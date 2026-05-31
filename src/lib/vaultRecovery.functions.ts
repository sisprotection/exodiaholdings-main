import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const dataUrlSchema = z
  .string()
  .min(50)
  .max(12_000_000) // ~9MB base64
  .regex(/^data:image\/(png|jpe?g|webp);base64,/, "Must be a base64 image data URL");

async function bucketObjectToDataUrl(path: string): Promise<string> {
  const { data, error } = await supabaseAdmin.storage.from("vault-recovery").download(path);
  if (error || !data) throw new Error("Could not load reference image");
  const buf = Buffer.from(await data.arrayBuffer());
  const mime = data.type || "image/jpeg";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

/**
 * Verifies a live selfie against the user's stored ID photo + reference selfie
 * using Gemini vision. On match, atomically wipes all vault_items for the user
 * so they can set a fresh passphrase on next unlock.
 */
export const recoverVault = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      liveSelfieDataUrl: dataUrlSchema,
    }).parse,
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { data: rec, error: recErr } = await supabaseAdmin
      .from("vault_recovery")
      .select("id_path, selfie_path")
      .eq("user_id", userId)
      .maybeSingle();
    if (recErr) throw new Error(recErr.message);
    if (!rec) {
      return {
        matched: false,
        reason: "Recovery is not set up. Unlock your cabinet once with your passphrase and upload your ID + selfie first.",
      };
    }

    const [idImg, refSelfie] = await Promise.all([
      bucketObjectToDataUrl(rec.id_path),
      bucketObjectToDataUrl(rec.selfie_path),
    ]);

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI gateway not configured");

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are a strict identity verification reviewer. You compare three images: (1) a government ID photo, (2) a stored reference selfie, (3) a live selfie. Decide if the person in the live selfie is the same human as in BOTH the ID and the reference selfie. Reject mismatches, photos of screens, obvious deepfakes, masks, or images of a different person. Respond ONLY with strict JSON: {\"match\": boolean, \"confidence\": \"low\"|\"medium\"|\"high\", \"reason\": string}.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Image 1: Government ID." },
              { type: "image_url", image_url: { url: idImg } },
              { type: "text", text: "Image 2: Reference selfie stored at setup." },
              { type: "image_url", image_url: { url: refSelfie } },
              { type: "text", text: "Image 3: Live selfie just captured. Same person?" },
              { type: "image_url", image_url: { url: data.liveSelfieDataUrl } },
            ],
          },
        ],
      }),
    });

    if (resp.status === 429) return { matched: false, reason: "Rate limit reached. Try again in a minute." };
    if (resp.status === 402) return { matched: false, reason: "AI credits exhausted. Add credits in Workspace settings." };
    if (!resp.ok) return { matched: false, reason: `Verifier error (${resp.status})` };

    const payload: any = await resp.json();
    const raw: string = payload?.choices?.[0]?.message?.content ?? "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { matched: false, reason: "Verifier returned an unreadable response" };

    let verdict: { match?: boolean; confidence?: string; reason?: string };
    try { verdict = JSON.parse(jsonMatch[0]); } catch { return { matched: false, reason: "Verifier returned invalid JSON" }; }

    if (!verdict.match || verdict.confidence === "low") {
      return {
        matched: false,
        confidence: verdict.confidence,
        reason: verdict.reason || "Face did not match with sufficient confidence.",
      };
    }

    // MATCH: wipe vault entries so the user can set a brand-new passphrase.
    const { error: delErr } = await supabaseAdmin
      .from("vault_items")
      .delete()
      .eq("user_id", userId);
    if (delErr) throw new Error(`Identity confirmed but wipe failed: ${delErr.message}`);

    return {
      matched: true,
      confidence: verdict.confidence,
      reason: "Identity confirmed. Your cabinet has been reset — set a new passphrase on the next unlock.",
    };
  });

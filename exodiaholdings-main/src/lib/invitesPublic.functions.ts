import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/** Validate an invite token publicly (no auth required) — used on accept-invite page. */
export const validateInviteToken = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ token: z.string().min(8).max(128) }).parse(input))
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("invites")
      .select("email, display_name, expires_at, used_at")
      .eq("token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return { valid: false as const, reason: "Invite link not found." };
    if (row.used_at) return { valid: false as const, reason: "This invite has already been used." };
    if (new Date(row.expires_at) < new Date()) return { valid: false as const, reason: "This invite has expired." };
    return {
      valid: true as const,
      email: row.email,
      displayName: row.display_name,
    };
  });

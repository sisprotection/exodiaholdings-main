import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const emailSchema = z.string().trim().email().max(254);

export const provisionHeir = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      email: emailSchema,
      password: z.string().min(6).max(200),
      displayName: z.string().trim().min(1).max(120),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verify caller is owner
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const isOwner = (roles ?? []).some((r) => r.role === "owner");
    if (!isOwner) throw new Error("Only the owner can provision an heir account.");

    const lowerEmail = data.email.toLowerCase();

    // Check if user already exists in auth
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existing = existingUsers.users.find((u) => (u.email ?? "").toLowerCase() === lowerEmail);

    let heirUserId: string;
    if (existing) {
      heirUserId = existing.id;
    } else {
      // Pre-create an invite so handle_new_user trigger accepts the signup
      const { error: invErr } = await supabaseAdmin.from("invites").insert({
        email: lowerEmail,
        display_name: data.displayName,
        invited_by: userId,
        invited_role: "heir",
      });
      if (invErr) throw new Error(`Invite setup failed: ${invErr.message}`);

      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: lowerEmail,
        password: data.password,
        email_confirm: true,
        user_metadata: { full_name: data.displayName },
      });
      if (createErr || !created.user) {
        throw new Error(`Could not create account: ${createErr?.message ?? "unknown error"}`);
      }
      heirUserId = created.user.id;
    }

    // Ensure heir role is set (in case of pre-existing user)
    await supabaseAdmin.from("user_roles").upsert(
      { user_id: heirUserId, role: "heir" },
      { onConflict: "user_id,role", ignoreDuplicates: true },
    );

    // Link guardian <-> heir
    const { error: linkErr } = await supabaseAdmin.from("heir_relationships").upsert(
      { guardian_id: userId, heir_id: heirUserId, display_name: data.displayName },
      { onConflict: "guardian_id,heir_id" },
    );
    if (linkErr) throw new Error(`Link failed: ${linkErr.message}`);

    return { ok: true, heirUserId };
  });

export const listHeirsForGuardian = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("heir_relationships")
      .select("id, heir_id, display_name, created_at");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const sendLoveNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      heirId: z.string().uuid(),
      title: z.string().trim().min(1).max(120),
      body: z.string().trim().min(1).max(2000),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("heir_messages").insert({
      guardian_id: userId,
      heir_id: data.heirId,
      title: data.title,
      body: data.body,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyLoveNotes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("heir_messages")
      .select("id, title, body, created_at, guardian_id")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const deleteLoveNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("heir_messages").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

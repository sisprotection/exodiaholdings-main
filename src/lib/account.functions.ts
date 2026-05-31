import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const exportMyData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [profile, properties, payments, beneficiaries, vaultItems, paymentSources, tickets, coOwners, sales, docs, photos] =
      await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("properties").select("*").eq("owner_id", userId),
        supabase.from("payments").select("*"),
        supabase.from("beneficiaries").select("*").eq("user_id", userId),
        supabase.from("vault_items").select("id, cabinet, category, label, username, url, tags, notes, location, serial_number, created_at, updated_at").eq("user_id", userId),
        supabase.from("payment_sources").select("*").eq("user_id", userId),
        supabase.from("support_tickets").select("*").eq("user_id", userId),
        supabase.from("co_owners").select("*"),
        supabase.from("sale_records").select("*"),
        supabase.from("property_documents").select("*"),
        supabase.from("property_photos").select("*"),
      ]);

    return {
      exported_at: new Date().toISOString(),
      user_id: userId,
      profile: profile.data ?? null,
      properties: properties.data ?? [],
      payments: payments.data ?? [],
      beneficiaries: beneficiaries.data ?? [],
      vault_items_metadata: vaultItems.data ?? [],
      payment_sources: paymentSources.data ?? [],
      support_tickets: tickets.data ?? [],
      co_owners: coOwners.data ?? [],
      sale_records: sales.data ?? [],
      property_documents: docs.data ?? [],
      property_photos: photos.data ?? [],
      _notice:
        "Vault password values are end-to-end encrypted and intentionally excluded. Only you (with your passphrase) can decrypt them inside the app.",
    };
  });

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    // Delete the auth user — public rows cascade via owner-scoped FKs / RLS deletes below.
    // First scrub owned rows.
    const tables = [
      "support_tickets", "vault_recovery", "vault_items", "beneficiaries",
      "heir_messages", "heir_relationships", "trust_relationships",
      "payment_sources", "property_documents", "property_photos",
      "payments", "co_owners", "sale_records", "properties",
      "user_roles", "profiles", "invites",
    ];
    for (const t of tables) {
      const col = ["support_tickets","vault_recovery","vault_items","beneficiaries","payment_sources","user_roles"].includes(t)
        ? "user_id"
        : t === "properties" ? "owner_id"
        : t === "profiles" ? "id"
        : t === "heir_relationships" || t === "heir_messages" ? "guardian_id"
        : t === "trust_relationships" ? "grantor_id"
        : t === "invites" ? "invited_by"
        : null;
      if (!col) continue;
      await (supabaseAdmin.from(t as any) as any).delete().eq(col, userId);
    }
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

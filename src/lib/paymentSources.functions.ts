import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const kindSchema = z.enum(["card", "bank", "gig", "employer", "company", "cash", "other"]);

const baseInput = z.object({
  kind: kindSchema,
  label: z.string().trim().min(1).max(120),
  brand: z.string().trim().max(60).optional().nullable(),
  last4: z.string().trim().max(4).regex(/^\d{0,4}$/).optional().nullable(),
  color: z.string().trim().max(20).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const listPaymentSources = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("payment_sources")
      .select("id, kind, label, brand, last4, color, notes, sort_order, created_at")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createPaymentSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => baseInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("payment_sources")
      .insert({ ...data, user_id: userId })
      .select("id, kind, label, brand, last4, color, notes")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updatePaymentSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    baseInput.partial().extend({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { id, ...patch } = data;
    const { error } = await supabase.from("payment_sources").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePaymentSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("payment_sources").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const fundingAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [sourcesRes, propsRes, paymentsRes] = await Promise.all([
      supabase.from("payment_sources").select("id, label, kind, color").eq("user_id", userId),
      supabase.from("properties").select("id, monthly_payment, total_owed, payment_source_id").eq("owner_id", userId),
      supabase.from("payments").select("amount, payment_source_id, property_id"),
    ]);
    if (sourcesRes.error) throw new Error(sourcesRes.error.message);
    if (propsRes.error) throw new Error(propsRes.error.message);
    if (paymentsRes.error) throw new Error(paymentsRes.error.message);

    const sources = sourcesRes.data ?? [];
    const props = propsRes.data ?? [];
    const payments = paymentsRes.data ?? [];

    const propSourceMap = new Map(props.map((p) => [p.id, p.payment_source_id]));
    const byId = new Map(sources.map((s) => [s.id, s]));

    const totals = new Map<string, { monthly: number; paid: number }>();
    const ensure = (key: string) => {
      if (!totals.has(key)) totals.set(key, { monthly: 0, paid: 0 });
      return totals.get(key)!;
    };

    for (const p of props) {
      const key = p.payment_source_id ?? "__unassigned__";
      ensure(key).monthly += Number(p.monthly_payment) || 0;
    }
    for (const pay of payments) {
      const key = pay.payment_source_id ?? propSourceMap.get(pay.property_id) ?? "__unassigned__";
      ensure(key).paid += Number(pay.amount) || 0;
    }

    const rows = Array.from(totals.entries()).map(([id, v]) => {
      const src = id === "__unassigned__" ? null : byId.get(id);
      return {
        id,
        label: src?.label ?? "Unassigned",
        kind: src?.kind ?? "other",
        color: src?.color ?? null,
        monthly: v.monthly,
        paid: v.paid,
      };
    });

    return rows;
  });

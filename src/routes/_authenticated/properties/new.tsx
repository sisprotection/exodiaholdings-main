import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { FREQUENCY_LABEL, intervalMonthsFor, monthlyEquivalent, type PaymentFrequency } from "@/lib/payoff";
import { PaymentSourcePicker } from "@/components/PaymentSourcePicker";

export const Route = createFileRoute("/_authenticated/properties/new")({
  head: () => ({ meta: [{ title: "Add Holding — Exodia Holdings" }] }),
  component: NewProperty,
});

const schema = z.object({
  nickname: z.string().max(120).optional(),
  address_line1: z.string().min(1).max(255),
  city: z.string().min(1).max(120),
  state: z.string().min(1).max(60),
  zip: z.string().min(1).max(20),
  property_type: z.enum(["house","condo","land","commercial","vehicle","website","domain","business","equipment","intellectual_property","financial_account","collectible","other"]),
  asset_class: z.enum(["real_estate","digital","business","vehicle","financial","collectible","other"]),
  status: z.enum(["owned_outright", "financing", "sold"]),
  purchase_price: z.coerce.number().min(0).optional(),
  total_owed: z.coerce.number().min(0),
  payment_amount: z.coerce.number().min(0),
  payment_frequency: z.enum(["one_time","monthly","quarterly","semi_annual","annual","biennial","triennial","every_5_years","custom"]),
  custom_months: z.coerce.number().int().min(1).max(600).optional(),
  payment_start_date: z.string().optional(),
  payment_day_of_month: z.coerce.number().int().min(1).max(31).optional(),
  notes: z.string().max(2000).optional(),
});

function NewProperty() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [frequency, setFrequency] = useState<PaymentFrequency>("monthly");
  const [paymentSourceId, setPaymentSourceId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const raw = Object.fromEntries(fd.entries());
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || "Invalid input");
      return;
    }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Not signed in"); setLoading(false); return; }
    const freq = parsed.data.payment_frequency;
    const interval = intervalMonthsFor(freq, parsed.data.custom_months);
    const monthly = monthlyEquivalent(parsed.data.payment_amount, freq, parsed.data.custom_months);
    const payload = {
      nickname: parsed.data.nickname,
      address_line1: parsed.data.address_line1,
      city: parsed.data.city,
      state: parsed.data.state,
      zip: parsed.data.zip,
      property_type: parsed.data.property_type,
      asset_class: parsed.data.asset_class,
      status: parsed.data.status,
      purchase_price: parsed.data.purchase_price || null,
      total_owed: parsed.data.total_owed,
      monthly_payment: monthly,
      payment_frequency: freq,
      payment_interval_months: interval || null,
      payment_start_date: parsed.data.payment_start_date || null,
      payment_day_of_month: parsed.data.payment_day_of_month || null,
      notes: parsed.data.notes,
      owner_id: user.id,
      payment_source_id: paymentSourceId,
    };
    const { data, error } = await supabase.from("properties").insert(payload).select().single();
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Holding added to archive");
    navigate({ to: "/properties/$id", params: { id: data.id } });
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">New Entry</p>
      <h1 className="mt-2 font-display text-4xl text-gold-soft">Add Holding</h1>
      <div className="gold-rule mt-6 w-full" />

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <Field label="Nickname (optional)" name="nickname" placeholder="Ogden St" />
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-3"><Field label="Address / Identifier" name="address_line1" required placeholder="160 Ogden Street, VIN, domain.com, etc." /></div>
          <Field label="City" name="city" required />
          <Field label="State" name="state" required />
          <Field label="Zip" name="zip" required />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Select label="Asset Class" name="asset_class" options={[["real_estate","Real Estate"],["digital","Digital Assets"],["business","Businesses & Equipment"],["vehicle","Vehicles"],["financial","Financial Accounts"],["collectible","Collectibles"],["other","Other"]]} />
          <Select label="Type" name="property_type" options={[["house","House"],["condo","Condo"],["land","Land"],["commercial","Commercial / Building"],["vehicle","Vehicle"],["website","Website"],["domain","Domain"],["business","Business"],["equipment","Equipment"],["intellectual_property","Intellectual Property"],["financial_account","Financial Account"],["collectible","Collectible"],["other","Other"]]} />
          <Select label="Status" name="status" defaultValue="financing" options={[["financing","Financing"],["owned_outright","Owned Outright"],["sold","Sold"]]} />
        </div>

        <div className="gold-rule" />
        <h2 className="font-display text-xl text-gold-soft">Payoff Details</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Purchase Price" name="purchase_price" type="number" step="0.01" placeholder="40000" />
          <Field label="Total Owed" name="total_owed" type="number" step="0.01" required placeholder="40000" />
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_1fr]">
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-muted-foreground">Payment Frequency</label>
            <select
              name="payment_frequency"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as PaymentFrequency)}
              className="w-full rounded-md border border-border bg-card px-4 py-3 outline-none focus:border-gold"
            >
              {(Object.keys(FREQUENCY_LABEL) as PaymentFrequency[]).map((f) => (
                <option key={f} value={f}>{FREQUENCY_LABEL[f]}</option>
              ))}
            </select>
          </div>
          <Field
            label={frequency === "one_time" ? "Lump Sum Amount" : "Amount Per Payment"}
            name="payment_amount" type="number" step="0.01" required placeholder="550"
          />
          {frequency === "custom" ? (
            <Field label="Every N months" name="custom_months" type="number" min="1" max="600" required placeholder="18" />
          ) : (
            <Field label="Payment Day of Month" name="payment_day_of_month" type="number" min="1" max="31" placeholder="1" />
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Payment Start Date" name="payment_start_date" type="date" />
          <PaymentSourcePicker value={paymentSourceId} onChange={setPaymentSourceId} label="Funded By (Source)" />
        </div>

        <Field label="Notes" name="notes" textarea />

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate({ to: "/properties" })} className="rounded-md border border-border px-4 py-2.5 text-sm text-muted-foreground hover:border-gold hover:text-gold">Cancel</button>
          <button type="submit" disabled={loading} className="rounded-md bg-gold px-6 py-2.5 text-sm uppercase tracking-wider text-primary-foreground hover:gold-glow disabled:opacity-50">
            {loading ? "Saving…" : "Add to Archive"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field(props: { label: string; name: string; type?: string; required?: boolean; placeholder?: string; textarea?: boolean; step?: string; min?: string; max?: string; defaultValue?: string }) {
  const { label, textarea, ...rest } = props;
  return (
    <div>
      <label className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</label>
      {textarea ? (
        <textarea {...rest} rows={3} className="w-full rounded-md border border-border bg-card px-4 py-3 outline-none focus:border-gold" />
      ) : (
        <input {...rest} className="w-full rounded-md border border-border bg-card px-4 py-3 outline-none focus:border-gold" />
      )}
    </div>
  );
}

function Select({ label, name, options, defaultValue }: { label: string; name: string; options: [string, string][]; defaultValue?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</label>
      <select name={name} defaultValue={defaultValue} className="w-full rounded-md border border-border bg-card px-4 py-3 outline-none focus:border-gold">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}

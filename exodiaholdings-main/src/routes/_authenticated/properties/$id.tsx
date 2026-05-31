import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { calcPayoff, buildPayoffSeries, formatMoney } from "@/lib/payoff";
import { ResponsiveContainer, AreaChart, Area, ComposedChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { toast } from "sonner";
import { Trash2, Upload, FileText, Users, DollarSign, ArrowLeft, Receipt, TrendingUp } from "lucide-react";
import { ASSET_CLASS_LABEL, type AssetClass } from "@/lib/assetClass";
import { HeirVisibilityToggle } from "@/components/HeirVisibilityToggle";
import { Private } from "@/lib/privacy";

export const Route = createFileRoute("/_authenticated/properties/$id")({
  head: () => ({ meta: [{ title: "Property — Exodia Holdings" }] }),
  component: PropertyDetail,
});

function PropertyDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: property, isLoading } = useQuery({
    queryKey: ["property", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: photos = [] } = useQuery({
    queryKey: ["photos", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("property_photos").select("*").eq("property_id", id).order("sort_order");
      if (error) throw error;
      if (!data || data.length === 0) return [] as Array<{ id: string; storage_path: string; caption: string | null; signedUrl: string }>;
      const paths = data.map((p) => p.storage_path);
      const { data: signed } = await supabase.storage.from("property-photos").createSignedUrls(paths, 3600);
      const map = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
      return data.map((p) => ({ ...p, signedUrl: map.get(p.storage_path) ?? "" }));
    },
  });

  const { data: docs = [] } = useQuery({
    queryKey: ["docs", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("property_documents").select("*").eq("property_id", id).order("uploaded_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: coOwners = [] } = useQuery({
    queryKey: ["coOwners", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("co_owners").select("*").eq("property_id", id);
      if (error) throw error;
      return data;
    },
  });

  const { data: saleRecord } = useQuery({
    queryKey: ["sale", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("sale_records").select("*").eq("property_id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["payments", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("property_id", id)
        .order("paid_on", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="mx-auto max-w-7xl px-6 py-10 text-muted-foreground">Loading…</div>;
  if (!property) return <div className="mx-auto max-w-7xl px-6 py-10">Not found.</div>;

  const payoff = calcPayoff({
    totalOwed: Number(property.total_owed),
    monthlyPayment: Number(property.monthly_payment),
    paymentStartDate: property.payment_start_date,
  });
  const series = buildPayoffSeries({
    totalOwed: Number(property.total_owed),
    monthlyPayment: Number(property.monthly_payment),
    paymentStartDate: property.payment_start_date,
  });

  // Overlay actual cumulative payments onto the projection by matching month label.
  const actualByMonth = new Map<string, number>();
  let running = 0;
  for (const p of [...payments].sort((a, b) => (a.paid_on < b.paid_on ? -1 : 1))) {
    running += Number(p.amount);
    const label = new Date(p.paid_on).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    actualByMonth.set(label, running);
  }
  let lastActual = 0;
  const enrichedSeries = series.map((row) => {
    if (actualByMonth.has(row.month)) lastActual = actualByMonth.get(row.month)!;
    return { ...row, actual: payments.length > 0 ? lastActual : undefined };
  });
  const actualPaidTotal = payments.reduce((a, p) => a + Number(p.amount), 0);
  const effectivePaid = Math.max(payoff.amountPaid, actualPaidTotal);
  const effectiveRemaining = Math.max(0, Number(property.total_owed) - effectivePaid);

  const handleDelete = async () => {
    if (!confirm("Delete this property and all its records? This cannot be undone.")) return;
    const { error } = await supabase.from("properties").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Property removed from archive");
    navigate({ to: "/properties" });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const path = `${user.id}/${id}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("property-photos").upload(path, file);
    if (upErr) { toast.error(upErr.message); return; }
    const { error } = await supabase.from("property_photos").insert({ property_id: id, storage_path: path });
    if (error) { toast.error(error.message); return; }
    toast.success("Photo added");
    qc.invalidateQueries({ queryKey: ["photos", id] });
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const path = `${user.id}/${id}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("property-documents").upload(path, file);
    if (upErr) { toast.error(upErr.message); return; }
    const { error } = await supabase.from("property_documents").insert({
      property_id: id, storage_path: path, file_name: file.name, doc_type: "other",
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Document uploaded");
    qc.invalidateQueries({ queryKey: ["docs", id] });
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <Link to="/properties" className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground hover:text-gold">
        <ArrowLeft className="size-3.5" /> Back to ledger
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            {ASSET_CLASS_LABEL[property.asset_class as AssetClass]} · {property.property_type}
          </p>
          <h1 className="mt-2 font-display text-4xl text-gold-soft">{property.nickname || property.address_line1}</h1>
          <p className="mt-1 text-muted-foreground"><Private>{property.address_line1}</Private>, {property.city}, {property.state} {property.zip}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <HeirVisibilityToggle propertyId={id} visible={Boolean((property as any).visible_to_heir)} />
          <button onClick={handleDelete} className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 px-3 py-2 text-xs uppercase tracking-wider text-destructive hover:bg-destructive/10">
            <Trash2 className="size-3.5" /> Delete
          </button>
        </div>
      </div>
      <div className="gold-rule mt-6 w-full" />

      {/* Payoff Summary */}
      <section className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-lg border border-border/40 bg-card p-6">
          <h2 className="flex items-center gap-2 font-display text-xl text-gold-soft">
            <TrendingUp className="size-5 text-gold" /> Payoff Projection
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Metric label="Total Owed" value={formatMoney(Number(property.total_owed))} privateValue />
            <Metric label="Paid" value={formatMoney(effectivePaid)} privateValue />
            <Metric label="Remaining" value={formatMoney(effectiveRemaining)} accent privateValue />
            <Metric label="Payoff Date" value={payoff.projectedPayoffDate?.toLocaleDateString("en-US", { month: "short", year: "numeric" }) || "—"} />
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-gold transition-all duration-700 ease-out"
              style={{ width: `${Number(property.total_owed) > 0 ? Math.min(100, (effectivePaid / Number(property.total_owed)) * 100) : 0}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {payoff.progressPct.toFixed(1)}% projected · {payoff.monthsPaid} months in · {payoff.monthsRemaining} months remaining
            {payments.length > 0 && <> · {formatMoney(actualPaidTotal)} actually logged</>}
          </p>

          {enrichedSeries.length > 0 && (
            <div className="mt-6 h-72">
              <ResponsiveContainer>
                <ComposedChart data={enrichedSeries}>
                  <defs>
                    <linearGradient id="actualFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.55} />
                      <stop offset="100%" stopColor="var(--gold)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="oklch(0.3 0.02 85 / 30%)" strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fill: "oklch(0.68 0.02 85)", fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: "oklch(0.68 0.02 85)", fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: "oklch(0.17 0 0)", border: "1px solid var(--gold)", borderRadius: 8, color: "#fff" }}
                    formatter={(v: number) => formatMoney(v)}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: "oklch(0.68 0.02 85)" }} />
                  {payments.length > 0 && (
                    <Area type="monotone" dataKey="actual" stroke="var(--gold)" strokeWidth={2.5} fill="url(#actualFill)" name="Actual Paid" isAnimationActive animationDuration={1200} />
                  )}
                  <Line type="monotone" dataKey="paid" stroke="var(--gold-soft)" strokeWidth={1.5} dot={false} name="Projected Paid" isAnimationActive animationDuration={1200} />
                  <Line type="monotone" dataKey="remaining" stroke="oklch(0.6 0.08 60)" strokeWidth={1} dot={false} strokeDasharray="4 4" name="Remaining" isAnimationActive animationDuration={1200} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-border/40 bg-card p-6">
            <h3 className="flex items-center gap-2 text-sm uppercase tracking-wider text-muted-foreground"><DollarSign className="size-4 text-gold" /> Schedule</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <Row k="Monthly" v={formatMoney(Number(property.monthly_payment))} />
              <Row k="Started" v={property.payment_start_date ? new Date(property.payment_start_date).toLocaleDateString() : "—"} />
              <Row k="Due Day" v={property.payment_day_of_month?.toString() || "—"} />
              <Row k="Status" v={property.status.replace("_", " ")} />
            </dl>
          </div>
          {property.notes && (
            <div className="rounded-lg border border-border/40 bg-card p-6">
              <h3 className="text-sm uppercase tracking-wider text-muted-foreground">Notes</h3>
              <p className="mt-3 text-sm whitespace-pre-wrap">{property.notes}</p>
            </div>
          )}
        </div>
      </section>

      {/* Photos */}
      <section className="mt-10">
        <SectionHeader title="Photos" action={
          <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground hover:border-gold hover:text-gold">
            <Upload className="size-3.5" /> Upload
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </label>
        } />
        {photos.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No photos yet.</p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {photos.map((p) => (
              <img key={p.id} src={p.signedUrl} alt={p.caption || ""} className="aspect-square w-full rounded-lg border border-border object-cover" />
            ))}
          </div>
        )}
      </section>

      {/* Documents */}
      <section className="mt-10">
        <SectionHeader title="Documents" action={
          <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground hover:border-gold hover:text-gold">
            <Upload className="size-3.5" /> Upload
            <input type="file" className="hidden" onChange={handleDocUpload} />
          </label>
        } />
        {docs.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No documents yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border/40 rounded-lg border border-border/40 bg-card">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <FileText className="size-4 text-gold" />
                  <span className="text-sm">{d.file_name}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{d.doc_type}</span>
                </div>
                <button
                  onClick={async () => {
                    const { data, error } = await supabase.storage.from("property-documents").createSignedUrl(d.storage_path, 60);
                    if (error || !data) { toast.error("Could not open"); return; }
                    window.open(data.signedUrl, "_blank");
                  }}
                  className="text-xs uppercase tracking-wider text-gold hover:underline"
                >
                  Open
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Payments ledger */}
      <PaymentsSection propertyId={id} payments={payments} />

      {/* Co-owners */}
      <CoOwnersSection propertyId={id} coOwners={coOwners} />

      {/* Sale record */}
      <SaleSection propertyId={id} saleRecord={saleRecord} status={property.status} />
    </div>
  );
}

function PaymentsSection({ propertyId, payments }: { propertyId: string; payments: any[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const add = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      property_id: propertyId,
      amount: Number(fd.get("amount") || 0),
      paid_on: String(fd.get("paid_on") || new Date().toISOString().slice(0, 10)),
      method: String(fd.get("method") || "") || null,
      note: String(fd.get("note") || "") || null,
    };
    if (!payload.amount || payload.amount <= 0) { toast.error("Amount required"); return; }
    const { error } = await supabase.from("payments").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Payment logged — graph updated");
    qc.invalidateQueries({ queryKey: ["payments", propertyId] });
    qc.invalidateQueries({ queryKey: ["all-payments"] });
    setOpen(false);
    (e.target as HTMLFormElement).reset();
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("payments").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["payments", propertyId] });
    qc.invalidateQueries({ queryKey: ["all-payments"] });
  };
  const total = payments.reduce((a, p) => a + Number(p.amount), 0);
  return (
    <section className="mt-10">
      <SectionHeader title="Payment Ledger" action={
        <button onClick={() => setOpen(!open)} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground hover:border-gold hover:text-gold">
          <Receipt className="size-3.5" /> {open ? "Close" : "Log Payment"}
        </button>
      } />
      <p className="mt-1 text-xs text-muted-foreground">
        {payments.length} payment{payments.length === 1 ? "" : "s"} · {formatMoney(total)} logged
      </p>
      {open && (
        <form onSubmit={add} className="mt-4 grid gap-3 rounded-lg border border-border/40 bg-card p-4 sm:grid-cols-5">
          <input name="amount" type="number" step="0.01" placeholder="Amount" required className="rounded-md border border-border bg-background px-3 py-2" />
          <input name="paid_on" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required className="rounded-md border border-border bg-background px-3 py-2" />
          <input name="method" placeholder="Method (cash, wire…)" className="rounded-md border border-border bg-background px-3 py-2" />
          <input name="note" placeholder="Note" className="rounded-md border border-border bg-background px-3 py-2 sm:col-span-2" />
          <button className="sm:col-span-5 rounded-md bg-gold px-4 py-2 text-xs uppercase tracking-wider text-primary-foreground">Save Payment</button>
        </form>
      )}
      <ul className="mt-4 divide-y divide-border/40 rounded-lg border border-border/40 bg-card">
        {payments.length === 0 && <li className="p-4 text-sm text-muted-foreground">No payments logged yet.</li>}
        {[...payments].reverse().map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-3 p-4">
            <div>
              <div className="font-display text-base text-gold">{formatMoney(Number(p.amount))}</div>
              <div className="text-xs text-muted-foreground">
                {new Date(p.paid_on).toLocaleDateString()} {p.method && `· ${p.method}`} {p.note && `· ${p.note}`}
              </div>
            </div>
            <button onClick={() => remove(p.id)} className="text-xs text-destructive hover:underline">Remove</button>
          </li>
        ))}
      </ul>
    </section>
  );
}


function Metric({ label, value, accent, privateValue }: { label: string; value: string; accent?: boolean; privateValue?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 font-display text-lg ${accent ? "text-gold" : "text-foreground"}`}>
        {privateValue ? <Private>{value}</Private> : value}
      </div>
    </div>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between"><dt className="text-muted-foreground capitalize">{k}</dt><dd>{v}</dd></div>;
}
function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="font-display text-2xl text-gold-soft">{title}</h2>
      {action}
    </div>
  );
}

function CoOwnersSection({ propertyId, coOwners }: { propertyId: string; coOwners: any[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const add = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      property_id: propertyId,
      name: String(fd.get("name") || ""),
      relationship: String(fd.get("relationship") || "") || null,
      share_percent: fd.get("share_percent") ? Number(fd.get("share_percent")) : null,
      notes: String(fd.get("notes") || "") || null,
    };
    if (!payload.name) return;
    const { error } = await supabase.from("co_owners").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Co-owner added");
    qc.invalidateQueries({ queryKey: ["coOwners", propertyId] });
    setOpen(false);
    (e.target as HTMLFormElement).reset();
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("co_owners").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["coOwners", propertyId] });
  };
  return (
    <section className="mt-10">
      <SectionHeader title="Co-Owners / Adjoined Parties" action={
        <button onClick={() => setOpen(!open)} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground hover:border-gold hover:text-gold">
          <Users className="size-3.5" /> {open ? "Close" : "Add"}
        </button>
      } />
      {open && (
        <form onSubmit={add} className="mt-4 grid gap-3 rounded-lg border border-border/40 bg-card p-4 sm:grid-cols-4">
          <input name="name" placeholder="Name" required className="rounded-md border border-border bg-background px-3 py-2 sm:col-span-2" />
          <input name="relationship" placeholder="Relationship" className="rounded-md border border-border bg-background px-3 py-2" />
          <input name="share_percent" type="number" step="0.01" placeholder="Share %" className="rounded-md border border-border bg-background px-3 py-2" />
          <input name="notes" placeholder="Notes" className="rounded-md border border-border bg-background px-3 py-2 sm:col-span-3" />
          <button className="rounded-md bg-gold px-4 py-2 text-xs uppercase tracking-wider text-primary-foreground">Save</button>
        </form>
      )}
      <ul className="mt-4 space-y-2">
        {coOwners.length === 0 && <p className="text-sm text-muted-foreground">No co-owners recorded.</p>}
        {coOwners.map((c) => (
          <li key={c.id} className="flex items-center justify-between rounded-lg border border-border/40 bg-card px-4 py-3">
            <div>
              <div className="font-medium">{c.name} {c.share_percent && <span className="text-gold">· {c.share_percent}%</span>}</div>
              <div className="text-xs text-muted-foreground">{c.relationship} {c.notes && `· ${c.notes}`}</div>
            </div>
            <button onClick={() => remove(c.id)} className="text-xs text-destructive hover:underline">Remove</button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SaleSection({ propertyId, saleRecord, status }: { propertyId: string; saleRecord: any; status: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      property_id: propertyId,
      buyer_name: String(fd.get("buyer_name") || ""),
      sale_date: String(fd.get("sale_date") || ""),
      sale_price: Number(fd.get("sale_price") || 0),
      notes: String(fd.get("notes") || "") || null,
    };
    if (!payload.buyer_name || !payload.sale_date) { toast.error("Buyer and date required"); return; }
    const { error: saleErr } = saleRecord
      ? await supabase.from("sale_records").update(payload).eq("id", saleRecord.id)
      : await supabase.from("sale_records").insert(payload);
    if (saleErr) { toast.error(saleErr.message); return; }
    await supabase.from("properties").update({ status: "sold" }).eq("id", propertyId);
    toast.success("Sale recorded");
    qc.invalidateQueries({ queryKey: ["sale", propertyId] });
    qc.invalidateQueries({ queryKey: ["property", propertyId] });
    setOpen(false);
  };
  return (
    <section className="mt-10">
      <SectionHeader title="Sale Record" action={
        <button onClick={() => setOpen(!open)} className="rounded-md border border-border px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground hover:border-gold hover:text-gold">
          {saleRecord ? "Edit" : "Mark as Sold"}
        </button>
      } />
      {saleRecord && !open && (
        <div className="mt-4 rounded-lg border border-border/40 bg-card p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric label="Buyer" value={saleRecord.buyer_name} />
            <Metric label="Sale Date" value={new Date(saleRecord.sale_date).toLocaleDateString()} />
            <Metric label="Sale Price" value={formatMoney(Number(saleRecord.sale_price))} accent />
          </div>
          {saleRecord.notes && <p className="mt-3 text-sm text-muted-foreground">{saleRecord.notes}</p>}
        </div>
      )}
      {!saleRecord && !open && status !== "sold" && <p className="mt-4 text-sm text-muted-foreground">Not yet sold.</p>}
      {open && (
        <form onSubmit={submit} className="mt-4 grid gap-3 rounded-lg border border-border/40 bg-card p-4 sm:grid-cols-3">
          <input name="buyer_name" defaultValue={saleRecord?.buyer_name} placeholder="Buyer name" required className="rounded-md border border-border bg-background px-3 py-2" />
          <input name="sale_date" type="date" defaultValue={saleRecord?.sale_date} required className="rounded-md border border-border bg-background px-3 py-2" />
          <input name="sale_price" type="number" step="0.01" defaultValue={saleRecord?.sale_price} placeholder="Sale price" required className="rounded-md border border-border bg-background px-3 py-2" />
          <textarea name="notes" defaultValue={saleRecord?.notes || ""} placeholder="Notes" className="sm:col-span-3 rounded-md border border-border bg-background px-3 py-2" rows={2} />
          <div className="sm:col-span-3 flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-border px-4 py-2 text-xs uppercase tracking-wider">Cancel</button>
            <button type="submit" className="rounded-md bg-gold px-6 py-2 text-xs uppercase tracking-wider text-primary-foreground">Save Sale</button>
          </div>
        </form>
      )}
    </section>
  );
}

import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { calcPayoff, formatMoney } from "@/lib/payoff";
import { ASSET_CLASS_LABEL, ASSET_CLASS_BLURB, ASSET_CLASS_ORDER, type AssetClass } from "@/lib/assetClass";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/properties/")({
  head: () => ({ meta: [{ title: "Holdings — Exodia" }] }),
  component: PropertiesList,
});

type StatusFilter = "all" | "financing" | "owned_outright" | "sold";

function PropertiesList() {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [classFilter, setClassFilter] = useState<"all" | AssetClass>("all");

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ["properties"],
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["all-payments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("payments").select("property_id, amount");
      if (error) throw error;
      return data;
    },
  });

  const paidByProperty = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of payments) m.set(p.property_id, (m.get(p.property_id) || 0) + Number(p.amount));
    return m;
  }, [payments]);

  const filtered = properties.filter((p) => {
    if (status !== "all" && p.status !== status) return false;
    if (classFilter !== "all" && p.asset_class !== classFilter) return false;
    return true;
  });

  // Group by asset class (only show groups that have items)
  const grouped = useMemo(() => {
    const groups = new Map<AssetClass, typeof filtered>();
    for (const p of filtered) {
      const k = p.asset_class as AssetClass;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(p);
    }
    return ASSET_CLASS_ORDER
      .filter((c) => groups.has(c))
      .map((c) => ({ class: c, items: groups.get(c)! }));
  }, [filtered]);

  const statusFilters: Array<{ key: StatusFilter; label: string }> = [
    { key: "all", label: "All" },
    { key: "financing", label: "Financing" },
    { key: "owned_outright", label: "Owned" },
    { key: "sold", label: "Sold" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">The Ledger</p>
          <h1 className="mt-2 font-display text-4xl text-gold-soft">All Holdings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Organized by asset class — the structure of a holdings company.</p>
        </div>
        <Link to="/properties/new" className="inline-flex items-center gap-2 rounded-md bg-gold px-4 py-2.5 text-sm uppercase tracking-wider text-primary-foreground hover:gold-glow">
          <Plus className="size-4" /> Add Holding
        </Link>
      </div>
      <div className="gold-rule mt-6 w-full" />

      <div className="mt-6 flex flex-wrap gap-2">
        {statusFilters.map((f) => (
          <button
            key={f.key}
            onClick={() => setStatus(f.key)}
            className={`rounded-full border px-4 py-1.5 text-xs uppercase tracking-wider transition ${
              status === f.key ? "border-gold bg-gold/10 text-gold" : "border-border text-muted-foreground hover:border-gold/50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => setClassFilter("all")}
          className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-wider transition ${
            classFilter === "all" ? "border-gold bg-gold/10 text-gold" : "border-border/50 text-muted-foreground hover:border-gold/50"
          }`}
        >
          All Classes
        </button>
        {ASSET_CLASS_ORDER.map((c) => (
          <button
            key={c}
            onClick={() => setClassFilter(c)}
            className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-wider transition ${
              classFilter === c ? "border-gold bg-gold/10 text-gold" : "border-border/50 text-muted-foreground hover:border-gold/50"
            }`}
          >
            {ASSET_CLASS_LABEL[c]}
          </button>
        ))}
      </div>

      {isLoading && <p className="mt-8 text-muted-foreground">Loading…</p>}
      {!isLoading && filtered.length === 0 && (
        <div className="mt-8 rounded-lg border border-dashed border-border/60 p-12 text-center text-muted-foreground">
          No holdings match these filters.
        </div>
      )}

      {grouped.map(({ class: cls, items }) => (
        <section key={cls} className="mt-10">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl text-gold-soft">{ASSET_CLASS_LABEL[cls]}</h2>
              <p className="text-xs text-muted-foreground">{ASSET_CLASS_BLURB[cls]}</p>
            </div>
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {items.length} entr{items.length === 1 ? "y" : "ies"}
            </span>
          </div>
          <div className="gold-rule mt-3" />
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {items.map((p) => {
              const calc = calcPayoff({
                totalOwed: Number(p.total_owed),
                monthlyPayment: Number(p.monthly_payment),
                paymentStartDate: p.payment_start_date,
              });
              const paid = Math.max(calc.amountPaid, paidByProperty.get(p.id) || 0);
              const remaining = Math.max(0, Number(p.total_owed) - paid);
              const pct = Number(p.total_owed) > 0 ? Math.min(100, (paid / Number(p.total_owed)) * 100) : 0;
              return (
                <Link
                  key={p.id}
                  to="/properties/$id"
                  params={{ id: p.id }}
                  className="group rounded-lg border border-border/40 bg-card p-6 transition hover:border-gold/60 hover:gold-glow"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-display text-2xl text-gold-soft group-hover:text-gold">
                        {p.nickname || p.address_line1}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">{p.address_line1}</div>
                      <div className="text-sm text-muted-foreground">
                        {p.city}, {p.state} {p.zip}
                      </div>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{p.property_type}</span>
                  </div>
                  <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
                    <Stat label="Owed" value={formatMoney(Number(p.total_owed))} />
                    <Stat label="Paid" value={formatMoney(paid)} />
                    <Stat label="Left" value={formatMoney(remaining)} accent />
                  </div>
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full bg-gold transition-all duration-700 ease-out" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-2 flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                    <span>{pct.toFixed(0)}% paid</span>
                    {calc.projectedPayoffDate && remaining > 0 && (
                      <span>
                        Payoff {calc.projectedPayoffDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-0.5 font-display text-base ${accent ? "text-gold" : ""}`}>{value}</div>
    </div>
  );
}

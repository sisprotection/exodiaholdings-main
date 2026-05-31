import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { calcPayoff, formatMoney } from "@/lib/payoff";
import { ASSET_CLASS_LABEL, ASSET_CLASS_ORDER, type AssetClass } from "@/lib/assetClass";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Home, TrendingUp, Wallet, CalendarClock, Plus, Layers, Activity, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { useIsOwner } from "@/hooks/useRole";
import { InviteDialog } from "@/components/InviteDialog";
import { LoveNotesPanel } from "@/components/LoveNotesPanel";
import { Private } from "@/lib/privacy";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Command — Exodia Holdings" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { isOwner } = useIsOwner();
  const [inviteOpen, setInviteOpen] = useState(false);
  const { data: properties = [], isLoading } = useQuery({
    queryKey: ["properties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["all-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .order("paid_on", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Aggregate per-property paid (manual ledger sums) keyed by property id
  const paidByProperty = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of payments) {
      m.set(p.property_id, (m.get(p.property_id) || 0) + Number(p.amount));
    }
    return m;
  }, [payments]);

  const totals = properties.reduce(
    (acc, p) => {
      const calc = calcPayoff({
        totalOwed: Number(p.total_owed),
        monthlyPayment: Number(p.monthly_payment),
        paymentStartDate: p.payment_start_date,
      });
      const actualPaid = paidByProperty.get(p.id) || 0;
      const paid = Math.max(calc.amountPaid, actualPaid);
      const remaining = Math.max(0, Number(p.total_owed) - paid);
      acc.totalOwed += Number(p.total_owed) || 0;
      acc.paid += paid;
      acc.remaining += remaining;
      if (p.status === "financing") acc.financing += 1;
      if (p.status === "owned_outright") acc.owned += 1;
      if (p.status === "sold") acc.sold += 1;
      if (calc.projectedPayoffDate && remaining > 0) {
        if (!acc.nextPayoff || calc.projectedPayoffDate < acc.nextPayoff)
          acc.nextPayoff = calc.projectedPayoffDate;
      }
      return acc;
    },
    {
      totalOwed: 0,
      paid: 0,
      remaining: 0,
      financing: 0,
      owned: 0,
      sold: 0,
      nextPayoff: null as Date | null,
    },
  );

  // Cumulative paid series (across ALL holdings) — updates every time a payment is recorded
  const cumulativeSeries = useMemo(() => {
    if (payments.length === 0) return [];
    const sorted = [...payments].sort((a, b) => (a.paid_on < b.paid_on ? -1 : 1));
    let running = 0;
    return sorted.map((p) => {
      running += Number(p.amount);
      return {
        date: new Date(p.paid_on).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }),
        paid: running,
      };
    });
  }, [payments]);

  // Asset class breakdown
  const classBreakdown = useMemo(() => {
    const map = new Map<AssetClass, { count: number; owed: number; remaining: number }>();
    for (const c of ASSET_CLASS_ORDER) map.set(c, { count: 0, owed: 0, remaining: 0 });
    for (const p of properties) {
      const calc = calcPayoff({
        totalOwed: Number(p.total_owed),
        monthlyPayment: Number(p.monthly_payment),
        paymentStartDate: p.payment_start_date,
      });
      const paid = Math.max(calc.amountPaid, paidByProperty.get(p.id) || 0);
      const entry = map.get(p.asset_class as AssetClass) || { count: 0, owed: 0, remaining: 0 };
      entry.count += 1;
      entry.owed += Number(p.total_owed) || 0;
      entry.remaining += Math.max(0, Number(p.total_owed) - paid);
      map.set(p.asset_class as AssetClass, entry);
    }
    return ASSET_CLASS_ORDER
      .map((c) => ({ class: c, label: ASSET_CLASS_LABEL[c], ...map.get(c)! }))
      .filter((row) => row.count > 0);
  }, [properties, paidByProperty]);

  const PIE_COLORS = ["#c9a84c", "#f0d78c", "#b8923a", "#e8c873", "#9b7d2e", "#d9b85a", "#7a6324"];

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Command Deck</p>
          <h1 className="mt-2 font-display text-4xl text-gold-soft">Holdings Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every asset, every dollar, every projection — under one crown.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isOwner && (
            <button
              onClick={() => setInviteOpen(true)}
              className="inline-flex items-center gap-2 rounded-md border border-gold/50 px-4 py-2.5 text-sm uppercase tracking-wider text-gold hover:bg-gold/10"
            >
              <UserPlus className="size-4" /> Invite
            </button>
          )}
          <Link
            to="/properties/new"
            className="inline-flex items-center gap-2 rounded-md bg-gold px-4 py-2.5 text-sm uppercase tracking-wider text-primary-foreground hover:gold-glow"
          >
            <Plus className="size-4" /> Add Holding
          </Link>
        </div>
      </div>
      <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />
      <div className="gold-rule mt-6 w-full" />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Home className="size-5" />} label="Holdings" value={String(properties.length)} sub={`${totals.financing} financing · ${totals.owned} owned · ${totals.sold} sold`} />
        <StatCard icon={<Wallet className="size-5" />} label="Total Owed" value={formatMoney(totals.totalOwed)} sub="across all holdings" privateValue />
        <StatCard icon={<TrendingUp className="size-5" />} label="Paid So Far" value={formatMoney(totals.paid)} sub={`${formatMoney(totals.remaining)} remaining`} privateValue />
        <StatCard icon={<CalendarClock className="size-5" />} label="Next Payoff" value={totals.nextPayoff ? totals.nextPayoff.toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "—"} sub="earliest projected" />
      </div>

      {/* Animated cumulative paid chart */}
      <section className="mt-10 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-lg border border-border/40 bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-2xl text-gold-soft">
              <Activity className="size-5 text-gold" /> Capital Flow
            </h2>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {payments.length} payment{payments.length === 1 ? "" : "s"} logged
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Cumulative actual payments across every holding. Updates the moment you log a payment.
          </p>
          <div className="mt-6 h-72">
            {cumulativeSeries.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Log a payment on any holding to start the graph.
              </div>
            ) : (
              <ResponsiveContainer>
                <AreaChart data={cumulativeSeries}>
                  <defs>
                    <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="var(--gold)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="oklch(0.3 0.02 85 / 30%)" strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fill: "oklch(0.68 0.02 85)", fontSize: 10 }} />
                  <YAxis tick={{ fill: "oklch(0.68 0.02 85)", fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: "oklch(0.17 0 0)", border: "1px solid var(--gold)", borderRadius: 8, color: "#fff" }}
                    formatter={(v: number) => [formatMoney(v), "Cumulative Paid"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="paid"
                    stroke="var(--gold)"
                    strokeWidth={2}
                    fill="url(#goldFill)"
                    isAnimationActive
                    animationDuration={1200}
                    animationEasing="ease-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Asset class pie */}
        <div className="rounded-lg border border-border/40 bg-card p-6">
          <h2 className="flex items-center gap-2 font-display text-2xl text-gold-soft">
            <Layers className="size-5 text-gold" /> Asset Classes
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">By total owed.</p>
          <div className="mt-4 h-56">
            {classBreakdown.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No holdings yet.</div>
            ) : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={classBreakdown}
                    dataKey="owed"
                    nameKey="label"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={2}
                    isAnimationActive
                    animationDuration={1200}
                  >
                    {classBreakdown.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="oklch(0.13 0 0)" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "oklch(0.17 0 0)", border: "1px solid var(--gold)", borderRadius: 8 }}
                    formatter={(v: number, n) => [formatMoney(v), n as string]}
                  />
                  <Legend wrapperStyle={{ fontSize: 10, color: "oklch(0.68 0.02 85)" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      {/* Asset class table */}
      {classBreakdown.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-2xl text-gold-soft">Holdings by Class</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {classBreakdown.map((row, i) => (
              <div key={row.class} className="rounded-lg border border-border/40 bg-card p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{row.label}</span>
                  <span className="size-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                </div>
                <div className="mt-3 font-display text-2xl text-gold-soft">{row.count}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {formatMoney(row.owed)} owed · {formatMoney(row.remaining)} remaining
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {isOwner && (
        <section className="mt-12">
          <LoveNotesPanel />
        </section>
      )}

      <h2 className="mt-12 font-display text-2xl text-gold-soft">Recent Holdings</h2>
      <div className="mt-4 space-y-3">
        {isLoading && <p className="text-muted-foreground">Loading archive…</p>}
        {!isLoading && properties.length === 0 && (
          <div className="rounded-lg border border-dashed border-border/60 p-12 text-center">
            <p className="text-muted-foreground">The archive is empty. Add your first holding to begin.</p>
            <Link to="/properties/new" className="mt-4 inline-block text-gold hover:underline">Add holding →</Link>
          </div>
        )}
        {properties.slice(0, 5).map((p) => {
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
              className="block rounded-lg border border-border/40 bg-card p-5 transition hover:border-gold/60"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="font-display text-xl text-gold-soft">{p.nickname || p.address_line1}</div>
                  <div className="text-xs text-muted-foreground">
                    <Private>{p.address_line1}</Private>, {p.city}, {p.state} {p.zip}
                  </div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    {ASSET_CLASS_LABEL[p.asset_class as AssetClass]}
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <Pill status={p.status} />
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Remaining</div>
                    <div className="font-display text-lg text-gold"><Private>{formatMoney(remaining)}</Private></div>
                  </div>
                </div>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-gold transition-all duration-700 ease-out"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, privateValue }: { icon: React.ReactNode; label: string; value: string; sub?: string; privateValue?: boolean }) {
  return (
    <div className="rounded-lg border border-border/40 bg-card p-5">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs uppercase tracking-[0.2em]">{label}</span>
        <span className="text-gold">{icon}</span>
      </div>
      <div className="mt-3 font-display text-2xl text-foreground">
        {privateValue ? <Private>{value}</Private> : value}
      </div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{privateValue ? <Private>{sub}</Private> : sub}</div>}
    </div>
  );
}

function Pill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    financing: { label: "Financing", cls: "border-gold/50 text-gold" },
    owned_outright: { label: "Owned", cls: "border-emerald-500/50 text-emerald-400" },
    sold: { label: "Sold", cls: "border-muted-foreground/40 text-muted-foreground" },
  };
  const s = map[status] ?? { label: status, cls: "border-border" };
  return <span className={`rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-wider ${s.cls}`}>{s.label}</span>;
}

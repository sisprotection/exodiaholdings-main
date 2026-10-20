import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, ArrowUpRight, CalendarClock, Home, Layers, TrendingUp, Wallet } from "lucide-react";
import { Crest } from "@/components/Crest";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Exodia Holdings — Command Deck" },
      { name: "description", content: "A private command deck for Exodia Holdings." },
    ],
  }),
  component: DemoDashboard,
});

const holdings = [
  { name: "The Ashford Residence", location: "Austin, TX", className: "Residential", status: "Financing", remaining: "$412,800", progress: 38 },
  { name: "Crown & Commerce", location: "Dallas, TX", className: "Commercial", status: "Owned", remaining: "$0", progress: 100 },
  { name: "Northstar Acreage", location: "Bastrop County, TX", className: "Land", status: "Financing", remaining: "$186,400", progress: 61 },
];

function DemoDashboard() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-background/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <Crest size={42} />
            <div>
              <div className="font-display text-xl tracking-wide text-gold-soft">Exodia Holdings</div>
              <div className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Private command deck</div>
            </div>
          </div>
          <div className="hidden items-center gap-6 text-xs uppercase tracking-[0.18em] text-muted-foreground md:flex">
            <span className="text-gold">Overview</span><span>Properties</span><span>Ledger</span>
          </div>
          <span className="rounded-full border border-gold/40 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-gold">Demo mode</span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Command Deck</p>
            <h1 className="mt-2 font-display text-5xl text-gold-soft">Holdings Overview</h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">Every asset, every dollar, every projection — under one crown.</p>
          </div>
          <Link to="/privacy" className="inline-flex items-center gap-2 rounded-md bg-gold px-4 py-3 text-xs uppercase tracking-[0.18em] text-primary-foreground transition hover:gold-glow">
            View secure access <ArrowUpRight className="size-4" />
          </Link>
        </div>
        <div className="gold-rule mt-7 w-full" />

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={<Home />} label="Holdings" value="3" detail="2 financing · 1 owned" />
          <Stat icon={<Wallet />} label="Total Owed" value="$1.42M" detail="across all holdings" />
          <Stat icon={<TrendingUp />} label="Paid So Far" value="$884K" detail="$599K remaining" />
          <Stat icon={<CalendarClock />} label="Next Payoff" value="Oct 2027" detail="earliest projected" />
        </div>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-lg border border-border/40 bg-card p-6">
            <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 font-display text-2xl text-gold-soft"><Activity className="size-5 text-gold" /> Capital Flow</h2><span className="text-[10px] uppercase tracking-wider text-muted-foreground">24 payments logged</span></div>
            <p className="mt-1 text-xs text-muted-foreground">Cumulative actual payments across every holding.</p>
            <div className="mt-7 flex h-56 items-end gap-3 border-b border-border/60 px-2 pb-0 sm:gap-5">
              {[28, 38, 43, 55, 62, 70, 78, 88, 96].map((height, index) => <div key={index} className="group relative flex-1"><div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground opacity-0 transition group-hover:opacity-100">${index + 3}0k</div><div className="h-full rounded-t-sm bg-gradient-to-t from-gold/20 to-gold" style={{ height: `${height}%` }} /></div>)}
            </div>
            <div className="mt-3 flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground"><span>Jan 24</span><span>Oct 26</span></div>
          </div>
          <div className="rounded-lg border border-border/40 bg-card p-6"><h2 className="flex items-center gap-2 font-display text-2xl text-gold-soft"><Layers className="size-5 text-gold" /> Asset Classes</h2><p className="mt-1 text-xs text-muted-foreground">By total owed.</p><div className="mt-7 flex items-center justify-center"><div className="relative size-44 rounded-full" style={{ background: "conic-gradient(var(--gold) 0 54%, #f0d78c 54% 78%, #9b7d2e 78% 100%)" }}><div className="absolute inset-7 flex items-center justify-center rounded-full bg-card text-center"><span><strong className="block font-display text-2xl text-gold-soft">$1.42M</strong><small className="text-[10px] uppercase tracking-wider text-muted-foreground">total owed</small></span></div></div></div><div className="mt-6 flex justify-center gap-4 text-[10px] text-muted-foreground"><span><i className="mr-1 inline-block size-2 rounded-full bg-gold" />Residential</span><span><i className="mr-1 inline-block size-2 rounded-full bg-[#f0d78c]" />Commercial</span><span><i className="mr-1 inline-block size-2 rounded-full bg-[#9b7d2e]" />Land</span></div></div>
        </section>

        <section className="mt-10"><div className="flex items-center justify-between"><h2 className="font-display text-2xl text-gold-soft">Recent Holdings</h2><span className="text-xs uppercase tracking-wider text-muted-foreground">Showing demo data</span></div><div className="mt-4 grid gap-3">{holdings.map((holding) => <div key={holding.name} className="rounded-lg border border-border/40 bg-card p-5 transition hover:border-gold/60"><div className="flex flex-wrap items-center justify-between gap-4"><div><div className="font-display text-xl text-gold-soft">{holding.name}</div><div className="text-xs text-muted-foreground">{holding.location}</div><div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{holding.className}</div></div><div className="flex items-center gap-6 text-sm"><span className="rounded-full border border-gold/50 px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-gold">{holding.status}</span><div className="text-right"><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Remaining</div><div className="font-display text-lg text-gold">{holding.remaining}</div></div></div></div><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-gold" style={{ width: `${holding.progress}%` }} /></div></div>)}</div></section>
      </main>
      <Footer />
    </div>
  );
}

function Stat({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return <div className="rounded-lg border border-border/40 bg-card p-5"><div className="flex items-center justify-between text-muted-foreground"><span className="text-xs uppercase tracking-[0.2em]">{label}</span><span className="text-gold">{icon}</span></div><div className="mt-3 font-display text-2xl text-foreground">{value}</div><div className="mt-1 text-xs text-muted-foreground">{detail}</div></div>;
}

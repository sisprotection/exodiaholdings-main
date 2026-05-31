import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRoleFlags } from "@/hooks/useRole";
import { toast } from "sonner";
import { LifeBuoy, Send, AlertCircle, CheckCircle2, Clock, PauseCircle, PlayCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/support")({
  head: () => ({ meta: [{ title: "Support — Exodia Holdings" }] }),
  component: SupportPage,
});

type Priority = "low" | "normal" | "high" | "urgent";
type Status = "open" | "in_progress" | "waiting" | "resolved" | "closed";

const STATUS_META: Record<Status, { label: string; color: string; icon: React.ReactNode }> = {
  open:         { label: "Open",        color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40", icon: <PlayCircle className="size-3" /> },
  in_progress:  { label: "In Progress", color: "bg-amber-400/20 text-amber-200 border-amber-400/40",       icon: <Clock className="size-3" /> },
  waiting:      { label: "Waiting",     color: "bg-sky-400/20 text-sky-200 border-sky-400/40",             icon: <PauseCircle className="size-3" /> },
  resolved:     { label: "Resolved",    color: "bg-foreground/10 text-muted-foreground border-border",     icon: <CheckCircle2 className="size-3" /> },
  closed:       { label: "Closed",      color: "bg-foreground/5 text-muted-foreground border-border",      icon: <CheckCircle2 className="size-3" /> },
};

const PRIORITY_DOT: Record<Priority, string> = {
  low:    "bg-muted-foreground/40",
  normal: "bg-emerald-400",
  high:   "bg-amber-400 shadow-[0_0_6px_1px_rgba(251,191,36,0.6)]",
  urgent: "bg-rose-500 shadow-[0_0_6px_2px_rgba(244,63,94,0.7)] animate-pulse",
};

function SupportPage() {
  const qc = useQueryClient();
  const { isBoard } = useRoleFlags();
  const [filter, setFilter] = useState<"mine" | "all">(isBoard ? "all" : "mine");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [area, setArea] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [busy, setBusy] = useState(false);

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["support-tickets", filter, isBoard],
    queryFn: async () => {
      let q = supabase
        .from("support_tickets")
        .select("id, user_id, subject, body, area, priority, status, resolution_note, created_at, updated_at")
        .order("created_at", { ascending: false });
      if (filter === "mine") {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) q = q.eq("user_id", user.id);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) { toast.error("Subject and details required"); return; }
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBusy(false); toast.error("Sign in required"); return; }
    const { error } = await supabase.from("support_tickets").insert({
      user_id: user.id,
      subject: subject.trim(),
      body: body.trim(),
      area: area.trim() || null,
      priority,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Ticket submitted — we'll get on it.");
    setSubject(""); setBody(""); setArea(""); setPriority("normal");
    qc.invalidateQueries({ queryKey: ["support-tickets"] });
    qc.invalidateQueries({ queryKey: ["tickets-indicator"] });
  };

  const updateStatus = async (id: string, status: Status) => {
    const { error } = await supabase.from("support_tickets").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["support-tickets"] });
    qc.invalidateQueries({ queryKey: ["tickets-indicator"] });
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Help Desk</p>
          <h1 className="mt-2 flex items-center gap-2 font-display text-3xl text-gold-soft sm:text-4xl">
            <LifeBuoy className="size-7 text-gold" /> Support Tickets
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Submit an issue. The light indicator on the header tells the board when something needs attention.
          </p>
        </div>
        {isBoard && (
          <div className="inline-flex rounded-md border border-border/60 p-0.5 text-xs">
            <button onClick={() => setFilter("all")}  className={`px-3 py-1.5 rounded ${filter==="all"?"bg-gold text-primary-foreground":"text-muted-foreground"}`}>All</button>
            <button onClick={() => setFilter("mine")} className={`px-3 py-1.5 rounded ${filter==="mine"?"bg-gold text-primary-foreground":"text-muted-foreground"}`}>Mine</button>
          </div>
        )}
      </div>
      <div className="gold-rule mt-5 w-full" />

      {isBoard && (
        <div className="mt-6 rounded-lg border border-gold/30 bg-gold/5 p-4 text-xs text-muted-foreground">
          <p className="mb-2 font-display text-sm text-gold-soft">Tech Department — Status Color Guide</p>
          <p className="mb-3">Change a ticket's status using the buttons on each card. The header light updates everywhere in real time so the whole team sees progress.</p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(STATUS_META) as Status[]).map((s) => (
              <span key={s} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${STATUS_META[s].color}`}>
                {STATUS_META[s].icon} {STATUS_META[s].label}
              </span>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-[10px] uppercase tracking-wider">
            <span className="inline-flex items-center gap-1"><span className="inline-block size-2 rounded-full bg-rose-500 shadow-[0_0_6px_2px_rgba(244,63,94,0.7)]" /> Header light = urgent open</span>
            <span className="inline-flex items-center gap-1"><span className="inline-block size-2 rounded-full bg-amber-400 shadow-[0_0_6px_1px_rgba(251,191,36,0.6)]" /> = high priority</span>
            <span className="inline-flex items-center gap-1"><span className="inline-block size-2 rounded-full bg-emerald-400" /> = normal open</span>
            <span className="inline-flex items-center gap-1"><span className="inline-block size-2 rounded-full bg-muted-foreground/40" /> = all clear</span>
          </div>
        </div>
      )}

      {/* New ticket form */}
      <form onSubmit={submit} className="mt-6 grid gap-3 rounded-lg border border-border/40 bg-card p-4 sm:p-5">
        <h2 className="font-display text-lg text-gold-soft">Open a new ticket</h2>
        <input value={subject} onChange={(e)=>setSubject(e.target.value)} required maxLength={200}
          placeholder="Short subject (e.g. Can't upload a photo)"
          className="rounded-md border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-gold" />
        <textarea value={body} onChange={(e)=>setBody(e.target.value)} required maxLength={4000} rows={4}
          placeholder="What's happening? When did it start? Any error messages?"
          className="rounded-md border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-gold" />
        <div className="grid gap-3 sm:grid-cols-2">
          <input value={area} onChange={(e)=>setArea(e.target.value)} maxLength={80}
            placeholder="Where in the app? (optional)"
            className="rounded-md border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-gold" />
          <select value={priority} onChange={(e)=>setPriority(e.target.value as Priority)}
            className="rounded-md border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-gold">
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <div className="flex justify-end">
          <button disabled={busy} className="inline-flex items-center gap-1.5 rounded-md bg-gold px-4 py-2.5 text-xs uppercase tracking-wider text-primary-foreground hover:gold-glow disabled:opacity-50">
            <Send className="size-3.5" /> {busy ? "Submitting…" : "Submit Ticket"}
          </button>
        </div>
      </form>

      {/* Ticket list */}
      <div className="mt-8 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading tickets…</p>}
        {!isLoading && tickets.length === 0 && (
          <div className="rounded-lg border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
            No tickets {filter==="mine"?"from you":""} yet. All clear.
          </div>
        )}
        {tickets.map((t) => {
          const meta = STATUS_META[t.status as Status];
          return (
            <article key={t.id} className="rounded-lg border border-border/40 bg-card p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-block size-2.5 rounded-full ${PRIORITY_DOT[t.priority as Priority]}`} title={`Priority: ${t.priority}`} />
                    <h3 className="font-display text-lg text-gold-soft">{t.subject}</h3>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${meta.color}`}>
                      {meta.icon} {meta.label}
                    </span>
                    {t.area && <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground">{t.area}</span>}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">{t.body}</p>
                  <p className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {new Date(t.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              {isBoard && t.status !== "closed" && (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-border/40 pt-3">
                  {(["open","in_progress","waiting","resolved","closed"] as Status[])
                    .filter((s) => s !== t.status)
                    .map((s) => (
                      <button key={s} onClick={() => updateStatus(t.id, s)}
                        className="inline-flex items-center gap-1 rounded-md border border-border/60 px-2.5 py-1 text-[10px] uppercase tracking-wider text-muted-foreground hover:border-gold hover:text-gold">
                        <AlertCircle className="size-3" /> Mark {STATUS_META[s].label}
                      </button>
                    ))}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LEGACY_QUOTES } from "@/lib/legacy";
import { getTrustDetails } from "@/lib/legacy.functions";
import { Crest } from "@/components/Crest";
import { useIsOwner } from "@/hooks/useRole";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/legacy")({
  head: () => ({ meta: [{ title: "Legacy — Exodia Holdings" }] }),
  component: LegacyPage,
});

function LegacyPage() {
  const { isOwner, isLoading: roleLoading } = useIsOwner();
  if (roleLoading) {
    return <div className="mx-auto max-w-3xl px-6 py-16 text-center text-muted-foreground">Loading…</div>;
  }
  return isOwner ? <OwnerLegacy /> : <MemberLegacy />;
}

/* -------- OWNER (Domenick) — original hardcoded dedication -------- */
function OwnerLegacy() {
  const fetchTrust = useServerFn(getTrustDetails);
  const { data: trust, isLoading } = useQuery({ queryKey: ["trust"], queryFn: () => fetchTrust() });

  if (isLoading || !trust) {
    return <div className="mx-auto max-w-3xl px-6 py-16 text-center text-muted-foreground">Loading…</div>;
  }
  const { beneficiary, grantor } = trust;
  const dob = new Date(beneficiary.dobIso);
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="flex flex-col items-center text-center">
        <Crest size={72} />
        <p className="mt-6 text-xs uppercase tracking-[0.4em] text-muted-foreground">The Dedication</p>
        <h1 className="mt-3 font-display text-5xl text-gold-soft">Held in Trust</h1>
        <div className="gold-rule mx-auto mt-4 w-24" />
      </div>

      <div className="mt-12 rounded-lg border border-gold/30 bg-card p-8 gold-glow">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Beneficiary</p>
        <h2 className="mt-2 font-display text-3xl text-gold">{beneficiary.full}</h2>
        <p className="mt-1 text-muted-foreground">{beneficiary.relationship}</p>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <Row label="Date of Birth" value={dob.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} />
          <Row label="Grantor" value={grantor.full} />
          <Row label="First Name" value={beneficiary.first} />
          <Row label="Middle Name" value={beneficiary.middle} />
          <Row label="Last Name" value={beneficiary.last} />
          <Row label="Status" value="Sole Beneficiary" />
        </dl>
      </div>

      <div className="mt-8 rounded-lg border border-border/40 bg-card p-8">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Letter of Intent</p>
        <p className="mt-4 font-display text-xl leading-relaxed text-gold-soft">
          Every property recorded in this archive, every dollar tracked toward payoff, and every line of code that holds this system together is built and maintained in trust for my daughter, {beneficiary.full}.
        </p>
        <p className="mt-4 leading-relaxed text-muted-foreground">
          Upon succession, full ownership of the holdings catalogued herein, along with administrative access to this system via her own credentials, transfers to her. Until that day, this work continues — every payment a brick in her foundation.
        </p>
        <p className="mt-6 font-display text-lg text-gold">— {grantor.full}</p>
      </div>

      <FounderLetterCard />

      <div className="mt-8 rounded-lg border border-border/40 bg-card p-8">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">The Quotes</p>
        <h3 className="mt-2 font-display text-2xl text-gold-soft">She tells me to keep going.</h3>
        <ul className="mt-6 space-y-3">
          {LEGACY_QUOTES.map((q, i) => (
            <li key={i} className="flex gap-3 border-l-2 border-gold/50 pl-4">
              <span className="font-display text-base italic text-gold-soft">"{q}"</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-12 text-center text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
        Exodia Holdings · {grantor.full}, Grantor · {beneficiary.full}, Beneficiary
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-base">{value}</dd>
    </div>
  );
}

function FounderLetterCard() {
  const { data: url } = useQuery({
    queryKey: ["founder-letter-url"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .storage
        .from("legacy-docs")
        .createSignedUrl(`${user.id}/founder-letter.pdf`, 60 * 30);
      if (error) return null;
      return data.signedUrl;
    },
  });

  return (
    <div className="mt-8 rounded-lg border border-gold/40 bg-card p-8 gold-glow">
      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">President's Archive</p>
      <h3 className="mt-2 font-display text-2xl text-gold">Hall Family Legacy Trust — Founder's Document</h3>
      <p className="mt-3 text-sm text-muted-foreground">
        Sealed May 16, 2026 · Domenick Arlon Hall, Founder. Private to the President. Stored in an encrypted, owner-only vault.
      </p>
      {url ? (
        <div className="mt-6 space-y-4">
          <object data={url} type="application/pdf" className="h-[720px] w-full rounded-md border border-border/40">
            <p className="p-4 text-sm text-muted-foreground">
              Your browser cannot display the PDF inline.{" "}
              <a href={url} target="_blank" rel="noreferrer" className="text-gold underline">Open it in a new tab</a>.
            </p>
          </object>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-gold px-4 py-2 text-xs uppercase tracking-wider text-gold hover:bg-gold hover:text-primary-foreground transition-colors"
          >
            Open / Download
          </a>
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">Loading sealed document…</p>
      )}
    </div>
  );
}

type Beneficiary = {
  id: string;
  full_name: string;
  dob: string | null;
  relationship: string | null;
  share_percent: number;
  notes: string | null;
};

function MemberLegacy() {
  const qc = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, letter_of_intent")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: beneficiaries = [], isLoading } = useQuery<Beneficiary[]>({
    queryKey: ["my-beneficiaries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beneficiaries")
        .select("id, full_name, dob, relationship, share_percent, notes")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as Beneficiary[];
    },
  });

  const [letter, setLetter] = useState<string | null>(null);
  const effectiveLetter = letter ?? profile?.letter_of_intent ?? "";

  const saveLetter = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ letter_of_intent: effectiveLetter }).eq("id", user.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Letter of intent saved");
    qc.invalidateQueries({ queryKey: ["my-profile"] });
  };

  const addBeneficiary = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const payload = {
      user_id: user.id,
      full_name: String(fd.get("full_name") || "").trim(),
      dob: (fd.get("dob") as string) || null,
      relationship: (fd.get("relationship") as string) || null,
      share_percent: Number(fd.get("share_percent") || 0),
      gender: ((fd.get("gender") as string) || "unspecified") as "female" | "male" | "other" | "unspecified",
      notes: (fd.get("notes") as string) || null,
      sort_order: beneficiaries.length,
    };
    if (!payload.full_name) { toast.error("Name required"); return; }
    const { error } = await supabase.from("beneficiaries").insert(payload);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["my-beneficiaries"] });
    (e.target as HTMLFormElement).reset();
    toast.success("Beneficiary added");
  };

  const removeBeneficiary = async (id: string) => {
    const { error } = await supabase.from("beneficiaries").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["my-beneficiaries"] });
  };

  const totalShare = beneficiaries.reduce((a, b) => a + Number(b.share_percent || 0), 0);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="flex flex-col items-center text-center">
        <Crest size={72} />
        <p className="mt-6 text-xs uppercase tracking-[0.4em] text-muted-foreground">Your Trust</p>
        <h1 className="mt-3 font-display text-5xl text-gold-soft">Held in Trust</h1>
        <div className="gold-rule mx-auto mt-4 w-24" />
        <p className="mt-4 max-w-md text-sm text-muted-foreground">
          Document who inherits, in what share, and why. Private to your account.
        </p>
      </div>

      {/* Beneficiaries */}
      <section className="mt-12 rounded-lg border border-gold/30 bg-card p-8 gold-glow">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Beneficiaries</p>
            <h2 className="mt-1 font-display text-2xl text-gold">Held In Trust For</h2>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Share</p>
            <p className={`font-display text-xl ${totalShare === 100 ? "text-gold" : "text-destructive"}`}>
              {totalShare.toFixed(2)}%
            </p>
            {totalShare !== 100 && (
              <p className="text-[10px] text-muted-foreground">Should sum to 100%</p>
            )}
          </div>
        </div>

        {isLoading ? (
          <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
        ) : beneficiaries.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">No beneficiaries yet. Add the first below.</p>
        ) : (
          <ul className="mt-6 divide-y divide-border/40 rounded-md border border-border/40">
            {beneficiaries.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-lg text-gold-soft">{b.full_name}</span>
                    {b.relationship && <span className="rounded-full border border-gold/30 px-2 py-0.5 text-[10px] uppercase tracking-wider text-gold">{b.relationship}</span>}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {b.dob ? new Date(b.dob).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "DOB not set"}
                    {b.notes && <span className="ml-2">· {b.notes}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-display text-xl text-gold">{Number(b.share_percent).toFixed(2)}%</span>
                  <button onClick={() => removeBeneficiary(b.id)} className="rounded p-1.5 text-muted-foreground hover:text-destructive">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={addBeneficiary} className="mt-6 grid gap-3 rounded-md border border-dashed border-border/60 bg-background/50 p-4 sm:grid-cols-5">
          <input name="full_name" required placeholder="Full name" className="rounded-md border border-border bg-background px-3 py-2 text-sm sm:col-span-2" />
          <input name="dob" type="date" className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <input name="relationship" placeholder="Relationship" className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <select name="gender" defaultValue="unspecified" className="rounded-md border border-border bg-background px-3 py-2 text-sm">
            <option value="unspecified">Pronoun…</option>
            <option value="female">She</option>
            <option value="male">He</option>
            <option value="other">They</option>
          </select>
          <input name="share_percent" type="number" step="0.01" min="0" max="100" placeholder="% share" required className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <input name="notes" placeholder="Notes (optional)" className="rounded-md border border-border bg-background px-3 py-2 text-sm sm:col-span-4" />
          <button className="inline-flex items-center justify-center gap-1.5 rounded-md bg-gold px-3 py-2 text-xs uppercase tracking-wider text-primary-foreground hover:gold-glow">
            <Plus className="size-3.5" /> Add
          </button>
        </form>
      </section>

      {/* Letter of Intent */}
      <section className="mt-8 rounded-lg border border-border/40 bg-card p-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Letter of Intent</p>
            <h2 className="mt-1 font-display text-2xl text-gold-soft">In Your Own Words</h2>
          </div>
          <button onClick={saveLetter} className="inline-flex items-center gap-1.5 rounded-md bg-gold px-4 py-2 text-xs uppercase tracking-wider text-primary-foreground hover:gold-glow">
            <Save className="size-3.5" /> Save
          </button>
        </div>
        <textarea
          value={effectiveLetter}
          onChange={(e) => setLetter(e.target.value)}
          rows={12}
          placeholder="Why this trust exists. What you want preserved. What guidance you leave behind…"
          className="mt-4 w-full rounded-md border border-border bg-background px-4 py-3 text-sm leading-relaxed outline-none focus:border-gold"
        />
      </section>

      <p className="mt-12 text-center text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
        Exodia Holdings · Private to {profile?.full_name ?? "your account"}
      </p>
    </div>
  );
}

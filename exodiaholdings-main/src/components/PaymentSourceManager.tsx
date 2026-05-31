import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CreditCard, Banknote, Briefcase, Building2, Wallet, Trash2, Plus, Lock } from "lucide-react";
import {
  listPaymentSources,
  createPaymentSource,
  deletePaymentSource,
} from "@/lib/paymentSources.functions";

const KIND_OPTIONS: [string, string, React.ReactNode][] = [
  ["card", "Credit / Debit Card", <CreditCard key="c" className="size-4" />],
  ["bank", "Bank Account", <Banknote key="b" className="size-4" />],
  ["gig", "Side Gig / Hustle", <Briefcase key="g" className="size-4" />],
  ["employer", "Employer / W-2", <Building2 key="e" className="size-4" />],
  ["company", "Company / LLC", <Building2 key="co" className="size-4" />],
  ["cash", "Cash", <Wallet key="ca" className="size-4" />],
  ["other", "Other", <Wallet key="o" className="size-4" />],
];

function detectBrand(num: string): string | null {
  const n = num.replace(/\D/g, "");
  if (/^4/.test(n)) return "Visa";
  if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return "Mastercard";
  if (/^3[47]/.test(n)) return "Amex";
  if (/^6(?:011|5)/.test(n)) return "Discover";
  return null;
}

export function PaymentSourceManager() {
  const qc = useQueryClient();
  const list = useServerFn(listPaymentSources);
  const create = useServerFn(createPaymentSource);
  const remove = useServerFn(deletePaymentSource);

  const { data: sources = [], isLoading } = useQuery({
    queryKey: ["payment-sources"],
    queryFn: () => list(),
  });

  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState("card");
  const [label, setLabel] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const cleanCard = cardNumber.replace(/\D/g, "");
  const brand = detectBrand(cleanCard);
  const last4 = cleanCard.slice(-4);
  const cleanAcct = accountNumber.replace(/\D/g, "");
  const acctLast4 = cleanAcct.slice(-4);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    setBusy(true);
    try {
      await create({
        data: {
          kind: kind as any,
          label: label.trim(),
          brand: kind === "card" ? brand : null,
          last4: kind === "card" ? last4 || null : kind === "bank" ? acctLast4 || null : null,
          notes: notes.trim() || null,
        },
      });
      toast.success("Source added — full number was never sent or stored");
      setLabel(""); setCardNumber(""); setAccountNumber(""); setNotes("");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["payment-sources"] });
      qc.invalidateQueries({ queryKey: ["funding-analytics"] });
    } catch (err: any) {
      toast.error(err?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };

  const del = async (id: string) => {
    if (!confirm("Delete this source? Holdings funded by it will be unassigned.")) return;
    await remove({ data: { id } });
    qc.invalidateQueries({ queryKey: ["payment-sources"] });
  };

  return (
    <section className="rounded-lg border border-border/40 bg-card p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl text-gold-soft">Payment Sources</h2>
        <button
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-md border border-gold/50 px-3 py-2 text-xs uppercase tracking-wider text-gold hover:bg-gold/10"
        >
          <Plus className="size-3.5" /> Add Source
        </button>
      </div>
      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="size-3 text-gold" />
        Card and account numbers are NEVER sent or stored. Only the last four digits are kept for display.
      </p>

      {open && (
        <form onSubmit={submit} className="mt-5 grid gap-3 rounded-md border border-gold/30 bg-background/40 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-muted-foreground">Source Type</label>
              <select value={kind} onChange={(e) => setKind(e.target.value)} className="w-full rounded-md border border-border bg-card px-4 py-3">
                {KIND_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-muted-foreground">Label (e.g. "Chase Sapphire", "Uber gigs")</label>
              <input value={label} onChange={(e) => setLabel(e.target.value)} required maxLength={120} className="w-full rounded-md border border-border bg-card px-4 py-3" />
            </div>
          </div>

          {kind === "card" && (
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-muted-foreground">Card Number (masked after typing)</label>
              <MaskedSecretInput value={cardNumber} onChange={setCardNumber} placeholder="•••• •••• •••• ••••" />
              <p className="mt-1 text-[10px] text-muted-foreground">
                {brand ? `Detected: ${brand}` : "Auto-detects Visa / Mastercard / Amex / Discover"}
                {last4 && ` · stored as •••• ${last4}`}
              </p>
            </div>
          )}

          {kind === "bank" && (
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-muted-foreground">Account Number (masked)</label>
              <MaskedSecretInput value={accountNumber} onChange={setAccountNumber} placeholder="••••••••" />
              {acctLast4 && <p className="mt-1 text-[10px] text-muted-foreground">stored as •••• {acctLast4}</p>}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-muted-foreground">Notes (optional)</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} className="w-full rounded-md border border-border bg-card px-4 py-3" />
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-border px-4 py-2 text-xs uppercase tracking-wider">Cancel</button>
            <button disabled={busy} className="rounded-md bg-gold px-6 py-2 text-xs uppercase tracking-wider text-primary-foreground disabled:opacity-50">
              {busy ? "Saving…" : "Save Source"}
            </button>
          </div>
        </form>
      )}

      <ul className="mt-5 space-y-2">
        {isLoading && <li className="text-sm text-muted-foreground">Loading…</li>}
        {!isLoading && sources.length === 0 && (
          <li className="rounded-md border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
            No sources yet. Add a card, bank, side gig, employer, or company to track what's funding each holding.
          </li>
        )}
        {sources.map((s) => {
          const opt = KIND_OPTIONS.find(([v]) => v === s.kind);
          return (
            <li key={s.id} className="flex items-center justify-between gap-3 rounded-md border border-border/40 bg-background/40 p-3">
              <div className="flex items-center gap-3">
                <span className="text-gold">{opt?.[2]}</span>
                <div>
                  <div className="text-sm">
                    {s.label}
                    {s.brand && <span className="ml-2 text-xs text-muted-foreground">{s.brand}</span>}
                    {s.last4 && <span className="ml-2 font-mono text-xs text-muted-foreground">•••• {s.last4}</span>}
                  </div>
                  {s.notes && <div className="text-[10px] text-muted-foreground">{s.notes}</div>}
                </div>
              </div>
              <button onClick={() => del(s.id)} className="rounded p-1.5 text-muted-foreground hover:text-destructive" title="Delete">
                <Trash2 className="size-3.5" />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function MaskedSecretInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [focused, setFocused] = useState(false);
  const clean = value.replace(/\D/g, "");
  const display = focused
    ? clean.replace(/(\d{4})(?=\d)/g, "$1 ")
    : clean.length > 4
      ? `${"•".repeat(clean.length - 4).replace(/(.{4})/g, "$1 ")}${clean.slice(-4)}`
      : "•".repeat(clean.length);
  return (
    <input
      inputMode="numeric"
      autoComplete="off"
      spellCheck={false}
      value={display}
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 19))}
      className="w-full rounded-md border border-border bg-card px-4 py-3 font-mono tracking-wider"
    />
  );
}

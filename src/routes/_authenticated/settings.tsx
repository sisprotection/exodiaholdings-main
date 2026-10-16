import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Download, Trash2, Shield, FileJson, FileSpreadsheet, ScrollText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Crest } from "@/components/Crest";
import { PaymentSourceManager } from "@/components/PaymentSourceManager";
import { exportMyData, deleteMyAccount } from "@/lib/account.functions";
import { openCertificate } from "@/lib/certificate";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Exodia Holdings" }] }),
  component: Settings,
});

function toCSV(rows: any[]): string {
  if (!rows || rows.length === 0) return "";
  const keys = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const esc = (v: any) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  return [keys.join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join("\n");
}

function Settings() {
  const navigate = useNavigate();
  const exportFn = useServerFn(exportMyData);
  const deleteFn = useServerFn(deleteMyAccount);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState<"export-json" | "export-csv" | "delete" | null>(null);

  const printAgreement = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    let name = user?.email ?? "Member";
    if (user) {
      const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
      if (prof?.full_name) name = prof.full_name;
    }
    openCertificate({ kind: "agreement", recipientName: name });
  };

  const downloadJSON = async () => {
    setBusy("export-json");
    try {
      const data = await exportFn();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      triggerDownload(blob, `exodia-export-${new Date().toISOString().slice(0, 10)}.json`);
      toast.success("Your data export is downloading");
    } catch (e: any) { toast.error(e?.message ?? "Export failed"); }
    finally { setBusy(null); }
  };

  const downloadCSV = async () => {
    setBusy("export-csv");
    try {
      const data: any = await exportFn();
      const sections = [
        ["properties.csv", data.properties],
        ["payments.csv", data.payments],
        ["payment_sources.csv", data.payment_sources],
        ["beneficiaries.csv", data.beneficiaries],
        ["vault_metadata.csv", data.vault_items_metadata],
        ["tickets.csv", data.support_tickets],
      ];
      for (const [name, rows] of sections) {
        if (!rows || rows.length === 0) continue;
        const csv = toCSV(rows as any[]);
        triggerDownload(new Blob([csv], { type: "text/csv" }), `exodia-${name}`);
      }
      toast.success("CSV files downloading");
    } catch (e: any) { toast.error(e?.message ?? "Export failed"); }
    finally { setBusy(null); }
  };

  const purge = async () => {
    if (confirmText !== "DELETE EVERYTHING") {
      toast.error("Type DELETE EVERYTHING exactly to confirm");
      return;
    }
    setBusy("delete");
    try {
      await deleteFn();
      await supabase.auth.signOut();
      toast.success("Account purged. Goodbye.");
      navigate({ to: "/" });
    } catch (e: any) { toast.error(e?.message ?? "Delete failed"); }
    finally { setBusy(null); }
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Account</p>
      <h1 className="mt-2 font-display text-4xl text-gold-soft">Settings</h1>
      <div className="gold-rule mt-6 w-full" />

      {/* Your data is yours badge */}
      <section className="mt-8 rounded-lg border border-gold/50 bg-gradient-to-br from-gold/5 via-transparent to-transparent p-6 gold-glow">
        <div className="flex items-start gap-4">
          <Crest size={56} />
          <div>
            <h2 className="font-display text-2xl text-gold-soft flex items-center gap-2">
              <Shield className="size-5 text-gold" /> Your Data Is Yours
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Exodia Holdings cannot read your encrypted Cabinet (vault) — your passphrase
              never leaves your device. Card and account numbers are never transmitted; only the
              last four digits are kept for display. You may export everything you've entered, or
              purge your account permanently, at any time.
            </p>
          </div>
        </div>
      </section>

      {/* Account Agreement Certificate */}
      <section className="mt-8 rounded-lg border border-gold/40 bg-card p-6">
        <h2 className="font-display text-2xl text-gold-soft flex items-center gap-2">
          <ScrollText className="size-5 text-gold" /> My Account Agreement Certificate
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A signed certificate acknowledging your registration with Exodia Holdings and our privacy promise.
          Issued under the seal and signed by the Office of the President.
        </p>
        <button onClick={printAgreement} className="mt-4 inline-flex items-center gap-2 rounded-md border border-gold/50 px-4 py-2.5 text-sm uppercase tracking-wider text-gold hover:bg-gold/10">
          <ScrollText className="size-4" /> Download Certificate
        </button>
      </section>

      {/* Payment sources */}
      <div className="mt-8">
        <PaymentSourceManager />
      </div>

      {/* Export */}
      <section className="mt-8 rounded-lg border border-border/40 bg-card p-6">
        <h2 className="font-display text-2xl text-gold-soft flex items-center gap-2">
          <Download className="size-5 text-gold" /> Export My Data
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Download a complete copy of every record tied to your account.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button onClick={downloadJSON} disabled={busy !== null} className="inline-flex items-center gap-2 rounded-md border border-gold/50 px-4 py-2.5 text-sm uppercase tracking-wider text-gold hover:bg-gold/10 disabled:opacity-50">
            <FileJson className="size-4" /> {busy === "export-json" ? "Preparing…" : "Download JSON"}
          </button>
          <button onClick={downloadCSV} disabled={busy !== null} className="inline-flex items-center gap-2 rounded-md border border-gold/50 px-4 py-2.5 text-sm uppercase tracking-wider text-gold hover:bg-gold/10 disabled:opacity-50">
            <FileSpreadsheet className="size-4" /> {busy === "export-csv" ? "Preparing…" : "Download CSV (per table)"}
          </button>
        </div>
      </section>

      {/* Legal */}
      <section className="mt-8 rounded-lg border border-border/40 bg-card p-6">
        <h2 className="font-display text-2xl text-gold-soft">Legal</h2>
        <ul className="mt-3 space-y-1 text-sm">
          <li><a href="/privacy" className="text-gold hover:underline">Privacy Policy →</a></li>
          <li><a href="/terms" className="text-gold hover:underline">Terms of Service →</a></li>
        </ul>
      </section>

      {/* Danger zone */}
      <section className="mt-8 rounded-lg border border-destructive/40 bg-destructive/5 p-6">
        <h2 className="font-display text-2xl text-destructive flex items-center gap-2">
          <Trash2 className="size-5" /> Purge My Account
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Permanently deletes your profile, holdings, payments, vault, beneficiaries, tickets,
          and sign-in. This action cannot be undone.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type DELETE EVERYTHING"
            className="flex-1 rounded-md border border-destructive/40 bg-background px-3 py-2 text-sm"
          />
          <button
            onClick={purge}
            disabled={busy !== null || confirmText !== "DELETE EVERYTHING"}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-destructive px-5 py-2.5 text-sm uppercase tracking-wider text-destructive-foreground hover:opacity-90 disabled:opacity-30"
          >
            <Trash2 className="size-4" /> {busy === "delete" ? "Purging…" : "Purge Account"}
          </button>
        </div>
      </section>
    </div>
  );
}

function triggerDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

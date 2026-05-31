import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Lock, Unlock, Plus, Eye, EyeOff, Copy, Trash2, KeyRound, ShieldAlert } from "lucide-react";
import {
  unlockVault,
  isVaultUnlocked,
  getCachedKey,
  lockVault,
  encryptString,
  decryptString,
} from "@/lib/vaultCrypto";
import { RecoveryDialogButton, RecoverySetupCard } from "@/components/VaultRecovery";

export const Route = createFileRoute("/_authenticated/vault")({
  head: () => ({ meta: [{ title: "My Cabinet — Exodia Holdings" }] }),
  component: VaultPage,
});

type VaultRow = {
  id: string;
  cabinet: string;
  category: string;
  label: string;
  username: string | null;
  password_ciphertext: string | null;
  url: string | null;
  serial_number: string | null;
  location: string | null;
  notes: string | null;
  tags: string[] | null;
  created_at: string;
};

const CATEGORIES = ["login", "serial", "license", "api_key", "card", "wifi", "other"] as const;

function VaultPage() {
  const [unlocked, setUnlocked] = useState(isVaultUnlocked());

  if (!unlocked) return <UnlockGate onUnlocked={() => setUnlocked(true)} />;
  return <VaultContent onLock={() => { lockVault(); setUnlocked(false); }} />;
}

function UnlockGate({ onUnlocked }: { onUnlocked: () => void }) {
  const [passphrase, setPassphrase] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passphrase.length < 6) { toast.error("Passphrase must be at least 6 characters"); return; }
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      await unlockVault(passphrase, user.id);
      onUnlocked();
    } catch (err: any) {
      toast.error(err?.message ?? "Could not unlock");
    } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-lg px-6 py-20">
      <div className="rounded-lg border border-gold/40 bg-card p-8 gold-glow">
        <div className="flex items-center gap-3">
          <KeyRound className="size-6 text-gold" />
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Private Cabinet</p>
            <h1 className="font-display text-2xl text-gold-soft">Unlock Your Vault</h1>
          </div>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Your cabinet stores logins, serial numbers, license keys, Wi-Fi codes, and where each thing physically lives.
          Everything is encrypted in your browser with this passphrase. The server stores only ciphertext.
          <strong className="block mt-2 text-gold-soft">No one — not even the site owner — can read it without your passphrase.</strong>
        </p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <input
            type="password" autoFocus required value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="Vault passphrase"
            className="w-full rounded-md border border-border bg-background px-4 py-3 outline-none focus:border-gold"
          />
          <button disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-gold px-4 py-3 text-sm uppercase tracking-wider text-primary-foreground hover:gold-glow disabled:opacity-50">
            <Unlock className="size-4" /> {busy ? "Unlocking…" : "Unlock Vault"}
          </button>
        </form>
        <div className="mt-6 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-muted-foreground">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
          <p>If you forget this passphrase your encrypted entries are unrecoverable. Use the same passphrase every time, or write it down somewhere safe.</p>
        </div>
        <RecoveryDialogButton />
      </div>
    </div>
  );
}

function VaultContent({ onLock }: { onLock: () => void }) {
  const qc = useQueryClient();
  const key = getCachedKey()!;
  const [openAdd, setOpenAdd] = useState(false);
  const [filter, setFilter] = useState("");

  const { data: rows = [], isLoading } = useQuery<VaultRow[]>({
    queryKey: ["vault"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vault_items")
        .select("*")
        .order("cabinet")
        .order("label");
      if (error) throw error;
      return (data ?? []) as VaultRow[];
    },
  });

  const filtered = useMemo(() => {
    const q = filter.toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.label, r.cabinet, r.category, r.url, r.serial_number, r.location, r.username, r.notes]
        .filter(Boolean).join(" ").toLowerCase().includes(q),
    );
  }, [rows, filter]);

  const grouped = useMemo(() => {
    const g: Record<string, VaultRow[]> = {};
    filtered.forEach((r) => { (g[r.cabinet] ||= []).push(r); });
    return g;
  }, [filtered]);

  const remove = async (id: string) => {
    if (!confirm("Delete this entry permanently?")) return;
    const { error } = await supabase.from("vault_items").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["vault"] });
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Private Cabinet</p>
          <h1 className="mt-1 font-display text-4xl text-gold-soft">My Cabinet</h1>
          <p className="mt-1 text-sm text-muted-foreground">Encrypted in your browser · Not visible to admins or owners</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={filter} onChange={(e) => setFilter(e.target.value)}
            placeholder="Search…"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
          />
          <button onClick={() => setOpenAdd(true)} className="inline-flex items-center gap-1.5 rounded-md bg-gold px-3 py-2 text-xs uppercase tracking-wider text-primary-foreground hover:gold-glow">
            <Plus className="size-3.5" /> New Entry
          </button>
          <button onClick={onLock} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground hover:border-gold hover:text-gold">
            <Lock className="size-3.5" /> Lock
          </button>
        </div>
      </div>

      <div className="gold-rule mt-6 w-full" />

      {isLoading ? (
        <p className="mt-10 text-center text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="mt-10 rounded-lg border border-dashed border-border/60 p-10 text-center">
          <p className="font-display text-xl text-gold-soft">Your cabinet is empty</p>
          <p className="mt-2 text-sm text-muted-foreground">Add your first credential, serial number, or license key.</p>
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {Object.entries(grouped).map(([cab, items]) => (
            <section key={cab}>
              <h2 className="text-xs uppercase tracking-[0.3em] text-gold">{cab}</h2>
              <ul className="mt-3 divide-y divide-border/40 rounded-md border border-border/40">
                {items.map((r) => (
                  <VaultRowItem key={r.id} row={r} cryptoKey={key} onDelete={() => remove(r.id)} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <RecoverySetupCard />

      {openAdd && <AddEntryDialog cryptoKey={key} onClose={() => setOpenAdd(false)} />}
    </div>
  );
}

function VaultRowItem({ row, cryptoKey, onDelete }: { row: VaultRow; cryptoKey: CryptoKey; onDelete: () => void }) {
  const [show, setShow] = useState(false);
  const [plain, setPlain] = useState<string | null>(null);

  const reveal = async () => {
    if (plain === null && row.password_ciphertext) {
      setPlain(await decryptString(row.password_ciphertext, cryptoKey));
    }
    setShow((s) => !s);
  };

  const copyPassword = async () => {
    const txt = plain ?? (row.password_ciphertext ? await decryptString(row.password_ciphertext, cryptoKey) : "");
    setPlain(txt);
    await navigator.clipboard.writeText(txt);
    toast.success("Password copied");
  };

  return (
    <li className="grid gap-2 p-4 sm:grid-cols-[1fr_auto] sm:items-start">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-display text-lg text-gold-soft">{row.label}</span>
          <span className="rounded-full border border-gold/30 px-2 py-0.5 text-[10px] uppercase tracking-wider text-gold">
            {row.category}
          </span>
          {row.location && (
            <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              📍 {row.location}
            </span>
          )}
        </div>
        <dl className="mt-2 grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
          {row.username && <Field label="Username" value={row.username} copyable />}
          {row.url && <Field label="URL" value={row.url} copyable />}
          {row.serial_number && <Field label="Serial #" value={row.serial_number} copyable />}
          {row.password_ciphertext && (
            <div>
              <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">Password</dt>
              <dd className="mt-0.5 flex items-center gap-1.5">
                <span className="font-mono">{show ? (plain ?? "•••") : "••••••••"}</span>
                <button onClick={reveal} className="text-muted-foreground hover:text-gold">
                  {show ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
                <button onClick={copyPassword} className="text-muted-foreground hover:text-gold"><Copy className="size-3.5" /></button>
              </dd>
            </div>
          )}
          {row.notes && (
            <div className="sm:col-span-2">
              <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">Notes</dt>
              <dd className="mt-0.5 text-muted-foreground">{row.notes}</dd>
            </div>
          )}
        </dl>
      </div>
      <button onClick={onDelete} className="self-start rounded p-1.5 text-muted-foreground hover:text-destructive">
        <Trash2 className="size-4" />
      </button>
    </li>
  );
}

function Field({ label, value, copyable }: { label: string; value: string; copyable?: boolean }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 flex items-center gap-1.5 break-all">
        <span>{value}</span>
        {copyable && (
          <button onClick={() => { navigator.clipboard.writeText(value); toast.success(`${label} copied`); }} className="text-muted-foreground hover:text-gold">
            <Copy className="size-3" />
          </button>
        )}
      </dd>
    </div>
  );
}

function AddEntryDialog({ cryptoKey, onClose }: { cryptoKey: CryptoKey; onClose: () => void }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    try {
      const fd = new FormData(e.currentTarget);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const password = String(fd.get("password") || "");
      const payload = {
        user_id: user.id,
        label: String(fd.get("label") || "").trim(),
        cabinet: String(fd.get("cabinet") || "General").trim() || "General",
        category: String(fd.get("category") || "login"),
        username: (fd.get("username") as string) || null,
        url: (fd.get("url") as string) || null,
        serial_number: (fd.get("serial_number") as string) || null,
        location: (fd.get("location") as string) || null,
        notes: (fd.get("notes") as string) || null,
        password_ciphertext: password ? await encryptString(password, cryptoKey) : null,
      };
      if (!payload.label) throw new Error("Label is required");
      const { error } = await supabase.from("vault_items").insert(payload);
      if (error) throw error;
      toast.success("Entry added to cabinet");
      qc.invalidateQueries({ queryKey: ["vault"] });
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save");
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="w-full max-w-xl space-y-3 rounded-lg border border-gold/40 bg-card p-6 gold-glow">
        <h2 className="font-display text-2xl text-gold-soft">New Cabinet Entry</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <input name="label" required placeholder="Label (e.g. Chase Bank)" className="rounded-md border border-border bg-background px-3 py-2 text-sm sm:col-span-2" />
          <input name="cabinet" placeholder="Cabinet (Banking, Hardware…)" className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <select name="category" defaultValue="login" className="rounded-md border border-border bg-background px-3 py-2 text-sm">
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input name="username" placeholder="Username / email" className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <input name="password" type="password" placeholder="Password (encrypted)" className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <input name="url" placeholder="URL" className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <input name="serial_number" placeholder="Serial # / License key" className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
          <input name="location" placeholder="Where it lives (Office safe, Drawer 2…)" className="rounded-md border border-border bg-background px-3 py-2 text-sm sm:col-span-2" />
          <textarea name="notes" placeholder="Notes" rows={3} className="rounded-md border border-border bg-background px-3 py-2 text-sm sm:col-span-2" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-md border border-border px-4 py-2 text-xs uppercase tracking-wider hover:border-gold">Cancel</button>
          <button disabled={busy} className="rounded-md bg-gold px-4 py-2 text-xs uppercase tracking-wider text-primary-foreground hover:gold-glow disabled:opacity-50">
            {busy ? "Encrypting…" : "Save Entry"}
          </button>
        </div>
      </form>
    </div>
  );
}

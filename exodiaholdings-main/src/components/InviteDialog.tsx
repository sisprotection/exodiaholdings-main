import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createInvite, listMyInvites, revokeInvite } from "@/lib/invites.functions";
import { toast } from "sonner";
import { Mail, Copy, Trash2, X, Check, Clock } from "lucide-react";
import { useRoleFlags } from "@/hooks/useRole";

type InviteRole = "member" | "admin" | "vice_president" | "trustee";

export function InviteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const create = useServerFn(createInvite);
  const list = useServerFn(listMyInvites);
  const revoke = useServerFn(revokeInvite);
  const { isOwner, isVP } = useRoleFlags();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<InviteRole>("member");
  const [busy, setBusy] = useState(false);

  const { data: invites = [] } = useQuery({
    queryKey: ["my-invites"],
    queryFn: () => list(),
    enabled: open,
  });

  const availableRoles: { value: InviteRole; label: string }[] = [
    { value: "member", label: "Member" },
    ...(isOwner || isVP ? [{ value: "admin" as const, label: "Board Admin" }] : []),
    ...(isOwner ? [{ value: "vice_president" as const, label: "Vice President" }] : []),
    ...(isOwner || isVP ? [{ value: "trustee" as const, label: "Trustee" }] : []),
  ];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setBusy(true);
    try {
      const row = await create({ data: { email, displayName: name || undefined, role } });
      const link = `${window.location.origin}/accept-invite/${row.token}`;
      await navigator.clipboard.writeText(link).catch(() => {});
      toast.success("Invite created — link copied to clipboard");
      setEmail(""); setName(""); setRole("member");
      qc.invalidateQueries({ queryKey: ["my-invites"] });
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create invite");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl rounded-lg border border-gold/40 bg-card p-6 gold-glow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Grant Access</p>
            <h2 className="mt-1 font-display text-3xl text-gold-soft">Invite a Member</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-gold"><X className="size-5" /></button>
        </div>
        <div className="gold-rule mt-4 w-full" />

        <form onSubmit={submit} className="mt-6 grid gap-3 sm:grid-cols-2">
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="invitee@email.com"
            className="rounded-md border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-gold"
          />
          <input
            value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Their name (optional)"
            className="rounded-md border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-gold"
          />
          <select
            value={role} onChange={(e) => setRole(e.target.value as InviteRole)}
            className="rounded-md border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-gold"
          >
            {availableRoles.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <button disabled={busy} className="inline-flex items-center justify-center gap-1.5 rounded-md bg-gold px-4 py-2.5 text-xs uppercase tracking-wider text-primary-foreground hover:gold-glow disabled:opacity-50">
            <Mail className="size-3.5" /> {busy ? "Creating…" : "Generate Link"}
          </button>
        </form>
        <p className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
          Each link is single-use and expires in 30 days. Even owners cannot view inside a member's holdings or cabinet.
        </p>

        <h3 className="mt-8 text-xs uppercase tracking-[0.3em] text-muted-foreground">Active Invites</h3>
        <ul className="mt-3 max-h-72 divide-y divide-border/40 overflow-y-auto rounded-md border border-border/40">
          {invites.length === 0 && (
            <li className="p-4 text-center text-sm text-muted-foreground">No invites yet.</li>
          )}
          {invites.map((inv) => {
            const link = `${window.location.origin}/accept-invite/${inv.token}`;
            const expired = new Date(inv.expires_at) < new Date();
            return (
              <li key={inv.id} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm">{inv.email}</span>
                    <span className="rounded-full border border-gold/30 px-2 py-0.5 text-[10px] uppercase tracking-wider text-gold">
                      {(inv.invited_role ?? "member").replace("_", " ")}
                    </span>
                    {inv.used_at ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 px-2 py-0.5 text-[10px] uppercase text-emerald-400">
                        <Check className="size-3" /> Redeemed
                      </span>
                    ) : expired ? (
                      <span className="rounded-full border border-destructive/40 px-2 py-0.5 text-[10px] uppercase text-destructive">Expired</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-gold/40 px-2 py-0.5 text-[10px] uppercase text-gold">
                        <Clock className="size-3" /> Pending
                      </span>
                    )}
                  </div>
                  {!inv.used_at && !expired && (
                    <div className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">{link}</div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {!inv.used_at && !expired && (
                    <button
                      onClick={async () => { await navigator.clipboard.writeText(link); toast.success("Link copied"); }}
                      className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-gold"
                      title="Copy link"
                    >
                      <Copy className="size-3.5" />
                    </button>
                  )}
                  {!inv.used_at && (
                    <button
                      onClick={async () => {
                        await revoke({ data: { id: inv.id } });
                        qc.invalidateQueries({ queryKey: ["my-invites"] });
                        toast.success("Invite revoked");
                      }}
                      className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-destructive"
                      title="Revoke"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

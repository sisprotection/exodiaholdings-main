import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRoleFlags, roleLabel, type AppRole } from "@/hooks/useRole";
import { InviteDialog } from "@/components/InviteDialog";
import { Award, Printer, ShieldCheck, UserPlus, Vault, KeyRound } from "lucide-react";
import { openCertificate } from "@/lib/certificate";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/board")({
  head: () => ({ meta: [{ title: "Board of Directors — Exodia Holdings" }] }),
  component: BoardPage,
});

type BoardRow = {
  user_id: string;
  role: AppRole;
  full_name: string | null;
};

function BoardPage() {
  const { isBoard, isLoading: roleLoading } = useRoleFlags();
  const [inviteOpen, setInviteOpen] = useState(false);

  const { data: board = [], isLoading } = useQuery<BoardRow[]>({
    queryKey: ["board-members"],
    enabled: isBoard,
    queryFn: async () => {
      // RLS restricts user_roles to self — so we read what we can and merge with profiles.
      // For a full board roster we rely on a future RPC; for now show the current user's seat
      // plus any rows the database happens to expose.
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role");
      const ids = Array.from(new Set((roles ?? []).map((r) => r.user_id)));
      const { data: profiles } = ids.length
        ? await supabase.from("profiles").select("id, full_name").in("id", ids)
        : { data: [] as { id: string; full_name: string | null }[] };
      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
      return (roles ?? [])
        .filter((r) => ["owner", "vice_president", "admin"].includes(r.role))
        .map((r) => ({
          user_id: r.user_id,
          role: r.role as AppRole,
          full_name: profileMap.get(r.user_id) ?? null,
        }));
    },
  });

  if (roleLoading) {
    return <div className="mx-auto max-w-3xl px-6 py-16 text-center text-muted-foreground">Loading…</div>;
  }
  if (!isBoard) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h1 className="font-display text-3xl text-gold-soft">Board access only</h1>
        <p className="mt-2 text-muted-foreground">This area is reserved for owners, vice presidents, and admins.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Governance</p>
          <h1 className="mt-1 font-display text-4xl text-gold-soft">Board of Directors</h1>
        </div>
        <button onClick={() => setInviteOpen(true)} className="inline-flex items-center gap-1.5 rounded-md bg-gold px-4 py-2 text-xs uppercase tracking-wider text-primary-foreground hover:gold-glow">
          <UserPlus className="size-3.5" /> Invite to Board
        </button>
      </div>

      <div className="mt-6 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-400" />
          <div className="text-sm">
            <p className="font-display text-base text-emerald-300">Hard privacy guarantee</p>
            <p className="mt-1 text-muted-foreground">
              Even site owners and Vice Presidents <strong>cannot view inside another member's holdings, cabinet,
              legacy, or messages</strong>. Cross-account access requires the grantor to explicitly add a trustee.
              This is enforced at the database level, not just in the UI.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-start gap-3 rounded-lg border border-gold/30 bg-gold/5 p-3 text-xs text-muted-foreground">
        <KeyRound className="mt-0.5 size-4 shrink-0 text-gold" />
        <p>
          <strong className="text-gold-soft">First sign-in reminder:</strong> enroll your face + ID in{" "}
          <Link to="/vault" className="text-gold underline">Cabinet → Recovery Setup</Link>{" "}
          so you can regain access if you ever forget your passphrase.
        </p>
      </div>

      <div className="gold-rule mt-8 w-full" />

      {isLoading ? (
        <p className="mt-10 text-center text-muted-foreground">Loading board roster…</p>
      ) : (
        <ul className="mt-8 grid gap-4 md:grid-cols-2">
          {board.map((m) => (
            <BoardCard key={m.user_id + m.role} member={m} />
          ))}
          {board.length === 0 && (
            <li className="md:col-span-2 rounded-lg border border-dashed border-border/60 p-8 text-center text-muted-foreground">
              No board members visible to your account yet.
            </li>
          )}
        </ul>
      )}

      <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  );
}

function BoardCard({ member }: { member: BoardRow }) {
  const name = member.full_name ?? "Board Member";
  const title = roleLabel(member.role);
  const printPosition = () => openCertificate({ kind: "position", recipientName: name, title });
  const printVault = () => openCertificate({ kind: "vault", recipientName: name, title });

  return (
    <li className="rounded-lg border border-gold/30 bg-card p-5 gold-glow">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Award className="size-4 text-gold" />
            <span className="text-[10px] uppercase tracking-[0.3em] text-gold">{title}</span>
          </div>
          <h3 className="mt-2 font-display text-2xl text-gold-soft">{name}</h3>
          <p className="mt-1 text-xs text-muted-foreground">Two certificates available — signed under the seal.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={printPosition} className="inline-flex items-center gap-1 rounded-md border border-gold/40 px-3 py-1.5 text-[10px] uppercase tracking-wider text-gold hover:gold-glow">
            <Printer className="size-3" /> Position
          </button>
          <button onClick={printVault} className="inline-flex items-center gap-1 rounded-md border border-gold/40 px-3 py-1.5 text-[10px] uppercase tracking-wider text-gold hover:gold-glow">
            <Vault className="size-3" /> Vault
          </button>
        </div>
      </div>
    </li>
  );
}


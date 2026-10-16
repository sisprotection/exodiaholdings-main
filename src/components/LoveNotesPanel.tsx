import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listHeirsForGuardian,
  listMyLoveNotes,
  sendLoveNote,
  deleteLoveNote,
  provisionHeir,
} from "@/lib/heir.functions";
import { Heart, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useRoleFlags } from "@/hooks/useRole";

export function LoveNotesPanel() {
  const { isOwner } = useRoleFlags();
  const qc = useQueryClient();
  const heirsFn = useServerFn(listHeirsForGuardian);
  const notesFn = useServerFn(listMyLoveNotes);
  const sendFn = useServerFn(sendLoveNote);
  const delFn = useServerFn(deleteLoveNote);
  const provFn = useServerFn(provisionHeir);

  const { data: heirs = [], refetch: refetchHeirs } = useQuery({
    queryKey: ["my-heirs"],
    queryFn: () => heirsFn(),
    enabled: isOwner,
  });

  const { data: notes = [] } = useQuery({
    queryKey: ["love-notes-sent"],
    queryFn: () => notesFn(),
    enabled: isOwner,
  });

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [provBusy, setProvBusy] = useState(false);
  const heir = heirs[0];

  if (!isOwner) return null;

  const handleProvision = async () => {
    setProvBusy(true);
    try {
      await provFn({
        data: {
          email: "khadijahall0325x@gmail.com",
          password: "become the cup",
          displayName: "Khadija Laila Hall",
        },
      });
      toast.success("Khadija's monitoring account is ready");
      refetchHeirs();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not provision account");
    } finally {
      setProvBusy(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!heir) return;
    setBusy(true);
    try {
      await sendFn({ data: { heirId: heir.heir_id, title, body } });
      toast.success("Love note sent 💛");
      setTitle(""); setBody("");
      qc.invalidateQueries({ queryKey: ["love-notes-sent"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally { setBusy(false); }
  };

  return (
    <section className="rounded-lg border border-rose-400/30 bg-card p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-rose-300/80">For Khadija 💛</p>
          <h2 className="mt-1 flex items-center gap-2 font-display text-2xl text-gold-soft">
            <Heart className="size-5 text-rose-300" /> Love Notes
          </h2>
        </div>
        {!heir && (
          <button
            onClick={handleProvision}
            disabled={provBusy}
            className="inline-flex items-center gap-1.5 rounded-md border border-gold/50 px-3 py-2 text-xs uppercase tracking-wider text-gold hover:bg-gold/10 disabled:opacity-50"
          >
            <UserPlus className="size-3.5" /> {provBusy ? "Setting up…" : "Set up Khadija's account"}
          </button>
        )}
      </div>

      {!heir ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Click "Set up Khadija's account" to create her monitoring login. She'll only see what you choose to share.
        </p>
      ) : (
        <>
          <p className="mt-3 text-xs text-muted-foreground">
            Linked to <span className="text-gold-soft">{heir.display_name ?? "Khadija"}</span>. She sees these notes the next time she signs in.
          </p>

          <form onSubmit={handleSend} className="mt-5 grid gap-3">
            <input
              required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="A title (e.g. Goodnight, baby)"
              className="rounded-md border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-gold"
            />
            <textarea
              required maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)}
              placeholder="Write something only Khadija should read…"
              rows={4}
              className="rounded-md border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-gold"
            />
            <button
              disabled={busy}
              className="self-start rounded-md bg-gold px-4 py-2 text-xs uppercase tracking-wider text-primary-foreground hover:gold-glow disabled:opacity-50"
            >
              {busy ? "Sending…" : "Send to Khadija"}
            </button>
          </form>

          <h3 className="mt-8 text-xs uppercase tracking-[0.3em] text-muted-foreground">Sent</h3>
          <ul className="mt-3 space-y-3">
            {notes.length === 0 && (
              <li className="text-sm text-muted-foreground">No notes yet — write her something.</li>
            )}
            {notes.map((n) => (
              <li key={n.id} className="rounded-md border border-border/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-display text-lg text-gold-soft">{n.title}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {new Date(n.created_at).toLocaleDateString()}
                    </span>
                    <button
                      onClick={async () => {
                        await delFn({ data: { id: n.id } });
                        qc.invalidateQueries({ queryKey: ["love-notes-sent"] });
                      }}
                      className="text-muted-foreground hover:text-destructive"
                      title="Delete"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">{n.body}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

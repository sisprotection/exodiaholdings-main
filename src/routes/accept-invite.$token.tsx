import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { validateInviteToken } from "@/lib/invitesPublic.functions";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Crest } from "@/components/Crest";
import { Footer } from "@/components/Footer";
import { toast } from "sonner";
import { Mail, KeyRound } from "lucide-react";

export const Route = createFileRoute("/accept-invite/$token")({
  head: () => ({ meta: [{ title: "Accept Invite — Exodia Holdings" }] }),
  component: AcceptInvite,
});

function AcceptInvite() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const validate = useServerFn(validateInviteToken);

  const [status, setStatus] = useState<"loading" | "valid" | "invalid">("loading");
  const [reason, setReason] = useState<string>("");
  const [invite, setInvite] = useState<{ email: string; displayName: string | null } | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    validate({ data: { token } }).then((res) => {
      if (cancelled) return;
      if (res.valid) {
        setInvite({ email: res.email, displayName: res.displayName });
        setStatus("valid");
      } else {
        setReason(res.reason);
        setStatus("invalid");
      }
    }).catch((e) => {
      setReason(e?.message ?? "Could not validate invite.");
      setStatus("invalid");
    });
    return () => { cancelled = true; };
  }, [token, validate]);

  const signUpWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invite) return;
    if (password.length < 8) { toast.error("Password must be at least 8 characters."); return; }
    if (password !== confirm) { toast.error("Passwords do not match."); return; }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: invite.email,
      password,
      options: {
        emailRedirectTo: window.location.origin + "/dashboard",
        data: { full_name: invite.displayName ?? undefined },
      },
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Welcome to Exodia Holdings.");
    navigate({ to: "/dashboard" });
  };

  const signInWith = async (provider: "google" | "apple") => {
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin + "/dashboard" });
    if (result.error) toast.error(result.error.message ?? "Sign-in failed");
  };

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center text-center">
            <Crest size={72} />
            <p className="mt-6 text-xs uppercase tracking-[0.4em] text-muted-foreground">You've Been Invited</p>
            <h1 className="mt-2 font-display text-4xl text-gold-soft">Exodia Holdings</h1>
            <div className="gold-rule mx-auto mt-3 w-16" />
          </div>

          {status === "loading" && (
            <p className="mt-10 text-center text-sm text-muted-foreground">Verifying invite…</p>
          )}

          {status === "invalid" && (
            <div className="mt-10 rounded-lg border border-destructive/40 bg-card p-6 text-center">
              <h2 className="font-display text-xl text-destructive">Invite Invalid</h2>
              <p className="mt-2 text-sm text-muted-foreground">{reason}</p>
              <p className="mt-4 text-xs uppercase tracking-wider text-muted-foreground">Ask whoever invited you for a fresh link.</p>
            </div>
          )}

          {status === "valid" && invite && (
            <div className="mt-10">
              <div className="rounded-lg border border-gold/30 bg-card p-5 text-center gold-glow">
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Provisioning for</p>
                <p className="mt-1 font-display text-xl text-gold">{invite.email}</p>
                {invite.displayName && <p className="text-sm text-muted-foreground">{invite.displayName}</p>}
              </div>

              <div className="mt-6 grid gap-3">
                <button
                  onClick={() => signInWith("google")}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background py-3 text-sm hover:border-gold hover:text-gold"
                >
                  <GoogleIcon /> Continue with Google
                </button>
                <button
                  onClick={() => signInWith("apple")}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background py-3 text-sm hover:border-gold hover:text-gold"
                >
                  <AppleIcon /> Continue with Apple
                </button>
              </div>

              <div className="my-6 flex items-center gap-3 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                <div className="h-px flex-1 bg-border" /> or set a password <div className="h-px flex-1 bg-border" />
              </div>

              <form onSubmit={signUpWithPassword} className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-muted-foreground">Email</label>
                  <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2.5 text-sm text-muted-foreground">
                    <Mail className="size-3.5" /> {invite.email}
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-muted-foreground">Password</label>
                  <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-md border border-border bg-card px-4 py-3 outline-none focus:border-gold" placeholder="At least 8 characters" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-muted-foreground">Confirm Password</label>
                  <input type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)}
                    className="w-full rounded-md border border-border bg-card px-4 py-3 outline-none focus:border-gold" />
                </div>
                <button disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-gold py-3 text-sm uppercase tracking-[0.2em] text-primary-foreground hover:gold-glow disabled:opacity-50">
                  <KeyRound className="size-4" /> {busy ? "Creating…" : "Claim Account"}
                </button>
              </form>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.42-1.69 4.18-5.5 4.18-3.3 0-6-2.74-6-6.13S8.7 6 12 6c1.88 0 3.13.8 3.85 1.5l2.62-2.53C16.87 3.46 14.66 2.5 12 2.5 6.78 2.5 2.5 6.78 2.5 12s4.28 9.5 9.5 9.5c5.49 0 9.13-3.86 9.13-9.3 0-.63-.07-1.1-.17-1.55H12z"/>
    </svg>
  );
}
function AppleIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.36 12.69c-.02-2.04 1.66-3.02 1.73-3.07-.94-1.38-2.41-1.57-2.93-1.59-1.25-.13-2.44.74-3.08.74-.64 0-1.62-.72-2.66-.7-1.37.02-2.63.8-3.34 2.03-1.42 2.47-.36 6.13 1.03 8.14.68.99 1.49 2.09 2.55 2.05 1.03-.04 1.42-.66 2.67-.66 1.24 0 1.6.66 2.69.64 1.11-.02 1.81-1 2.49-1.99.78-1.14 1.1-2.24 1.12-2.3-.02-.01-2.15-.83-2.17-3.29zM14.4 6.27c.57-.69.96-1.66.85-2.62-.82.03-1.82.55-2.41 1.24-.53.6-1 1.59-.87 2.53.92.07 1.86-.47 2.43-1.15z"/>
    </svg>
  );
}

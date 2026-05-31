import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Crest } from "@/components/Crest";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Exodia Holdings — Sign In" },
      { name: "description", content: "Secure access to the Exodia Holdings property archive." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      {/* Animated crest hero glow */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/3 size-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/10 blur-3xl" />
      </div>
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center text-center">
            <div className="animate-[fadeIn_1.2s_ease-out]">
              <Crest size={96} />
            </div>
            <h1 className="mt-8 font-display text-5xl text-gold-soft">Exodia Holdings</h1>
            <div className="gold-rule mx-auto mt-3 w-16" />
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              Holdings, ledgers, and projections for every property under one name.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-10 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-muted-foreground">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-border bg-card px-4 py-3 text-foreground outline-none focus:border-gold"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-muted-foreground">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-border bg-card px-4 py-3 text-foreground outline-none focus:border-gold"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-gold py-3 text-sm font-medium uppercase tracking-[0.2em] text-primary-foreground transition-all hover:gold-glow disabled:opacity-50"
            >
              {loading ? "Verifying…" : "Enter Archive"}
            </button>
          </form>

          <p className="mt-6 text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60">
            Access by invitation only
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}

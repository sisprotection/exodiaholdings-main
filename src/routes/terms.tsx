import { createFileRoute, Link } from "@tanstack/react-router";
import { Crest } from "@/components/Crest";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Exodia Holdings" },
      { name: "description", content: "Terms of use for Exodia Holdings." },
    ],
  }),
  component: Terms,
});

function Terms() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 mx-auto w-full max-w-3xl px-6 py-12">
        <div className="flex items-center gap-4">
          <Crest size={48} />
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Legal</p>
            <h1 className="font-display text-4xl text-gold-soft">Terms of Service</h1>
          </div>
        </div>
        <div className="gold-rule mt-6 w-full" />
        <p className="mt-6 text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

        <article className="mt-8 space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="font-display text-2xl text-gold-soft">1. Access by Invitation</h2>
            <p>Accounts are created only through invitation by the owner or board. You agree to use the platform for the lawful management of your own holdings and records.</p>
          </section>
          <section>
            <h2 className="font-display text-2xl text-gold-soft">2. Your Responsibility</h2>
            <p>You are responsible for safeguarding your password and your Cabinet passphrase. We cannot recover a forgotten Cabinet passphrase.</p>
          </section>
          <section>
            <h2 className="font-display text-2xl text-gold-soft">3. Not Financial or Legal Advice</h2>
            <p>The projections, payoff schedules, and analytics provided are informational. Consult licensed advisors for financial, tax, or legal decisions.</p>
          </section>
          <section>
            <h2 className="font-display text-2xl text-gold-soft">4. Prohibited Use</h2>
            <p>No unlawful activity, no attempts to access other members' data, no scraping, no automated abuse.</p>
          </section>
          <section>
            <h2 className="font-display text-2xl text-gold-soft">5. Termination</h2>
            <p>You may purge your account anytime from Settings. We may suspend accounts for violation of these terms.</p>
          </section>
          <section>
            <h2 className="font-display text-2xl text-gold-soft">6. Liability</h2>
            <p>The service is provided "as is." We are not liable for indirect damages arising from loss of data, missed payments, or projections.</p>
          </section>
        </article>

        <p className="mt-10 text-xs text-muted-foreground">
          <Link to="/" className="text-gold hover:underline">← Back</Link>
        </p>
      </main>
      <Footer />
    </div>
  );
}

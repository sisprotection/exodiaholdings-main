import { createFileRoute, Link } from "@tanstack/react-router";
import { Crest } from "@/components/Crest";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Exodia Holdings" },
      { name: "description", content: "How Exodia Holdings collects, stores, and protects your data." },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 mx-auto w-full max-w-3xl px-6 py-12">
        <div className="flex items-center gap-4">
          <Crest size={48} />
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Legal</p>
            <h1 className="font-display text-4xl text-gold-soft">Privacy Policy</h1>
          </div>
        </div>
        <div className="gold-rule mt-6 w-full" />

        <p className="mt-6 text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

        <article className="prose prose-invert mt-8 max-w-none space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="font-display text-2xl text-gold-soft">1. What We Collect</h2>
            <p>Only what you enter: your email, profile name, holdings, payments, beneficiaries, support tickets, and encrypted Cabinet entries.</p>
          </section>
          <section>
            <h2 className="font-display text-2xl text-gold-soft">2. Zero-Knowledge Cabinet</h2>
            <p>Your Cabinet (vault) passwords are encrypted on YOUR device with a passphrase that never leaves your browser. We physically cannot read them. If you lose your passphrase, we cannot recover it.</p>
          </section>
          <section>
            <h2 className="font-display text-2xl text-gold-soft">3. Card and Account Numbers</h2>
            <p>We do NOT transmit or store full card numbers, bank account numbers, CVVs, or PINs. Only the last four digits are kept (for display) when you save a Payment Source.</p>
          </section>
          <section>
            <h2 className="font-display text-2xl text-gold-soft">4. Who Can See Your Data</h2>
            <p>Only you. Even the account owner of Exodia Holdings cannot view another member's holdings, vault, or beneficiaries unless you explicitly add them as a trustee. Heirs (e.g. family monitors) only see items you've flagged "visible to heir."</p>
          </section>
          <section>
            <h2 className="font-display text-2xl text-gold-soft">5. Your Rights (GDPR / CCPA)</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Right to access — download all your data anytime from Settings.</li>
              <li>Right to deletion — purge your account anytime from Settings.</li>
              <li>Right to correction — edit any record directly.</li>
              <li>Right to portability — exports are JSON and CSV.</li>
            </ul>
          </section>
          <section>
            <h2 className="font-display text-2xl text-gold-soft">6. Security</h2>
            <p>All traffic is HTTPS. Database access is gated by per-user Row Level Security. File uploads are stored in private buckets with signed URLs. Authentication tokens are short-lived and rotated.</p>
          </section>
          <section>
            <h2 className="font-display text-2xl text-gold-soft">7. Children</h2>
            <p>Heir monitoring accounts (e.g. for a child) are managed entirely by the guardian. We do not knowingly collect data directly from anyone under 13 without parental control.</p>
          </section>
          <section>
            <h2 className="font-display text-2xl text-gold-soft">8. Contact</h2>
            <p>Submit a support ticket from inside the app, or write to the address on file with Exodia Holdings.</p>
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

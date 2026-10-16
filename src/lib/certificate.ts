// Shared certificate generator — opens a print-ready window with the Exodia seal.
// Three kinds: position (board appointment), vault (custodianship of holdings),
// agreement (member acknowledgment of account terms).

import sealUrl from "@/assets/hall-seal.jpg";

export type CertKind = "position" | "vault" | "agreement";

export interface CertOptions {
  kind: CertKind;
  recipientName: string;
  /** For "position" certs — e.g. "Vice President" */
  title?: string;
  /** Name of the signer; defaults to "Larry T. Hall" / Office of the President. */
  signedBy?: string;
  /** Override the certificate number. Defaults to a deterministic-ish stamp. */
  certNumber?: string;
}

const HEADINGS: Record<CertKind, { eyebrow: string; heading: string; body: (name: string, title?: string) => string }> = {
  position: {
    eyebrow: "Office of the President",
    heading: "Certificate of Appointment",
    body: (name, title) =>
      `is hereby formally appointed to the Board of Directors of Exodia Holdings as <strong>${title ?? "Board Member"}</strong>, ` +
      `with all powers, privileges, fiduciary duties, and responsibilities conferred upon said office. ` +
      `This appointment is granted by the authority of the President and recorded under the seal of the Holdings.`,
  },
  vault: {
    eyebrow: "Custodianship of the Vault",
    heading: "Certificate of Vault Custody",
    body: (name) =>
      `is recognized as a sworn custodian of the Exodia Holdings Vault, entrusted with the protection, ` +
      `discretion, and continuity of the family's encrypted records. The bearer acknowledges the inviolable nature ` +
      `of zero-knowledge custody — that the contents of the Vault may be guarded but never read without the rightful key.`,
  },
  agreement: {
    eyebrow: "Member Account Agreement",
    heading: "Certificate of Account",
    body: (name) =>
      `has registered with Exodia Holdings and acknowledged the Privacy Policy and Terms of Service of the Holdings. ` +
      `The bearer's records remain the bearer's property in perpetuity; encrypted Cabinet contents cannot be read by the Holdings; ` +
      `and the bearer may export or purge their data at any time. Issued in good faith under the Seal.`,
  },
};

export function openCertificate(opts: CertOptions) {
  const w = window.open("", "_blank", "width=1100,height=800");
  if (!w) return;
  w.document.write(buildCertificateHtml(opts));
  w.document.close();
  // Print after the seal image has a chance to load.
  setTimeout(() => {
    try { w.focus(); w.print(); } catch { /* user can still print manually */ }
  }, 600);
}

function buildCertificateHtml(opts: CertOptions): string {
  const { kind, recipientName, title, signedBy = "Larry T. Hall", certNumber } = opts;
  const meta = HEADINGS[kind];
  const date = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const stamp = certNumber ?? `EH-${kind.toUpperCase().slice(0, 3)}-${Date.now().toString(36).toUpperCase()}`;
  const seal = (typeof sealUrl === "string" ? sealUrl : (sealUrl as any).src) ?? "";

  return `<!doctype html><html><head><meta charset="utf-8" />
<title>Exodia Holdings — ${meta.heading} — ${escapeHtml(recipientName)}</title>
<style>
  @page { size: landscape; margin: 0; }
  * { box-sizing: border-box; }
  body { font-family: 'Garamond', Georgia, 'Times New Roman', serif; margin: 0; padding: 36px;
         color: #1a1208; background: #1a1208; min-height: 100vh; }
  .frame {
    border: 10px double #8b6914;
    outline: 1px solid #c9a84c;
    outline-offset: -22px;
    padding: 56px 64px 48px;
    min-height: 92vh;
    text-align: center;
    position: relative;
    background:
      radial-gradient(circle at center, #fff9e8 0%, #f5ecc8 70%, #e9dcab 100%);
    box-shadow: 0 0 0 1px #6b4f11 inset;
  }
  .corner { position: absolute; width: 32px; height: 32px; border: 2px solid #8b6914; }
  .c-tl { top: 30px; left: 30px; border-right: 0; border-bottom: 0; }
  .c-tr { top: 30px; right: 30px; border-left: 0; border-bottom: 0; }
  .c-bl { bottom: 30px; left: 30px; border-right: 0; border-top: 0; }
  .c-br { bottom: 30px; right: 30px; border-left: 0; border-top: 0; }
  .eyebrow { color: #6b4f11; letter-spacing: 0.5em; font-size: 11px; text-transform: uppercase; }
  .heading { font-size: 54px; margin: 18px 0 6px; color: #6b4f11; letter-spacing: 0.04em; font-weight: 600; }
  .sub { font-size: 12px; color: #8b6914; letter-spacing: 0.35em; text-transform: uppercase; }
  .seal-wrap { margin: 28px auto 8px; display: flex; align-items: center; justify-content: center; gap: 20px; }
  .seal-wrap img { width: 96px; height: 96px; border-radius: 50%; border: 2px solid #8b6914;
                   box-shadow: 0 0 0 4px #f5ecc8, 0 0 0 5px #c9a84c; object-fit: cover; }
  .name { font-size: 64px; margin: 18px 0 6px; color: #1a1208; font-style: italic; font-family: 'Snell Roundhand', 'Brush Script MT', cursive; }
  .rule { width: 55%; margin: 6px auto 18px; border: 0; border-top: 1px solid #8b6914; }
  .title-line { font-size: 20px; color: #6b4f11; letter-spacing: 0.25em; text-transform: uppercase; }
  .body { margin: 28px auto 22px; max-width: 760px; font-size: 16px; line-height: 1.7; color: #2a1d09; }
  .sign-row { display: flex; justify-content: space-between; align-items: flex-end; margin: 56px 60px 8px; gap: 32px; }
  .sign-col { flex: 1; text-align: center; }
  .sign-script { font-family: 'Snell Roundhand', 'Brush Script MT', cursive; font-size: 32px; color: #1a1208; min-height: 36px; }
  .sign-line { border-top: 1px solid #6b4f11; padding-top: 4px; font-size: 11px; color: #6b4f11; letter-spacing: 0.2em; text-transform: uppercase; }
  .stamp { position: absolute; bottom: 48px; right: 60px; font-size: 10px; color: #6b4f11; letter-spacing: 0.2em; text-transform: uppercase; }
  @media print { body { padding: 0; background: white; } .frame { min-height: 100vh; box-shadow: none; } }
</style></head>
<body><div class="frame">
  <span class="corner c-tl"></span><span class="corner c-tr"></span>
  <span class="corner c-bl"></span><span class="corner c-br"></span>

  <div class="eyebrow">★ Exodia Holdings ★ ${escapeHtml(meta.eyebrow)} ★</div>
  <div class="seal-wrap">${seal ? `<img src="${seal}" alt="Exodia Holdings Seal" />` : ""}</div>
  <h1 class="heading">${meta.heading}</h1>
  <div class="sub">Issued under the Seal of Exodia Holdings</div>

  <div class="name">${escapeHtml(recipientName)}</div>
  <hr class="rule" />
  ${kind === "position" && title ? `<div class="title-line">${escapeHtml(title)}</div>` : ""}

  <p class="body">${meta.body(recipientName, title)}</p>
  <p class="body" style="font-size:13px;color:#6b4f11;">Effective ${date}</p>

  <div class="sign-row">
    <div class="sign-col">
      <div class="sign-script">${escapeHtml(signedBy)}</div>
      <div class="sign-line">President &amp; Owner — Exodia Holdings</div>
    </div>
    <div class="sign-col">
      <div class="sign-script" style="font-style: italic; font-family: Garamond, serif; font-size: 16px; letter-spacing: 0.15em;">${date}</div>
      <div class="sign-line">Date of Issue</div>
    </div>
  </div>

  <div class="stamp">Certificate № ${escapeHtml(stamp)}</div>
</div></body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string)
  );
}

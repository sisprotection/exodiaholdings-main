/**
 * Exodia Holdings — Public (client-safe) legacy strings.
 *
 * Only first names and motivational quotes live here. Full names, DOB, and
 * other PII belong in `legacy.server.ts` and are only fetched after auth.
 */

export const GRANTOR_FIRST = "Domenick" as const;
export const BENEFICIARY_FIRST = "Khadija" as const;

export const LEGACY_QUOTES: readonly string[] = [
  "Daddy, build my future.",
  "Keep going — she's watching.",
  "Study. Focus. Save.",
  "Don't spend on what you don't need.",
  "Every payment is a brick in her foundation.",
  "Never give up — the work compounds.",
  "Discipline today, dynasty tomorrow.",
  "Build it so she never has to ask.",
] as const;

export function pickQuote(seed: number = Date.now()): string {
  return LEGACY_QUOTES[seed % LEGACY_QUOTES.length];
}

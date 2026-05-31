import { BENEFICIARY_FIRST, GRANTOR_FIRST } from "./legacy";

export type BeneficiaryLite = {
  full_name: string;
  gender?: "female" | "male" | "other" | "unspecified" | null;
};

export function buildLegacyFooter(opts: {
  isOwner: boolean;
  beneficiaries: BeneficiaryLite[];
}): { quote: string; line: string } {
  if (opts.isOwner) {
    return {
      quote: "Daddy, build my future.",
      line: `Built in trust for ${BENEFICIARY_FIRST} — by ${GRANTOR_FIRST}`,
    };
  }
  const list = opts.beneficiaries.filter((b) => b.full_name?.trim());
  if (list.length === 0) {
    return { quote: "Build your legacy.", line: "Exodia Holdings" };
  }
  let pronoun = "they're";
  if (list.length === 1) {
    const g = list[0].gender;
    pronoun = g === "male" ? "he's" : g === "female" ? "she's" : "they're";
  }
  const firstNames = list.map((b) => b.full_name.split(/\s+/)[0]).join(", ");
  return {
    quote: `Keep going — ${pronoun} watching.`,
    line: `Built in trust for ${firstNames}`,
  };
}

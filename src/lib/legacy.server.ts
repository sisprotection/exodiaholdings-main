// Server-only sensitive trust data. Never imported by client modules.
// Lives in a `.server.ts` file so Vite excludes it from the browser bundle.

export const TRUST = {
  grantor: {
    full: "Domenick Arlon Hall",
    first: "Domenick",
    middle: "Arlon",
    last: "Hall",
  },
  beneficiary: {
    full: "Khadija Laila Hall",
    first: "Khadija",
    middle: "Laila",
    last: "Hall",
    dobIso: "2019-03-25",
    relationship: "Daughter & Sole Trust Beneficiary",
  },
} as const;

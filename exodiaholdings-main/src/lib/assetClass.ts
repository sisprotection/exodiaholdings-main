export type AssetClass =
  | "real_estate"
  | "digital"
  | "business"
  | "vehicle"
  | "financial"
  | "collectible"
  | "other";

export const ASSET_CLASS_LABEL: Record<AssetClass, string> = {
  real_estate: "Real Estate",
  digital: "Digital Assets",
  business: "Businesses & Equipment",
  vehicle: "Vehicles",
  financial: "Financial Accounts",
  collectible: "Collectibles",
  other: "Other Holdings",
};

export const ASSET_CLASS_BLURB: Record<AssetClass, string> = {
  real_estate: "Land, homes, condos, commercial buildings.",
  digital: "Websites, domains, IP, software, online brands.",
  business: "Operating companies, subsidiaries, equipment.",
  vehicle: "Cars, trucks, motorcycles, vessels.",
  financial: "Brokerage, retirement, crypto, cash reserves.",
  collectible: "Art, jewelry, rare items of value.",
  other: "Anything not yet categorized.",
};

export const ASSET_CLASS_ORDER: AssetClass[] = [
  "real_estate",
  "digital",
  "business",
  "vehicle",
  "financial",
  "collectible",
  "other",
];

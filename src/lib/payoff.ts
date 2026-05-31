export type PaymentFrequency =
  | "one_time"
  | "monthly"
  | "quarterly"
  | "semi_annual"
  | "annual"
  | "biennial"
  | "triennial"
  | "every_5_years"
  | "custom";

export const FREQUENCY_MONTHS: Record<Exclude<PaymentFrequency, "custom" | "one_time">, number> = {
  monthly: 1,
  quarterly: 3,
  semi_annual: 6,
  annual: 12,
  biennial: 24,
  triennial: 36,
  every_5_years: 60,
};

export const FREQUENCY_LABEL: Record<PaymentFrequency, string> = {
  one_time: "One-time",
  monthly: "Monthly",
  quarterly: "Quarterly (every 3 months)",
  semi_annual: "Semi-annual (every 6 months)",
  annual: "Annual (yearly)",
  biennial: "Every 2 years",
  triennial: "Every 3 years",
  every_5_years: "Every 5 years",
  custom: "Custom (months)",
};

export function intervalMonthsFor(frequency: PaymentFrequency, customMonths?: number | null): number {
  if (frequency === "one_time") return 0;
  if (frequency === "custom") return Math.max(1, Number(customMonths) || 1);
  return FREQUENCY_MONTHS[frequency];
}

/** Equivalent monthly payment, used so existing chart math keeps working. */
export function monthlyEquivalent(amountPerPeriod: number, frequency: PaymentFrequency, customMonths?: number | null): number {
  if (!amountPerPeriod || amountPerPeriod <= 0) return 0;
  if (frequency === "one_time") return 0;
  const months = intervalMonthsFor(frequency, customMonths);
  return amountPerPeriod / months;
}

export interface PayoffInput {
  totalOwed: number;
  monthlyPayment: number;
  paymentStartDate: string | null;
}

export interface PayoffResult {
  monthsPaid: number;
  amountPaid: number;
  remaining: number;
  monthsRemaining: number;
  projectedPayoffDate: Date | null;
  progressPct: number;
}

export function calcPayoff({ totalOwed, monthlyPayment, paymentStartDate }: PayoffInput): PayoffResult {
  if (!paymentStartDate || !monthlyPayment || monthlyPayment <= 0 || !totalOwed) {
    return {
      monthsPaid: 0,
      amountPaid: 0,
      remaining: totalOwed || 0,
      monthsRemaining: 0,
      projectedPayoffDate: null,
      progressPct: 0,
    };
  }
  const start = new Date(paymentStartDate);
  const now = new Date();
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months -= 1;
  const monthsPaid = Math.max(0, months + 1);
  const amountPaid = Math.min(totalOwed, monthsPaid * monthlyPayment);
  const remaining = Math.max(0, totalOwed - amountPaid);
  const monthsRemaining = Math.ceil(remaining / monthlyPayment);
  const projected = new Date(now);
  projected.setMonth(projected.getMonth() + monthsRemaining);
  return {
    monthsPaid,
    amountPaid,
    remaining,
    monthsRemaining,
    projectedPayoffDate: remaining === 0 ? now : projected,
    progressPct: totalOwed > 0 ? Math.min(100, (amountPaid / totalOwed) * 100) : 0,
  };
}

export function buildPayoffSeries(input: PayoffInput): Array<{ month: string; paid: number; remaining: number }> {
  const { totalOwed, monthlyPayment, paymentStartDate } = input;
  if (!paymentStartDate || !monthlyPayment || monthlyPayment <= 0) return [];
  const start = new Date(paymentStartDate);
  const totalMonths = Math.ceil(totalOwed / monthlyPayment);
  const series: Array<{ month: string; paid: number; remaining: number }> = [];
  for (let i = 0; i <= totalMonths; i++) {
    const d = new Date(start);
    d.setMonth(start.getMonth() + i);
    const paid = Math.min(totalOwed, i * monthlyPayment);
    series.push({
      month: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      paid,
      remaining: Math.max(0, totalOwed - paid),
    });
  }
  return series;
}

export function formatMoney(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);
}

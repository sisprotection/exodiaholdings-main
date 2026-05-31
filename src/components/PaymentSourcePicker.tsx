import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listPaymentSources } from "@/lib/paymentSources.functions";
import { Link } from "@tanstack/react-router";

export function PaymentSourcePicker({
  name,
  value,
  onChange,
  label = "Funded By",
  allowNone = true,
}: {
  name?: string;
  value?: string | null;
  onChange?: (id: string | null) => void;
  label?: string;
  allowNone?: boolean;
}) {
  const list = useServerFn(listPaymentSources);
  const { data: sources = [] } = useQuery({ queryKey: ["payment-sources"], queryFn: () => list() });

  return (
    <div>
      <label className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</label>
      <select
        name={name}
        value={value ?? ""}
        onChange={(e) => onChange?.(e.target.value || null)}
        className="w-full rounded-md border border-border bg-card px-4 py-3 outline-none focus:border-gold"
      >
        {allowNone && <option value="">— None / Unassigned —</option>}
        {sources.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
            {s.brand && ` · ${s.brand}`}
            {s.last4 && ` •••• ${s.last4}`}
          </option>
        ))}
      </select>
      {sources.length === 0 && (
        <p className="mt-1 text-[10px] text-muted-foreground">
          No saved sources.{" "}
          <Link to="/settings" className="text-gold hover:underline">Add one in Settings →</Link>
        </p>
      )}
    </div>
  );
}

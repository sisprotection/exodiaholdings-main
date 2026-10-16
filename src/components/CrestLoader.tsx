import sealUrl from "@/assets/hall-seal.jpg";

export function CrestLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <img
        src={sealUrl}
        alt=""
        aria-hidden="true"
        className="size-16 animate-pulse rounded-full ring-1 ring-gold/40 gold-glow object-cover"
      />
      <p className="mt-4 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{label}</p>
    </div>
  );
}

export function CrestEmpty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 py-12 text-center">
      <img
        src={sealUrl}
        alt=""
        aria-hidden="true"
        className="size-14 rounded-full opacity-50 ring-1 ring-gold/30 object-cover"
      />
      <p className="mt-4 font-display text-lg text-gold-soft">{title}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

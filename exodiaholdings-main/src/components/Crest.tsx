import sealUrl from "@/assets/hall-seal.jpg";

export function Crest({ size = 56, showLabel = false }: { size?: number; showLabel?: boolean }) {
  return (
    <div className="inline-flex flex-col items-center">
      <img
        src={sealUrl}
        alt="Exodia Holdings LLC — Hall Family Trust & Legacy Seal"
        width={size}
        height={size}
        className="rounded-full ring-1 ring-gold/40 gold-glow object-cover"
        style={{ width: size, height: size }}
        loading="eager"
      />
      {showLabel && (
        <>
          <div className="mt-2 text-[10px] uppercase tracking-[0.4em] text-gold-soft">Exodia</div>
          <div className="text-[8px] uppercase tracking-[0.3em] text-muted-foreground">Holdings</div>
        </>
      )}
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useRoleFlags } from "@/hooks/useRole";
import { buildLegacyFooter, type BeneficiaryLite } from "@/lib/legacyFooter";
import sealUrl from "@/assets/hall-seal.jpg";

export function Footer() {
  const { isOwner, isLoading } = useRoleFlags();

  const { data: beneficiaries = [] } = useQuery({
    queryKey: ["footer-beneficiaries"],
    enabled: !isLoading && !isOwner,
    queryFn: async (): Promise<BeneficiaryLite[]> => {
      const { data, error } = await supabase
        .from("beneficiaries")
        .select("full_name, gender")
        .order("sort_order");
      if (error) return [];
      return (data ?? []) as BeneficiaryLite[];
    },
  });

  const { quote, line } = buildLegacyFooter({ isOwner, beneficiaries });

  return (
    <footer className="relative mt-20 overflow-hidden border-t border-border/40 px-6 py-10">
      {/* Crest watermark */}
      <img
        src={sealUrl}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 size-[420px] -translate-x-1/2 -translate-y-1/2 opacity-[0.04] blur-[1px]"
      />
      <div className="mx-auto max-w-7xl text-center">
        <div className="gold-rule mx-auto mb-6 w-24" />
        <p className="font-display text-lg text-gold-soft">"{quote}"</p>
        <p className="mt-3 text-xs uppercase tracking-[0.3em] text-muted-foreground">{line}</p>
        <p className="mt-1 text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60">
          Exodia Holdings
        </p>
        <nav className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70">
          <Link to="/privacy" className="hover:text-gold">Privacy</Link>
          <span className="text-muted-foreground/30">·</span>
          <Link to="/terms" className="hover:text-gold">Terms</Link>
          <span className="text-muted-foreground/30">·</span>
          <span>Your data is yours</span>
        </nav>
      </div>
    </footer>
  );
}

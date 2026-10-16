import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LifeBuoy } from "lucide-react";
import { useRoleFlags } from "@/hooks/useRole";

export function TicketsIndicator() {
  const { isBoard } = useRoleFlags();
  const { data } = useQuery({
    queryKey: ["tickets-indicator", isBoard],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("id, priority, status")
        .in("status", ["open", "in_progress", "waiting"]);
      if (error) return { count: 0, hasUrgent: false, hasHigh: false };
      return {
        count: data?.length ?? 0,
        hasUrgent: (data ?? []).some((t) => t.priority === "urgent"),
        hasHigh: (data ?? []).some((t) => t.priority === "high"),
      };
    },
  });
  const count = data?.count ?? 0;
  const color = data?.hasUrgent
    ? "bg-rose-500 shadow-[0_0_8px_2px_rgba(244,63,94,0.7)]"
    : data?.hasHigh
    ? "bg-amber-400 shadow-[0_0_8px_2px_rgba(251,191,36,0.6)]"
    : count > 0
    ? "bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.5)]"
    : "bg-muted-foreground/40";

  return (
    <Link
      to="/support"
      className="relative inline-flex items-center gap-1 px-3 py-2 text-muted-foreground hover:text-gold"
      title={isBoard ? "Triage support tickets" : "Get help"}
      activeProps={{ className: "relative inline-flex items-center gap-1 px-3 py-2 text-gold" }}
    >
      <LifeBuoy className="size-3.5" />
      <span className="hidden sm:inline">Support</span>
      <span className={`ml-1 inline-block size-2 rounded-full ${color}`} aria-hidden />
      {isBoard && count > 0 && (
        <span className="ml-1 rounded-full bg-rose-500/20 px-1.5 text-[10px] text-rose-200">{count}</span>
      )}
    </Link>
  );
}

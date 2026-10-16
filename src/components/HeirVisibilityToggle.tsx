import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useRoleFlags } from "@/hooks/useRole";

export function HeirVisibilityToggle({
  propertyId,
  visible,
  invalidateKeys = [],
}: {
  propertyId: string;
  visible: boolean;
  invalidateKeys?: unknown[][];
}) {
  const qc = useQueryClient();
  const { isOwner } = useRoleFlags();
  const [busy, setBusy] = useState(false);
  if (!isOwner) return null;

  const toggle = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("properties")
      .update({ visible_to_heir: !visible })
      .eq("id", propertyId);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(!visible ? "Khadija can now see this" : "Hidden from Khadija");
    qc.invalidateQueries({ queryKey: ["property", propertyId] });
    invalidateKeys.forEach((k) => qc.invalidateQueries({ queryKey: k }));
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-xs uppercase tracking-wider transition disabled:opacity-50 ${
        visible
          ? "border-rose-400/50 bg-rose-400/10 text-rose-200 hover:bg-rose-400/20"
          : "border-border text-muted-foreground hover:border-gold hover:text-gold"
      }`}
      title={visible ? "Click to hide from Khadija" : "Click to show to Khadija"}
    >
      {visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
      {visible ? "Visible to Khadija 💛" : "Hidden from Khadija"}
    </button>
  );
}

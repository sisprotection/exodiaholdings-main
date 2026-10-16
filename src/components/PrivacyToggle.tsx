import { Eye, EyeOff } from "lucide-react";
import { usePrivacy } from "@/lib/privacy";

export function PrivacyToggle() {
  const { privacyMode, togglePrivacy } = usePrivacy();
  return (
    <button
      onClick={togglePrivacy}
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-2 text-[10px] uppercase tracking-wider transition ${
        privacyMode
          ? "border-amber-400/50 bg-amber-400/10 text-amber-200"
          : "border-border/60 text-muted-foreground hover:border-gold hover:text-gold"
      }`}
      title={privacyMode ? "Privacy Mode ON — amounts & addresses hidden" : "Privacy Mode OFF — amounts visible"}
    >
      {privacyMode ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
      <span className="hidden sm:inline">{privacyMode ? "Private" : "Visible"}</span>
    </button>
  );
}

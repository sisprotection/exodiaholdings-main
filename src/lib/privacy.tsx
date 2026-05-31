import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Ctx = { privacyMode: boolean; togglePrivacy: () => void; setPrivacy: (v: boolean) => void };
const PrivacyCtx = createContext<Ctx | null>(null);

const KEY = "exodia.privacyMode";

export function PrivacyProvider({ children }: { children: ReactNode }) {
  // Secret by default — undefined storage means ON.
  const [privacyMode, setPrivacy] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const raw = window.localStorage.getItem(KEY);
    return raw === null ? true : raw === "1";
  });
  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(KEY, privacyMode ? "1" : "0");
  }, [privacyMode]);
  return (
    <PrivacyCtx.Provider value={{ privacyMode, setPrivacy, togglePrivacy: () => setPrivacy((v) => !v) }}>
      {children}
    </PrivacyCtx.Provider>
  );
}

export function usePrivacy() {
  const ctx = useContext(PrivacyCtx);
  if (!ctx) return { privacyMode: false, togglePrivacy: () => {}, setPrivacy: () => {} };
  return ctx;
}

/** Blurs sensitive content until clicked; reveals only that one element while held/clicked. */
export function Private({ children, as: As = "span", className = "" }: { children: ReactNode; as?: any; className?: string }) {
  const { privacyMode } = usePrivacy();
  const [revealed, setRevealed] = useState(false);
  if (!privacyMode) return <As className={className}>{children}</As>;
  return (
    <As
      onClick={(e: React.MouseEvent) => { e.stopPropagation(); e.preventDefault(); setRevealed((r) => !r); }}
      className={`cursor-pointer select-none rounded transition ${
        revealed ? "" : "blur-sm hover:blur-[2px] bg-foreground/5 px-1"
      } ${className}`}
      title={revealed ? "Click to hide" : "Click to reveal"}
    >
      {children}
    </As>
  );
}

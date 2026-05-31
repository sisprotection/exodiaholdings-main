import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Lock, Users, Heart, Menu, X, Settings as SettingsIcon } from "lucide-react";
import { Crest } from "./Crest";
import { useRoleFlags } from "@/hooks/useRole";
import { PrivacyToggle } from "./PrivacyToggle";
import { TicketsIndicator } from "./TicketsIndicator";

export function AppHeader() {
  const navigate = useNavigate();
  const { isBoard, isHeir } = useRoleFlags();
  const [open, setOpen] = useState(false);
  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  if (isHeir) {
    return (
      <header className="sticky top-0 z-20 border-b border-rose-400/20 bg-background/80 px-4 py-3 backdrop-blur-md sm:px-6 sm:py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link to="/for-khadija" className="flex items-center gap-3">
            <Crest size={32} />
            <div className="hidden sm:block">
              <div className="font-display text-base leading-none text-gold sm:text-lg">For Khadija</div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-rose-300/70">Daddy's Love Letter</div>
            </div>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link to="/for-khadija" className="inline-flex items-center gap-1 px-3 py-2 text-rose-200 hover:text-gold">
              <Heart className="size-3.5" /> My Page
            </Link>
            <TicketsIndicator />
            <button onClick={signOut} className="ml-1 inline-flex items-center gap-1.5 rounded-md border border-border/60 px-2.5 py-2 text-xs uppercase tracking-wider text-muted-foreground hover:border-gold hover:text-gold">
              <LogOut className="size-3.5" /><span className="hidden sm:inline">Sign out</span>
            </button>
          </nav>
        </div>
      </header>
    );
  }

  const navLinks = (
    <>
      <Link to="/dashboard" className="px-3 py-2 text-muted-foreground hover:text-gold" activeProps={{ className: "px-3 py-2 text-gold" }} onClick={() => setOpen(false)}>Dashboard</Link>
      <Link to="/properties" className="px-3 py-2 text-muted-foreground hover:text-gold" activeProps={{ className: "px-3 py-2 text-gold" }} onClick={() => setOpen(false)}>Holdings</Link>
      <Link to="/vault" className="inline-flex items-center gap-1 px-3 py-2 text-muted-foreground hover:text-gold" activeProps={{ className: "inline-flex items-center gap-1 px-3 py-2 text-gold" }} onClick={() => setOpen(false)}>
        <Lock className="size-3.5" /> Cabinet
      </Link>
      <Link to="/legacy" className="px-3 py-2 text-muted-foreground hover:text-gold" activeProps={{ className: "px-3 py-2 text-gold" }} onClick={() => setOpen(false)}>Legacy</Link>
      {isBoard && (
        <Link to="/board" className="inline-flex items-center gap-1 px-3 py-2 text-muted-foreground hover:text-gold" activeProps={{ className: "inline-flex items-center gap-1 px-3 py-2 text-gold" }} onClick={() => setOpen(false)}>
          <Users className="size-3.5" /> Board
        </Link>
      )}
      <Link to="/settings" className="inline-flex items-center gap-1 px-3 py-2 text-muted-foreground hover:text-gold" activeProps={{ className: "inline-flex items-center gap-1 px-3 py-2 text-gold" }} onClick={() => setOpen(false)}>
        <SettingsIcon className="size-3.5" /> Settings
      </Link>
      <TicketsIndicator />
    </>
  );

  return (
    <header className="sticky top-0 z-20 border-b border-border/40 bg-background/80 px-4 py-3 backdrop-blur-md sm:px-6 sm:py-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <Link to="/dashboard" className="flex items-center gap-2 sm:gap-3">
          <Crest size={32} />
          <div className="hidden md:block">
            <div className="font-display text-base leading-none text-gold sm:text-lg">Exodia Holdings</div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Holdings Command</div>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-0.5 text-sm">
          {navLinks}
        </nav>

        <div className="flex items-center gap-1.5">
          <PrivacyToggle />
          <button onClick={signOut} className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-border/60 px-2.5 py-2 text-[10px] uppercase tracking-wider text-muted-foreground hover:border-gold hover:text-gold">
            <LogOut className="size-3.5" /> Sign out
          </button>
          <button onClick={() => setOpen((v) => !v)} className="lg:hidden rounded-md border border-border/60 p-2 text-muted-foreground hover:text-gold" aria-label="Menu">
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {/* Mobile/tablet nav drawer */}
      {open && (
        <nav className="lg:hidden mt-3 flex flex-col gap-1 border-t border-border/40 pt-3 text-sm">
          {navLinks}
          <button onClick={signOut} className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground hover:border-gold hover:text-gold">
            <LogOut className="size-3.5" /> Sign out
          </button>
        </nav>
      )}
    </header>
  );
}

import { Link, useLocation } from "@tanstack/react-router";
import { LifeBuoy } from "lucide-react";

/**
 * Floating "Report an issue" button visible on every authenticated page.
 * Routes everyone (owner, VP, board, members, heirs) into the ticket system
 * so the tech department has a single inbox.
 */
export function ReportIssueFab() {
  const location = useLocation();
  // Hide on the support page itself
  if (location.pathname.startsWith("/support")) return null;

  return (
    <Link
      to="/support"
      title="Report a bug or request help — tech department"
      className="fixed bottom-5 right-5 z-30 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-background/90 px-4 py-2.5 text-xs uppercase tracking-wider text-gold shadow-lg shadow-black/40 backdrop-blur-md hover:gold-glow hover:border-gold sm:bottom-6 sm:right-6"
    >
      <LifeBuoy className="size-4" />
      <span className="hidden sm:inline">Report an issue</span>
      <span className="sm:hidden">Help</span>
    </Link>
  );
}

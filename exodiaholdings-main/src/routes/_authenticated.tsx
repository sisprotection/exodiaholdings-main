import { createFileRoute, Outlet, redirect, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";
import { useRoleFlags } from "@/hooks/useRole";
import { PrivacyProvider } from "@/lib/privacy";
import { ReportIssueFab } from "@/components/ReportIssueFab";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/" });
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const { isHeir, isLoading } = useRoleFlags();
  const location = useLocation();
  const navigate = useNavigate();

  // Heir is confined to /for-khadija
  useEffect(() => {
    if (isLoading) return;
    if (isHeir && location.pathname !== "/for-khadija") {
      navigate({ to: "/for-khadija", replace: true });
    }
  }, [isHeir, isLoading, location.pathname, navigate]);

  return (
    <PrivacyProvider>
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <main className="flex-1">
          <Outlet />
        </main>
        <Footer />
        <ReportIssueFab />
      </div>
    </PrivacyProvider>
  );
}

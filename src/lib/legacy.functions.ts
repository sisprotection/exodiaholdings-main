import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { TRUST } from "./legacy.server";

export const getTrustDetails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => TRUST);

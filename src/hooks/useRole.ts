import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "owner" | "vice_president" | "admin" | "trustee" | "member" | "heir";

export function useMyRoles() {
  return useQuery({
    queryKey: ["my-roles"],
    queryFn: async (): Promise<AppRole[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (error) throw error;
      return (data ?? []).map((r) => r.role as AppRole);
    },
  });
}

export function useRoleFlags() {
  const { data: roles = [], isLoading } = useMyRoles();
  const isOwner = roles.includes("owner");
  const isVP = roles.includes("vice_president");
  const isAdmin = roles.includes("admin");
  const isHeir = roles.includes("heir");
  const isBoard = isOwner || isVP || isAdmin;
  const topTitle: AppRole =
    isOwner ? "owner" : isVP ? "vice_president" : isAdmin ? "admin" : isHeir ? "heir" : roles[0] ?? "member";
  return { roles, isOwner, isVP, isAdmin, isHeir, isBoard, topTitle, isLoading };
}

// Back-compat
export function useIsOwner() {
  const { isOwner, isLoading } = useRoleFlags();
  return { isOwner, isLoading };
}

export function roleLabel(role: AppRole): string {
  switch (role) {
    case "owner": return "President / Owner";
    case "vice_president": return "Vice President";
    case "admin": return "Board Admin";
    case "trustee": return "Trustee";
    case "member": return "Member";
    case "heir": return "Heir (Family Monitor)";
  }
}

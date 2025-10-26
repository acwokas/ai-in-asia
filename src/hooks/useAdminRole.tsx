import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useAdminRole = () => {
  const { user } = useAuth();

  const { data: isAdmin, isLoading } = useQuery({
    queryKey: ["admin-role", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("has_role", {
          _user_id: user!.id,
          _role: "admin"
        });

      if (error) {
        console.error("Error checking admin role:", error);
        return false;
      }

      return data;
    },
  });

  return { isAdmin: isAdmin ?? false, isLoading };
};

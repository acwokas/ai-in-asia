import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import Header from "@/components/Header";
import { Loader2 } from "lucide-react";

export default function AdminLayout() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useAdminRole();
  const navigate = useNavigate();
  

  const loading = authLoading || adminLoading;

  useEffect(() => {
    if (loading) return;
    if (!user || !isAdmin) {
      toast.error("Access Denied", { description: "You don't have admin privileges." });
      navigate("/", { replace: true });
    }
  }, [loading, user, isAdmin, navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  return (
    <>
      <Header />
      <Outlet />
    </>
  );
}

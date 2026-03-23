import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Processing OAuth callback…");

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const error = searchParams.get("error");

      if (error) {
        setStatus("error");
        setMessage(`OAuth was denied: ${error}`);
        return;
      }

      if (!code || !state) {
        setStatus("error");
        setMessage("Missing authorization code or state.");
        return;
      }

      try {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/google-oauth?action=callback&code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
          { method: "GET" }
        );

        const data = await res.json();

        if (!res.ok || !data.success) {
          setStatus("error");
          setMessage(data.error || "Token exchange failed.");
          return;
        }

        setStatus("success");
        setMessage(`Successfully connected ${state.replace("_", " ")}!`);

        // Redirect back to analytics after 2s
        setTimeout(() => navigate("/admin/analytics/all"), 2000);
      } catch (err: any) {
        setStatus("error");
        setMessage(err.message || "An unexpected error occurred.");
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 p-8 max-w-md">
        {status === "loading" && (
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
        )}
        {status === "success" && (
          <CheckCircle2 className="h-12 w-12 mx-auto text-green-500" />
        )}
        {status === "error" && (
          <XCircle className="h-12 w-12 mx-auto text-destructive" />
        )}
        <p className="text-lg font-medium">{message}</p>
        {status === "error" && (
          <button
            onClick={() => navigate("/admin/analytics/all")}
            className="text-sm text-primary hover:underline"
          >
            Return to Analytics Dashboard
          </button>
        )}
      </div>
    </div>
  );
};

export default OAuthCallback;

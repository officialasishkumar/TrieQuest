import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Code2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const GoogleCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    const code = searchParams.get("code");
    if (!code) {
      toast.error("Google sign-in failed", { description: "No authorization code received." });
      navigate("/auth", { replace: true });
      return;
    }

    api
      .googleAuth(code)
      .then((response) => {
        setSession(response.accessToken, response.user);
        toast.success("Signed in with Google");
        navigate("/dashboard", { replace: true });
      })
      .catch(() => {
        toast.error("Google sign-in failed", { description: "Could not authenticate with Google. Please try again." });
        navigate("/auth", { replace: true });
      });
  }, [searchParams, navigate, setSession]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Code2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  );
};

export default GoogleCallback;

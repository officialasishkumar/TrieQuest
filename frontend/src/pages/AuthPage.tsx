import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Code2, Loader2, Lock, Mail, User, Workflow, Layers3, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { getAuthErrorContent } from "@/lib/auth-errors";
import type { GlobalStatsResponse } from "@/lib/types";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";

const buildGoogleOAuthUrl = () => {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: `${window.location.origin}/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [favoriteTopic, setFavoriteTopic] = useState("");
  const [favoritePlatform, setFavoritePlatform] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [stats, setStats] = useState<GlobalStatsResponse | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const navigate = useNavigate();
  const { isAuthenticated, isLoading, setSession } = useAuth();

  useEffect(() => {
    api.getGlobalStats().then(setStats).catch(console.error);
  }, []);

  const checkUsername = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = value.trim();
    if (trimmed.length < 3) {
      setUsernameStatus("idle");
      return;
    }

    setUsernameStatus("checking");
    debounceRef.current = setTimeout(async () => {
      try {
        const { available } = await api.checkUsername(trimmed);
        setUsernameStatus(available ? "available" : "taken");
      } catch {
        setUsernameStatus("idle");
      }
    }, 300);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Code2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = isLogin
        ? await api.login({ identifier, password })
        : await api.register({
            email,
            password,
            username,
            displayName,
            favoriteTopic: favoriteTopic || undefined,
            favoritePlatform: favoritePlatform || undefined,
          });

      setSession(response.accessToken, response.user);
      toast.success(isLogin ? "Welcome back!" : "Account created");
      navigate("/dashboard");
    } catch (error) {
      const content = getAuthErrorContent(error, isLogin ? "login" : "register");
      toast.error(content.title, content.description ? { description: content.description } : undefined);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <div className="hidden lg:flex lg:w-1/2 bg-foreground p-12 flex-col justify-between">
        <div className="flex items-center gap-2">
          <Code2 className="w-8 h-8 text-primary-foreground" />
          <span className="text-2xl font-semibold tracking-tight text-primary-foreground">TrieQuest</span>
        </div>
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
            className="text-5xl font-bold tracking-tight text-primary-foreground leading-tight"
          >
            The shared ledger of your
            <br />
            squad&apos;s coding grind.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: [0.2, 0, 0, 1] }}
            className="mt-6 text-lg text-primary-foreground/70 max-w-lg"
          >
            Share problem links from any platform. Track what your squad is solving.
            Analyze difficulty mix, platform loyalty, and practice velocity in one place.
          </motion.p>
        </div>
        <div className="flex items-center gap-8">
          {[
            { label: "Squads created", value: stats ? stats.groupsCreated.toLocaleString() : "..." },
            { label: "Problems shared", value: stats ? stats.problemsShared.toLocaleString() : "..." },
            { label: "Active members", value: stats ? stats.activeMembers.toLocaleString() : "..." },
          ].map((stat) => (
            <div key={stat.label}>
              <span className="text-2xl font-mono tabular-nums font-semibold text-primary-foreground">{stat.value}</span>
              <span className="block text-sm text-primary-foreground/60 mt-1">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
          className="w-full max-w-md"
        >
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <Code2 className="w-6 h-6 text-primary" />
            <span className="text-xl font-semibold tracking-tight">TrieQuest</span>
          </div>

          <h2 className="text-3xl font-bold tracking-tight">{isLogin ? "Welcome back" : "Create your account"}</h2>
          <p className="text-base text-muted-foreground mt-2">
            {isLogin ? "Sign in with your email or username." : "Join the squad ledger."}
          </p>

          {GOOGLE_CLIENT_ID && (
            <div className="mt-8">
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 text-base font-medium gap-3"
                onClick={() => {
                  window.location.href = buildGoogleOAuthUrl();
                }}
              >
                <GoogleIcon />
                Continue with Google
              </Button>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className={GOOGLE_CLIENT_ID ? "space-y-4" : "mt-8 space-y-4"}>
            {!isLogin && (
              <>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Name"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    className="pl-11 h-12 text-base"
                    required
                  />
                </div>
                <div>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Username"
                      value={username}
                      onChange={(event) => {
                        setUsername(event.target.value);
                        checkUsername(event.target.value);
                      }}
                      className={`pl-11 pr-10 h-12 text-base ${
                        usernameStatus === "taken"
                          ? "border-red-500 focus-visible:ring-red-500"
                          : usernameStatus === "available"
                            ? "border-green-500 focus-visible:ring-green-500"
                            : ""
                      }`}
                      required
                    />
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                      {usernameStatus === "checking" && (
                        <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                      )}
                      {usernameStatus === "available" && (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      )}
                      {usernameStatus === "taken" && (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  </div>
                  {usernameStatus === "taken" && (
                    <p className="text-sm text-red-500 mt-1">That username is already taken</p>
                  )}
                </div>
                <div className="relative">
                  <Layers3 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Favorite Topic (Optional)"
                    value={favoriteTopic}
                    onChange={(event) => setFavoriteTopic(event.target.value)}
                    className="pl-11 h-12 text-base"
                  />
                </div>
                <div className="relative">
                  <Workflow className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Favorite Platform (Optional)"
                    value={favoritePlatform}
                    onChange={(event) => setFavoritePlatform(event.target.value)}
                    className="pl-11 h-12 text-base"
                  />
                </div>
              </>
            )}
            {isLogin ? (
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Email or username"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  className="pl-11 h-12 text-base"
                  required
                />
              </div>
            ) : (
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="pl-11 h-12 text-base"
                  required
                />
              </div>
            )}
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="pl-11 h-12 text-base"
                required
              />
            </div>
            <Button type="submit" className="w-full h-12 text-base font-semibold gap-2 mt-2" disabled={isSubmitting}>
              {isSubmitting ? "Please wait" : isLogin ? "Sign in" : "Create account"}
              <ArrowRight className="w-5 h-5" />
            </Button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => { setIsLogin(!isLogin); setUsernameStatus("idle"); }}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AuthPage;

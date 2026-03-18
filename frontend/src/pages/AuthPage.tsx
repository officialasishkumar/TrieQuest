import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Code2, Lock, Mail, User, Workflow, Layers3 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { getAuthErrorContent } from "@/lib/auth-errors";
import type { GlobalStatsResponse } from "@/lib/types";

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
  const [stats, setStats] = useState<GlobalStatsResponse | null>(null);

  const navigate = useNavigate();
  const { isAuthenticated, isLoading, setSession } = useAuth();

  useEffect(() => {
    api.getGlobalStats().then(setStats).catch(console.error);
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

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
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
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className="pl-11 h-12 text-base"
                    required
                  />
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
              onClick={() => setIsLogin(!isLogin)}
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

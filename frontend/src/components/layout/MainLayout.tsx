import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, Building2, Code2, Eye, FlaskConical, LogOut, Moon, Plus, Sun, Swords, UserCircle, Users } from "lucide-react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { CreateGroupModal } from "@/components/CreateGroupModal";
import { DiscoverModal } from "@/components/DiscoverModal";
import { FriendsManager } from "@/components/FriendsManager";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useProblemNotifications } from "@/hooks/use-problem-notifications";
import { useTheme } from "@/hooks/use-theme";
import { api } from "@/lib/api";
import { useAppContext } from "@/lib/app-context";
import { useAuth } from "@/lib/auth";

export const MainLayout = () => {
  useProblemNotifications();

  const [friendsManagerTab, setFriendsManagerTab] = useState<"friends" | "requests" | "search" | null>(null);

  const { isDark, toggle: toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { activeGroup, setActiveGroup, showCreateGroup, setShowCreateGroup, showDiscover, setShowDiscover } = useAppContext();

  const friendRequestsQuery = useQuery({
    queryKey: ["friendRequests"],
    queryFn: api.listFriendRequests,
    refetchInterval: 10000,
  });

  const joinRequestsQuery = useQuery({
    queryKey: ["joinRequests", "incoming"],
    queryFn: api.listJoinRequests,
    refetchInterval: 15000,
  });

  const pendingRequestCount = friendRequestsQuery.data?.length ?? 0;

  const createGroupMutation = useMutation({
    mutationFn: ({ name, memberIds }: { name: string; memberIds: number[] }) =>
      api.createGroup({ name, memberIds }),
    onSuccess: (group) => {
      toast.success(`Squad "${group.name}" created`);
      setActiveGroup(group.id);
      void queryClient.invalidateQueries({ queryKey: ["groups"] });
      navigate("/dashboard");
      setShowCreateGroup(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Squad creation failed.");
    },
  });

  const navItems = [
    { icon: Code2, label: "Feed", path: "/dashboard" },
    { icon: Swords, label: "Battle", path: "/challenges" },
    { icon: Plus, label: "Add", action: () => setShowCreateGroup(true) },
    {
      icon: BarChart3,
      label: "Analytics",
      path: activeGroup ? `/analytics?groupId=${activeGroup}` : "/analytics",
      matchPath: "/analytics",
    },
    {
      label: "Profile",
      path: "/profile",
      icon: user?.avatarUrl
        ? () => (
            <div className="w-5 h-5 rounded-full overflow-hidden border border-primary/20 bg-secondary flex items-center justify-center">
              <img src={user.avatarUrl!} alt={user.displayName} className="w-full h-full object-cover" />
            </div>
          )
        : UserCircle,
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 bg-gradient-to-r from-background via-background to-primary/5 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate("/dashboard")}>
            <Code2 className="w-6 h-6 text-primary" />
            <span className="text-base font-semibold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              TrieQuest
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-9 w-9 p-0 relative ${friendsManagerTab ? "bg-accent text-accent-foreground" : ""}`}
                  onClick={() => setFriendsManagerTab(pendingRequestCount > 0 ? "requests" : "friends")}
                >
                  <Users className="w-4.5 h-4.5" />
                  {pendingRequestCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                      {pendingRequestCount}
                    </span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Friends</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-9 w-9 p-0 ${location.pathname.startsWith("/companies") ? "bg-accent text-accent-foreground" : ""}`}
                  onClick={() => navigate("/companies")}
                >
                  <Building2 className="w-4.5 h-4.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Company Problems</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-9 w-9 p-0 ${location.pathname.startsWith("/challenges") ? "bg-accent text-accent-foreground" : ""}`}
                  onClick={() => navigate("/challenges")}
                >
                  <Swords className="w-4.5 h-4.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Challenges</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-9 w-9 p-0 ${location.pathname.startsWith("/visualize") ? "bg-accent text-accent-foreground" : ""}`}
                  onClick={() => navigate("/visualize")}
                >
                  <Eye className="w-4.5 h-4.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Visualize</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-9 w-9 p-0 ${location.pathname.startsWith("/test-generator") ? "bg-accent text-accent-foreground" : ""}`}
                  onClick={() => navigate("/test-generator")}
                >
                  <FlaskConical className="w-4.5 h-4.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Test Generator</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-9 w-9 p-0 ${location.pathname.startsWith("/analytics") ? "bg-accent text-accent-foreground" : ""}`}
                  onClick={() => navigate(activeGroup ? `/analytics?groupId=${activeGroup}` : "/analytics")}
                >
                  <BarChart3 className="w-4.5 h-4.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Analytics</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={toggleTheme}>
                  {isDark ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isDark ? "Light Mode" : "Dark Mode"}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-9 w-9 p-0 ${location.pathname.startsWith("/profile") ? "bg-accent text-accent-foreground" : ""}`}
                  onClick={() => navigate("/profile")}
                >
                  {user?.avatarUrl ? (
                    <div className="w-6 h-6 rounded-full overflow-hidden border-2 border-primary/20 bg-secondary flex items-center justify-center">
                      <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <UserCircle className="w-4.5 h-4.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Profile</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0"
                  onClick={() => {
                    logout();
                    navigate("/auth");
                  }}
                >
                  <LogOut className="w-4.5 h-4.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Log Out</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full pb-14 md:pb-0 flex flex-col">
        <Outlet />
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm z-50 border-t">
        <div className="flex items-center justify-around h-14">
          {navItems.map((tab) => {
            const isActive = tab.path
              ? location.pathname === tab.path || (tab.matchPath && location.pathname.startsWith(tab.matchPath))
              : false;
            return (
              <button
                key={tab.label}
                onClick={() => {
                  if (tab.action) tab.action();
                  else if (tab.path) navigate(tab.path);
                }}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <AnimatePresence>
        {friendsManagerTab && (
          <FriendsManager initialTab={friendsManagerTab} onClose={() => setFriendsManagerTab(null)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showCreateGroup && (
          <CreateGroupModal
            onClose={() => setShowCreateGroup(false)}
            onCreate={(name, memberIds) =>
              createGroupMutation.mutateAsync({ name, memberIds }).then(() => undefined)
            }
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showDiscover && <DiscoverModal onClose={() => setShowDiscover(false)} />}
      </AnimatePresence>
    </div>
  );
};

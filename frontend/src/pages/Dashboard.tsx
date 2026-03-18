import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Filter, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AddProblemInput } from "@/components/AddProblemInput";
import { ManageGroupMembersModal } from "@/components/ManageGroupMembersModal";
import { ProblemCard } from "@/components/ProblemCard";
import { ProblemDetailsModal } from "@/components/ProblemDetailsModal";
import type { Group } from "@/components/GroupCard";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useAppContext } from "@/lib/app-context";
import { formatRelativeTime } from "@/lib/format";
import type { Problem } from "@/lib/types";
import { useGroupNotifications } from "@/hooks/use-group-notifications";
import { DashboardAnalytics } from "./Dashboard/DashboardAnalytics";
import { DashboardSidebar } from "./Dashboard/DashboardSidebar";

const Dashboard = () => {
  const { user } = useAuth();
  const { activeGroup, setActiveGroup, setShowCreateGroup } = useAppContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterText, setFilterText] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null);
  const [showManageMembers, setShowManageMembers] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const groupsQuery = useQuery({
    queryKey: ["groups"],
    queryFn: api.listGroups,
  });

  useEffect(() => {
    if (!groupsQuery.data?.length) {
      setActiveGroup(null);
      return;
    }

    const hasActive = groupsQuery.data.some((group) => group.id === activeGroup);
    if (!activeGroup || !hasActive) {
      setActiveGroup(groupsQuery.data[0].id);
    }
  }, [activeGroup, groupsQuery.data, setActiveGroup]);

  useEffect(() => {
    setSelectedProblem(null);
  }, [activeGroup]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && groupToDelete) setGroupToDelete(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [groupToDelete]);

  const problemsQuery = useQuery({
    queryKey: ["group", activeGroup, "problems"],
    queryFn: () => api.listGroupProblems(activeGroup as number),
    enabled: Boolean(activeGroup),
    refetchInterval: 30_000,
  });

  const analyticsQuery = useQuery({
    queryKey: ["group", activeGroup, "analytics", "30d"],
    queryFn: () => api.getGroupAnalytics(activeGroup as number, "30d"),
    enabled: Boolean(activeGroup),
  });

  const addProblemMutation = useMutation({
    mutationFn: (url: string) => api.addProblem(activeGroup as number, url),
    onSuccess: () => {
      toast.success("Problem added to the feed");
      void queryClient.invalidateQueries({ queryKey: ["group", activeGroup] });
      void queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Problem lookup failed.");
    },
  });

  const deleteProblemMutation = useMutation({
    mutationFn: (problemId: number) => api.removeGroupProblem(activeGroup as number, problemId),
    onSuccess: () => {
      toast.success("Problem removed from the squad");
      void queryClient.invalidateQueries({ queryKey: ["group", activeGroup] });
      void queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to remove problem");
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (groupId: number | string) => api.deleteGroup(Number(groupId)),
    onSuccess: (_, deletedGroupId) => {
      toast.success("Squad deleted successfully");
      setGroupToDelete(null);
      void queryClient.invalidateQueries({ queryKey: ["groups"] });
      if (activeGroup === Number(deletedGroupId)) {
        setActiveGroup(null);
        localStorage.removeItem("triequest-active-group");
      }
    },
    onError: () => {
      toast.error("Failed to delete squad");
      setGroupToDelete(null);
    },
  });

  const filteredGroups: Group[] = useMemo(
    () =>
      (groupsQuery.data ?? [])
        .filter((group) => group.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .map((group) => ({
          id: group.id,
          name: group.name,
          memberCount: group.memberCount,
          problemCount: group.problemCount,
          lastActive: formatRelativeTime(group.lastActiveAt),
          members: group.members,
          memberDetails: group.memberDetails,
          isOwner: group.isOwner,
        })),
    [groupsQuery.data, searchQuery]
  );

  const activeGroupSummary = groupsQuery.data?.find((group) => group.id === activeGroup) ?? null;
  const problems = (problemsQuery.data ?? []).map(
    (problem): Problem => ({
      id: problem.id,
      title: problem.title,
      contest: problem.contest ?? undefined,
      tags: problem.tags ?? undefined,
      difficulty: problem.difficulty,
      url: problem.url,
      platform: problem.platform,
      sharedBy: problem.sharedBy,
      thumbnailUrl: problem.thumbnailUrl ?? undefined,
      solvedByCount: problem.solvedByCount ?? undefined,
      sharedAt: problem.sharedAt,
    })
  );

  const filteredProblems = useMemo(() => {
    if (!filterText.trim()) return problems;
    const lower = filterText.toLowerCase();
    return problems.filter(
      (problem) =>
        problem.title.toLowerCase().includes(lower) ||
        (problem.contest ?? "").toLowerCase().includes(lower) ||
        problem.sharedBy.toLowerCase().includes(lower) ||
        problem.difficulty.toLowerCase().includes(lower) ||
        problem.platform.toLowerCase().includes(lower) ||
        (problem.tags ?? "").toLowerCase().includes(lower)
    );
  }, [problems, filterText]);

  useGroupNotifications(problems, activeGroupSummary?.name ?? null, activeGroup);

  const chartData = analyticsQuery.data;
  const weeklyTotal = chartData?.weeklyActivity.reduce((sum, entry) => sum + entry.problems, 0) ?? 0;
  const topDifficulty = chartData?.difficultyDistribution[0]?.name ?? "N/A";
  const topPlatform = chartData?.platformLoyalty[0]?.name ?? "N/A";

  return (
    <div className="flex flex-1 w-full">
      <DashboardSidebar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        setShowCreateGroup={setShowCreateGroup}
        filteredGroups={filteredGroups}
        activeGroup={activeGroup}
        setActiveGroup={setActiveGroup}
        setGroupToDelete={setGroupToDelete}
      />

      <main className="flex-1 min-w-0 pb-14 md:pb-0">
        <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                {activeGroupSummary?.name ?? "Create your first squad"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {activeGroupSummary
                  ? `${activeGroupSummary.memberCount} members · ${activeGroupSummary.problemCount} problems`
                  : "Start by creating a squad or invite friends to an existing one."}
              </p>
            </div>
            {activeGroup && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-sm gap-1 text-muted-foreground"
                  onClick={() => setShowManageMembers(true)}
                >
                  <Users className="w-3.5 h-3.5" /> Members
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-sm gap-1 text-muted-foreground"
                  onClick={() => navigate(`/analytics?groupId=${activeGroup}`)}
                >
                  Analytics <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>

          {activeGroup ? (
            <AddProblemInput onSubmit={(url) => addProblemMutation.mutateAsync(url).then(() => undefined)} />
          ) : (
            <div className="p-4 rounded-lg bg-card shadow-card text-base text-muted-foreground">
              Create a squad before sharing problems.
            </div>
          )}

          <div className="space-y-0.5">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                Recent Activity
              </span>
              <Button
                variant="ghost"
                size="sm"
                className={`h-6 w-6 p-0 hover:bg-transparent ${
                  showFilter ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => {
                  setShowFilter(!showFilter);
                  if (showFilter) setFilterText("");
                }}
                title="Filter problems"
              >
                <Filter className="w-3.5 h-3.5" />
              </Button>
            </div>

            <AnimatePresence>
              {showFilter && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-3 pb-3 pt-1 overflow-hidden"
                >
                  <Input
                    placeholder="Filter by title, contest, @username, difficulty, tags, or platform..."
                    value={filterText}
                    onChange={(event) => setFilterText(event.target.value)}
                    className="h-8 text-sm bg-secondary/30 border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/50"
                    autoFocus
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {filteredProblems.length === 0 ? (
              <div className="px-3 py-8 rounded-lg bg-card shadow-card text-base text-muted-foreground">
                {problems.length === 0 ? "No problems have been shared in this squad yet." : "No problems match your filter."}
              </div>
            ) : (
              filteredProblems.map((problem, index) => (
                <ProblemCard
                  key={problem.id}
                  problem={problem}
                  index={index}
                  onClick={() => setSelectedProblem(problem)}
                  onDelete={
                    activeGroupSummary?.isOwner || user?.username === problem.sharedBy
                      ? () => {
                          if (window.confirm(`Are you sure you want to remove '${problem.title}'?`)) {
                            deleteProblemMutation.mutate(Number(problem.id));
                          }
                        }
                      : undefined
                  }
                />
              ))
            )}
          </div>
        </div>
      </main>

      <DashboardAnalytics
        weeklyTotal={weeklyTotal}
        memberCount={activeGroupSummary?.memberCount ?? 0}
        topDifficulty={topDifficulty}
        topPlatform={topPlatform}
        chartData={chartData}
      />

      <AnimatePresence>
        {selectedProblem && <ProblemDetailsModal problem={selectedProblem} onClose={() => setSelectedProblem(null)} />}
      </AnimatePresence>

      <AnimatePresence>
        {showManageMembers && activeGroupSummary && (
          <ManageGroupMembersModal
            group={
              filteredGroups.find((group) => group.id === activeGroup) || {
                ...activeGroupSummary,
                id: activeGroupSummary.id,
                lastActive: "",
                memberDetails: activeGroupSummary.memberDetails,
              }
            }
            onClose={() => setShowManageMembers(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {groupToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setGroupToDelete(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-background rounded-xl p-6 shadow-elevated"
              onClick={(event) => event.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-2">Delete Squad</h3>
              <p className="text-muted-foreground text-sm mb-6">
                Are you sure you want to delete <span className="font-medium text-foreground">{groupToDelete.name}</span>? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setGroupToDelete(null)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => deleteGroupMutation.mutate(groupToDelete.id)}
                  disabled={deleteGroupMutation.isPending}
                >
                  {deleteGroupMutation.isPending ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;

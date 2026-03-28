import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import {
  Check,
  Clock,
  Compass,
  Crown,
  FileText,
  Loader2,
  Users,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const DiscoverPage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const topGroupsQuery = useQuery({
    queryKey: ["topGroups"],
    queryFn: api.getTopGroups,
  });

  const joinRequestsQuery = useQuery({
    queryKey: ["joinRequests", "incoming"],
    queryFn: api.listJoinRequests,
  });

  const requestJoinMutation = useMutation({
    mutationFn: (groupId: number) => api.requestJoinGroup(groupId),
    onSuccess: () => {
      toast.success("Join request sent!");
      void queryClient.invalidateQueries({ queryKey: ["topGroups"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to send request.");
    },
  });

  const acceptMutation = useMutation({
    mutationFn: (requestId: number) => api.acceptJoinRequest(requestId),
    onSuccess: () => {
      toast.success("Member added to squad!");
      void queryClient.invalidateQueries({ queryKey: ["joinRequests", "incoming"] });
      void queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to accept.");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (requestId: number) => api.rejectJoinRequest(requestId),
    onSuccess: () => {
      toast.success("Request rejected.");
      void queryClient.invalidateQueries({ queryKey: ["joinRequests", "incoming"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to reject.");
    },
  });

  const joinRequests = joinRequestsQuery.data ?? [];
  const topGroups = topGroupsQuery.data ?? [];

  return (
    <div className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Compass className="w-6 h-6 text-primary" />
          Discover Squads
        </h1>
        <p className="text-muted-foreground mt-1">
          Find top squads and request to join them.
        </p>
      </div>

      {joinRequests.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Pending Join Requests
            <span className="ml-1 inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-secondary text-secondary-foreground text-xs font-semibold">
              {joinRequests.length}
            </span>
          </h2>
          <div className="space-y-2">
            {joinRequests.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center overflow-hidden shrink-0">
                    {req.avatarUrl ? (
                      <img src={req.avatarUrl} alt={req.displayName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-semibold text-secondary-foreground">{req.displayName[0]}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      <span className="font-semibold">{req.displayName}</span>
                      <span className="text-muted-foreground"> @{req.username}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      wants to join <span className="font-medium text-foreground">{req.groupName}</span>
                      {" · "}
                      {formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="default"
                    className="h-8 gap-1"
                    onClick={() => acceptMutation.mutate(req.id)}
                    disabled={acceptMutation.isPending || rejectMutation.isPending}
                  >
                    <Check className="w-3.5 h-3.5" />
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1"
                    onClick={() => rejectMutation.mutate(req.id)}
                    disabled={acceptMutation.isPending || rejectMutation.isPending}
                  >
                    <X className="w-3.5 h-3.5" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </motion.section>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Crown className="w-5 h-5 text-yellow-500" />
          Top Squads
        </h2>

        {topGroupsQuery.isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : topGroups.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No squads to discover yet. Create one and invite your friends!</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {topGroups.map((group, index) => (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="flex items-center justify-between gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0">
                    {index + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{group.name}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {group.memberCount} {group.memberCount === 1 ? "member" : "members"}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" />
                        {group.problemCount} problems
                      </span>
                      <span className="flex items-center gap-1">
                        <Crown className="w-3.5 h-3.5" />
                        @{group.ownerUsername}
                      </span>
                      {group.lastActiveAt && (
                        <span className="hidden sm:flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDistanceToNow(new Date(group.lastActiveAt), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  {group.joinStatus === "member" ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">
                      <Check className="w-3 h-3" />
                      Joined
                    </span>
                  ) : group.joinStatus === "pending" ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-medium text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      Pending
                    </span>
                  ) : group.ownerUsername === user?.username ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">
                      <Crown className="w-3 h-3" />
                      Owner
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      className="h-8 gap-1.5"
                      onClick={() => requestJoinMutation.mutate(group.id)}
                      disabled={requestJoinMutation.isPending}
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Ask to Join
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default DiscoverPage;

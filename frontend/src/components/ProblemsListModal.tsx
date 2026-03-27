import { useEffect } from "react";
import { motion } from "framer-motion";
import { ExternalLink, Loader2, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { PlatformBadge } from "@/components/PlatformBadge";
import { getDifficultyColor, hexToRgba } from "@/lib/difficulty-colors";
import { formatRelativeTime } from "@/lib/format";
import type { Problem } from "@/lib/types";

type ProblemsListModalProps = {
  title: string;
  queryKey: unknown[];
  queryFn: () => Promise<Problem[]>;
  onClose: () => void;
};

export const ProblemsListModal = ({ title, queryKey, queryFn, onClose }: ProblemsListModalProps) => {
  const { data: problems = [], isLoading } = useQuery({ queryKey, queryFn });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center bg-background/60 p-4 pt-[8vh] backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
          <div>
            <h2 className="text-lg font-bold tracking-tight">{title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{problems.length} problems</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : problems.length === 0 ? (
            <div className="text-center py-16 text-sm text-muted-foreground">
              No problems shared yet.
            </div>
          ) : (
            <div className="divide-y">
              {problems.map((problem, i) => (
                <motion.a
                  key={problem.id}
                  href={problem.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-center gap-4 px-6 py-3.5 hover:bg-secondary/50 transition-colors group"
                >
                  <span className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center text-xs font-bold font-mono text-muted-foreground flex-shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-foreground block truncate group-hover:text-primary transition-colors">
                      {problem.title}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <PlatformBadge url={problem.url} size="sm" showLabel={false} />
                      <span className="text-xs text-muted-foreground truncate">
                        {problem.contest ?? problem.platform}
                      </span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">@{problem.sharedBy}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">{formatRelativeTime(problem.sharedAt)}</span>
                    </div>
                  </div>
                  <span
                    className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md flex-shrink-0"
                    style={{
                      backgroundColor: hexToRgba(getDifficultyColor(problem.platform, problem.difficulty), 0.15),
                      color: getDifficultyColor(problem.platform, problem.difficulty),
                    }}
                  >
                    {problem.difficulty}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary transition-colors flex-shrink-0" />
                </motion.a>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

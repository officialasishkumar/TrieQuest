import { Trash2 } from "lucide-react";
import { motion } from "framer-motion";

import { ProblemThumbnail } from "./ProblemThumbnail";
import { formatRelativeTime } from "@/lib/format";
import type { Problem } from "@/lib/types";

type ProblemCardProps = {
  problem: Problem;
  index?: number;
  onClick?: () => void;
  onDelete?: (event: React.MouseEvent) => void;
};

export const ProblemCard = ({ problem, index = 0, onClick, onDelete }: ProblemCardProps) => {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03, ease: [0.2, 0, 0, 1] }}
      className="group flex w-full items-center gap-3.5 rounded-xl px-3 py-3 text-left transition-colors duration-200 hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      onClick={onClick}
      aria-label={`Open details for ${problem.title}`}
    >
      <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 overflow-hidden">
        <ProblemThumbnail title={problem.title} url={problem.url} thumbnailUrl={problem.thumbnailUrl} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-base font-medium text-foreground truncate">{problem.title}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-sm text-muted-foreground truncate">{problem.contest ?? problem.platform}</span>
          <span className="text-sm text-muted-foreground">·</span>
          <span className="text-sm text-muted-foreground">@{problem.sharedBy}</span>
        </div>
      </div>

      <div className="relative flex items-center justify-end">
        <div
          className={`flex items-center gap-3 transition-opacity duration-200 ${
            onDelete ? "group-hover:opacity-0 group-focus-visible:opacity-0" : ""
          }`}
        >
          <span className="hidden sm:inline-flex text-xs font-mono px-2 py-0.5 rounded-md bg-secondary text-muted-foreground">
            {problem.difficulty}
          </span>

          <span className="text-[10px] font-mono tabular-nums text-muted-foreground/60 whitespace-nowrap">
            {formatRelativeTime(problem.sharedAt)}
          </span>
        </div>

        {onDelete && (
          <div
            onClick={(event) => {
              event.stopPropagation();
              onDelete(event);
            }}
            className="absolute right-0 p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-opacity opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 cursor-pointer flex items-center justify-center"
            title="Remove problem"
          >
            <Trash2 className="h-4 w-4" />
          </div>
        )}
      </div>
    </motion.button>
  );
};

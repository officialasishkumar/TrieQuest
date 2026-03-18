import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Link2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AddProblemInputProps = {
  onSubmit: (url: string) => Promise<void>;
};

export const AddProblemInput = ({ onSubmit }: AddProblemInputProps) => {
  const [url, setUrl] = useState("");
  const [isFetching, setIsFetching] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!url.trim() || isFetching) return;

    setIsFetching(true);
    try {
      await onSubmit(url);
      setUrl("");
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-card shadow-card">
        <Link2 className="w-5 h-5 text-muted-foreground ml-2 flex-shrink-0" />
        <Input
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="Paste a LeetCode, Codeforces, AtCoder, or CodeChef URL..."
          className="border-0 shadow-none focus-visible:ring-0 text-base bg-transparent px-0 h-9"
        />
        <AnimatePresence mode="wait">
          {isFetching ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="font-mono">Resolving...</span>
            </motion.div>
          ) : url.trim() ? (
            <motion.div
              key="submit"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ ease: [0.2, 0, 0, 1] }}
            >
              <Button type="submit" size="sm" className="h-8 px-3 text-sm gap-1">
                Share <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </form>
  );
};

import { motion } from "framer-motion";
import { Search, GitCompare, Layers, Link2, GitBranch, Grid3X3 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const algorithms = [
  { slug: "linear-search", title: "Linear Search", description: "Scan elements one by one until the target is found.", icon: Search, color: "text-blue-500" },
  { slug: "binary-search", title: "Binary Search", description: "Divide and conquer on a sorted array to find the target.", icon: GitCompare, color: "text-emerald-500" },
  { slug: "stack", title: "Stack", description: "Last-in first-out data structure with push, pop & peek.", icon: Layers, color: "text-purple-500" },
  { slug: "linked-list", title: "Linked List", description: "Dynamic nodes connected by pointers. Insert & delete anywhere.", icon: Link2, color: "text-orange-500" },
  { slug: "binary-tree", title: "Binary Tree", description: "Traverse a binary tree in pre-order, in-order, post-order & level-order.", icon: GitBranch, color: "text-pink-500" },
  { slug: "bfs-grid", title: "BFS Pathfinder", description: "Find the shortest path on a grid using breadth-first search.", icon: Grid3X3, color: "text-cyan-500" },
];

export default function VisualizePage() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-1 flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-secondary/20 w-full">
      <div className="w-full max-w-7xl mx-auto px-6 pt-10 pb-16 space-y-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold tracking-tight">Algorithm Visualizer</h1>
          <p className="text-muted-foreground mt-1">Interactive visualizations to understand algorithms & data structures.</p>
        </motion.div>
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/80">Pick an Algorithm</h2>
          <div className="h-px flex-1 bg-border/40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {algorithms.map((algo, i) => (
            <motion.div
              key={algo.slug}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="p-6 rounded-2xl bg-card border shadow-sm cursor-pointer group"
              onClick={() => navigate(`/visualize/${algo.slug}`)}
            >
              <div className={`w-10 h-10 rounded-xl bg-secondary flex items-center justify-center mb-4 ${algo.color} group-hover:scale-110 transition-transform`}>
                <algo.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold tracking-tight">{algo.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{algo.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

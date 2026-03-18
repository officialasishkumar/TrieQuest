import {
  AtCoderIcon,
  CodeChefIcon,
  CodeforcesIcon,
  CoderIcon,
  GenericPlatformIcon,
  GeeksForGeeksIcon,
  HackerRankIcon,
  LeetCodeIcon,
} from "./icons/PlatformIcons";

type PlatformBadgeProps = {
  url: string;
  size?: "sm" | "md";
  showLabel?: boolean;
};

const getPlatform = (url: string) => {
  if (url.includes("leetcode.com")) return { name: "LeetCode", icon: LeetCodeIcon, colorClass: "text-amber-500" };
  if (url.includes("codeforces.com")) return { name: "Codeforces", icon: CodeforcesIcon, colorClass: "text-blue-500" };
  if (url.includes("codechef.com")) return { name: "CodeChef", icon: CodeChefIcon, colorClass: "text-orange-500" };
  if (url.includes("atcoder.jp")) return { name: "AtCoder", icon: AtCoderIcon, colorClass: "text-cyan-500" };
  if (url.includes("hackerrank.com")) return { name: "HackerRank", icon: HackerRankIcon, colorClass: "text-emerald-500" };
  if (url.includes("geeksforgeeks.org")) {
    return { name: "GeeksForGeeks", icon: GeeksForGeeksIcon, colorClass: "text-green-600" };
  }
  if (url.includes("coderbyte.com") || url.includes("coder.com")) {
    return { name: "Coder", icon: CoderIcon, colorClass: "text-violet-500" };
  }
  return { name: "Platform", icon: GenericPlatformIcon, colorClass: "text-muted-foreground" };
};

export const PlatformBadge = ({ url, size = "sm", showLabel = true }: PlatformBadgeProps) => {
  const platform = getPlatform(url);
  const Icon = platform.icon;
  const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";

  return (
    <div
      className={`flex items-center gap-1.5 ${showLabel ? "px-2 py-0.5 rounded-md bg-secondary" : ""}`}
      title={!showLabel ? platform.name : undefined}
    >
      <Icon className={`${iconSize} ${platform.colorClass}`} />
      {showLabel && (
        <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          {platform.name}
        </span>
      )}
    </div>
  );
};

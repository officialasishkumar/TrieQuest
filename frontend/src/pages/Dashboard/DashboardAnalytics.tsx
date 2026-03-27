import { PlatformDifficultyBreakdown, PlatformLoyalty, StatCard, WeeklyActivity } from "@/components/AnalyticsCharts";
import type { Analytics } from "@/lib/types";

type DashboardAnalyticsProps = {
  weeklyTotal: number;
  memberCount: number;
  topDifficulty: string;
  topPlatform: string;
  chartData: Analytics | undefined;
};

export const DashboardAnalytics = ({
  weeklyTotal,
  memberCount,
  topDifficulty,
  topPlatform,
  chartData,
}: DashboardAnalyticsProps) => {
  return (
    <aside className="hidden lg:block w-80 xl:w-96 h-[calc(100vh-56px)] sticky top-14 overflow-y-auto border-l bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-secondary/20">
      <div className="p-6 space-y-8">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">Quick Stats</h2>
            <div className="h-px flex-1 bg-border/40" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="This week" value={String(weeklyTotal)} />
            <StatCard label="Members" value={String(memberCount)} />
            <StatCard label="Top difficulty" value={topDifficulty} />
            <StatCard label="Top platform" value={topPlatform} />
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">Active Times</h2>
            <div className="h-px flex-1 bg-border/40" />
          </div>
          <div className="p-5 rounded-xl bg-card border shadow-sm">
            <WeeklyActivity data={chartData?.weeklyActivity ?? []} />
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">Difficulty</h2>
            <div className="h-px flex-1 bg-border/40" />
          </div>
          <div className="p-5 rounded-xl bg-card border shadow-sm">
            <PlatformDifficultyBreakdown data={chartData?.platformDifficulty ?? []} />
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">Platform Loyalty</h2>
            <div className="h-px flex-1 bg-border/40" />
          </div>
          <div className="p-5 rounded-xl bg-card border shadow-sm">
            <PlatformLoyalty data={chartData?.platformLoyalty ?? []} />
          </div>
        </div>
      </div>
    </aside>
  );
};

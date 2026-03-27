import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PlatformMark } from "@/components/icons/PlatformIcons";
import { getTierColor } from "@/lib/difficulty-colors";
import type { DailyPoint, DistributionPoint, MonthlyPoint, PlatformDifficultyGroup, PlatformPoint } from "@/lib/types";

const chartColors = [
  "hsl(221.2, 83.2%, 53.3%)",
  "hsl(38, 92%, 50%)",
  "hsl(173, 80%, 40%)",
  "hsl(262, 83%, 58%)",
  "hsl(141, 73%, 42%)",
  "hsl(240, 4.8%, 80%)",
];

const withColors = (data: DistributionPoint[]) =>
  data.map((entry, index) => ({
    ...entry,
    color: chartColors[index % chartColors.length],
  }));

export const DifficultyDistribution = ({ data }: { data: DistributionPoint[] }) => {
  const difficultyData = withColors(data);

  if (!difficultyData.length) {
    return (
      <div>
        <h3 className="text-sm font-semibold tracking-tight text-foreground mb-3">Difficulty Mix</h3>
        <div className="text-sm text-muted-foreground">No problems available yet.</div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-semibold tracking-tight text-foreground mb-3">Difficulty Mix</h3>
      <div className="flex items-center gap-4">
        <div className="w-28 h-28">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={difficultyData}
                cx="50%"
                cy="50%"
                innerRadius={28}
                outerRadius={48}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
              >
                {difficultyData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-1.5">
          {difficultyData.map((difficulty) => (
            <div key={difficulty.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: difficulty.color }} />
                <span className="text-xs text-foreground">{difficulty.name}</span>
              </div>
              <span className="text-xs font-mono tabular-nums text-muted-foreground">{difficulty.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const PlatformDifficultyBreakdown = ({ data }: { data: PlatformDifficultyGroup[] }) => {
  if (!data.length) {
    return (
      <div>
        <h3 className="text-sm font-semibold tracking-tight text-foreground mb-3">Difficulty Analytics</h3>
        <div className="text-sm text-muted-foreground">No problems available yet.</div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-semibold tracking-tight text-foreground mb-4">Difficulty Analytics</h3>
      <div className="space-y-4">
        {data.map((group) => {
          const total = group.items.reduce((sum, i) => sum + i.count, 0);
          return (
            <div key={group.platform}>
              <div className="flex items-center gap-2 mb-1.5">
                <PlatformMark source={group.platform} className="h-3.5 w-3.5" decorative />
                <span className="text-xs font-medium text-foreground">{group.platform}</span>
                <span className="text-[10px] text-muted-foreground/60 ml-auto font-mono tabular-nums">
                  {total}
                </span>
              </div>
              <div className="flex h-2 rounded-full overflow-hidden bg-secondary gap-px">
                {group.items.map((item) => (
                  <div
                    key={item.tier}
                    className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-500"
                    style={{
                      width: `${item.percent}%`,
                      minWidth: item.percent > 0 ? "4px" : "0",
                      backgroundColor: getTierColor(group.platform, item.tier),
                    }}
                    title={`${item.tier}: ${item.count} (${item.percent}%)`}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                {group.items.map((item) => {
                  const color = getTierColor(group.platform, item.tier);
                  return (
                    <div key={item.tier} className="flex items-center gap-1">
                      <div
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">{item.tier}</span>
                      <span
                        className="text-[10px] font-mono tabular-nums font-semibold"
                        style={{ color }}
                      >
                        {item.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const PlatformLoyalty = ({ data }: { data: PlatformPoint[] }) => {
  if (!data.length) {
    return (
      <div>
        <h3 className="text-sm font-semibold tracking-tight text-foreground mb-3">Platform Loyalty</h3>
        <div className="text-sm text-muted-foreground">No platforms to compare yet.</div>
      </div>
    );
  }

  const maxProblems = Math.max(...data.map((entry) => entry.problems), 1);

  return (
    <div>
      <h3 className="text-sm font-semibold tracking-tight text-foreground mb-3">Platform Loyalty</h3>
      <div className="space-y-2">
        {data.map((entry, index) => (
          <div key={entry.name} className="flex items-center gap-3">
            <div className="flex w-28 min-w-0 items-center gap-2">
              <PlatformMark source={entry.name} className="h-4 w-4" decorative />
              <span className="text-xs text-foreground truncate">{entry.name}</span>
            </div>
            <div className="flex-1 h-5 bg-secondary rounded overflow-hidden">
              <div
                className="h-full rounded transition-all duration-500"
                style={{
                  width: `${(entry.problems / maxProblems) * 100}%`,
                  backgroundColor: chartColors[index % chartColors.length],
                }}
              />
            </div>
            <span className="text-xs font-mono tabular-nums text-muted-foreground w-8 text-right">
              {entry.problems}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const WeeklyActivity = ({ data }: { data: DailyPoint[] }) => {
  if (!data.length) {
    return (
      <div>
        <h3 className="text-sm font-semibold tracking-tight text-foreground mb-3">Weekly Activity</h3>
        <div className="text-sm text-muted-foreground">No activity yet.</div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-semibold tracking-tight text-foreground mb-3">Weekly Activity</h3>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barSize={16}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 4.8%, 92%)" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11, fill: "hsl(240, 3.8%, 46.1%)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "hsl(240, 3.8%, 46.1%)" }}
              axisLine={false}
              tickLine={false}
              width={24}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(0, 0%, 100%)",
                border: "none",
                borderRadius: "8px",
                boxShadow: "var(--shadow-elevated)",
                fontSize: "12px",
              }}
            />
            <Bar dataKey="problems" fill="hsl(221.2, 83.2%, 53.3%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export const StatCard = ({ label, value, change, onClick }: { label: string; value: string; change?: string; onClick?: () => void }) => (
  <div
    className={`p-3 rounded-lg bg-card shadow-card ${onClick ? "cursor-pointer hover:bg-secondary/60 transition-colors" : ""}`}
    onClick={onClick}
    role={onClick ? "button" : undefined}
    tabIndex={onClick ? 0 : undefined}
    onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") onClick(); } : undefined}
  >
    <span className="text-xs text-muted-foreground">{label}</span>
    <div className="flex items-baseline gap-2 mt-1">
      <span className="text-xl font-semibold tracking-tight text-foreground font-mono tabular-nums">{value}</span>
      {change && (
        <span className={`text-[11px] font-mono ${change.startsWith("+") ? "text-green-600" : "text-destructive"}`}>
          {change}
        </span>
      )}
    </div>
  </div>
);

export const MonthlyVolumeChart = ({ data }: { data: MonthlyPoint[] }) => {
  if (!data?.length) {
    return (
      <div>
        <h3 className="text-base font-semibold mb-6">Monthly Activity</h3>
        <div className="text-sm text-muted-foreground">No activity data yet.</div>
      </div>
    );
  }

  return (
    <>
      <h3 className="text-base font-semibold mb-6">Monthly Activity</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorProblems" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              dy={10}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              width={35}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                borderColor: "hsl(var(--border))",
                borderRadius: "12px",
                boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
              }}
            />
            <Area
              type="monotone"
              dataKey="problems"
              stroke="hsl(var(--primary))"
              strokeWidth={3}
              fill="url(#colorProblems)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </>
  );
};

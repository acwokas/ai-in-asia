import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TimePeriod, QuarterInfo } from "@/hooks/useDashboardTimePeriod";

interface Props {
  period: TimePeriod;
  onPeriodChange: (p: TimePeriod) => void;
  pastQuarters: QuarterInfo[];
  compareOffset: number;
  onCompareOffsetChange: (n: number) => void;
  currentQuarter: QuarterInfo;
}

export function DashboardTimePeriodSelector({
  period,
  onPeriodChange,
  pastQuarters,
  compareOffset,
  onCompareOffsetChange,
  currentQuarter,
}: Props) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      <Tabs
        value={period}
        onValueChange={(v) => onPeriodChange(v as TimePeriod)}
      >
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="30m" className="text-xs">Last 30 min</TabsTrigger>
          <TabsTrigger value="24h" className="text-xs">Past 24 hours</TabsTrigger>
          <TabsTrigger value="7d" className="text-xs">Past 7 days</TabsTrigger>
          <TabsTrigger value="quarter" className="text-xs">{currentQuarter.label}</TabsTrigger>
          <TabsTrigger value="compare" className="text-xs">Compare quarters</TabsTrigger>
        </TabsList>
      </Tabs>

      {period === "compare" && (
        <Select
          value={String(compareOffset)}
          onValueChange={(v) => onCompareOffsetChange(Number(v))}
        >
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue placeholder="Compare with…" />
          </SelectTrigger>
          <SelectContent>
            {pastQuarters.map((q, i) => (
              <SelectItem key={i + 1} value={String(i + 1)}>
                vs {q.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

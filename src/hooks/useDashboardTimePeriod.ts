import { useState, useMemo } from "react";
import { startOfQuarter, subQuarters, format } from "date-fns";

export type TimePeriod = "30m" | "24h" | "7d" | "quarter" | "compare";

export interface QuarterInfo {
  label: string;
  start: Date;
  end: Date;
}

function getQuarter(date: Date): QuarterInfo {
  const start = startOfQuarter(date);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 3);
  end.setMilliseconds(-1);
  const q = Math.ceil((start.getMonth() + 1) / 3);
  return { label: `Q${q} ${start.getFullYear()}`, start, end };
}

export function useDashboardTimePeriod() {
  const [period, setPeriod] = useState<TimePeriod>("quarter");
  const [compareOffset, setCompareOffset] = useState(1); // quarters back

  const currentQuarter = useMemo(() => getQuarter(new Date()), []);

  const pastQuarters = useMemo(() => {
    return [1, 2, 3, 4].map((i) => getQuarter(subQuarters(new Date(), i)));
  }, []);

  const comparisonQuarter = useMemo(
    () => getQuarter(subQuarters(new Date(), compareOffset)),
    [compareOffset],
  );

  const dateRange = useMemo<{ start: Date; end: Date }>(() => {
    const now = new Date();
    switch (period) {
      case "30m":
        return { start: new Date(now.getTime() - 30 * 60 * 1000), end: now };
      case "24h":
        return { start: new Date(now.getTime() - 24 * 60 * 60 * 1000), end: now };
      case "7d":
        return { start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), end: now };
      case "quarter":
      case "compare":
        return { start: currentQuarter.start, end: currentQuarter.end };
    }
  }, [period, currentQuarter]);

  return {
    period,
    setPeriod,
    dateRange,
    currentQuarter,
    comparisonQuarter,
    compareOffset,
    setCompareOffset,
    pastQuarters,
    isComparing: period === "compare",
  };
}

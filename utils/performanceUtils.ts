import { EnergyLevel, Session } from "@/types";

/**
 * Filters sessions based on a date range
 */
export function filterSessionsByDateRange(
  sessions: Session[],
  days: number,
): Session[] {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return sessions.filter((session) => new Date(session.date) >= cutoffDate);
}

/**
 * Calculates the completion rate for a set of sessions
 */
export function calculateCompletionRate(sessions: Session[]): number {
  if (sessions.length === 0) return 0;

  const completedSessions = sessions.filter((s) => s.sessionCompleted);
  return (completedSessions.length / sessions.length) * 100;
}

/**
 * Finds the most productive task based on completed duration
 */
export function findMostProductiveTask(sessions: Session[]): string {
  if (sessions.length === 0) return "N/A";

  const taskMap = new Map<string, number>();

  sessions.forEach((s) => {
    if (!s.taskType) return;
    const current = taskMap.get(s.taskType) || 0;
    taskMap.set(s.taskType, current + s.focusedUntilSkipped); //completedDuration was there
  });

  let mostProductiveTask = "N/A";
  let maxTime = 0;

  taskMap.forEach((time, task) => {
    if (time > maxTime) {
      maxTime = time;
      mostProductiveTask = task;
    }
  });

  return mostProductiveTask;
}

/**
 * Finds the best energy level based on average completion duration
 */
export function findBestEnergyLevel(sessions: Session[]): EnergyLevel | "N/A" {
  if (sessions.length === 0) return "N/A";

  const energyMap = new Map<EnergyLevel, { total: number; count: number }>();

  sessions.forEach((s) => {
    if (!s.energyLevel) return;
    const current = energyMap.get(s.energyLevel) || { total: 0, count: 0 };
    energyMap.set(s.energyLevel, {
      total: current.total + s.focusedUntilSkipped, //completedDuration was there
      count: current.count + 1,
    });
  });

  let bestEnergyLevel: EnergyLevel | "N/A" = "N/A";
  let bestAvg = 0;

  energyMap.forEach((data, level) => {
    const avg = data.total / data.count;
    if (avg > bestAvg) {
      bestAvg = avg;
      bestEnergyLevel = level;
    }
  });

  return bestEnergyLevel;
}

/**
 * Calculates daily focus time for the past week
 */
export function calculateDailyFocusTime(sessions: Session[]): {
  days: string[];
  values: number[];
} {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const values = Array(7).fill(0);

  sessions.forEach((session) => {
    const date = new Date(session.date);
    const dayIndex = date.getDay();
    values[dayIndex] += session.focusedUntilSkipped / 60; //convert to minutes
  });

  return { days, values };
}

/**
 * Determines if the performance trend is improving, declining, or neutral
 */
export function determinePerformanceTrend(
  sessions: Session[],
): "up" | "down" | "neutral" {
  if (sessions.length < 4) return "neutral";

  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const midpoint = Math.floor(sortedSessions.length / 2);
  const firstHalf = sortedSessions.slice(0, midpoint);
  const secondHalf = sortedSessions.slice(midpoint);

  const firstHalfCompletionRate =
    firstHalf.length > 0
      ? firstHalf.filter((s) => s.sessionCompleted).length / firstHalf.length
      : 0;

  const secondHalfCompletionRate =
    secondHalf.length > 0
      ? secondHalf.filter((s) => s.sessionCompleted).length / secondHalf.length
      : 0;

  if (secondHalfCompletionRate > firstHalfCompletionRate * 1.1) {
    return "up";
  } else if (secondHalfCompletionRate < firstHalfCompletionRate * 0.9) {
    return "down";
  }

  return "neutral";
}

/**
 * Formats seconds into a minutes display string
 */
/**
 * Formats minutes into a display string (e.g. "45 min" or "2.5 hrs")
 */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }
  const hours = minutes / 60;
  // If exact hour, don't show decimal (e.g. "2 hrs")
  if (hours % 1 === 0) {
    return `${hours} hrs`;
  }
  return `${hours.toFixed(1)} hrs`;
}

/**
 * Get sessions for a specific date range
 * @param startDaysAgo - Start of range (e.g. 13 for two weeks ago)
 * @param endDaysAgo - End of range (e.g. 7 for one week ago)
 */
/**
 * Get aggregated chart data based on time range
 */
export function getChartData(
  sessions: Session[],
  timeRange: "week" | "month" | "year",
): { labels: string[]; values: number[]; maxValue: number } {
  const labels: string[] = [];
  const values: number[] = [];
  const { startDate, endDate } = getPeriodDates(timeRange, 0);

  // Filter sessions first
  const rangeSessions = sessions.filter((s) => {
    const d = new Date(s.createdAt || s.date);
    return d >= startDate && d <= endDate;
  });

  if (timeRange === "week") {
    // 7 Days: Mon - Sun
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    labels.push(...days);

    // Initialize with 0
    const dayMap = new Array(7).fill(0);

    rangeSessions.forEach((s) => {
      const d = new Date(s.createdAt || s.date);
      // getDay: 0 (Sun) - 6 (Sat). We want 0 (Mon) - 6 (Sun)
      let dayIndex = d.getDay() - 1;
      if (dayIndex === -1) dayIndex = 6; // Sunday is 6

      dayMap[dayIndex] += s.sessionCompleted
        ? s.userSelectedDuration
        : s.focusedUntilSkipped;
    });
    values.push(...dayMap);
  } else if (timeRange === "month") {
    // 4-5 Weeks
    // Bucket by week number relative to start of month
    // OR simpler: Bucket by "Week 1", "Week 2"...

    // Let's create buckets for each week in the range
    let current = new Date(startDate);
    let weekIndex = 1;

    while (current <= endDate) {
      labels.push(`W${weekIndex}`);

      const weekStart = new Date(current);
      const weekEnd = new Date(current);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      // Sum sessions in this week
      const weeklySum = rangeSessions
        .filter((s) => {
          const d = new Date(s.createdAt || s.date);
          return d >= weekStart && d <= weekEnd;
        })
        .reduce(
          (acc, s) =>
            acc +
            (s.sessionCompleted
              ? s.userSelectedDuration
              : s.focusedUntilSkipped),
          0,
        );

      values.push(weeklySum);

      // Move to next week
      current.setDate(current.getDate() + 7);
      weekIndex++;
    }
  } else if (timeRange === "year") {
    // 12 Months
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    labels.push(...months);
    const monthMap = new Array(12).fill(0);

    rangeSessions.forEach((s) => {
      const d = new Date(s.createdAt || s.date);
      const monthIndex = d.getMonth(); // 0-11
      monthMap[monthIndex] += s.sessionCompleted
        ? s.userSelectedDuration
        : s.focusedUntilSkipped;
    });
    values.push(...monthMap);
  }

  const maxValue = Math.max(...values, 1);
  return { labels, values, maxValue };
}

/**
 * Filter sessions that fall within a specific start and end date
 */
export function filterSessionsInDateRange(
  sessions: Session[],
  startDate: Date,
  endDate: Date,
): Session[] {
  return sessions.filter((session) => {
    const date = new Date(session.createdAt || session.date);
    return date >= startDate && date <= endDate;
  });
}

/**
 * Get start and end dates for a specific period (week/month/year)
 * @param range TimeRange
 * @param periodsAgo 0 for current, 1 for previous, etc.
 */
export function getPeriodDates(
  range: "week" | "month" | "year",
  periodsAgo: number = 0,
): { startDate: Date; endDate: Date } {
  const now = new Date();
  let startDate = new Date(now);
  let endDate = new Date(now);

  if (range === "week") {
    // Current week starts on Monday
    const day = now.getDay(); // 0 is Sunday
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday

    // Set to Monday of current week
    startDate.setDate(diff);
    // Subtract weeks if needed
    startDate.setDate(startDate.getDate() - periodsAgo * 7);
    startDate.setHours(0, 0, 0, 0);

    // End date is Sunday of that week
    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
  } else if (range === "month") {
    // Set to 1st of current month
    startDate.setDate(1);
    // Subtract months
    startDate.setMonth(startDate.getMonth() - periodsAgo);
    startDate.setHours(0, 0, 0, 0);

    // End date is last day of that month
    endDate = new Date(startDate);
    endDate.setMonth(startDate.getMonth() + 1);
    endDate.setDate(0); // Last day of previous month
    endDate.setHours(23, 59, 59, 999);
  } else if (range === "year") {
    // Set to Jan 1st of current year
    startDate.setMonth(0, 1);
    // Subtract years
    startDate.setFullYear(startDate.getFullYear() - periodsAgo);
    startDate.setHours(0, 0, 0, 0);

    // End date is Dec 31st
    endDate = new Date(startDate);
    endDate.setFullYear(startDate.getFullYear() + 1);
    endDate.setDate(0); // Dec 31st (last day of previous year's Dec)
    endDate.setHours(23, 59, 59, 999);
  }

  return { startDate, endDate };
}

/**
 * Calculate period metrics for comparison
 */
export function calculatePeriodMetrics(sessions: Session[]) {
  if (sessions.length === 0) {
    return { totalFocusTime: 0, sessionCount: 0, completionRate: 0 };
  }

  const totalFocusTime = sessions.reduce((acc, s) => {
    return (
      acc +
      (s.sessionCompleted ? s.userSelectedDuration : s.focusedUntilSkipped)
    );
  }, 0);

  const completionRate = calculateCompletionRate(sessions);

  return {
    totalFocusTime,
    sessionCount: sessions.length,
    completionRate,
  };
}

/**
 * Calculate delta between current and previous period
 */
export function calculatePeriodDelta(
  current: number,
  previous: number,
): { delta: number; percentage: number; trend: "up" | "down" | "neutral" } {
  const delta = current - previous;

  if (previous === 0) {
    if (current === 0) {
      return { delta: 0, percentage: 0, trend: "neutral" };
    }
    return { delta, percentage: 100, trend: "up" };
  }

  const percentage = Math.round((delta / previous) * 100);

  let trend: "up" | "down" | "neutral" = "neutral";
  if (percentage > 5) trend = "up";
  else if (percentage < -5) trend = "down";

  return { delta, percentage, trend };
}

/**
 * Get heatmap data: Map of DateString -> Minutes
 */
export function getHeatmapData(
  sessions: Session[],
  daysCount: number = 100, // Default ~3 months
): { data: Record<string, number>; maxMinutes: number } {
  const data: Record<string, number> = {};
  let maxMinutes = 0;

  const today = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysCount);

  // Filter relevant sessions once
  const relevantSessions = sessions.filter((s) => {
    const d = new Date(s.createdAt || s.date);
    return d >= startDate && d <= today;
  });

  relevantSessions.forEach((s) => {
    const d = new Date(s.createdAt || s.date);
    const dateKey = d.toISOString().split("T")[0];

    // Aggregate minutes per day
    const duration = s.sessionCompleted
      ? s.userSelectedDuration
      : s.focusedUntilSkipped;
    data[dateKey] = (data[dateKey] || 0) + duration;
  });

  // Calculate max for scaling intensity
  Object.values(data).forEach((mins) => {
    if (mins > maxMinutes) maxMinutes = mins;
  });

  return { data, maxMinutes };
}

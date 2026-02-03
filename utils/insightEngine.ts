import { Session } from "@/types";

/**
 * Insights calculated from session data
 */
export interface InsightData {
  energyCorrelation: {
    highEnergyAvg: number;
    lowEnergyAvg: number;
    diffPercent: number;
    isSignificant: boolean;
  };
  timeOfDay: {
    bestPeriod: "Morning" | "Afternoon" | "Evening" | "Night" | "N/A";
    morningAvg: number;
    afternoonAvg: number;
    eveningAvg: number;
    nightAvg: number;
  };
  streak: {
    current: number;
    best: number;
  };
}

/**
 * Calculate correlation between energy level and focus duration
 */
export function calculateEnergyCorrelation(sessions: Session[]) {
  const highSessions = sessions.filter((s) => s.energyLevel === "high");
  const lowSessions = sessions.filter((s) => s.energyLevel === "low");

  const getAvg = (list: Session[]) => {
    if (list.length === 0) return 0;
    const total = list.reduce(
      (acc, s) =>
        acc +
        (s.sessionCompleted ? s.userSelectedDuration : s.focusedUntilSkipped),
      0,
    );
    return total / list.length;
  };

  const highAvg = getAvg(highSessions);
  const lowAvg = getAvg(lowSessions);

  let diffPercent = 0;
  if (lowAvg > 0) {
    diffPercent = Math.round(((highAvg - lowAvg) / lowAvg) * 100);
  } else if (highAvg > 0) {
    diffPercent = 100; // Arbitrary 100% better if low is 0
  }

  return {
    highEnergyAvg: highAvg,
    lowEnergyAvg: lowAvg,
    diffPercent,
    isSignificant: Math.abs(diffPercent) > 10 && highSessions.length > 2,
  };
}

/**
 * Determine best time of day for focus
 */
export function calculateTimeOfDayPattern(sessions: Session[]) {
  const buckets = {
    Morning: { total: 0, count: 0 }, // 5am - 12pm
    Afternoon: { total: 0, count: 0 }, // 12pm - 5pm
    Evening: { total: 0, count: 0 }, // 5pm - 9pm
    Night: { total: 0, count: 0 }, // 9pm - 5am
  };

  sessions.forEach((s) => {
    const d = new Date(s.createdAt || s.date);
    const hour = d.getHours();
    const duration = s.sessionCompleted
      ? s.userSelectedDuration
      : s.focusedUntilSkipped;

    if (hour >= 5 && hour < 12) {
      buckets.Morning.total += duration;
      buckets.Morning.count++;
    } else if (hour >= 12 && hour < 17) {
      buckets.Afternoon.total += duration;
      buckets.Afternoon.count++;
    } else if (hour >= 17 && hour < 21) {
      buckets.Evening.total += duration;
      buckets.Evening.count++;
    } else {
      buckets.Night.total += duration;
      buckets.Night.count++;
    }
  });

  const getAvg = (b: { total: number; count: number }) =>
    b.count > 0 ? b.total / b.count : 0;

  const avgs = {
    Morning: getAvg(buckets.Morning),
    Afternoon: getAvg(buckets.Afternoon),
    Evening: getAvg(buckets.Evening),
    Night: getAvg(buckets.Night),
  };

  let bestPeriod: keyof typeof avgs | "N/A" = "N/A";
  let maxAvg = 0;

  (Object.keys(avgs) as Array<keyof typeof avgs>).forEach((key) => {
    if (avgs[key] > maxAvg) {
      maxAvg = avgs[key];
      bestPeriod = key;
    }
  });

  return {
    bestPeriod: maxAvg > 0 ? bestPeriod : "N/A",
    morningAvg: avgs.Morning,
    afternoonAvg: avgs.Afternoon,
    eveningAvg: avgs.Evening,
    nightAvg: avgs.Night,
  };
}

/**
 * Calculate current and best daily streaks
 */
export function calculateStreak(sessions: Session[]) {
  if (sessions.length === 0) return { current: 0, best: 0 };

  // Get unique dates
  const dates = Array.from(
    new Set(
      sessions.map(
        (s) => new Date(s.createdAt || s.date).toISOString().split("T")[0],
      ),
    ),
  ).sort();

  if (dates.length === 0) return { current: 0, best: 0 };

  // Calculate Best Streak
  let best = 1;
  let currentRun = 1;

  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diffTime = Math.abs(curr.getTime() - prev.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      currentRun++;
    } else {
      currentRun = 1;
    }
    if (currentRun > best) best = currentRun;
  }

  // Calculate Current Streak (working backwards from today)
  const today = new Date().toISOString().split("T")[0];
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = yesterdayDate.toISOString().split("T")[0];

  const lastActiveDate = dates[dates.length - 1];
  let currentStreak = 0;

  // If user hasn't focused today or yesterday, streak is 0
  if (lastActiveDate !== today && lastActiveDate !== yesterday) {
    currentStreak = 0;
  } else {
    // Count backwards
    currentStreak = 1;
    let expectedDate = new Date(lastActiveDate);

    for (let i = dates.length - 2; i >= 0; i--) {
      expectedDate.setDate(expectedDate.getDate() - 1); // Go back 1 day
      const expectedDateStr = expectedDate.toISOString().split("T")[0];

      if (dates[i] === expectedDateStr) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  return { current: currentStreak, best };
}

export function generateInsights(sessions: Session[]): InsightData {
  return {
    energyCorrelation: calculateEnergyCorrelation(sessions),
    timeOfDay: calculateTimeOfDayPattern(sessions),
    streak: calculateStreak(sessions),
  };
}

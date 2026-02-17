/**
 * RL Capacity Tracking
 *
 * Part of the Reinforcement Learning system. Tracks actual focus duration
 * vs. selected duration to detect trends and adjust challenge levels.
 */
import { EnergyLevel } from "@/types";
import { roundToNearest5 } from "@/utils/time";
import { loadCapacity, saveCapacity } from "./storage";
import { CAPACITY_HISTORY_LIMIT, CapacityStats } from "./types";

/**
 * Calculate trend from recent sessions.
 */
function calculateTrend(
  sessions: CapacityStats["recentSessions"],
): CapacityStats["trend"] {
  if (sessions.length < 3) return "stable";

  const recent = sessions.slice(-5);
  const ratios = recent.map((s) => s.actualFocusTime / s.selectedDuration);

  // Linear regression on ratios
  const n = ratios.length;
  const sumX = (n * (n - 1)) / 2;
  const sumY = ratios.reduce((a, b) => a + b, 0);
  const sumXY = ratios.reduce((sum, y, x) => sum + x * y, 0);
  const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

  if (slope > 0.05) return "growing";
  if (slope < -0.05) return "declining";
  return "stable";
}

/**
 * Get capacity stats for a context.
 */
export async function getCapacityStats(
  contextKey: string,
): Promise<CapacityStats> {
  const capacityState = await loadCapacity();

  if (!capacityState[contextKey]) {
    return {
      recentSessions: [],
      averageCapacity: 0,
      completionRate: 0,
      trend: "stable",
    };
  }

  return {
    ...capacityState[contextKey],
    recentSessions: capacityState[contextKey].recentSessions || [],
  };
}

/**
 * Update capacity stats after a session.
 */
export async function updateCapacityStats(
  contextKey: string,
  selectedDuration: number,
  actualFocusTime: number,
  completed: boolean,
): Promise<void> {
  const capacityState = await loadCapacity();

  if (!capacityState[contextKey]) {
    capacityState[contextKey] = {
      recentSessions: [],
      averageCapacity: 0,
      completionRate: 0,
      trend: "stable",
    };
  } else if (!capacityState[contextKey].recentSessions) {
    capacityState[contextKey].recentSessions = [];
  }

  const stats = capacityState[contextKey];

  // Add new session
  stats.recentSessions.push({
    selectedDuration,
    actualFocusTime,
    completed,
    timestamp: Date.now(),
  });

  // Trim to limit
  if (stats.recentSessions.length > CAPACITY_HISTORY_LIMIT) {
    stats.recentSessions = stats.recentSessions.slice(-CAPACITY_HISTORY_LIMIT);
  }

  // Recalculate stats
  const totalFocusTime = stats.recentSessions.reduce(
    (sum, s) => sum + s.actualFocusTime,
    0,
  );
  stats.averageCapacity = totalFocusTime / stats.recentSessions.length;

  const completedCount = stats.recentSessions.filter((s) => s.completed).length;
  stats.completionRate = completedCount / stats.recentSessions.length;

  stats.trend = calculateTrend(stats.recentSessions);

  await saveCapacity(capacityState);

  console.log("[RL] Capacity updated for", contextKey, ":", {
    avgCapacity: stats.averageCapacity.toFixed(1),
    completionRate: (stats.completionRate * 100).toFixed(0) + "%",
    trend: stats.trend,
  });
}

/**
 * Adjust recommendation based on capacity.
 * @param modelRec - The model's recommendation
 * @param stats - User's capacity statistics
 * @param energyLevel - Current energy level (affects stretch thresholds)
 */
export function adjustForCapacity(
  modelRec: number,
  stats: CapacityStats,
  energyLevel: EnergyLevel = "mid",
): number {
  // Not enough data
  if (!stats.recentSessions || stats.recentSessions.length < 3) return modelRec;

  // If user consistently quits early, recommend their actual capacity
  if (stats.completionRate < 0.5) {
    const adjusted = roundToNearest5(stats.averageCapacity);
    console.log(
      "[RL] Capacity adjustment: user struggling, recommending",
      adjusted,
      "instead of",
      modelRec,
    );
    return Math.max(10, adjusted);
  }

  // Don't stretch if low energy - respect user's preference
  if (energyLevel === "low") {
    return modelRec;
  }

  // Stretch thresholds by energy level:
  // - High energy: stretch at 85% completion (more aggressive)
  // - Mid energy: stretch at 95% completion (conservative)
  const stretchThreshold = energyLevel === "high" ? 0.85 : 0.95;

  if (
    stats.completionRate >= stretchThreshold &&
    (stats.trend === "stable" || stats.trend === "growing")
  ) {
    const nudged = modelRec + 5;
    console.log(
      `[RL] Capacity stretch (${energyLevel} energy, ${(stats.completionRate * 100).toFixed(0)}% completion):`,
      modelRec,
      "→",
      nudged,
    );
    return nudged;
  }

  return modelRec;
}

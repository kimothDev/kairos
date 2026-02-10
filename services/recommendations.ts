import { EnergyLevel } from "@/types";
import { createContextKeyFromParts } from "@/utils/contextKey";
import { normalizeTask } from "@/utils/task";
import { roundToNearest5 } from "@/utils/time";
import { getModelState } from "./rl";

/**
 * Recommendation interface for focus and break durations.
 */
export interface FocusRecommendation {
  focusDuration: number;
  breakDuration: number;
}

/**
 * Base recommendations by energy level.
 * These are used as heuristic starting points before the model has learned.
 */
const baseRecommendationsByEnergy: Record<EnergyLevel, FocusRecommendation> = {
  low: { focusDuration: 15, breakDuration: 5 },
  mid: { focusDuration: 25, breakDuration: 5 },
  high: { focusDuration: 35, breakDuration: 10 },
  "": { focusDuration: 25, breakDuration: 5 },
};

/**
 * Task-specific adjustments.
 * Only tasks that need adjustment are listed.
 */
const shortSessionTasks = ["meditating", "planning"];

/**
 * Reward calculation constants.
 */
export const REWARD_CONSTANTS = {
  RECOMMENDATION_BONUS: 0.15,
  SKIPPED_FOCUS_BASE: 0.4,
  SKIPPED_BREAK_BASE: 0.3,
  SKIPPED_BREAK_MULTIPLIER: 0.3,
  COMPLETED_BASE: 0.7,
  COMPLETED_MULTIPLIER: 0.3,
  IDEAL_MAX_DURATION: 60,
  EXCESS_PENALTY_MULTIPLIER: 0.1,
} as const;

/**
 * Get heuristic recommendations based on energy level and task type.
 *
 * NOTE: timeOfDay was removed from recommendations as it's redundant
 * with user-reported energy level. Energy directly captures focus capacity.
 */
export async function getRecommendations(
  energyLevel: EnergyLevel,
  taskType?: string,
): Promise<FocusRecommendation> {
  // Get the current model state to check observations
  const modelState = await getModelState();

  // Create context key (now without timeOfDay)
  const focusContextKey = createContextKeyFromParts(
    taskType,
    energyLevel,
    false,
  );
  const breakContextKey = createContextKeyFromParts(
    taskType,
    energyLevel,
    true,
  );

  // Get base recommendation for this energy level
  const recommendation = { ...baseRecommendationsByEnergy[energyLevel] };

  // Get number of observations for this context
  const focusParams = modelState[focusContextKey]?.[
    recommendation.focusDuration
  ] || { alpha: 1.5, beta: 1 };
  const totalObs = focusParams.alpha + focusParams.beta - 2.5;

  // Calculate rule-based fade factor (1.0 → 0.0 as observations increase)
  // After 5 sessions, heuristics have minimal influence
  const fadeFactor = Math.max(0, 1 - totalObs / 5);

  // Only apply task adjustments if we haven't learned enough
  if (fadeFactor > 0 && taskType) {
    const normalizedTask = normalizeTask(taskType);

    // Apply 0.8x multiplier for short session tasks
    if (shortSessionTasks.includes(normalizedTask)) {
      recommendation.focusDuration = roundToNearest5(
        recommendation.focusDuration * 0.8,
      );
    }
  }

  // Clamp and round the final focus duration
  recommendation.focusDuration = Math.min(
    60,
    Math.max(5, roundToNearest5(recommendation.focusDuration)),
  );

  // Normalize break time
  recommendation.breakDuration =
    recommendation.breakDuration <= 1
      ? 5
      : Math.min(
          20,
          Math.max(5, roundToNearest5(recommendation.breakDuration)),
        );

  return recommendation;
}

/**
 * Calculate reward based on session completion.
 *
 * @param sessionCompleted - Whether the user completed the full session
 * @param acceptedRecommendation - Whether user accepted our recommendation
 * @param focusedUntilSkipped - Actual minutes focused before skipping (or full duration)
 * @param userSelectedDuration - The duration user selected/accepted
 * @param recommendedDuration - What we recommended
 * @param skipReason - Why the session ended early
 */
export function calculateReward(
  sessionCompleted: boolean,
  acceptedRecommendation: boolean,
  focusedUntilSkipped: number,
  userSelectedDuration: number,
  recommendedDuration: number,
  skipReason: "skippedFocus" | "skippedBreak" | "none" = "none",
): number {
  const targetDuration = acceptedRecommendation
    ? recommendedDuration
    : userSelectedDuration;
  const focusRatio = Math.min(1, focusedUntilSkipped / targetDuration);

  let reward = 0;
  const recommendationBonus = acceptedRecommendation
    ? REWARD_CONSTANTS.RECOMMENDATION_BONUS
    : 0;

  // Handle different session outcomes
  if (skipReason === "skippedFocus") {
    // Skipped during focus: 0-0.4 range
    reward =
      REWARD_CONSTANTS.SKIPPED_FOCUS_BASE * focusRatio + recommendationBonus;
  } else if (skipReason === "skippedBreak") {
    // Skipped during break: 0.3-0.6 range
    reward =
      REWARD_CONSTANTS.SKIPPED_BREAK_BASE +
      REWARD_CONSTANTS.SKIPPED_BREAK_MULTIPLIER * focusRatio +
      recommendationBonus;
  } else if (sessionCompleted) {
    // Completed session: 0.7-1.0 range
    reward =
      REWARD_CONSTANTS.COMPLETED_BASE +
      REWARD_CONSTANTS.COMPLETED_MULTIPLIER * focusRatio +
      recommendationBonus;
  }

  // Penalize very long sessions
  if (targetDuration > REWARD_CONSTANTS.IDEAL_MAX_DURATION) {
    const excessPenalty =
      REWARD_CONSTANTS.EXCESS_PENALTY_MULTIPLIER *
      Math.min(
        1,
        (targetDuration - REWARD_CONSTANTS.IDEAL_MAX_DURATION) /
          REWARD_CONSTANTS.IDEAL_MAX_DURATION,
      );
    reward -= excessPenalty;
  }

  return Math.min(1, Math.max(0, reward));
}

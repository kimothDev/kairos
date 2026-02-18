/**
 * Session Planner
 *
 * High-level service that orchestrates session recommendations by combining
 * heuristic (rule-based) logic with Reinforcement Learning (Thompson Sampling).
 */
import { EnergyLevel } from "@/types";
import { FocusRecommendation, getRecommendations } from "./recommendations";
import {
    Context,
    getSmartBreakRecommendation,
    getSmartRecommendation,
} from "./rl";

/**
 * Get a complete session recommendation, combining
 * rule-based logic with personalized learning using contextual bandits.
 *
 * @param energyLevel - User's current energy level
 * @param taskType - Type of task being performed
 * @param dynamicFocusArms - Custom focus durations added by user
 * @returns { focusDuration, breakDuration } both in minutes
 */
export async function getSessionRecommendation(
  energyLevel: EnergyLevel,
  taskType: string,
  dynamicFocusArms: number[] = [],
  includeShortSessions: boolean = false,
): Promise<FocusRecommendation> {
  // Create context for bandits (simplified - no timeOfDay)
  const context: Context = {
    energyLevel,
    taskType: taskType || "default",
  };

  // Get base recommendation from rule-based system
  const baseRecommendation = await getRecommendations(
    energyLevel,
    taskType,
    includeShortSessions,
  );

  // Get smart recommendation from contextual bandits
  const smartFocus = await getSmartRecommendation(
    context,
    baseRecommendation.focusDuration,
    dynamicFocusArms,
    includeShortSessions,
  );

  // Get smart break - scaled to focus duration
  const smartBreak = await getSmartBreakRecommendation(
    context,
    baseRecommendation.breakDuration,
    smartFocus.value, // Pass focus duration to scale break options
    includeShortSessions,
  );

  return {
    focusDuration: smartFocus.value,
    breakDuration: smartBreak.value,
  };
}

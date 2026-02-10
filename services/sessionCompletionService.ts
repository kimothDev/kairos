import { MIN_SESSION_FOR_SAVE } from "@/constants/timer";
import { calculateReward } from "@/services/recommendations";
import {
    updateCapacityStats,
    updateModel,
    updateZoneData,
} from "@/services/rl";
import {
    createAndSaveSession,
    loadSessionsFromDB,
} from "@/services/sessionService";
import { EnergyLevel } from "@/types";
import {
    createBreakContext,
    createFocusContext,
    detectTimeOfDay,
    secondsToMinutes,
} from "@/utils/sessionUtils";

/**
 * Session Completion Service
 *
 * Consolidates the 3 duplicate session-saving flows into one unified service.
 * Handles: DB save, RL model updates, capacity stats, zone data.
 */

export type CompletionType = "completed" | "skippedFocus" | "skippedBreak";

export interface SessionCompletionParams {
  type: CompletionType;
  taskType: string;
  energyLevel: EnergyLevel;
  recommendedFocusDuration: number;
  recommendedBreakDuration: number;
  userAcceptedRecommendation: boolean;
  originalFocusDuration: number; // in seconds
  selectedBreakDuration: number; // in seconds
  focusedTime: number; // actual focused time in seconds (for skips)
}

/**
 * Complete a session - handles all 3 completion types.
 */
export async function completeSession(
  params: SessionCompletionParams,
): Promise<void> {
  const {
    type,
    taskType,
    energyLevel,
    recommendedFocusDuration,
    recommendedBreakDuration,
    userAcceptedRecommendation,
    originalFocusDuration,
    selectedBreakDuration,
    focusedTime,
  } = params;

  // Skip saving sessions that are too short (likely accidental starts)
  // Only applies to skipped sessions - completed sessions always get saved
  if (type !== "completed" && focusedTime < MIN_SESSION_FOR_SAVE) {
    console.log(
      `[Session] Skipping save: session too short (${focusedTime}s < ${MIN_SESSION_FOR_SAVE}s minimum)`,
    );
    return;
  }

  const focusTimeInMinutes = secondsToMinutes(focusedTime);
  const totalFocusDuration = secondsToMinutes(originalFocusDuration);
  const breakTimeInMinutes = secondsToMinutes(selectedBreakDuration);

  const sessionCompleted = type === "completed";
  const skipReason =
    type === "skippedFocus"
      ? "skippedFocus"
      : type === "skippedBreak"
        ? "skippedBreak"
        : undefined;

  // Calculate reward based on completion type
  const reward = sessionCompleted
    ? 1.0
    : calculateReward(
        false,
        userAcceptedRecommendation,
        focusTimeInMinutes,
        totalFocusDuration,
        recommendedFocusDuration,
        skipReason as "skippedFocus" | "skippedBreak",
      );

  // Create and save session to DB
  const newSession = await createAndSaveSession({
    taskType,
    energyLevel,
    timeOfDay: detectTimeOfDay(),
    recommendedDuration: recommendedFocusDuration,
    recommendedBreak: recommendedBreakDuration,
    userSelectedDuration: totalFocusDuration,
    userSelectedBreak: sessionCompleted ? breakTimeInMinutes : 0,
    acceptedRecommendation: userAcceptedRecommendation,
    sessionCompleted,
    focusedUntilSkipped: focusTimeInMinutes,
    reward,
    date: new Date().toISOString().split("T")[0],
    createdAt: new Date().toISOString(),
    skipReason,
  });

  // Update RL models
  const focusContext = createFocusContext(taskType, energyLevel);

  if (sessionCompleted) {
    // Completed session: update both focus and break models
    await updateModel(focusContext, focusTimeInMinutes, reward);

    const breakContext = createBreakContext(taskType, energyLevel);
    await updateModel(breakContext, breakTimeInMinutes, reward);

    // Update capacity stats
    await updateCapacityStats(
      `${taskType}|${energyLevel}`,
      focusTimeInMinutes,
      focusTimeInMinutes,
      true,
    );

    // Update zone data
    await updateZoneData(`${taskType}|${energyLevel}`, focusTimeInMinutes);
  } else if (type === "skippedFocus") {
    // Skipped focus: update capacity with actual focus time
    await updateCapacityStats(
      `${taskType}|${energyLevel}`,
      totalFocusDuration,
      focusTimeInMinutes,
      false,
    );
  } else if (type === "skippedBreak") {
    // Skipped break: update both models with 0 break
    await updateModel(focusContext, focusTimeInMinutes, reward);

    const breakContext = createBreakContext(taskType, energyLevel);
    await updateModel(breakContext, 0, reward);
  }
}

/**
 * Load sessions from database.
 */
export async function loadSessions(): Promise<import("@/types").Session[]> {
  return loadSessionsFromDB();
}

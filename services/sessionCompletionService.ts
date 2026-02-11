import { MIN_SESSION_FOR_SAVE } from "@/constants/timer";
import {
  applyCapacityScaling,
  calculateReward,
} from "@/services/recommendations";
import {
  getCapacityStats,
  getZoneActions,
  getZoneData,
  SPILLOVER_FACTOR,
  SPILLOVER_THRESHOLD,
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

  // Calculate base reward using the reward function for ALL session types
  const baseReward = calculateReward(
    sessionCompleted,
    userAcceptedRecommendation,
    focusTimeInMinutes,
    totalFocusDuration,
    recommendedFocusDuration,
    (skipReason as "skippedFocus" | "skippedBreak" | "none") ?? "none",
  );

  // Apply capacity scaling for completed sessions only
  // (don't double-penalize failed sessions)
  const contextKey = `${taskType}|${energyLevel}`;
  let reward = baseReward;

  if (sessionCompleted) {
    const capacityStats = await getCapacityStats(contextKey);
    reward = applyCapacityScaling(
      baseReward,
      focusTimeInMinutes,
      capacityStats.averageCapacity,
    );

    if (reward !== baseReward) {
      console.log(
        `[RL] Capacity scaling: ${baseReward.toFixed(3)} → ${reward.toFixed(3)}`,
        `(${focusTimeInMinutes}min vs avg ${capacityStats.averageCapacity.toFixed(1)}min)`,
      );
    }
  }

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
      contextKey,
      focusTimeInMinutes,
      focusTimeInMinutes,
      true,
    );

    // Update zone data
    await updateZoneData(contextKey, focusTimeInMinutes);

    // Upward spillover: warm up the next higher arm in the zone
    if (reward >= SPILLOVER_THRESHOLD) {
      const zoneData = await getZoneData(
        contextKey,
        energyLevel,
        focusTimeInMinutes,
      );
      const zoneActions = getZoneActions(zoneData.zone);

      // Find the next arm above the completed duration
      const nextArm = zoneActions.find((a) => a > focusTimeInMinutes);

      if (nextArm) {
        const spilloverReward = reward * SPILLOVER_FACTOR;
        await updateModel(focusContext, nextArm, spilloverReward);
        console.log(
          `[RL] Spillover: ${focusTimeInMinutes}min → ${nextArm}min`,
          `(reward ${spilloverReward.toFixed(3)})`,
        );
      }
    }
  } else if (type === "skippedFocus") {
    // Skipped focus: update capacity with actual focus time
    await updateCapacityStats(
      contextKey,
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

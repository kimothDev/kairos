/**
 * Session Completion Service
 *
 * Orchestrates the final steps of a focus session, including saving to DB,
 * updating RL models, and handling "spillover" learning for better recommendations.
 * Consolidates duplicate session-saving flows into one unified service.
 */
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

  const focusTimeInMinutes = secondsToMinutes(focusedTime);
  const totalFocusDuration = secondsToMinutes(originalFocusDuration);
  const breakTimeInMinutes = secondsToMinutes(selectedBreakDuration);

  // LOG SUMMARY: Explanatory view of the session choices
  const choiceStatus = userAcceptedRecommendation
    ? "TRUSTED: User followed the Smart Recommendation."
    : "CUSTOMIZED: User picked their own duration.";

  console.log(`\n--- 📊 Session Summary ---`);
  console.log(
    `Type: ${type.toUpperCase()} | Task: ${taskType} | Energy: ${energyLevel}`,
  );
  console.log(
    `Duration: ${totalFocusDuration}min (Target was ${recommendedFocusDuration}min)`,
  );
  console.log(`Status: ${choiceStatus}`);
  console.log(`--------------------------\n`);

  // Skip saving sessions that are too short (likely accidental starts)
  // Only applies to skipped sessions - completed sessions always get saved
  if (type !== "completed" && focusedTime < MIN_SESSION_FOR_SAVE) {
    console.log(
      `[RL] Skipping save: Session was only ${focusedTime}s. Too short to be useful for learning.`,
    );
    return;
  }

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

    if (reward < baseReward) {
      console.log(
        `[RL] ⚖️ Capacity Penalty: Reward reduced (${baseReward.toFixed(2)} → ${reward.toFixed(2)}).`,
        `Reason: ${focusTimeInMinutes}min is too easy compared to your average of ${capacityStats.averageCapacity.toFixed(1)}min.`,
      );
    } else if (reward > baseReward) {
      console.log(
        `[RL] ⭐ Capacity Bonus: Reward increased (${baseReward.toFixed(2)} → ${reward.toFixed(2)}).`,
        `Reason: Great job stretching your focus beyond your usual ${capacityStats.averageCapacity.toFixed(1)}min!`,
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
          `[RL] 📈 Spillover Learning: "Warming up" the ${nextArm}min option.`,
          `Success at ${focusTimeInMinutes}min suggest you might be ready for more!`,
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

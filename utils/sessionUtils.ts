/**
 * Session Utilities
 *
 * Helper functions for session lifecycle management, including context creation,
 * notification scheduling, session object factory, and reward calculation integration.
 */
import { insertSession } from "@/services/database";
import { calculateReward } from "@/services/recommendations";
import { Context, debugModel, loadModel, updateModel } from "@/services/rl";
import { getSessionRecommendation } from "@/services/sessionPlanner";
import { EnergyLevel } from "@/types";
import { createContextKey } from "@/utils/contextKey";
import * as Notifications from "expo-notifications";

// ============================================================================
// Context Helpers
// ============================================================================

/**
 * Create a focus context for RL model updates.
 */
export function createFocusContext(
  taskType: string,
  energyLevel: EnergyLevel,
): Context {
  return {
    taskType,
    energyLevel,
  };
}

/**
 * Create a break context for RL model updates.
 * Appends '-break' to the task type to differentiate from focus sessions.
 */
export function createBreakContext(
  taskType: string,
  energyLevel: EnergyLevel,
): Context {
  return {
    taskType: `${taskType}-break`,
    energyLevel,
  };
}

// ============================================================================
// Notification Helpers
// ============================================================================

/**
 * Cancel a scheduled notification safely.
 * Handles null/undefined IDs and swallows errors.
 */
export async function cancelScheduledNotification(
  notificationId: string | null,
): Promise<void> {
  if (notificationId) {
    await Notifications.cancelScheduledNotificationAsync(notificationId).catch(
      () => {},
    );
  }
}

/**
 * Schedule a timer completion notification.
 * @param durationSeconds - Time until notification fires
 * @param isBreakTime - Whether this is a break timer
 * @returns Notification ID or null if scheduling failed
 */
export async function scheduleTimerNotification(
  durationSeconds: number,
  isBreakTime: boolean,
): Promise<string | null> {
  const { Platform } = require("react-native");
  const triggerDate = new Date(Date.now() + durationSeconds * 1000);

  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: isBreakTime ? "Break Over!" : "Focus Complete!",
        body: isBreakTime
          ? "Ready for another focus session?"
          : "Time to take a break.",
        sound: true,
      },
      trigger: {
        type: "date",
        date: triggerDate,
        channelId: Platform.OS === "android" ? "default" : undefined,
      } as any,
    });
  } catch (error) {
    console.error("Failed to schedule notification:", error);
    return null;
  }
}

// ============================================================================
// Time Helpers
// ============================================================================

/**
 * Convert seconds to minutes (rounded).
 */
export function secondsToMinutes(seconds: number): number {
  return Math.round(seconds / 60);
}

/**
 * Detect time of day - kept for backward compatibility with database storage.
 */
export function detectTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

/**
 * Create a session object with all required fields.
 */
export function createSession(params: {
  taskType: string;
  energyLevel: EnergyLevel;
  recommendedDuration: number;
  recommendedBreak: number;
  userSelectedDuration: number;
  userSelectedBreak: number;
  acceptedRecommendation: boolean;
  sessionCompleted: boolean;
  focusedUntilSkipped: number;
  skipReason?: "skippedFocus" | "skippedBreak";
}) {
  return {
    ...params,
    timeOfDay: detectTimeOfDay(), // Still stored for historical data
    reward: calculateReward(
      params.sessionCompleted,
      params.acceptedRecommendation,
      params.focusedUntilSkipped,
      params.userSelectedDuration,
      params.recommendedDuration,
      params.skipReason,
    ),
    date: new Date().toISOString().split("T")[0],
    createdAt: new Date().toISOString(),
  };
}

/**
 * Create a session and update the RL model.
 */
export async function createSessionWithContext(
  context: Context,
  sessionData: {
    taskType: string;
    energyLevel: EnergyLevel;
    recommendedDuration: number;
    recommendedBreak: number;
    userSelectedDuration: number;
    userSelectedBreak: number;
    acceptedRecommendation: boolean;
    sessionCompleted: boolean;
    focusedUntilSkipped: number;
    skipReason?: "skippedFocus" | "skippedBreak";
  },
  store: any,
  modelActionOverride?: number,
) {
  const newSession = createSession(sessionData);
  await insertSession(newSession);
  await updateModel(
    context,
    modelActionOverride ?? (sessionData.focusedUntilSkipped || 0),
    newSession.reward,
  );
  await store.loadSessions();

  // Debug logging
  const model = await loadModel();
  const contextKey = createContextKey(context);
  const actions = Object.keys(model[contextKey] || {})
    .map(Number)
    .sort((a, b) => a - b);

  console.log(`\n=== Session Model Update ===`);
  console.log(`Context: ${contextKey}`);
  console.log("Action | Alpha | Beta | Mean | Observations");
  console.log("------------------------------------------");
  actions.forEach((action) => {
    const params = model[contextKey][action];
    if (!params) return;
    const { alpha, beta } = params;
    const mean = alpha / (alpha + beta);
    const observations = alpha + beta - 1.5 - 1.0;
    console.log(
      `${action.toString().padStart(5)} | ${alpha.toFixed(3).padStart(5)} | ${beta.toFixed(3).padStart(5)} | ${mean.toFixed(3).padStart(5)} | ${observations.toFixed(1)}`,
    );
  });
  console.log("");

  await debugModel();
  return newSession;
}

/**
 * Reset timer state after session ends.
 */
export function resetTimerState(set: any) {
  set({
    isActive: false,
    isBreakTime: false,
    taskType: undefined,
    energyLevel: undefined,
    userAcceptedRecommendation: false,
    hasInteractedWithTimer: false,
    hasDismissedRecommendationCard: false,
    showSkipConfirm: false,
    showSkip: false,
    showBreakModal: false,
    showTimeAdjust: false,
    time: 0,
    initialTime: 0,
    sessionStartTimestamp: undefined,
  });
}

/**
 * Update recommendations after energy or task changes.
 */
export async function updateRecommendations(
  energyLevel: EnergyLevel,
  taskType: string,
  set: any,
  dynamicFocusArms: number[],
  includeShortSessions: boolean = false,
) {
  try {
    const { focusDuration, breakDuration } = await getSessionRecommendation(
      energyLevel,
      taskType,
      dynamicFocusArms,
      includeShortSessions,
    );
    set({
      recommendedFocusDuration: focusDuration,
      recommendedBreakDuration: breakDuration,
      time: focusDuration * 60,
      initialTime: focusDuration * 60,
      userAcceptedRecommendation: false,
      hasDismissedRecommendationCard: false,
      hasInteractedWithTimer: false,
    });
  } catch (error) {
    console.error("Error getting session recommendation:", error);
  }
}

/**
 * Format time in seconds to minutes string.
 */
export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes} min`;
}

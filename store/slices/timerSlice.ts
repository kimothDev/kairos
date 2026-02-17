/**
 * Timer Slice
 *
 * Manages the core timer logic, including starting, pausing, canceling,
 * and completing focus and break sessions.
 */
import {
    MIN_SESSION_FOR_SAVE,
    TIME_ADJUSTMENT_STEP,
    TIMER_CONSTANTS,
} from "@/constants/timer";
import { getSmartBreakRecommendation } from "@/services/rl";
import {
    completeSession,
    CompletionType,
} from "@/services/sessionCompletionService";
import { EnergyLevel } from "@/types";
import {
    cancelScheduledNotification,
    resetTimerState,
    scheduleTimerNotification,
} from "@/utils/sessionUtils";
import { Vibration } from "react-native";
import { SliceCreator, TimerSlice } from "./sliceTypes";

const SPEED_FACTOR = 1;

/**
 * Internal helper to save a session and update state.
 * Encapsulates the logic for completing a session in the DB and updating the store.
 */
const saveSessionInternal = async (
  get: any,
  set: any,
  completionType: CompletionType,
  focusedTimeOverride?: number,
  selectedBreakDurationOverride?: number,
) => {
  const state = get();
  if (state.hasSavedSession) return;

  set({ hasSavedSession: true, sessionJustCompleted: true });

  try {
    const focusedTime = focusedTimeOverride ?? state.originalFocusDuration;
    const selectedBreakDuration =
      selectedBreakDurationOverride ?? state.selectedBreakDuration;

    await completeSession({
      type: completionType,
      taskType: state.taskType,
      energyLevel: state.energyLevel as EnergyLevel,
      recommendedFocusDuration: state.recommendedFocusDuration,
      recommendedBreakDuration: state.recommendedBreakDuration,
      userAcceptedRecommendation: state.userAcceptedRecommendation,
      originalFocusDuration: state.originalFocusDuration,
      selectedBreakDuration,
      focusedTime,
    });
    // Refresh sessions list
    get().loadSessions();
  } catch (error) {
    console.error("Error completing session:", error);
  }
};

export const createTimerSlice: SliceCreator<TimerSlice> = (set, get) => ({
  // State defaults
  isActive: false,
  isBreakTime: false,
  time: 0,
  initialTime: 0,
  focusSessionDuration: 0,
  sessionStartTimestamp: undefined,
  scheduledNotificationId: null,
  originalFocusDuration: 0,
  selectedBreakDuration: 5,

  // Actions
  startTimer: async () => {
    const state = get();
    const {
      taskType,
      energyLevel,
      time,
      recommendedFocusDuration,
      userAcceptedRecommendation,
      isBreakTime,
      sessionJustCompleted,
      notificationsEnabled,
      scheduledNotificationId,
    } = state;

    if (!taskType && !sessionJustCompleted) {
      get().showThemedAlert(
        "Missing Task",
        "Please select a task type before starting the timer.",
      );
      return;
    }

    if (!energyLevel && !sessionJustCompleted) {
      get().showThemedAlert(
        "Missing Mood",
        "Please select your focus mood before starting the timer.",
      );
      return;
    }

    await cancelScheduledNotification(scheduledNotificationId);

    let newNotificationId: string | null = null;
    if (notificationsEnabled) {
      const durationSeconds = Math.ceil(time / SPEED_FACTOR);
      newNotificationId = await scheduleTimerNotification(
        durationSeconds,
        isBreakTime,
      );
    }

    if (!isBreakTime) {
      // Re-calculate smart break based on ACTUAL selected time
      // This ensures that if the user customized focus (e.g. 10m),
      // the break recommendation respects the scaled options.
      const breakRec = await getSmartBreakRecommendation(
        { taskType: taskType!, energyLevel: energyLevel! },
        state.recommendedBreakDuration,
        Math.round(time / 60),
      );
      set({
        originalFocusDuration: time,
        recommendedBreakDuration: breakRec.value,
      });
    }

    set({
      isActive: true,
      showCancel: !isBreakTime,
      showSkip: isBreakTime,
      initialTime: time,
      sessionStartTimestamp: Date.now(),
      focusSessionDuration: time,
      hasSavedSession: false,
      userAcceptedRecommendation:
        userAcceptedRecommendation && time === recommendedFocusDuration * 60,
      sessionJustCompleted: false,
      scheduledNotificationId: newNotificationId,
    });

    if (!isBreakTime) {
      setTimeout(() => {
        if (get().isActive) {
          set({ showCancel: false, showSkip: true });
        }
      }, MIN_SESSION_FOR_SAVE * 1000);
    }
  },

  pauseTimer: () => set({ isActive: false }),

  cancelTimer: async () => {
    await cancelScheduledNotification(get().scheduledNotificationId);
    set({
      isActive: false,
      showCancel: false,
      showSkip: false,
      showTimeAdjust: false,
      time: 0,
      initialTime: 0,
      taskType: undefined,
      energyLevel: undefined,
      userAcceptedRecommendation: false,
      hasInteractedWithTimer: false,
      hasDismissedRecommendationCard: false,
      sessionStartTimestamp: undefined,
      scheduledNotificationId: null,
    });
  },

  skipTimer: () => set({ showSkipConfirm: true }),

  completeTimer: async () => {
    const state = get();
    // If we are in focus mode, we just finished it.
    if (!state.isBreakTime) {
      set({ sessionJustCompleted: true });
      resetTimerState(set);
      return;
    }

    // If we are in break mode, we finished the break essentially.
    // Wait, completeTimer called during break means break is done.
    // Logic: Save session with "completed" status.
    await saveSessionInternal(get, set, "completed");
    resetTimerState(set);
  },

  skipFocusSession: async (isSkippingBreak = false) => {
    const state = get();
    await cancelScheduledNotification(state.scheduledNotificationId);
    set({ scheduledNotificationId: null });

    const elapsedSeconds = state.focusSessionDuration - state.time;
    // Use original duration if skipping break (focus was done)
    const focusedTime = isSkippingBreak
      ? state.originalFocusDuration
      : elapsedSeconds;

    if (isNaN(focusedTime) || focusedTime < 0) {
      console.warn("Invalid skip time");
      return;
    }

    const type: CompletionType = isSkippingBreak
      ? "skippedBreak"
      : "skippedFocus";

    await saveSessionInternal(get, set, type, focusedTime);

    // Explicitly reset timer state after saving
    resetTimerState(set);
  },

  startBreak: async (duration) => {
    const state = get();

    if (duration === 0) {
      // User chose to skip break.
      // This means the focus session was completed, but they want no break.
      await saveSessionInternal(
        get,
        set,
        "skippedBreak",
        state.originalFocusDuration, // Focus was fully completed
        0, // Break duration is 0
      );

      resetTimerState(set);
      return;
    }

    // Start the break timer
    set({
      time: duration,
      initialTime: duration,
      isBreakTime: true,
      isActive: true,
      selectedBreakDuration: duration,
      showBreakModal: false,
    });

    get().startTimer();
  },

  adjustTime: (direction) => {
    const { includeShortSessions, time } = get();
    const currentMinutes = Math.floor(time / 60);

    const minMinutes = includeShortSessions
      ? TIMER_CONSTANTS.ADHD.MIN_FOCUS / 60
      : TIMER_CONSTANTS.DEFAULT.MIN_FOCUS / 60;
    const maxMinutes = includeShortSessions
      ? TIMER_CONSTANTS.ADHD.MAX_FOCUS / 60
      : TIMER_CONSTANTS.DEFAULT.MAX_FOCUS / 60;

    const newMinutes =
      direction === "up"
        ? Math.min(maxMinutes, currentMinutes + TIME_ADJUSTMENT_STEP / 60)
        : Math.max(minMinutes, currentMinutes - TIME_ADJUSTMENT_STEP / 60);

    set({
      time: newMinutes * 60,
      initialTime: newMinutes * 60,
      userAcceptedRecommendation: false,
    });
  },

  setTime: (duration) => {
    set({
      time: duration,
      initialTime: duration,
      userAcceptedRecommendation: false,
    });
  },

  getLiveTime: () => {
    const { isActive, sessionStartTimestamp, initialTime } = get();
    if (!isActive || !sessionStartTimestamp) return initialTime;

    // Note: SPEED_FACTOR is mainly for dev testing, default is 1 (seconds)
    const elapsed =
      Math.floor((Date.now() - sessionStartTimestamp) / 1000) * SPEED_FACTOR;
    return Math.max(initialTime - elapsed, 0);
  },

  restoreTimerState: () => {
    const state = get();
    if (!state.isActive || !state.sessionStartTimestamp) return;

    const elapsed =
      Math.floor((Date.now() - state.sessionStartTimestamp) / 1000) *
      SPEED_FACTOR;
    const remaining = state.initialTime - elapsed;

    if (remaining <= 0) {
      // Long vibrate for completion: 1s ON, 0.2s OFF, 1s ON
      Vibration.vibrate([0, 1000, 200, 1000]);
      set({ scheduledNotificationId: null });

      if (!state.isBreakTime) {
        // Focus done, time for break
        set({
          time: 0,
          isActive: false,
          isBreakTime: true,
          showBreakModal: true,
          sessionStartTimestamp: undefined,
        });
        return;
      }

      // Break done
      get().completeTimer();
    } else {
      set({ time: remaining, isActive: true });
    }
  },
});

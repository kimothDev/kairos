import {
  DEFAULT_TASKS,
  MIN_SESSION_FOR_SAVE,
  TIME_ADJUSTMENT_STEP,
  TIMER_CONSTANTS,
} from "@/constants/timer";
import {
  completeSession,
  CompletionType,
} from "@/services/sessionCompletionService";
import { getSessionRecommendation } from "@/services/sessionPlanner";
import {
  clearAllSessionsFromDB,
  loadSessionsFromDB,
} from "@/services/sessionService";
import { EnergyLevel, Session, TimerState } from "@/types";
import {
  cancelScheduledNotification,
  resetTimerState,
  scheduleTimerNotification,
  updateRecommendations,
} from "@/utils/sessionUtils";
import { normalizeTask } from "@/utils/task";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

const DYNAMIC_ARMS_KEY = "dynamic_focus_arms";
const SPEED_FACTOR = 100;

interface TimerStoreState extends TimerState {}

// Helper to centralize session saving logic
const saveAndCompleteSession = async (
  get: () => TimerStoreState,
  set: (partial: Partial<TimerStoreState>) => void,
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
    get().loadSessions();
  } catch (error) {
    console.error("Error completing session:", error);
  }

  // Only reset if we're not starting a break immediately (handled by caller if needed)
  if (completionType !== "completed" || !state.isBreakTime) {
    resetTimerState(set);
  }
};

/**
 * Timer Store - Facade Pattern
 *
 * This store maintains the same public API but delegates to focused sub-stores
 * and services internally. Components continue to use useTimerStore() as before.
 */
const useTimerStore = create<TimerStoreState>()(
  persist(
    (set, get) => ({
      // ============================================================================
      // STATE
      // ============================================================================

      // Timer state
      isActive: false,
      isBreakTime: false,
      time: 0,
      initialTime: 0,
      focusSessionDuration: 0,
      sessionStartTimestamp: undefined,
      scheduledNotificationId: null,
      originalFocusDuration: 0,
      selectedBreakDuration: 5,

      // Session context
      taskType: "",
      energyLevel: "",
      sessions: [] as Session[],
      isLoading: false,
      hasSavedSession: false,
      sessionJustCompleted: false,

      // Recommendations
      recommendedFocusDuration: 25,
      recommendedBreakDuration: 5,
      userAcceptedRecommendation: true,

      // UI state
      showTimeAdjust: false,
      showCancel: false,
      showSkip: false,
      showTaskModal: false,
      showBreakModal: false,
      showSkipConfirm: false,
      hasInteractedWithTimer: false,
      hasDismissedRecommendationCard: false,

      // Settings
      previousTasks: [],
      includeShortSessions: false,
      dynamicFocusArms: [],
      notificationsEnabled: false,

      // ============================================================================
      // SESSION ACTIONS
      // ============================================================================

      loadSessions: async () => {
        set({ isLoading: true });
        try {
          const sessions = await loadSessionsFromDB();
          set({ sessions, isLoading: false });
        } catch (error) {
          console.error("Failed to load sessions:", error);
          set({ isLoading: false });
        }
      },

      clearAllSessions: async () => {
        set({ isLoading: true });
        try {
          await clearAllSessionsFromDB();
          set({ sessions: [], isLoading: false });
        } catch (error) {
          console.error("Failed to clear sessions:", error);
          set({ isLoading: false });
        }
      },

      // ============================================================================
      // TIMER ACTIONS
      // ============================================================================

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
          alert("Please select a task type before starting the timer.");
          return;
        }

        if (!energyLevel && !sessionJustCompleted) {
          alert("Please select your energy level before starting the timer.");
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
          set({ originalFocusDuration: time });
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
            userAcceptedRecommendation ||
            time === recommendedFocusDuration * 60,
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
        if (!state.isBreakTime) {
          set({ sessionJustCompleted: true });
          resetTimerState(set);
          return;
        }

        await saveAndCompleteSession(get, set, "completed");
        resetTimerState(set);
      },

      skipFocusSession: async (isSkippingBreak = false) => {
        const state = get();
        await cancelScheduledNotification(state.scheduledNotificationId);
        set({ scheduledNotificationId: null });

        const elapsedSeconds = state.focusSessionDuration - state.time;
        // Fix: Use state.originalFocusDuration when skipping break (task was fully completed)
        // AND when explicitly skipping a finished session (weird edge case, but safe)
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
        await saveAndCompleteSession(get, set, type, focusedTime);
      },

      startBreak: async (duration) => {
        const state = get();

        if (duration === 0) {
          // Skip break path
          const elapsedFocusSeconds = state.focusSessionDuration - state.time;
          // When skipping break here, we assume the focus part was done?
          // Actually if we are starting break, focus IS done.
          // Yet the logic below uses elapsedFocusSeconds which might be wrong if we just finished focus.
          // But wait, if startBreak is called, we are usually at the end of focus or in break view.
          // original logic used elapsedFocusSeconds, but passing 0 as duration means we skip break.
          // Wait, if we start break with 0, it means we skip it.
          // The proper focused time should be originalFocusDuration because focus completed.

          await saveAndCompleteSession(
            get,
            set,
            "skippedBreak",
            state.originalFocusDuration, // Focus was completed
            0, // Break duration is 0
          );
          return;
        }

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
          userAcceptedRecommendation: true,
        });
      },

      getLiveTime: () => {
        const { isActive, sessionStartTimestamp, initialTime } = get();
        if (!isActive || !sessionStartTimestamp) return initialTime;
        const elapsed =
          Math.floor((Date.now() - sessionStartTimestamp) / 1000) *
          SPEED_FACTOR;
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
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          set({ scheduledNotificationId: null });

          if (!state.isBreakTime) {
            set({
              time: 0,
              isActive: false,
              isBreakTime: true,
              showBreakModal: true,
              sessionStartTimestamp: undefined,
            });
            return;
          }

          get().completeTimer();
        } else {
          set({ time: remaining, isActive: true });
        }
      },

      resetTimer: () => {
        const { energyLevel, taskType, dynamicFocusArms } = get();

        if (energyLevel && taskType) {
          getSessionRecommendation(
            energyLevel as EnergyLevel,
            taskType,
            dynamicFocusArms,
          )
            .then(({ focusDuration, breakDuration }) => {
              set({
                recommendedFocusDuration: focusDuration,
                recommendedBreakDuration: breakDuration,
                time: focusDuration * 60,
                initialTime: focusDuration * 60,
              });
            })
            .catch(() => {
              set({
                recommendedFocusDuration: 25,
                recommendedBreakDuration: 5,
                time: 25 * 60,
                initialTime: 25 * 60,
              });
            });
        } else {
          set({
            recommendedFocusDuration: 25,
            recommendedBreakDuration: 5,
            time: 25 * 60,
            initialTime: 25 * 60,
          });
        }

        set({
          isActive: false,
          isBreakTime: false,
          showTimeAdjust: false,
          showCancel: false,
          showSkip: false,
          showTaskModal: false,
          showBreakModal: false,
          showSkipConfirm: false,
          userAcceptedRecommendation: true,
          originalFocusDuration: 0,
          hasSavedSession: false,
        });
      },

      // ============================================================================
      // TASK/ENERGY ACTIONS
      // ============================================================================

      setTaskType: (task) => {
        set({ taskType: task, showTaskModal: false });
        const { energyLevel, dynamicFocusArms } = get();
        if (energyLevel) {
          updateRecommendations(
            energyLevel as EnergyLevel,
            task,
            set,
            dynamicFocusArms,
          );
        }
      },

      setEnergyLevel: (level) => {
        set({ energyLevel: level });
        const { taskType, dynamicFocusArms } = get();
        if (level) {
          if (taskType) {
            updateRecommendations(level, taskType, set, dynamicFocusArms);
          } else {
            set({
              recommendedFocusDuration: 25,
              recommendedBreakDuration: 5,
              time: 25 * 60,
              initialTime: 25 * 60,
              userAcceptedRecommendation: true,
            });
          }
        }
      },

      addCustomTask: (task) => {
        const normalized = normalizeTask(task);
        if (!normalized) return;

        const isDefaultTask =
          DEFAULT_TASKS.map(normalizeTask).includes(normalized);

        if (!isDefaultTask) {
          set((state) => ({
            previousTasks: [
              normalized,
              ...state.previousTasks.filter(
                (t) => normalizeTask(t) !== normalized,
              ),
            ],
            taskType: normalized,
            showTaskModal: false,
          }));
        } else {
          set({ taskType: normalized, showTaskModal: false });
        }

        const { energyLevel, dynamicFocusArms } = get();
        if (energyLevel) {
          getSessionRecommendation(
            energyLevel as EnergyLevel,
            normalized,
            dynamicFocusArms,
          )
            .then(({ focusDuration, breakDuration }) => {
              set({
                recommendedFocusDuration: focusDuration,
                recommendedBreakDuration: breakDuration,
                time: focusDuration * 60,
                initialTime: focusDuration * 60,
                userAcceptedRecommendation: true,
              });
            })
            .catch((error) =>
              console.error("Error getting session recommendation:", error),
            );
        }
      },

      removeCustomTask: (taskToRemove) =>
        set((state) => ({
          previousTasks: state.previousTasks.filter(
            (task) => task !== taskToRemove,
          ),
        })),

      // ============================================================================
      // RECOMMENDATION ACTIONS
      // ============================================================================

      acceptRecommendation: () => {
        const { recommendedFocusDuration } = get();
        set({
          time: recommendedFocusDuration * 60,
          initialTime: recommendedFocusDuration * 60,
          userAcceptedRecommendation: true,
          hasInteractedWithTimer: false,
        });
      },

      rejectRecommendation: () =>
        set({
          userAcceptedRecommendation: false,
          hasInteractedWithTimer: false,
        }),

      setSelectedBreakDuration: (duration) =>
        set({ selectedBreakDuration: duration }),

      // ============================================================================
      // UI TOGGLE ACTIONS
      // ============================================================================

      toggleTimeAdjust: () => {
        const { isActive, showTimeAdjust } = get();
        if (!isActive) {
          set({
            showTimeAdjust: !showTimeAdjust,
            userAcceptedRecommendation: false,
            hasInteractedWithTimer: true,
          });
        }
      },

      toggleTaskModal: (show) => set({ showTaskModal: show }),
      toggleBreakModal: (show) => set({ showBreakModal: show }),
      toggleSkipConfirm: (show) => set({ showSkipConfirm: show }),

      setHasInteractedWithTimer: (value) =>
        set({ hasInteractedWithTimer: value }),
      setHasDismissedRecommendationCard: (value) =>
        set({ hasDismissedRecommendationCard: value }),
      setHasSavedSession: (val) => set({ hasSavedSession: val }),

      toggleHasDismissedRecommendationCard: () =>
        set({ hasDismissedRecommendationCard: true }),
      toggleIncludeShortSessions: () =>
        set((state) => ({ includeShortSessions: !state.includeShortSessions })),
      toggleNotificationsEnabled: () =>
        set((state) => ({ notificationsEnabled: !state.notificationsEnabled })),

      addDynamicFocusArm: (arm) => {
        const { dynamicFocusArms } = get();
        if (dynamicFocusArms.includes(arm)) return;

        const updatedArms = [...dynamicFocusArms, arm];
        set({ dynamicFocusArms: updatedArms });

        AsyncStorage.setItem(
          DYNAMIC_ARMS_KEY,
          JSON.stringify(updatedArms),
        ).catch((err) => console.error("Failed to save dynamic arms:", err));
      },
    }),
    {
      name: "timer-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        previousTasks: state.previousTasks,
        includeShortSessions: state.includeShortSessions,
        dynamicFocusArms: state.dynamicFocusArms,
        notificationsEnabled: state.notificationsEnabled,
      }),
    },
  ),
);

// Initialize on load
useTimerStore.getState().loadSessions();

const existingTasks = useTimerStore.getState().previousTasks;
if (!existingTasks || existingTasks.length === 0) {
  useTimerStore.setState({
    previousTasks: DEFAULT_TASKS,
  });
}

export const loadDynamicFocusArms = async () => {
  try {
    const stored = await AsyncStorage.getItem(DYNAMIC_ARMS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        useTimerStore.setState({ dynamicFocusArms: parsed });
      }
    }
  } catch (err) {
    console.error("Failed to load dynamic focus arms:", err);
  }
};

export default useTimerStore;

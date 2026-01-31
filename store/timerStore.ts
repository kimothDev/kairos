import { TIME_ADJUSTMENT_STEP, TIMER_CONSTANTS } from "@/constants/timer";
import {
  Context,
  updateCapacityStats,
  updateModel,
  updateZoneData,
} from "@/services/contextualBandits";
import { DBSession } from "@/services/database";
import { calculateReward } from "@/services/recommendations";
import { getSessionRecommendation } from "@/services/sessionPlanner";
import {
  clearAllSessionsFromDB,
  createAndSaveSession,
  loadSessionsFromDB,
} from "@/services/sessionService";
import { EnergyLevel, TimerState } from "@/types";
import {
  detectTimeOfDay,
  resetTimerState,
  updateRecommendations,
} from "@/utils/sessionUtils";
import { normalizeTask } from "@/utils/task";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

const DYNAMIC_ARMS_KEY = "dynamic_focus_arms";
const SPEED_FACTOR = 1;

interface TimerStoreState extends TimerState {}

const useTimerStore = create<TimerStoreState>()(
  persist(
    (set, get) => ({
      isActive: false,
      isBreakTime: false,
      time: 0,
      initialTime: 0,
      focusSessionDuration: 0,
      taskType: "",
      energyLevel: "",
      showTimeAdjust: false,
      showCancel: false,
      showSkip: false,
      showTaskModal: false,
      showBreakModal: false,
      showSkipConfirm: false,

      previousTasks: [],
      sessions: [],
      isLoading: false,
      hasInteractedWithTimer: false,
      hasDismissedRecommendationCard: false,
      sessionStartTimestamp: undefined,

      includeShortSessions: false,
      dynamicFocusArms: [],

      notificationsEnabled: false,
      hasSavedSession: false,
      originalFocusDuration: 0,
      recommendedFocusDuration: 25,
      recommendedBreakDuration: 5,
      userAcceptedRecommendation: true,
      selectedBreakDuration: 5,
      sessionJustCompleted: false,
      scheduledNotificationId: null,

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

      toggleNotificationsEnabled: () =>
        set((state) => ({ notificationsEnabled: !state.notificationsEnabled })),

      toggleHasDismissedRecommendationCard: () =>
        set({ hasDismissedRecommendationCard: true }),

      toggleIncludeShortSessions: () =>
        set((state) => ({ includeShortSessions: !state.includeShortSessions })),

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

      startTimer: async () => {
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
        } = get();

        if (!taskType && !sessionJustCompleted) {
          alert("Please select a task type before starting the timer.");
          return;
        }

        if (!energyLevel && !sessionJustCompleted) {
          alert("Please select your energy level before starting the timer.");
          return;
        }

        // Cancel any existing scheduled notification
        if (scheduledNotificationId) {
          await Notifications.cancelScheduledNotificationAsync(
            scheduledNotificationId,
          ).catch(() => {});
        }

        // Schedule notification upfront for background delivery
        let newNotificationId: string | null = null;
        if (notificationsEnabled) {
          const durationSeconds = Math.ceil(time / SPEED_FACTOR);
          const triggerDate = new Date(Date.now() + durationSeconds * 1000);
          try {
            newNotificationId = await Notifications.scheduleNotificationAsync({
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
          }
        }

        const now = Date.now();

        if (!isBreakTime) {
          set({ originalFocusDuration: time });
        }

        set({
          isActive: true,
          showCancel: !isBreakTime,
          showSkip: isBreakTime,
          initialTime: time,
          time,
          sessionStartTimestamp: now,
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
          }, 10000);
        }
      },

      pauseTimer: () => set({ isActive: false }),

      cancelTimer: async () => {
        const { scheduledNotificationId } = get();
        if (scheduledNotificationId) {
          await Notifications.cancelScheduledNotificationAsync(
            scheduledNotificationId,
          ).catch(() => {});
        }
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
        const {
          taskType,
          energyLevel,
          recommendedFocusDuration,
          recommendedBreakDuration,
          userAcceptedRecommendation,
          selectedBreakDuration,
          originalFocusDuration,
          isBreakTime,
        } = get();

        const focusTimeInMinutes = Math.round(originalFocusDuration / 60);
        const breakTimeInMinutes = Math.round(selectedBreakDuration / 60);

        // Create simplified context (no timeOfDay)
        const context: Context = {
          taskType,
          energyLevel: energyLevel as EnergyLevel,
        };

        if (isBreakTime) {
          const breakContext: Context = {
            taskType: `${taskType}-break`,
            energyLevel: energyLevel as EnergyLevel,
          };

          if (get().hasSavedSession) return;
          set({ hasSavedSession: true, sessionJustCompleted: true });

          try {
            const newSession = await createAndSaveSession({
              taskType,
              energyLevel: energyLevel as EnergyLevel,
              timeOfDay: detectTimeOfDay(), // Still stored for DB
              recommendedDuration: recommendedFocusDuration,
              recommendedBreak: recommendedBreakDuration,
              userSelectedDuration: focusTimeInMinutes,
              userSelectedBreak: breakTimeInMinutes,
              acceptedRecommendation: userAcceptedRecommendation,
              sessionCompleted: true,
              focusedUntilSkipped: focusTimeInMinutes,
              reward: 1.0,
              date: new Date().toISOString().split("T")[0],
              createdAt: new Date().toISOString(),
            });

            // Update model for FOCUS - this is the user's selected duration!
            await updateModel(context, focusTimeInMinutes, newSession.reward);

            // Update model for break
            await updateModel(
              breakContext,
              breakTimeInMinutes,
              newSession.reward,
            );

            // Update capacity stats for focus
            await updateCapacityStats(
              `${taskType}|${energyLevel}`,
              focusTimeInMinutes,
              focusTimeInMinutes,
              true,
            );

            // Update zone data based on selection
            await updateZoneData(
              `${taskType}|${energyLevel}`,
              focusTimeInMinutes,
            );

            get().loadSessions();
          } catch (error) {
            console.error("Error inserting completed session:", error);
          }
        } else {
          set({ sessionJustCompleted: true });
        }

        resetTimerState(set);
      },

      skipFocusSession: async (isSkippingBreak: boolean = false) => {
        const {
          initialTime,
          time,
          taskType,
          energyLevel,
          recommendedFocusDuration,
          recommendedBreakDuration,
          userAcceptedRecommendation,
          focusSessionDuration,
          originalFocusDuration,
          scheduledNotificationId,
        } = get();

        if (scheduledNotificationId) {
          await Notifications.cancelScheduledNotificationAsync(
            scheduledNotificationId,
          ).catch(() => {});
          set({ scheduledNotificationId: null });
        }

        const elapsedSeconds = focusSessionDuration - time;
        let focusTimeInMinutes = Math.round(elapsedSeconds / 60);
        const totalFocusDuration = Math.round(originalFocusDuration / 60);

        if (isSkippingBreak) {
          focusTimeInMinutes = totalFocusDuration;
        }

        if (isNaN(focusTimeInMinutes) || focusTimeInMinutes < 0) {
          console.warn("Invalid skip time:", {
            initialTime,
            time,
            elapsedSeconds,
          });
          return;
        }

        const context: Context = {
          taskType,
          energyLevel: energyLevel as EnergyLevel,
        };

        const skipReason = isSkippingBreak
          ? "skippedBreak"
          : ("skippedFocus" as const);

        if (get().hasSavedSession) return;
        set({ hasSavedSession: true, sessionJustCompleted: true });

        try {
          await createAndSaveSession({
            taskType,
            energyLevel: energyLevel as EnergyLevel,
            timeOfDay: detectTimeOfDay(),
            recommendedDuration: recommendedFocusDuration,
            recommendedBreak: recommendedBreakDuration,
            userSelectedDuration: totalFocusDuration,
            userSelectedBreak: 0,
            acceptedRecommendation: userAcceptedRecommendation,
            sessionCompleted: false,
            focusedUntilSkipped: focusTimeInMinutes,
            skipReason,
            reward: calculateReward(
              false,
              userAcceptedRecommendation,
              focusTimeInMinutes,
              totalFocusDuration,
              recommendedFocusDuration,
              skipReason,
            ),
            date: new Date().toISOString().split("T")[0],
            createdAt: new Date().toISOString(),
          });

          // Update capacity with actual focus time
          await updateCapacityStats(
            `${taskType}|${energyLevel}`,
            totalFocusDuration,
            focusTimeInMinutes,
            false,
          );

          get().loadSessions();
        } catch (error) {
          console.error("Error inserting skipped session:", error);
        }

        resetTimerState(set);
      },

      adjustTime: (direction) => {
        const { includeShortSessions } = get();
        const currentTime = get().time;
        const currentMinutes = Math.floor(currentTime / 60);

        const minMinutes = includeShortSessions
          ? TIMER_CONSTANTS.ADHD.MIN_FOCUS / 60
          : TIMER_CONSTANTS.DEFAULT.MIN_FOCUS / 60;
        const maxMinutes = includeShortSessions
          ? TIMER_CONSTANTS.ADHD.MAX_FOCUS / 60
          : TIMER_CONSTANTS.DEFAULT.MAX_FOCUS / 60;

        let newMinutes =
          direction === "up"
            ? Math.min(maxMinutes, currentMinutes + TIME_ADJUSTMENT_STEP / 60)
            : Math.max(minMinutes, currentMinutes - TIME_ADJUSTMENT_STEP / 60);

        const newTime = newMinutes * 60;

        set({
          time: newTime,
          initialTime: newTime,
          userAcceptedRecommendation: true,
        });
      },

      setTaskType: (task) => {
        set({ taskType: task, showTaskModal: false });

        const { energyLevel, dynamicFocusArms } = get();
        if (energyLevel) {
          updateRecommendations(energyLevel, task, set, dynamicFocusArms);
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

        const isDefaultTask = [
          "Coding",
          "Writing",
          "Reading",
          "Studying",
          "Designing",
          "Meditating",
          "Planning",
          "Researching",
        ]
          .map(normalizeTask)
          .includes(normalized);

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
          getSessionRecommendation(energyLevel, normalized, dynamicFocusArms)
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

      getLiveTime: () => {
        const { isActive, sessionStartTimestamp, initialTime } = get();
        if (!isActive || !sessionStartTimestamp) return initialTime;
        const elapsed =
          Math.floor((Date.now() - sessionStartTimestamp) / 1000) *
          SPEED_FACTOR;
        return Math.max(initialTime - elapsed, 0);
      },

      removeCustomTask: (taskToRemove: string) =>
        set((state) => ({
          previousTasks: state.previousTasks.filter(
            (task) => task !== taskToRemove,
          ),
        })),

      startBreak: async (duration) => {
        const {
          taskType,
          energyLevel,
          recommendedFocusDuration,
          recommendedBreakDuration,
          userAcceptedRecommendation,
          originalFocusDuration,
        } = get();

        if (duration === 0) {
          const remainingFocus = get().time;
          const elapsedFocusSeconds =
            get().focusSessionDuration - remainingFocus;
          const focusTimeInMinutes = Math.round(elapsedFocusSeconds / 60);
          const totalFocusDuration = Math.round(originalFocusDuration / 60);

          const newSession: Omit<DBSession, "id"> = {
            taskType,
            energyLevel,
            timeOfDay: detectTimeOfDay(),
            recommendedDuration: recommendedFocusDuration,
            recommendedBreak: recommendedBreakDuration,
            userSelectedDuration: totalFocusDuration,
            userSelectedBreak: 0,
            acceptedRecommendation: userAcceptedRecommendation,
            sessionCompleted: false,
            focusedUntilSkipped: focusTimeInMinutes,
            reward: calculateReward(
              false,
              userAcceptedRecommendation,
              focusTimeInMinutes,
              totalFocusDuration,
              recommendedFocusDuration,
              "skippedBreak",
            ),
            date: new Date().toISOString().split("T")[0],
            createdAt: new Date().toISOString(),
            skipReason: "skippedBreak",
          };

          if (get().hasSavedSession) return;
          set({ hasSavedSession: true, sessionJustCompleted: true });

          try {
            await createAndSaveSession(newSession);

            const focusContext: Context = {
              taskType,
              energyLevel: energyLevel as EnergyLevel,
            };
            await updateModel(
              focusContext,
              focusTimeInMinutes,
              newSession.reward,
            );

            const breakContext: Context = {
              taskType: `${taskType}-break`,
              energyLevel: energyLevel as EnergyLevel,
            };
            await updateModel(breakContext, 0, newSession.reward);

            get().loadSessions();
          } catch (error) {
            console.error("Failed to save session with skipped break:", error);
          }

          resetTimerState(set);
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

      resetTimer: () => {
        const { energyLevel, taskType, dynamicFocusArms } = get();

        let recommendedFocusDuration = 25;
        let recommendedBreakDuration = 5;

        if (energyLevel && taskType) {
          getSessionRecommendation(energyLevel, taskType, dynamicFocusArms)
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
          recommendedBreakDuration,
          userAcceptedRecommendation: true,
          originalFocusDuration: 0,
          hasSavedSession: false,
        });
      },

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

      restoreTimerState: () => {
        const state = get();
        const {
          isActive,
          sessionStartTimestamp,
          initialTime,
          isBreakTime,
          notificationsEnabled,
          focusSessionDuration,
          originalFocusDuration,
        } = state;

        if (!isActive || !sessionStartTimestamp) return;

        const now = Date.now();
        const elapsed =
          Math.floor((now - sessionStartTimestamp) / 1000) * SPEED_FACTOR;
        const remaining = initialTime - elapsed;

        if (remaining <= 0) {
          const isBreakEnding = isBreakTime;

          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          set({ scheduledNotificationId: null });

          if (!isBreakEnding) {
            set({
              time: 0,
              isActive: false,
              isBreakTime: true,
              showBreakModal: true,
              sessionStartTimestamp: undefined,
              focusSessionDuration,
              originalFocusDuration,
            });
            return;
          }

          get().completeTimer();
        } else {
          set({
            time: remaining,
            isActive: true,
          });
        }
      },

      setHasInteractedWithTimer: (value: boolean) =>
        set({ hasInteractedWithTimer: value }),
      setHasDismissedRecommendationCard: (value: boolean) =>
        set({ hasDismissedRecommendationCard: value }),
      setHasSavedSession: (val: boolean) => set({ hasSavedSession: val }),
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

useTimerStore.getState().loadSessions();

const existingTasks = useTimerStore.getState().previousTasks;
if (!existingTasks || existingTasks.length === 0) {
  useTimerStore.setState({
    previousTasks: [
      "Coding",
      "Writing",
      "Reading",
      "Studying",
      "Designing",
      "Meditating",
      "Planning",
      "Researching",
    ],
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

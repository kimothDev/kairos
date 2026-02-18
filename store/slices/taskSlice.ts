/**
 * Task Slice
 *
 * Handles task selection, energy level updates, and fetching
 * smart recommendations based on the current context.
 */
import { DEFAULT_TASKS } from "@/constants/timer";
import { getSessionRecommendation } from "@/services/sessionPlanner";
import { EnergyLevel } from "@/types";
import { updateRecommendations } from "@/utils/sessionUtils";
import { normalizeTask } from "@/utils/task";
import { SliceCreator, TaskSlice } from "./sliceTypes";

// Defaults for fallback
const DEFAULT_RECOMMENDATION = {
  focusDuration: 25,
  breakDuration: 5,
};

/**
 * Internal helper to fetch and apply recommendations.
 * Replaces the duplicated logic across 4 different actions.
 */
const fetchAndApplyRecommendation = async (
  get: any,
  set: any,
  energyLevel: EnergyLevel,
  taskType: string,
  dynamicFocusArms: number[],
  includeShortSessions: boolean,
) => {
  if (!energyLevel || !taskType) {
    // Fallback if missing context
    set({
      recommendedFocusDuration: DEFAULT_RECOMMENDATION.focusDuration,
      recommendedBreakDuration: DEFAULT_RECOMMENDATION.breakDuration,
      time: DEFAULT_RECOMMENDATION.focusDuration * 60,
      initialTime: DEFAULT_RECOMMENDATION.focusDuration * 60,
      userAcceptedRecommendation: false,
    });
    return;
  }

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
    // Fallback on error
    set({
      recommendedFocusDuration: DEFAULT_RECOMMENDATION.focusDuration,
      recommendedBreakDuration: DEFAULT_RECOMMENDATION.breakDuration,
      time: DEFAULT_RECOMMENDATION.focusDuration * 60,
      initialTime: DEFAULT_RECOMMENDATION.focusDuration * 60,
    });
  }
};

export const createTaskSlice: SliceCreator<TaskSlice> = (set, get) => ({
  // State
  taskType: "",
  energyLevel: "",
  recommendedFocusDuration: DEFAULT_RECOMMENDATION.focusDuration,
  recommendedBreakDuration: DEFAULT_RECOMMENDATION.breakDuration,
  userAcceptedRecommendation: false,

  // Actions
  setTaskType: (task) => {
    set({
      taskType: task,
      energyLevel: "", // Reset energy level on task change
      recommendedFocusDuration: DEFAULT_RECOMMENDATION.focusDuration,
      recommendedBreakDuration: DEFAULT_RECOMMENDATION.breakDuration,
      time: 0, // Clear the timer time
      initialTime: 0,
      showTaskModal: false,
      hasInteractedWithTimer: false,
      userAcceptedRecommendation: false,
    });
  },

  setEnergyLevel: (level) => {
    const {
      energyLevel: currentLevel,
      taskType,
      dynamicFocusArms,
      includeShortSessions,
    } = get();

    // If clicking same mood for fun, don't update anything
    if (level === currentLevel) return;

    set({ energyLevel: level });

    if (level && taskType) {
      updateRecommendations(
        level,
        taskType,
        set,
        dynamicFocusArms,
        includeShortSessions,
      );
    } else if (level) {
      set({
        recommendedFocusDuration: DEFAULT_RECOMMENDATION.focusDuration,
        recommendedBreakDuration: DEFAULT_RECOMMENDATION.breakDuration,
        time: DEFAULT_RECOMMENDATION.focusDuration * 60,
        initialTime: DEFAULT_RECOMMENDATION.focusDuration * 60,
        userAcceptedRecommendation: false,
        hasInteractedWithTimer: false,
      });
    }
  },

  addCustomTask: (task) => {
    const normalized = normalizeTask(task);
    if (!normalized) return;

    const isDefaultTask = DEFAULT_TASKS.map(normalizeTask).includes(normalized);

    if (!isDefaultTask) {
      const { previousTasks } = get();
      set({
        previousTasks: [
          normalized,
          ...(previousTasks || []).filter(
            (t) => normalizeTask(t) !== normalized,
          ),
        ],
        taskType: normalized,
        showTaskModal: false,
      });
    } else {
      set({ taskType: normalized, showTaskModal: false });
    }

    const { energyLevel, dynamicFocusArms, includeShortSessions } = get();
    // This action sets userAcceptedRecommendation = TRUE
    fetchAndApplyRecommendation(
      get,
      set,
      energyLevel,
      normalized,
      dynamicFocusArms,
      includeShortSessions,
    );
  },

  removeCustomTask: (taskToRemove) =>
    set((state) => ({
      previousTasks: (state.previousTasks || []).filter(
        (task) => task !== taskToRemove,
      ),
    })),

  resetTimer: () => {
    const { energyLevel, taskType, dynamicFocusArms, includeShortSessions } =
      get();

    // This action sets userAcceptedRecommendation = TRUE
    fetchAndApplyRecommendation(
      get,
      set,
      energyLevel as EnergyLevel,
      taskType,
      dynamicFocusArms,
      includeShortSessions,
    );

    // Reset UI flags
    set({
      isActive: false,
      isBreakTime: false,
      showTimeAdjust: false,
      showCancel: false,
      showSkip: false,
      showTaskModal: false,
      showBreakModal: false,
      showSkipConfirm: false,
      userAcceptedRecommendation: false, // Also set by helper, but ensuring strict compliance
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
});

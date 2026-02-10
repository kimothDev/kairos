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
) => {
  if (!energyLevel || !taskType) {
    // Fallback if missing context
    set({
      recommendedFocusDuration: DEFAULT_RECOMMENDATION.focusDuration,
      recommendedBreakDuration: DEFAULT_RECOMMENDATION.breakDuration,
      time: DEFAULT_RECOMMENDATION.focusDuration * 60,
      initialTime: DEFAULT_RECOMMENDATION.focusDuration * 60,
      userAcceptedRecommendation: true,
    });
    return;
  }

  try {
    const { focusDuration, breakDuration } = await getSessionRecommendation(
      energyLevel,
      taskType,
      dynamicFocusArms,
    );

    set({
      recommendedFocusDuration: focusDuration,
      recommendedBreakDuration: breakDuration,
      time: focusDuration * 60,
      initialTime: focusDuration * 60,
      userAcceptedRecommendation: true,
      hasDismissedRecommendationCard: false,
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
  userAcceptedRecommendation: true,

  // Actions
  setTaskType: (task) => {
    set({ taskType: task, showTaskModal: false });
    const { energyLevel, dynamicFocusArms } = get();

    // Using existing util for simple update (legacy pattern) or consolidate?
    // The original code used updateRecommendations inside setTaskType/setEnergyLevel
    // but full getSessionRecommendation inside resetTimer/addCustomTask.
    // Let's unify them all to use our new helper if possible,
    // BUT updateRecommendations util has slightly different behavior
    // (sets userAcceptedRecommendation to FALSE).

    // Looking at original code:
    // setTaskType -> updateRecommendations (sets userAcceptedRecommendation = false)
    // setEnergyLevel -> updateRecommendations (sets userAcceptedRecommendation = false)
    // addCustomTask -> getSessionRecommendation (sets userAcceptedRecommendation = TRUE)
    // resetTimer -> getSessionRecommendation (sets userAcceptedRecommendation = TRUE)

    // We should respect this difference.
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
          recommendedFocusDuration: DEFAULT_RECOMMENDATION.focusDuration,
          recommendedBreakDuration: DEFAULT_RECOMMENDATION.breakDuration,
          time: DEFAULT_RECOMMENDATION.focusDuration * 60,
          initialTime: DEFAULT_RECOMMENDATION.focusDuration * 60,
          userAcceptedRecommendation: true,
        });
      }
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

    const { energyLevel, dynamicFocusArms } = get();
    // This action sets userAcceptedRecommendation = TRUE
    fetchAndApplyRecommendation(
      get,
      set,
      energyLevel,
      normalized,
      dynamicFocusArms,
    );
  },

  removeCustomTask: (taskToRemove) =>
    set((state) => ({
      previousTasks: (state.previousTasks || []).filter(
        (task) => task !== taskToRemove,
      ),
    })),

  resetTimer: () => {
    const { energyLevel, taskType, dynamicFocusArms } = get();

    // This action sets userAcceptedRecommendation = TRUE
    fetchAndApplyRecommendation(
      get,
      set,
      energyLevel as EnergyLevel,
      taskType,
      dynamicFocusArms,
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
      userAcceptedRecommendation: true, // Also set by helper, but ensuring strict compliance
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

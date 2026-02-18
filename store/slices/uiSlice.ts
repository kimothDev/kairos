/**
 * UI Slice
 *
 * Manages UI-related state such as modal visibility, alert messages,
 * and user preferences like notification toggles.
 */
import { DEFAULT_TASKS } from "@/constants/timer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SliceCreator, UISlice } from "./sliceTypes";

const DYNAMIC_ARMS_KEY = "dynamic_focus_arms";

export const createUISlice: SliceCreator<UISlice> = (set, get) => ({
  // State
  showTimeAdjust: false,
  showCancel: false,
  showSkip: false,
  showTaskModal: false,
  showBreakModal: false,
  showSkipConfirm: false,
  hasInteractedWithTimer: false,
  hasDismissedRecommendationCard: false,
  previousTasks: [],
  hasMigratedTasks: false,
  includeShortSessions: false,
  dynamicFocusArms: [],
  notificationsEnabled: false,
  themedAlert: null,

  // Actions
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

  setHasInteractedWithTimer: (value) => set({ hasInteractedWithTimer: value }),
  setHasDismissedRecommendationCard: (value) =>
    set({ hasDismissedRecommendationCard: value }),

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

    AsyncStorage.setItem(DYNAMIC_ARMS_KEY, JSON.stringify(updatedArms)).catch(
      (err) => console.error("Failed to save dynamic arms:", err),
    );
  },

  migrateTasks: () => {
    set((state) => {
      const merged = new Set([...state.previousTasks, ...DEFAULT_TASKS]);
      return {
        previousTasks: Array.from(merged),
        hasMigratedTasks: true,
      };
    });
  },

  showThemedAlert: (title, message, buttons, alignment) => {
    if (message) {
      set({ themedAlert: { title, message, buttons, alignment } });
    } else {
      set({ themedAlert: { message: title, buttons, alignment } });
    }
  },

  hideThemedAlert: () => set({ themedAlert: null }),
});

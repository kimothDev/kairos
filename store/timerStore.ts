/**
 * Timer Store
 *
 * The main store for the application using Zustand.
 * Combines focused slices (timer, session, task, ui) into a single state management hub.
 */
import { DEFAULT_TASKS } from "@/constants/timer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createSessionSlice } from "./slices/sessionSlice";
import { TimerStoreState } from "./slices/sliceTypes";
import { createTaskSlice } from "./slices/taskSlice";
import { createTimerSlice } from "./slices/timerSlice";
import { createUISlice } from "./slices/uiSlice";

const DYNAMIC_ARMS_KEY = "dynamic_focus_arms";
const useTimerStore = create<TimerStoreState>()(
  persist(
    (set, get) => ({
      ...createTimerSlice(set, get),
      ...createSessionSlice(set, get),
      ...createTaskSlice(set, get),
      ...createUISlice(set, get),
    }),
    {
      name: "timer-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        previousTasks: state.previousTasks,
        includeShortSessions: state.includeShortSessions,
        dynamicFocusArms: state.dynamicFocusArms,
        notificationsEnabled: state.notificationsEnabled,
        hasMigratedTasks: state.hasMigratedTasks,
      }),
    },
  ),
);

// Initialize on load
useTimerStore.getState().loadSessions();

// Ensure default tasks exist
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

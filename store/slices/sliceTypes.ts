import { EnergyLevel, Session } from "@/types";

// Define the state shape for each slice
// These interfaces are effectively subsets of the main TimerState
// but defined explicitly for better type safety in slices

export interface TimerSlice {
  // State
  isActive: boolean;
  isBreakTime: boolean;
  time: number;
  initialTime: number;
  focusSessionDuration: number;
  sessionStartTimestamp?: number;
  scheduledNotificationId: string | null;
  originalFocusDuration: number;
  selectedBreakDuration: number;

  // Actions
  startTimer: () => Promise<void> | void;
  pauseTimer: () => void;
  cancelTimer: () => Promise<void> | void;
  skipTimer: () => void;
  completeTimer: () => void;
  skipFocusSession: (isSkippingBreak?: boolean) => Promise<void>;
  startBreak: (duration: number) => void;
  adjustTime: (direction: "up" | "down") => void;
  setTime: (duration: number) => void;
  getLiveTime: () => number;
  restoreTimerState: () => void;
}

export interface SessionSlice {
  // State
  sessions: Session[];
  isLoading: boolean;
  hasSavedSession: boolean;
  sessionJustCompleted: boolean;

  // Actions
  loadSessions: () => Promise<void>;
  clearAllSessions: () => Promise<void>;
  updateSessionNote: (id: number, note: string) => Promise<void>;
  setHasSavedSession: (val: boolean) => void;
}

export interface TaskSlice {
  // State
  taskType: string;
  energyLevel: EnergyLevel;
  recommendedFocusDuration: number;
  recommendedBreakDuration: number;
  userAcceptedRecommendation: boolean;

  // Actions
  setTaskType: (task: string) => void;
  setEnergyLevel: (level: EnergyLevel) => void;
  addCustomTask: (task: string) => void;
  removeCustomTask: (taskToRemove: string) => void;
  resetTimer: () => void;
  acceptRecommendation: () => void;
  rejectRecommendation: () => void;
  setSelectedBreakDuration: (duration: number) => void;
}

export interface AlertButton {
  text: string;
  style?: "cancel" | "destructive" | "default";
  onPress?: () => void;
}

export interface UISlice {
  // State
  showTimeAdjust: boolean;
  showCancel: boolean;
  showSkip: boolean;
  showTaskModal: boolean;
  showBreakModal: boolean;
  showSkipConfirm: boolean;
  hasInteractedWithTimer: boolean;
  hasDismissedRecommendationCard: boolean;
  previousTasks: string[];
  hasMigratedTasks: boolean;
  includeShortSessions: boolean;
  dynamicFocusArms: number[];
  notificationsEnabled: boolean;

  themedAlert: {
    title?: string;
    message: string;
    buttons?: AlertButton[];
    alignment?: "center" | "left";
  } | null;

  // Actions
  toggleTimeAdjust: () => void;
  toggleTaskModal: (show: boolean) => void;
  toggleBreakModal: (show: boolean) => void;
  toggleSkipConfirm: (show: boolean) => void;
  setHasInteractedWithTimer: (value: boolean) => void;
  setHasDismissedRecommendationCard: (value: boolean) => void;
  toggleHasDismissedRecommendationCard: () => void;
  toggleIncludeShortSessions: () => void;
  toggleNotificationsEnabled: () => void;
  addDynamicFocusArm: (arm: number) => void;
  migrateTasks: () => void;
  showThemedAlert: (
    title: string,
    message?: string,
    buttons?: AlertButton[],
    alignment?: "center" | "left",
  ) => void;
  hideThemedAlert: () => void;
}

// Combined store state
export type TimerStoreState = TimerSlice & SessionSlice & TaskSlice & UISlice;

// Slice creator type
export type SliceCreator<T> = (
  set: (
    partial:
      | Partial<TimerStoreState>
      | ((state: TimerStoreState) => Partial<TimerStoreState>),
  ) => void,
  get: () => TimerStoreState,
) => T;

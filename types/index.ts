/**
 * User's focus capacity/state. Displayed as "Focus Mood" in the UI.
 * Internal levels: low -> Relaxed, mid -> Steady, high -> Intense.
 */
export type EnergyLevel = "low" | "mid" | "high" | "";
export type TimeRange = "week" | "month" | "year";

/**
 * Session data stored in the database.
 * Note: timeOfDay is kept for historical sessions but no longer used for RL context.
 */
export interface Session {
  id?: number;
  taskType: string;
  energyLevel: EnergyLevel;
  timeOfDay: string; // Kept for backward compatibility with existing database records
  recommendedDuration: number;
  recommendedBreak: number;
  userSelectedDuration: number;
  userSelectedBreak: number;
  acceptedRecommendation: boolean;
  sessionCompleted: boolean;
  focusedUntilSkipped: number;
  reward: number;
  date: string;
  createdAt: string;
  skipReason?: "skippedFocus" | "skippedBreak" | "none";
  note?: string;
}

export interface TimerState {
  isActive: boolean;
  isBreakTime: boolean;
  time: number;
  initialTime: number;
  taskType: string;
  energyLevel: EnergyLevel;
  showTimeAdjust: boolean;
  showCancel: boolean;
  showSkip: boolean;
  showTaskModal: boolean;
  showBreakModal: boolean;
  showSkipConfirm: boolean;

  previousTasks: string[];
  sessions: Session[];
  isLoading: boolean;
  hasInteractedWithTimer: boolean;
  hasDismissedRecommendationCard: boolean;
  sessionStartTimestamp?: number;
  includeShortSessions: boolean;
  dynamicFocusArms: number[];
  notificationsEnabled: boolean;
  focusSessionDuration: number;
  originalFocusDuration: number;
  hasSavedSession: boolean;
  sessionJustCompleted: boolean;
  scheduledNotificationId: string | null;

  //recommendation fields
  recommendedFocusDuration: number;
  recommendedBreakDuration: number;
  userAcceptedRecommendation: boolean;
  selectedBreakDuration: number;
  // Note: timeOfDay removed from state - no longer used for RL context

  //actions
  startTimer: () => Promise<void> | void;
  pauseTimer: () => void;
  cancelTimer: () => Promise<void> | void;
  skipTimer: () => void;
  completeTimer: () => void;
  adjustTime: (direction: "up" | "down") => void;
  setTaskType: (task: string) => void;
  setEnergyLevel: (level: EnergyLevel) => void;
  addCustomTask: (task: string) => void;
  startBreak: (duration: number) => void;
  toggleTimeAdjust: () => void;
  toggleTaskModal: (show: boolean) => void;
  toggleBreakModal: (show: boolean) => void;
  toggleSkipConfirm: (show: boolean) => void;
  resetTimer: () => void;
  loadSessions: () => Promise<void>;
  clearAllSessions: () => Promise<void>;
  acceptRecommendation: () => void;
  rejectRecommendation: () => void;
  setSelectedBreakDuration: (duration: number) => void;
  setHasInteractedWithTimer: (value: boolean) => void;
  setHasDismissedRecommendationCard: (value: boolean) => void;
  removeCustomTask: (taskToRemove: string) => void;
  restoreTimerState: () => void;
  toggleIncludeShortSessions: () => void;
  addDynamicFocusArm: (duration: number) => void;
  toggleNotificationsEnabled: () => void;
  skipFocusSession: (isSkippingBreak?: boolean) => Promise<void>;
  setHasSavedSession: (val: boolean) => void;
  getLiveTime: () => number;
  updateSessionNote: (id: number, note: string) => Promise<void>;
}

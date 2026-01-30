import { TimeOfDay } from '@/services/recommendations';

export type EnergyLevel = 'low' | 'mid' | 'high' | '';
export type TimeRange = 'week' | 'month' | 'year';

export interface Session {
  id?: number;
  taskType: string;
  energyLevel: EnergyLevel;
  timeOfDay: string;
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
  skipReason?: 'skippedFocus' | 'skippedBreak' | 'none';

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
  customTask: string;
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
  sessionJustCompleted: boolean;  // Flag to skip validation after session ends
  scheduledNotificationId: string | null;  // ID of scheduled notification for background delivery

  //recommendation fields
  recommendedFocusDuration: number;
  recommendedBreakDuration: number;
  userAcceptedRecommendation: boolean;
  selectedBreakDuration: number;
  timeOfDay: TimeOfDay;

  //actions
  startTimer: () => Promise<void> | void;
  pauseTimer: () => void;
  cancelTimer: () => Promise<void> | void;
  skipTimer: () => void;
  completeTimer: () => void;
  adjustTime: (direction: 'up' | 'down') => void;
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
}
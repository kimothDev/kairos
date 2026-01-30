import { Context, debugModel, loadModel, updateModel } from '@/services/contextualBandits';
import { insertSession } from '@/services/database';
import { calculateReward, TimeOfDay } from '@/services/recommendations';
import { getSessionRecommendation } from '@/services/sessionPlanner';
import { EnergyLevel } from '@/types';

// Session creation function
export const createSession = (params: {
  taskType: string;
  energyLevel: EnergyLevel;
  timeOfDay: TimeOfDay;
  recommendedDuration: number;
  recommendedBreak: number;
  userSelectedDuration: number;
  userSelectedBreak: number;
  acceptedRecommendation: boolean;
  sessionCompleted: boolean;
  focusedUntilSkipped: number;
  skipReason?: 'skippedFocus' | 'skippedBreak';
}) => {
  return {
    ...params,
    reward: calculateReward(
      params.sessionCompleted,
      params.acceptedRecommendation,
      params.focusedUntilSkipped,
      params.userSelectedDuration,
      params.recommendedDuration,
      params.skipReason
    ),
    date: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
  };
};

export const createSessionWithContext = async (
  context: Context,
  sessionData: {
    taskType: string;
    energyLevel: EnergyLevel;
    timeOfDay: TimeOfDay;
    recommendedDuration: number;
    recommendedBreak: number;
    userSelectedDuration: number;
    userSelectedBreak: number;
    acceptedRecommendation: boolean;
    sessionCompleted: boolean;
    focusedUntilSkipped: number;
    skipReason?: 'skippedFocus' | 'skippedBreak';
  },
  store: any,
  modelActionOverride?: number
) => {
  const newSession = createSession(sessionData);
  await insertSession(newSession);
  await updateModel(context, modelActionOverride ?? (sessionData.focusedUntilSkipped || 0), newSession.reward);
  await store.loadSessions();
  // Log context and table after session ends
  const model = await loadModel();
  const contextKey = `${context.taskType}|${context.energyLevel}|${context.timeOfDay}`;
  const actions = Object.keys(model[contextKey] || {}).map(Number).sort((a, b) => a - b);
  console.log(`\n=== Session Model Update ===`);
  console.log(`Context: ${context.taskType} | ${context.energyLevel} | ${context.timeOfDay}`);
  console.log('Action | Alpha | Beta | Mean | Observations');
  console.log('------------------------------------------');
  actions.forEach(action => {
    const params = model[contextKey][action];
    if (!params) return;
    const { alpha, beta } = params;
    const mean = alpha / (alpha + beta);
    const observations = alpha + beta - 1.5 - 1.0; //use DEFAULT_ALPHA, DEFAULT_BETA
    console.log(`${action.toString().padStart(5)} | ${alpha.toFixed(3).padStart(5)} | ${beta.toFixed(3).padStart(5)} | ${mean.toFixed(3).padStart(5)} | ${observations}`);
  });
  console.log('');
  await debugModel();
  return newSession;
};

export const resetTimerState = (set: any) => {
  set({
    isActive: false,
    isBreakTime: false,
    taskType: undefined,
    energyLevel: undefined,
    userAcceptedRecommendation: false,
    hasInteractedWithTimer: false,
    hasDismissedRecommendationCard: false,
    showSkipConfirm: false,
    showSkip: false,
    showBreakModal: false,
    showTimeAdjust: false,
    time: 0,
    initialTime: 0,
    sessionStartTimestamp: undefined,
  });
};

export const updateRecommendations = async (
  energyLevel: EnergyLevel,
  timeOfDay: TimeOfDay,
  taskType: string,
  set: any,
  includeShortSessions: boolean,
  dynamicFocusArms: number[]
) => {
  try {
    const { focusDuration, breakDuration } = await getSessionRecommendation(
      energyLevel,
      timeOfDay,
      taskType,
      includeShortSessions,
      dynamicFocusArms
    );
    set({
      recommendedFocusDuration: focusDuration,
      recommendedBreakDuration: breakDuration,
      time: focusDuration * 60,
      initialTime: focusDuration * 60,
      userAcceptedRecommendation: false,
      hasDismissedRecommendationCard: false
    });
  } catch (error) {
    console.error("Error getting session recommendation:", error);
  }
};

export const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  return `${minutes} min`;
}; 
import { Context, debugModel, loadModel, updateModel } from '@/services/contextualBandits';
import { insertSession } from '@/services/database';
import { calculateReward } from '@/services/recommendations';
import { getSessionRecommendation } from '@/services/sessionPlanner';
import { EnergyLevel } from '@/types';
import { createContextKey } from '@/utils/contextKey';

/**
 * Detect time of day - kept for backward compatibility with database storage.
 */
export function detectTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

/**
 * Create a session object with all required fields.
 */
export function createSession(params: {
  taskType: string;
  energyLevel: EnergyLevel;
  recommendedDuration: number;
  recommendedBreak: number;
  userSelectedDuration: number;
  userSelectedBreak: number;
  acceptedRecommendation: boolean;
  sessionCompleted: boolean;
  focusedUntilSkipped: number;
  skipReason?: 'skippedFocus' | 'skippedBreak';
}) {
  return {
    ...params,
    timeOfDay: detectTimeOfDay(),  // Still stored for historical data
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
}

/**
 * Create a session and update the RL model.
 */
export async function createSessionWithContext(
  context: Context,
  sessionData: {
    taskType: string;
    energyLevel: EnergyLevel;
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
) {
  const newSession = createSession(sessionData);
  await insertSession(newSession);
  await updateModel(context, modelActionOverride ?? (sessionData.focusedUntilSkipped || 0), newSession.reward);
  await store.loadSessions();

  // Debug logging
  const model = await loadModel();
  const contextKey = createContextKey(context);
  const actions = Object.keys(model[contextKey] || {}).map(Number).sort((a, b) => a - b);

  console.log(`\n=== Session Model Update ===`);
  console.log(`Context: ${contextKey}`);
  console.log('Action | Alpha | Beta | Mean | Observations');
  console.log('------------------------------------------');
  actions.forEach(action => {
    const params = model[contextKey][action];
    if (!params) return;
    const { alpha, beta } = params;
    const mean = alpha / (alpha + beta);
    const observations = alpha + beta - 1.5 - 1.0;
    console.log(`${action.toString().padStart(5)} | ${alpha.toFixed(3).padStart(5)} | ${beta.toFixed(3).padStart(5)} | ${mean.toFixed(3).padStart(5)} | ${observations.toFixed(1)}`);
  });
  console.log('');

  await debugModel();
  return newSession;
}

/**
 * Reset timer state after session ends.
 */
export function resetTimerState(set: any) {
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
}

/**
 * Update recommendations after energy or task changes.
 */
export async function updateRecommendations(
  energyLevel: EnergyLevel,
  taskType: string,
  set: any,
  dynamicFocusArms: number[]
) {
  try {
    const { focusDuration, breakDuration } = await getSessionRecommendation(
      energyLevel,
      taskType,
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
}

/**
 * Format time in seconds to minutes string.
 */
export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes} min`;
}
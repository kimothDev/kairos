import { EnergyLevel } from '@/types';
import { createContextKeyFromParts } from '@/utils/contextKey';
import { normalizeTask } from '@/utils/task';
import { roundToNearest5 } from '@/utils/time';
import { getModelState } from './contextualBandits';

//define time of day types
export type TimeOfDay = 'morning' | 'afternoon' | 'evening';

//define recommendation interface
export interface FocusRecommendation {
  focusDuration: number; // in minutes
  breakDuration: number; // in minutes
}

//detect time of day based on current hour
export const detectTimeOfDay = (): TimeOfDay => {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 12) {
    return 'morning';
  } else if (hour >= 12 && hour < 18) {
    return 'afternoon';
  } else {
    return 'evening';
  }
};

//base recommendations by energy level
const baseRecommendationsByEnergy: Record<EnergyLevel, FocusRecommendation> = {
  low: { focusDuration: 20, breakDuration: 5 },
  mid: { focusDuration: 30, breakDuration: 5 },
  high: { focusDuration: 40, breakDuration: 10 },
  '': { focusDuration: 25, breakDuration: 5 } // Default if no energy level selected
};

//task-specific adjustments (multipliers for focus duration)
const taskAdjustments: Record<string, number> = {
  'Coding': 1.0,      // No adjustment
  'Writing': 1.0,     // No adjustment
  'Reading': 1.0,     // No adjustment
  'Studying': 1.0,    // No adjustment
  'Designing': 1.0,   // No adjustment
  'Meditating': 0.8,  // Shorter sessions
  'Planning': 0.8,    // Shorter sessions
  'Researching': 1.0  // No adjustment
};

//reward calculation constants
export const REWARD_CONSTANTS = {
  RECOMMENDATION_BONUS: 0.15,
  SKIPPED_FOCUS_BASE: 0.4,
  SKIPPED_BREAK_BASE: 0.3,
  SKIPPED_BREAK_MULTIPLIER: 0.3,
  COMPLETED_BASE: 0.7,
  COMPLETED_MULTIPLIER: 0.3,
  IDEAL_MAX_DURATION: 60,
  EXCESS_PENALTY_MULTIPLIER: 0.1
} as const;

//get recommendations based on energy level, time of day, and task type
export const getRecommendations = async (
  energyLevel: EnergyLevel,
  timeOfDay: TimeOfDay,
  taskType?: string
): Promise<FocusRecommendation> => {
  //get the current model state to check number of observations
  const modelState = await getModelState();
  
  //create context keys for both focus and break
  const focusContextKey = createContextKeyFromParts(taskType, energyLevel, timeOfDay, false);
  const breakContextKey = createContextKeyFromParts(taskType, energyLevel, timeOfDay, true);
  
  //get number of observations for this context
  const focusParams = modelState[focusContextKey]?.[baseRecommendationsByEnergy[energyLevel].focusDuration] || { alpha: 1, beta: 1 };
  const breakParams = modelState[breakContextKey]?.[baseRecommendationsByEnergy[energyLevel].breakDuration] || { alpha: 1, beta: 1 };
  
  //calculate total observations (alpha + beta - 2)
  const focusObs = focusParams.alpha + focusParams.beta - 2;
  const breakObs = breakParams.alpha + breakParams.beta - 2;
  
  //calculate rule-based fade factor (1.0 -> 0.0 as observations increase)
  //after 7 sessions, rule-based system will have minimal influence
  const focusFadeFactor = Math.max(0, 1 - (focusObs / 7));
  const breakFadeFactor = Math.max(0, 1 - (breakObs / 7));

  //start with base focus/break times for this energy level
  const recommendation = { ...baseRecommendationsByEnergy[energyLevel] };

  //only apply time of day and task adjustments if we haven't learned enough
  if (focusFadeFactor > 0) {
    //modify base durations based on time of day
    switch (timeOfDay) {
      case 'morning':
        recommendation.focusDuration = roundToNearest5(recommendation.focusDuration) + 5; // Add 5 minutes
        break;
      case 'afternoon':
        recommendation.focusDuration = roundToNearest5(recommendation.focusDuration) - 5; // Subtract 5 minutes
        recommendation.breakDuration = roundToNearest5(recommendation.breakDuration) + 5; // Add 5 minutes
        break;
      case 'evening':
        recommendation.breakDuration = roundToNearest5(recommendation.breakDuration) + 5; // Add 5 minutes
        break;
    }

    //apply task adjustments if we have a task type
    if (taskType) {
      const normalizedTask = normalizeTask(taskType);
      const normalizedAdjustments: Record<string, number> = Object.fromEntries(
        Object.entries(taskAdjustments).map(([key, val]) => [key.toLowerCase(), val])
      );
      const taskMultiplier = normalizedAdjustments[normalizedTask] || 1.0;
      recommendation.focusDuration = roundToNearest5(recommendation.focusDuration * taskMultiplier);
    }
  }

  //clamp and round the final focus duration
  recommendation.focusDuration = Math.min(70, Math.max(5, roundToNearest5(recommendation.focusDuration)));

  //normalize break time
  recommendation.breakDuration = recommendation.breakDuration <= 1 
    ? 5 //minimum 5 minutes
    : Math.min(25, Math.max(5, roundToNearest5(recommendation.breakDuration)));

  return recommendation;
};

//calculate reward based on completion and acceptance of recommendation
export const calculateReward = (
  sessionCompleted: boolean,
  acceptedRecommendation: boolean,
  focusedUntilSkipped: number,
  userSelectedDuration: number,
  recommendedDuration: number,
  skipReason: 'skippedFocus' | 'skippedBreak' | 'none' = 'none'
): number => {
  const targetDuration = acceptedRecommendation ? recommendedDuration : userSelectedDuration;
  const focusRatio = Math.min(1, focusedUntilSkipped / targetDuration); // Cap at 1.0

  //base reward components
  let reward = 0;
  const recommendationBonus = acceptedRecommendation ? REWARD_CONSTANTS.RECOMMENDATION_BONUS : 0;

  //1. Handle skipped states differently
  if (skipReason === 'skippedFocus') {
    //linear reward for partial focus (0-0.4 range)
    reward = REWARD_CONSTANTS.SKIPPED_FOCUS_BASE * focusRatio + recommendationBonus;
  } 
  else if (skipReason === 'skippedBreak') {
    //breaks get milder penalties (0.3-0.6 range)
    reward = REWARD_CONSTANTS.SKIPPED_BREAK_BASE + 
      (REWARD_CONSTANTS.SKIPPED_BREAK_MULTIPLIER * focusRatio) + 
      recommendationBonus;
  }
  //2. Completed sessions get highest rewards
  else if (sessionCompleted) {
    reward = REWARD_CONSTANTS.COMPLETED_BASE + 
      (REWARD_CONSTANTS.COMPLETED_MULTIPLIER * focusRatio) + 
      recommendationBonus;
  }

  //3. Duration quality adjustment (penalize very long sessions)
  if (targetDuration > REWARD_CONSTANTS.IDEAL_MAX_DURATION) {
    const excessPenalty = REWARD_CONSTANTS.EXCESS_PENALTY_MULTIPLIER * 
      Math.min(1, (targetDuration - REWARD_CONSTANTS.IDEAL_MAX_DURATION) / REWARD_CONSTANTS.IDEAL_MAX_DURATION);
    reward -= excessPenalty;
  }

  return Math.min(1, Math.max(0, reward));
};


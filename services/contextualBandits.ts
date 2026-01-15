import { EnergyLevel } from '@/types';
import { createContextKey } from '@/utils/contextKey';
import { roundToNearest5 } from '@/utils/time';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TimeOfDay } from './recommendations';

//define the context type
export interface Context {
  taskType: string;
  energyLevel: EnergyLevel;
  timeOfDay: TimeOfDay;
}

//define the action type (focus duration in minutes)
export type Action = number;

//core focus-session actions (15–60 min in 5-min steps)
const BASE_ACTIONS: Action[] = [20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70];

//ADHD/short-session mode actions (10–30 min in 5-min steps)
const SHORT_ACTIONS: Action[] = [10, 15, 20, 25, 30];

//break durations (0 = skip, 5–25 min)
const BREAK_ACTIONS: Action[] = [5, 10, 15, 20];


/**
 * Returns the available focus-session actions:
 * - If includeShortSessions is ON, returns SHORT_ACTIONS
 * - Otherwise, returns BASE_ACTIONS
 * Also merges any dynamic arms added at runtime.
 */
export function getAvailableActions(includeShortSessions: boolean, dynamicFocusArms: number[] = []): Action[] {
  const base = includeShortSessions ? SHORT_ACTIONS : BASE_ACTIONS;
  return Array.from(new Set([...base, ...dynamicFocusArms])).sort((a, b) => a - b);
}

//storage key for the model
const MODEL_STORAGE_KEY = 'contextual_bandits_model';

//updated constants for more aggressive learning
const DEFAULT_ALPHA = 1.5;  //increased from 1 to favor slightly optimistic initial exploration
const DEFAULT_BETA = 1.0;
const EXPLORATION_DECAY = 0.95; //changed from 0.95 to 0.85 for faster decay (15% decay per session)

//define the model parameters
interface ModelParameters {
  alpha: number; //success count
  beta: number;  //failure count
}

//define the model state
interface ModelState {
  [key: string]: {
    [action: number]: ModelParameters;
  };
}

//load the model from storage
export const loadModel = async (): Promise<ModelState> => {
  try {
    const modelJson = await AsyncStorage.getItem(MODEL_STORAGE_KEY);
    if (!modelJson) return {};

    const model: ModelState = JSON.parse(modelJson);

    // Apply decay to all alpha/beta values
    // const decayRate = 0.99; // 1% decay (decayRate = 0.95 for faster adaptation)
    // for (const contextKey in model) {
    //   for (const action in model[contextKey]) {
    //     const entry = model[contextKey][action];
    //     entry.alpha *= decayRate;
    //     entry.beta *= decayRate;
    //   }
    // }

    return model;
  } catch (error) {
    console.error('Error loading contextual bandits model:', error);
    return {};
  }
};


//save the model to storage
export const saveModel = async (model: ModelState): Promise<void> => {
  try {
    await AsyncStorage.setItem(MODEL_STORAGE_KEY, JSON.stringify(model));
  } catch (error) {
    console.error('Error saving contextual bandits model:', error);
  }
};

//sample from a beta distribution
const sampleBeta = (alpha: number, beta: number): number => {
  const u = Math.random();
  const v = Math.random();
  const x = Math.pow(u, 1 / alpha);
  const y = Math.pow(v, 1 / beta);
  return x / (x + y);
};

//get the best action for a given context using Thompson sampling
export const getBestAction = async (
  context: Context,
  actions: Action[],
  includeShortSessions: boolean,
  dynamicFocusArms: number[]
): Promise<Action> => {
  const model = await loadModel();
  const contextKey = createContextKey(context);
  const availableActions = actions.length > 0 ? actions : getAvailableActions(includeShortSessions, dynamicFocusArms);

  //initialize context if missing
  if (!model[contextKey]) model[contextKey] = {};

  //track total tries in this context for exploration decay
  const totalTries = Object.values(model[contextKey]).reduce((sum, {alpha, beta}) => 
    sum + alpha + beta - DEFAULT_ALPHA - DEFAULT_BETA, 0);
  
  //ensure all actions exist with default params
  let needsSave = false;
  availableActions.forEach(action => {
    if (!model[contextKey][action]) {
      model[contextKey][action] = { alpha: DEFAULT_ALPHA, beta: DEFAULT_BETA };
      needsSave = true;
    }
  });
  if (needsSave) await saveModel(model);

  //find successful durations (mean > 0.6) with observations
  const successfulDurations = availableActions
    .map(action => {
      const { alpha, beta } = model[contextKey][action]!;
      const mean = alpha / (alpha + beta);
      const observations = alpha + beta - DEFAULT_ALPHA - DEFAULT_BETA;
      return { action, mean, observations };
    })
    .filter(({ mean, observations }) => mean > 0.6 && observations > 0)
    .sort((a, b) => b.mean - a.mean);

  //1. Early-phase: Random exploration for first few trials
  if (totalTries < 5 && Math.random() < 0.7) {
    //instead of pure random, use weighted random based on proximity to successful durations
    const weights = availableActions.map(action => {
      let weight = 1.0; // Base weight
      
      //find successful durations (mean > 0.6) with observations
      const successfulDurations = availableActions
        .map(a => {
          const { alpha, beta } = model[contextKey][a]!;
          const mean = alpha / (alpha + beta);
          const observations = alpha + beta - DEFAULT_ALPHA - DEFAULT_BETA;
          return { action: a, mean, observations };
        })
        .filter(({ mean, observations }) => mean > 0.6 && observations > 0);

      if (successfulDurations.length > 0) {
        //find the closest successful duration
        const closestSuccess = successfulDurations.reduce((closest, current) => {
          const currentDiff = Math.abs(current.action - action);
          const closestDiff = Math.abs(closest.action - action);
          return currentDiff < closestDiff ? current : closest;
        });

        //calculate bonus based on distance (max 10 minutes difference)
        const distance = Math.abs(closestSuccess.action - action);
        if (distance <= 10) {
          weight += (1 - distance / 10) * 0.5 * closestSuccess.mean;
        }
      }
      
      return weight;
    });

    //normalize weights
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    const normalizedWeights = weights.map(w => w / totalWeight);

    //select action based on weights
    const random = Math.random();
    let cumulativeWeight = 0;
    let selectedAction = availableActions[0];

    for (let i = 0; i < availableActions.length; i++) {
      cumulativeWeight += normalizedWeights[i];
      if (random <= cumulativeWeight) {
        selectedAction = availableActions[i];
        break;
      }
    }

    return selectedAction;
  }

  //2. Sample from Beta distributions
  const samples = availableActions.map(action => {
    const { alpha, beta } = model[contextKey][action]!;
    const mean = alpha / (alpha + beta);
    const variance = (alpha * beta) / (Math.pow(alpha + beta, 2) * (alpha + beta + 1));
    const observations = alpha + beta - DEFAULT_ALPHA - DEFAULT_BETA;
    
    //calculate proximity bonus based on successful durations
    let proximityBonus = 0;
    let closestSuccess = null;
    if (successfulDurations.length > 0) {
      //find the closest successful duration
      closestSuccess = successfulDurations.reduce((closest, current) => {
        const currentDiff = Math.abs(current.action - action);
        const closestDiff = Math.abs(closest.action - action);
        return currentDiff < closestDiff ? current : closest;
      });

      //calculate bonus based on distance (max 10 minutes difference)
      const distance = Math.abs(closestSuccess.action - action);
      if (distance <= 10) {
        proximityBonus = (1 - distance / 10) * 0.5 * closestSuccess.mean;
      }
    }
    
    //add a small bonus for higher durations if they have any success
    const durationBonus = action > 25 && mean > 0.5 ? 0.1 : 0;
    
    //add a penalty for durations with no observations
    const noDataPenalty = observations === 0 ? -0.2 : 0;
    
    return { 
      action,
      value: sampleBeta(alpha, beta) + durationBonus + noDataPenalty + proximityBonus,
      mean,
      variance,
      observations,
      proximityBonus,
      closestSuccess: closestSuccess ? `${closestSuccess.action}min` : 'none',
      durationBonus,
      noDataPenalty
    };
  });

  //3. Apply exploration decay with a lower rate
  const explorationRate = Math.pow(EXPLORATION_DECAY, totalTries);

  if (Math.random() < explorationRate) {
    //Explore: Prefer high-variance actions or higher durations with some success
    samples.sort((a, b) => {
      //if both have some success, prefer the one with higher success rate
      if (a.mean > 0.5 && b.mean > 0.5) {
        return b.mean - a.mean;
      }
      //if one has success and other doesn't, prefer the successful one
      if (a.mean > 0.5 && b.mean <= 0.5) return -1;
      if (b.mean > 0.5 && a.mean <= 0.5) return 1;
      //otherwise prefer high variance
      return b.variance - a.variance;
    });
    return samples[0].action;
  }

  //4. Default: Exploit best predicted action
  //sort by mean value and observations, with a bias towards higher durations
  samples.sort((a, b) => {
    // First prioritize durations with observations
    if (a.observations === 0 && b.observations === 0) return 0;
    if (a.observations === 0) return 1;
    if (b.observations === 0) return -1;
    
    //then prioritize high success rates
    if (a.mean > 0.6 && b.mean > 0.6) {
      return b.action - a.action;
    }
    
    return b.mean - a.mean;
  });

  return samples[0].action;
};

//update the model based on the reward
export const updateModel = async (
  context: Context,
  action: Action,
  reward: number
): Promise<void> => {
  if (reward === 0 || isNaN(reward)) return;

  const model = await loadModel();
  const contextKey = createContextKey(context);

  if (!model[contextKey]) model[contextKey] = {};
  if (!model[contextKey][action]) model[contextKey][action] = {
    alpha: DEFAULT_ALPHA,
    beta: DEFAULT_BETA,
  };

  const successWeight = reward;
  const failureWeight = 1 - reward;

  model[contextKey][action].alpha += successWeight;
  model[contextKey][action].beta += failureWeight;

  await saveModel(model);
};

//combine heuristic and learned preferences
export const getSmartRecommendation = async (
  context: Context,
  baseRecommendation: number,
  includeShortSessions: boolean,
  dynamicFocusArms: number[]
): Promise<{ value: number; source: 'heuristic' | 'learned' | 'blended' }> => {
  try {
    const availableActions = includeShortSessions ? SHORT_ACTIONS : BASE_ACTIONS;
    
    const learned = await getBestAction(context, availableActions, includeShortSessions, dynamicFocusArms);
    const model = await loadModel();
    const key = createContextKey(context);
    const params = model[key]?.[learned];

    if (!params) {
      const finalValue = includeShortSessions ? Math.min(baseRecommendation, Math.max(...SHORT_ACTIONS)) : baseRecommendation;
      return { value: finalValue, source: 'heuristic' };
    }

    const totalObs = params.alpha + params.beta - DEFAULT_ALPHA - DEFAULT_BETA;
    const mean = params.alpha / (params.alpha + params.beta);
    const confidence = Math.min(0.95, totalObs / 5);

    if (totalObs > 0 && mean > 0.5) {
      const learnedWeight = Math.min(0.9, confidence * 1.2);
      
      //find successful durations to calculate proximity bonus
      const successfulDurations = Object.entries(model[key])
        .map(([action, p]) => {
          const a = parseInt(action);
          const m = p.alpha / (p.alpha + p.beta);
          const obs = p.alpha + p.beta - DEFAULT_ALPHA - DEFAULT_BETA;
          return { action: a, mean: m, observations: obs };
        })
        .filter(({ mean, observations }) => mean > 0.6 && observations > 0)
        .sort((a, b) => b.mean - a.mean);

      //calculate proximity bonus for base recommendation
      let proximityBonus = 0;
      if (successfulDurations.length > 0) {
        const closestSuccess = successfulDurations.reduce((closest, current) => {
          const currentDiff = Math.abs(current.action - baseRecommendation);
          const closestDiff = Math.abs(closest.action - baseRecommendation);
          return currentDiff < closestDiff ? current : closest;
        });

        const distance = Math.abs(closestSuccess.action - baseRecommendation);
        if (distance <= 10) {
          proximityBonus = (1 - distance / 10) * 0.5 * closestSuccess.mean;
        }
      }

      const adjustedBase = baseRecommendation * (1 + proximityBonus);
      const rawValue = adjustedBase * (1 - learnedWeight) + learned * learnedWeight;
      const value = roundToNearest5(rawValue);

      const source =
        confidence < 0.3
          ? 'heuristic'
          : confidence > 0.7
          ? 'learned'
          : 'blended';

      const finalValue = includeShortSessions
        ? Math.min(value, Math.max(...SHORT_ACTIONS))
        : value;

      return { value: finalValue, source };
    }

    const finalValue = includeShortSessions ? Math.min(baseRecommendation, Math.max(...SHORT_ACTIONS)) : baseRecommendation;
    return { value: finalValue, source: 'heuristic' };
  } catch (err) {
    console.error('Error in getSmartRecommendation:', err);
    const finalValue = includeShortSessions ? Math.min(baseRecommendation, Math.max(...SHORT_ACTIONS)) : baseRecommendation;
    return { value: finalValue, source: 'heuristic' };
  }
};

//break recommendation via separate context
export const getSmartBreakRecommendation = async (
  context: Context,
  baseBreak: number,
  includeShortSessions: boolean
): Promise<{ value: number; source: 'heuristic' | 'learned' | 'blended' }> => {
  const availableBreaks = includeShortSessions ? [5] : BREAK_ACTIONS;
  const breakTask = context.taskType.replace(/-break(-break)+$/, '-break');
  const breakCtx: Context = {
    ...context,
    taskType: breakTask.endsWith('-break') ? breakTask : `${breakTask}-break`,
  };

  const model = await loadModel();
  const key = createContextKey(breakCtx);

  if (!model[key]) {
    model[key] = {};
  }

  const totalTries = Object.values(model[key]).reduce((sum, {alpha, beta}) => 
    sum + alpha + beta - DEFAULT_ALPHA - DEFAULT_BETA, 0);

  let needsSave = false;
  availableBreaks.forEach(action => {
    if (!model[key][action]) {
      model[key][action] = { alpha: DEFAULT_ALPHA, beta: DEFAULT_BETA };
      needsSave = true;
    }
  });
  if (needsSave) await saveModel(model);

  //find successful durations
  const successfulDurations = availableBreaks
    .map(action => {
      const { alpha, beta } = model[key][action]!;
      const mean = alpha / (alpha + beta);
      const observations = alpha + beta - DEFAULT_ALPHA - DEFAULT_BETA;
      return { action, mean, observations };
    })
    .filter(({ mean, observations }) => mean > 0.6 && observations > 0)
    .sort((a, b) => b.mean - a.mean);

  //early-phase: Weighted random selection
  if (totalTries < 3 && Math.random() < 0.7) {
    const weights = availableBreaks.map(action => {
      let weight = 1.0;
      if (successfulDurations.length > 0) {
        const closestSuccess = successfulDurations.reduce((closest, current) => {
          const currentDiff = Math.abs(current.action - action);
          const closestDiff = Math.abs(closest.action - action);
          return currentDiff < closestDiff ? current : closest;
        });

        const distance = Math.abs(closestSuccess.action - action);
        if (distance <= 5) {
          weight += (1 - distance / 5) * 0.5 * closestSuccess.mean;
        }
      }
      return weight;
    });

    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    const normalizedWeights = weights.map(w => w / totalWeight);

    const random = Math.random();
    let cumulativeWeight = 0;
    let selectedAction = availableBreaks[0];

    for (let i = 0; i < availableBreaks.length; i++) {
      cumulativeWeight += normalizedWeights[i];
      if (random <= cumulativeWeight) {
        selectedAction = availableBreaks[i];
        break;
      }
    }

    return { value: selectedAction, source: 'learned' };
  }

  //sample from Beta distributions
  const samples = availableBreaks.map(action => {
    const { alpha, beta } = model[key][action]!;
    const mean = alpha / (alpha + beta);
    const variance = (alpha * beta) / (Math.pow(alpha + beta, 2) * (alpha + beta + 1));
    const observations = alpha + beta - DEFAULT_ALPHA - DEFAULT_BETA;
    
    let proximityBonus = 0;
    if (successfulDurations.length > 0) {
      const closestSuccess = successfulDurations.reduce((closest, current) => {
        const currentDiff = Math.abs(current.action - action);
        const closestDiff = Math.abs(closest.action - action);
        return currentDiff < closestDiff ? current : closest;
      });

      const distance = Math.abs(closestSuccess.action - action);
      if (distance <= 5) {
        proximityBonus = (1 - distance / 5) * 0.5 * closestSuccess.mean;
      }
    }
    
    return { 
      action,
      value: sampleBeta(alpha, beta) + proximityBonus,
      mean,
      variance,
      observations
    };
  });

  const explorationRate = Math.pow(EXPLORATION_DECAY, totalTries);

  if (Math.random() < explorationRate) {
    samples.sort((a, b) => {
      if (a.mean > 0.5 && b.mean > 0.5) {
        return b.mean - a.mean;
      }
      return b.variance - a.variance;
    });
    return { value: samples[0].action, source: 'learned' };
  }

  samples.sort((a, b) => {
    if (a.observations === 0 && b.observations === 0) return 0;
    if (a.observations === 0) return 1;
    if (b.observations === 0) return -1;
    return b.mean - a.mean;
  });

  const best = samples[0].action;
  const params = model[key][best];
  const totalObs = params.alpha + params.beta - DEFAULT_ALPHA - DEFAULT_BETA;
  const mean = params.alpha / (params.alpha + params.beta);
  const confidence = Math.min(0.95, totalObs / 5);

  if (totalObs > 0 && mean > 0.5) {
    const learnedWeight = Math.min(0.9, confidence * 1.2);
    
    let proximityBonus = 0;
    if (successfulDurations.length > 0) {
      const closestSuccess = successfulDurations.reduce((closest, current) => {
        const currentDiff = Math.abs(current.action - baseBreak);
        const closestDiff = Math.abs(closest.action - baseBreak);
        return currentDiff < closestDiff ? current : closest;
      });

      const distance = Math.abs(closestSuccess.action - baseBreak);
      if (distance <= 5) {
        proximityBonus = (1 - distance / 5) * 0.5 * closestSuccess.mean;
      }
    }

    const adjustedBase = baseBreak * (1 + proximityBonus);
    const rawValue = adjustedBase * (1 - learnedWeight) + best * learnedWeight;
    const value = roundToNearest5(rawValue);

    const source =
      confidence < 0.3
        ? 'heuristic'
        : confidence > 0.7
        ? 'learned'
        : 'blended';

    return { value, source };
  }

  return { value: baseBreak, source: 'heuristic' };
};


//removes old stacked keys like -break-break
export const cleanBreakContextKeys = async () => {
  try {
    const model = await loadModel();
    const cleanedModel: ModelState = {};

    for (const contextKey in model) {
      //skip if not a "dirty" break key
      if (contextKey.includes('-break-break')) {
        continue;
      }

      //keep all clean keys
      cleanedModel[contextKey] = model[contextKey];
    }

    //save the cleaned model back
    await saveModel(cleanedModel);
  } catch (err) {
    console.error('[Cleanup] Failed to clean model:', err);
  }
};


//debugging helper
export const debugModel = async (): Promise<void> => {
  const model = await loadModel();
  console.log('\n=== Model State Summary ===');
  console.log('Contexts:', Object.keys(model).length);
  console.log('\nContext Details:');
  console.log('----------------');
  
  for (const key in model) {
    const [taskType, energy, timeOfDay] = key.split('|');
    console.log(`\nContext: ${taskType} | ${energy} | ${timeOfDay}`);
    console.log('Action | Mean | Confidence | Observations');
    console.log('----------------------------------------');
    
    const actions = Object.entries(model[key]);
    if (actions.length === 0) continue;

    actions.forEach(([action, params]) => {
      const { alpha, beta } = params;
      const mean = alpha / (alpha + beta);
      const totalObs = alpha + beta - DEFAULT_ALPHA - DEFAULT_BETA;
      const confidence = Math.min(0.95, totalObs / 10);
      
      console.log(`${action.toString().padStart(5)} | ${mean.toFixed(3)} | ${confidence.toFixed(3)} | ${totalObs}`);
    });
  }
  console.log('\n========================\n');
};

//get the current model state
export const getModelState = async (): Promise<ModelState> => {
  return await loadModel();
};

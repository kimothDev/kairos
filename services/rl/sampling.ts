/**
 * RL Thompson Sampling
 *
 * Part of the Reinforcement Learning system. Implements Thompson Sampling
 * for balancing exploitation and exploration of duration recommendations.
 */
import { createContextKey } from "@/utils/contextKey";
import { loadModel, saveModel } from "./storage";
import {
    Context,
    DEFAULT_ALPHA,
    DEFAULT_BETA,
    EARLY_EXPLORATION_THRESHOLD,
    ModelState,
} from "./types";
import { getZoneActions, getZoneData } from "./zones";

/**
 * Sample from a Beta distribution.
 */
export function sampleBeta(alpha: number, beta: number): number {
  const u = Math.random();
  const v = Math.random();
  const x = Math.pow(u, 1 / alpha);
  const y = Math.pow(v, 1 / beta);
  return x / (x + y);
}

/**
 * RL Storage Service
 *
 * Part of the Reinforcement Learning system. Handles persistent storage
 * of the RL models using AsyncStorage.
 */
/**
 * Get total observations for a context.
 */
export function getTotalObservations(
  model: ModelState,
  contextKey: string,
): number {
  if (!model[contextKey]) return 0;
  return Object.values(model[contextKey]).reduce(
    (sum, { alpha, beta }) => sum + alpha + beta - DEFAULT_ALPHA - DEFAULT_BETA,
    0,
  );
}

/**
 * Get the best action using Thompson Sampling.
 */
export async function getBestAction(
  context: Context,
  actions: number[],
  dynamicArms: number[] = [],
): Promise<number> {
  const model = await loadModel();
  const contextKey = createContextKey(context);
  const availableActions = getZoneActions(
    (await getZoneData(contextKey, context.energyLevel, 25)).zone,
    dynamicArms,
  );
  const actionsToUse = actions.length > 0 ? actions : availableActions;

  // Initialize context if missing
  if (!model[contextKey]) model[contextKey] = {};

  // Ensure all actions have default params
  let needsSave = false;
  for (const action of actionsToUse) {
    if (!model[contextKey][action]) {
      model[contextKey][action] = { alpha: DEFAULT_ALPHA, beta: DEFAULT_BETA };
      needsSave = true;
    }
  }
  if (needsSave) await saveModel(model);

  const totalTries = getTotalObservations(model, contextKey);

  // Early exploration: random selection
  if (totalTries < EARLY_EXPLORATION_THRESHOLD) {
    const randomAction =
      actionsToUse[Math.floor(Math.random() * actionsToUse.length)];
    console.log(
      "[RL] Early exploration: randomly selected",
      randomAction,
      "(total tries:",
      totalTries,
      ")",
    );
    return randomAction;
  }

  // Thompson Sampling: sample from each Beta distribution
  const samples = actionsToUse.map((action) => {
    const { alpha, beta } = model[contextKey][action] || {
      alpha: DEFAULT_ALPHA,
      beta: DEFAULT_BETA,
    };
    return {
      action,
      value: sampleBeta(alpha, beta),
      mean: alpha / (alpha + beta),
      observations: alpha + beta - DEFAULT_ALPHA - DEFAULT_BETA,
    };
  });

  // Sort by sampled value (descending)
  samples.sort((a, b) => b.value - a.value);

  console.log("[RL] Thompson Sampling for", contextKey, ":");
  samples.slice(0, 3).forEach((s) => {
    console.log(
      `  ${s.action}min: sample=${s.value.toFixed(3)}, mean=${s.mean.toFixed(3)}, obs=${s.observations.toFixed(1)}`,
    );
  });

  return samples[0].action;
}

/**
 * Update the model with a reward.
 */
export async function updateModel(
  context: Context,
  action: number,
  reward: number,
): Promise<void> {
  if (reward === 0 || isNaN(reward)) {
    console.log("[RL] Skipping update: invalid reward", reward);
    return;
  }

  const model = await loadModel();
  const contextKey = createContextKey(context);

  if (!model[contextKey]) model[contextKey] = {};
  if (!model[contextKey][action]) {
    model[contextKey][action] = { alpha: DEFAULT_ALPHA, beta: DEFAULT_BETA };
  }

  const oldAlpha = model[contextKey][action].alpha;
  const oldBeta = model[contextKey][action].beta;

  // Reward is [0, 1]: success weight = reward, failure weight = 1 - reward
  const successWeight = Math.max(0, Math.min(1, reward));
  const failureWeight = Math.max(0, 1 - successWeight);

  // Intent Bonus: If it was a successful manual choice, we trust it more
  // (Assuming reward > COMPLETED_BASE implies successful completion)
  const isSuccessfulManual = reward > 0.7;
  const multiplier = isSuccessfulManual ? 1.5 : 1.0;

  model[contextKey][action].alpha += successWeight * multiplier;
  model[contextKey][action].beta += failureWeight * multiplier;

  const newMean =
    model[contextKey][action].alpha /
    (model[contextKey][action].alpha + model[contextKey][action].beta);

  console.log("[RL] Model update:", {
    context: contextKey,
    action: action + "min",
    reward: reward.toFixed(3),
    alpha:
      oldAlpha.toFixed(2) + " → " + model[contextKey][action].alpha.toFixed(2),
    beta:
      oldBeta.toFixed(2) + " → " + model[contextKey][action].beta.toFixed(2),
    newMean: newMean.toFixed(3),
  });

  await saveModel(model);
}

/**
 * Penalize a rejected recommendation.
 */
export async function penalizeRejection(
  context: Context,
  rejectedAction: number,
): Promise<void> {
  await updateModel(context, rejectedAction, -0.3);
  console.log("[RL] Penalized rejected recommendation:", rejectedAction, "min");
}

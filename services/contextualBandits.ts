/**
 * Contextual Bandits RL System
 *
 * This module implements Thompson Sampling with:
 * - Zone-based action spaces (short: 5-30min, long: 25-60min)
 * - Dual-track learning (preference + capacity)
 * - Dynamic arms for custom durations
 * - Simplified context (taskType + energyLevel only)
 */

import { EnergyLevel } from "@/types";
import { createContextKey } from "@/utils/contextKey";
import { roundToNearest5 } from "@/utils/time";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Context for recommendations.
 * Simplified to just task type and energy level (timeOfDay removed).
 */
export interface Context {
  taskType: string;
  energyLevel: EnergyLevel;
}

export type Action = number;
export type FocusZone = "short" | "long";

/**
 * Zone data tracks which zone a user prefers for a given context
 * and whether they're ready to transition.
 */
export interface ZoneData {
  zone: FocusZone;
  confidence: number;
  selections: number[];
  transitionReady: boolean;
}

/**
 * Capacity stats track user's actual focus ability vs. their selections.
 */
export interface CapacityStats {
  recentSessions: Array<{
    selectedDuration: number;
    actualFocusTime: number;
    completed: boolean;
    timestamp: number;
  }>;
  averageCapacity: number;
  completionRate: number;
  trend: "growing" | "stable" | "declining";
}

/**
 * Model parameters for Beta distribution.
 */
interface ModelParameters {
  alpha: number; // success evidence
  beta: number; // failure evidence
}

/**
 * Model state stores parameters for each action in each context.
 */
interface ModelState {
  [contextKey: string]: {
    [action: number]: ModelParameters;
  };
}

/**
 * Zone state stores zone data for each context.
 */
interface ZoneState {
  [contextKey: string]: ZoneData;
}

/**
 * Capacity state stores capacity stats for each context.
 */
interface CapacityState {
  [contextKey: string]: CapacityStats;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MODEL_STORAGE_KEY = "contextual_bandits_model_v2";
const ZONE_STORAGE_KEY = "contextual_bandits_zones";
const CAPACITY_STORAGE_KEY = "contextual_bandits_capacity";

// Pessimistic priors: unexplored arms start with mean=0.4 (1.0/(1.0+1.5))
// This prevents random high samples from beating proven winners
const DEFAULT_ALPHA = 1.0;
const DEFAULT_BETA = 1.5;
const EARLY_EXPLORATION_THRESHOLD = 3;
const CAPACITY_HISTORY_LIMIT = 10;

/**
 * Zone action sets - overlap at 25-30 for smooth transitions.
 * Minimum focus is 10 minutes (5 min removed as too short for meaningful work).
 */
const ZONE_ACTIONS: Record<FocusZone, number[]> = {
  short: [10, 15, 20, 25, 30],
  long: [25, 30, 35, 40, 45, 50, 55, 60],
};

const BREAK_ACTIONS: number[] = [5, 10, 15, 20];

// ============================================================================
// STORAGE FUNCTIONS
// ============================================================================

export async function loadModel(): Promise<ModelState> {
  try {
    const json = await AsyncStorage.getItem(MODEL_STORAGE_KEY);
    return json ? JSON.parse(json) : {};
  } catch (error) {
    console.error("[RL] Error loading model:", error);
    return {};
  }
}

export async function saveModel(model: ModelState): Promise<void> {
  try {
    await AsyncStorage.setItem(MODEL_STORAGE_KEY, JSON.stringify(model));
  } catch (error) {
    console.error("[RL] Error saving model:", error);
  }
}

export async function loadZones(): Promise<ZoneState> {
  try {
    const json = await AsyncStorage.getItem(ZONE_STORAGE_KEY);
    return json ? JSON.parse(json) : {};
  } catch (error) {
    console.error("[RL] Error loading zones:", error);
    return {};
  }
}

export async function saveZones(zones: ZoneState): Promise<void> {
  try {
    await AsyncStorage.setItem(ZONE_STORAGE_KEY, JSON.stringify(zones));
  } catch (error) {
    console.error("[RL] Error saving zones:", error);
  }
}

export async function loadCapacity(): Promise<CapacityState> {
  try {
    const json = await AsyncStorage.getItem(CAPACITY_STORAGE_KEY);
    return json ? JSON.parse(json) : {};
  } catch (error) {
    console.error("[RL] Error loading capacity:", error);
    return {};
  }
}

export async function saveCapacity(capacity: CapacityState): Promise<void> {
  try {
    await AsyncStorage.setItem(CAPACITY_STORAGE_KEY, JSON.stringify(capacity));
  } catch (error) {
    console.error("[RL] Error saving capacity:", error);
  }
}

// ============================================================================
// ZONE FUNCTIONS
// ============================================================================

/**
 * Detect which zone based on a selection and energy level.
 * Used for initial zone detection when no history exists.
 */
export function detectZone(
  selection: number,
  energyLevel: EnergyLevel,
): FocusZone {
  if (selection <= 25) return "short";
  if (selection >= 35) return "long";
  // 26-34 range: use energy level as tiebreaker
  return energyLevel === "low" ? "short" : "long";
}

/**
 * Get available actions for a zone.
 */
export function getZoneActions(
  zone: FocusZone,
  dynamicArms: number[] = [],
): number[] {
  const base = ZONE_ACTIONS[zone];
  const combined = Array.from(new Set([...base, ...dynamicArms]));
  return combined.sort((a, b) => a - b);
}

/**
 * Check if zone should transition based on recent selections.
 * Requires 5 selections and a clear trend to avoid flip-flopping.
 */
export function checkZoneTransition(zoneData: ZoneData): FocusZone {
  const { zone, selections } = zoneData;

  // Need at least 5 selections to consider transition (was 3 - too sensitive)
  if (selections.length < 5) return zone;

  const recentSelections = selections.slice(-5);
  const avgRecent =
    recentSelections.reduce((a, b) => a + b, 0) / recentSelections.length;

  // Short → Long: user consistently choosing 30+ (avg must be >= 30, was 25)
  if (zone === "short" && avgRecent >= 30) {
    console.log(
      "[RL] Zone transition: short → long (avg:",
      avgRecent.toFixed(1),
      ")",
    );
    return "long";
  }

  // Long → Short: user consistently choosing 25 or less (was 30 - too close to short→long threshold)
  if (zone === "long" && avgRecent <= 25) {
    console.log(
      "[RL] Zone transition: long → short (avg:",
      avgRecent.toFixed(1),
      ")",
    );
    return "short";
  }

  return zone;
}

/**
 * Get or create zone data for a context.
 */
export async function getZoneData(
  contextKey: string,
  energyLevel: EnergyLevel,
  heuristicDuration: number,
): Promise<ZoneData> {
  const zones = await loadZones();

  if (!zones[contextKey]) {
    // Initialize with heuristic-based zone
    const zone = detectZone(heuristicDuration, energyLevel);
    zones[contextKey] = {
      zone,
      confidence: 0,
      selections: [],
      transitionReady: false,
    };
    await saveZones(zones);
    console.log("[RL] Created zone for", contextKey, ":", zone);
  }

  return zones[contextKey];
}

/**
 * Update zone data when user selects a duration.
 */
export async function updateZoneData(
  contextKey: string,
  selectedDuration: number,
): Promise<void> {
  const zones = await loadZones();

  if (!zones[contextKey]) {
    zones[contextKey] = {
      zone: selectedDuration <= 30 ? "short" : "long",
      confidence: 0,
      selections: [],
      transitionReady: false,
    };
  }

  // Add selection and trim history
  zones[contextKey].selections.push(selectedDuration);
  if (zones[contextKey].selections.length > 10) {
    zones[contextKey].selections = zones[contextKey].selections.slice(-10);
  }

  // Update confidence
  zones[contextKey].confidence = Math.min(
    1,
    zones[contextKey].selections.length / 5,
  );

  // Check for zone transition
  const newZone = checkZoneTransition(zones[contextKey]);
  if (newZone !== zones[contextKey].zone) {
    zones[contextKey].zone = newZone;
    zones[contextKey].transitionReady = false;
  }

  await saveZones(zones);
}

// ============================================================================
// CAPACITY FUNCTIONS
// ============================================================================

/**
 * Calculate trend from recent sessions.
 */
function calculateTrend(
  sessions: CapacityStats["recentSessions"],
): CapacityStats["trend"] {
  if (sessions.length < 3) return "stable";

  const recent = sessions.slice(-5);
  const ratios = recent.map((s) => s.actualFocusTime / s.selectedDuration);

  // Linear regression on ratios
  const n = ratios.length;
  const sumX = (n * (n - 1)) / 2;
  const sumY = ratios.reduce((a, b) => a + b, 0);
  const sumXY = ratios.reduce((sum, y, x) => sum + x * y, 0);
  const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

  if (slope > 0.05) return "growing";
  if (slope < -0.05) return "declining";
  return "stable";
}

/**
 * Get capacity stats for a context.
 */
export async function getCapacityStats(
  contextKey: string,
): Promise<CapacityStats> {
  const capacityState = await loadCapacity();

  if (!capacityState[contextKey]) {
    return {
      recentSessions: [],
      averageCapacity: 0,
      completionRate: 0,
      trend: "stable",
    };
  }

  return capacityState[contextKey];
}

/**
 * Update capacity stats after a session.
 */
export async function updateCapacityStats(
  contextKey: string,
  selectedDuration: number,
  actualFocusTime: number,
  completed: boolean,
): Promise<void> {
  const capacityState = await loadCapacity();

  if (!capacityState[contextKey]) {
    capacityState[contextKey] = {
      recentSessions: [],
      averageCapacity: 0,
      completionRate: 0,
      trend: "stable",
    };
  }

  const stats = capacityState[contextKey];

  // Add new session
  stats.recentSessions.push({
    selectedDuration,
    actualFocusTime,
    completed,
    timestamp: Date.now(),
  });

  // Trim to limit
  if (stats.recentSessions.length > CAPACITY_HISTORY_LIMIT) {
    stats.recentSessions = stats.recentSessions.slice(-CAPACITY_HISTORY_LIMIT);
  }

  // Recalculate stats
  const totalFocusTime = stats.recentSessions.reduce(
    (sum, s) => sum + s.actualFocusTime,
    0,
  );
  stats.averageCapacity = totalFocusTime / stats.recentSessions.length;

  const completedCount = stats.recentSessions.filter((s) => s.completed).length;
  stats.completionRate = completedCount / stats.recentSessions.length;

  stats.trend = calculateTrend(stats.recentSessions);

  await saveCapacity(capacityState);

  console.log("[RL] Capacity updated for", contextKey, ":", {
    avgCapacity: stats.averageCapacity.toFixed(1),
    completionRate: (stats.completionRate * 100).toFixed(0) + "%",
    trend: stats.trend,
  });
}

/**
 * Adjust recommendation based on capacity.
 * @param modelRec - The model's recommendation
 * @param stats - User's capacity statistics
 * @param energyLevel - Current energy level (affects stretch thresholds)
 */
export function adjustForCapacity(
  modelRec: number,
  stats: CapacityStats,
  energyLevel: EnergyLevel = "mid",
): number {
  // Not enough data
  if (stats.recentSessions.length < 3) return modelRec;

  // If user consistently quits early, recommend their actual capacity
  if (stats.completionRate < 0.5) {
    const adjusted = roundToNearest5(stats.averageCapacity);
    console.log(
      "[RL] Capacity adjustment: user struggling, recommending",
      adjusted,
      "instead of",
      modelRec,
    );
    return Math.max(10, adjusted);
  }

  // Don't stretch if low energy - respect user's preference
  if (energyLevel === "low") {
    return modelRec;
  }

  // Stretch thresholds by energy level:
  // - High energy: stretch at 85% completion (more aggressive)
  // - Mid energy: stretch at 95% completion (conservative)
  const stretchThreshold = energyLevel === "high" ? 0.85 : 0.95;

  if (
    stats.completionRate >= stretchThreshold &&
    (stats.trend === "stable" || stats.trend === "growing")
  ) {
    const nudged = modelRec + 5;
    console.log(
      `[RL] Capacity stretch (${energyLevel} energy, ${(stats.completionRate * 100).toFixed(0)}% completion):`,
      modelRec,
      "→",
      nudged,
    );
    return nudged;
  }

  return modelRec;
}

// ============================================================================
// THOMPSON SAMPLING
// ============================================================================

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
 * Get total observations for a context.
 */
function getTotalObservations(model: ModelState, contextKey: string): number {
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

  model[contextKey][action].alpha += successWeight;
  model[contextKey][action].beta += failureWeight;

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

// ============================================================================
// MAIN RECOMMENDATION FUNCTION
// ============================================================================

/**
 * Get a smart recommendation combining Thompson Sampling with capacity adjustment.
 */
export async function getSmartRecommendation(
  context: Context,
  heuristicRecommendation: number,
  dynamicArms: number[] = [],
): Promise<{
  value: number;
  source: "heuristic" | "learned" | "blended" | "capacity";
}> {
  const contextKey = createContextKey(context);

  console.log("\n=== Smart Recommendation ===");
  console.log("Context:", contextKey);
  console.log("Heuristic:", heuristicRecommendation);

  try {
    // Get zone and capacity data
    const zoneData = await getZoneData(
      contextKey,
      context.energyLevel,
      heuristicRecommendation,
    );
    const capacityStats = await getCapacityStats(contextKey);
    const actions = getZoneActions(zoneData.zone, dynamicArms);

    console.log("Zone:", zoneData.zone, "| Actions:", actions.join(", "));

    // Get Thompson Sampling recommendation
    const model = await loadModel();
    const totalObs = getTotalObservations(model, contextKey);

    if (totalObs < 2) {
      // Not enough data, use heuristic
      const clamped = Math.max(
        Math.min(...actions),
        Math.min(heuristicRecommendation, Math.max(...actions)),
      );
      console.log("=== Returning", clamped, "(heuristic - low data) ===\n");
      return { value: clamped, source: "heuristic" };
    }

    const modelRec = await getBestAction(context, actions, dynamicArms);

    // Apply capacity adjustment (respects energy level - no stretch for low energy)
    const capacityAdjusted = adjustForCapacity(
      modelRec,
      capacityStats,
      context.energyLevel,
    );

    // Clamp to zone actions
    const finalValue = Math.max(
      Math.min(...actions),
      Math.min(capacityAdjusted, Math.max(...actions)),
    );

    let source: "learned" | "blended" | "capacity";
    if (capacityAdjusted !== modelRec) {
      source = "capacity";
    } else if (totalObs >= 5) {
      source = "learned";
    } else {
      source = "blended";
    }

    console.log(
      "Model rec:",
      modelRec,
      "| Capacity adjusted:",
      capacityAdjusted,
      "| Final:",
      finalValue,
    );
    console.log("=== Returning", finalValue, "(" + source + ") ===\n");

    return { value: finalValue, source };
  } catch (error) {
    console.error("[RL] Error in getSmartRecommendation:", error);
    return { value: heuristicRecommendation, source: "heuristic" };
  }
}

// ============================================================================
// BREAK RECOMMENDATIONS
// ============================================================================

/**
 * Get available break actions based on focus duration.
 * Shorter focus sessions get shorter break options.
 *
 * Rule: Max break = Focus duration ÷ 3 (minimum 5 min)
 *
 * Examples:
 *   15 min focus → max 5 min break  → [5]
 *   25 min focus → max 8 min break  → [5]
 *   30 min focus → max 10 min break → [5, 10]
 *   45 min focus → max 15 min break → [5, 10, 15]
 *   60 min focus → max 20 min break → [5, 10, 15, 20]
 */
export function getBreakActionsForFocus(focusDuration: number): number[] {
  const maxBreak = Math.max(5, Math.floor(focusDuration / 3));
  return BREAK_ACTIONS.filter((action) => action <= maxBreak);
}

/**
 * Get a smart break recommendation.
 * @param context - The context (taskType, energyLevel)
 * @param baseBreak - Heuristic break recommendation
 * @param focusDuration - The focus session duration (to scale break options)
 */
export async function getSmartBreakRecommendation(
  context: Context,
  baseBreak: number,
  focusDuration: number = 25,
): Promise<{ value: number; source: "heuristic" | "learned" }> {
  const breakContext: Context = {
    ...context,
    taskType: `${context.taskType}-break`,
  };
  const contextKey = createContextKey(breakContext);

  // Get available break actions based on focus duration
  const availableBreaks = getBreakActionsForFocus(focusDuration);

  // Clamp heuristic to available options
  const clampedBase = Math.min(baseBreak, Math.max(...availableBreaks));

  console.log(
    `[RL] Break for ${focusDuration}min focus: options=[${availableBreaks.join(",")}], base=${clampedBase}`,
  );

  const model = await loadModel();
  const totalObs = getTotalObservations(model, contextKey);

  if (totalObs < 2) {
    return { value: clampedBase, source: "heuristic" };
  }

  const best = await getBestAction(breakContext, availableBreaks);
  return { value: best, source: "learned" };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Add a dynamic arm when user picks a custom duration.
 */
export function addDynamicArm(
  actions: number[],
  customDuration: number,
): number[] {
  if (actions.includes(customDuration)) return [...actions];
  return [...actions, customDuration].sort((a, b) => a - b);
}

/**
 * Get the current model state (for debugging).
 */
export async function getModelState(): Promise<ModelState> {
  return await loadModel();
}

/**
 * Debug function to print model state.
 */
export async function debugModel(): Promise<void> {
  const model = await loadModel();
  const zones = await loadZones();
  const capacity = await loadCapacity();

  console.log("\n========== RL Model Debug ==========");
  console.log("Contexts:", Object.keys(model).length);

  for (const key of Object.keys(model)) {
    console.log(`\n--- ${key} ---`);
    if (zones[key]) {
      console.log(
        `Zone: ${zones[key].zone}, Confidence: ${zones[key].confidence.toFixed(2)}`,
      );
    }
    if (capacity[key]) {
      console.log(
        `Capacity: ${capacity[key].averageCapacity.toFixed(1)}min, Completion: ${(capacity[key].completionRate * 100).toFixed(0)}%, Trend: ${capacity[key].trend}`,
      );
    }
    console.log("Actions:");
    const actions = Object.entries(model[key]);
    actions.sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
    for (const [action, params] of actions) {
      const mean = params.alpha / (params.alpha + params.beta);
      const obs = params.alpha + params.beta - DEFAULT_ALPHA - DEFAULT_BETA;
      console.log(
        `  ${action}min: mean=${mean.toFixed(3)}, obs=${obs.toFixed(1)}`,
      );
    }
  }
  console.log("\n=====================================\n");
}

/**
 * Clean up old data (migration utility).
 */
export async function cleanBreakContextKeys(): Promise<void> {
  const model = await loadModel();
  const cleaned: ModelState = {};

  for (const key of Object.keys(model)) {
    // Skip double-break keys
    if (key.includes("-break-break")) continue;
    cleaned[key] = model[key];
  }

  await saveModel(cleaned);
  console.log("[RL] Cleaned model - removed duplicate break keys");
}

/**
 * Export complete RL state for backup.
 */
export async function exportRLState(): Promise<{
  model: ModelState;
  zones: ZoneState;
  capacity: CapacityState;
}> {
  const model = await loadModel();
  const zones = await loadZones();
  const capacity = await loadCapacity();

  return { model, zones, capacity };
}

/**
 * Import complete RL state from backup.
 * @param data - The RL state object to import
 */
export async function importRLState(data: {
  model: ModelState;
  zones: ZoneState;
  capacity: CapacityState;
}): Promise<void> {
  if (data.model) await saveModel(data.model);
  if (data.zones) await saveZones(data.zones);
  if (data.capacity) await saveCapacity(data.capacity);

  console.log("[RL] Imported RL state from backup");
}

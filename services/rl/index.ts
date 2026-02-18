/**
 * Contextual Bandits RL System
 *
 * This module implements Thompson Sampling with:
 * - Zone-based action spaces (short: 5-30min, long: 25-60min)
 * - Dual-track learning (preference + capacity)
 * - Dynamic arms for custom durations
 * - Simplified context (taskType + energyLevel only)
 *
 * Split into focused modules:
 * - types.ts: Type definitions and constants
 * - storage.ts: AsyncStorage persistence
 * - zones.ts: Zone detection and transitions
 * - capacity.ts: Capacity tracking and adjustment
 * - sampling.ts: Thompson Sampling algorithm
 */

import { createContextKey } from "@/utils/contextKey";
import { adjustForCapacity, getCapacityStats } from "./capacity";
import { getBestAction, getTotalObservations } from "./sampling";
import {
    loadCapacity,
    loadModel,
    loadZones,
    saveCapacity,
    saveModel,
    saveZones,
} from "./storage";
import {
    BOOTSTRAP_THRESHOLD,
    BREAK_ACTIONS,
    CapacityState,
    Context,
    DEFAULT_ALPHA,
    DEFAULT_BETA,
    EWMA_ALPHA,
    ModelState,
    ZoneState,
} from "./types";
import { detectZone, getZoneActions, getZoneData } from "./zones";

// ============================================================================
// Re-exports (preserves public API)
// ============================================================================

export {
    adjustForCapacity,
    getCapacityStats,
    updateCapacityStats
} from "./capacity";
export {
    getBestAction,
    getTotalObservations,
    penalizeRejection,
    sampleBeta,
    updateModel
} from "./sampling";
export {
    loadCapacity,
    loadModel,
    loadZones,
    saveCapacity,
    saveModel,
    saveZones
} from "./storage";
export {
    BREAK_ACTIONS,
    DEFAULT_ALPHA,
    DEFAULT_BETA,
    SPILLOVER_FACTOR,
    SPILLOVER_THRESHOLD,
    ZONE_ACTIONS
} from "./types";
export type {
    Action,
    CapacityState,
    CapacityStats,
    Context,
    FocusZone,
    ModelParameters,
    ModelState,
    ZoneData,
    ZoneState
} from "./types";
export {
    checkZoneTransition,
    detectZone,
    getZoneActions,
    getZoneData,
    updateZoneData
} from "./zones";

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
  includeShortSessions: boolean = false,
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

    // If ADHD mode is on, force the zone to "short" to restrict actions
    if (includeShortSessions) {
      zoneData.zone = "short";
    }

    let actions = getZoneActions(zoneData.zone, dynamicArms);

    console.log("Zone:", zoneData.zone, "| Actions:", actions.join(", "));

    // Get Thompson Sampling recommendation
    const model = await loadModel();
    const totalObs = getTotalObservations(model, contextKey);

    let modelRec: number;
    let isBootstrap = false;

    if (
      totalObs < 1 &&
      (!capacityStats.recentSessions ||
        capacityStats.recentSessions.length === 0)
    ) {
      // Truly no data, use heuristic
      modelRec = heuristicRecommendation;
      console.log("=== Using heuristic (no data) ===");
    } else if (totalObs < BOOTSTRAP_THRESHOLD) {
      // Bootstrap phase: Mirror the user's average selection immediately
      isBootstrap = true;
      const sessions = capacityStats.recentSessions || [];
      if (sessions.length > 0) {
        let ewma = sessions[0].selectedDuration;
        for (let i = 1; i < sessions.length; i++) {
          ewma =
            EWMA_ALPHA * sessions[i].selectedDuration + (1 - EWMA_ALPHA) * ewma;
        }
        modelRec = Math.round(ewma / 5) * 5;
        console.log(
          `=== Bootstrap Phase (EWMA): ${modelRec}m (based on ${sessions.length} sessions) ===`,
        );
      } else {
        modelRec = heuristicRecommendation;
      }
    } else {
      // TS Takeover — ensure zone matches user's proven capacity
      if (capacityStats.averageCapacity > 0) {
        const correctZone = detectZone(
          Math.round(capacityStats.averageCapacity),
          context.energyLevel as "low" | "mid" | "high",
        );
        if (correctZone !== zoneData.zone) {
          console.log(
            `[RL] Automatic zone switch for ${contextKey}: ${zoneData.zone} -> ${correctZone} (avg: ${capacityStats.averageCapacity.toFixed(1)})`,
          );
          zoneData.zone = correctZone;
          actions = getZoneActions(correctZone, dynamicArms);
          console.log("Zone:", correctZone, "| Actions:", actions.join(", "));
        }
      }
      modelRec = await getBestAction(context, actions, dynamicArms);
    }

    // Apply capacity adjustment (respects energy level - no stretch for low energy)
    const capacityAdjusted = adjustForCapacity(
      modelRec,
      capacityStats,
      context.energyLevel,
    );

    // Cross-energy floor: if lower energy levels have learned,
    // high energy should be at least as capable. (high ≥ mid ≥ low)
    let floored = capacityAdjusted;
    const energyHierarchy: Array<"low" | "mid" | "high"> = [
      "low",
      "mid",
      "high",
    ];
    const currentIdx = energyHierarchy.indexOf(
      context.energyLevel as "low" | "mid" | "high",
    );

    if (currentIdx > 0) {
      for (let i = currentIdx - 1; i >= 0; i--) {
        const lowerKey = `${context.taskType}|${energyHierarchy[i]}`;
        const lowerModel = model[lowerKey];
        if (lowerModel) {
          // Find the best proven arm in the lower energy context (by mean)
          const lowerArms = lowerModel
            ? Object.keys(lowerModel).map(Number)
            : [];
          if (lowerArms.length > 0) {
            const bestLowerArm = lowerArms.reduce((best, arm) => {
              const meanBest =
                lowerModel[best].alpha /
                (lowerModel[best].alpha + lowerModel[best].beta);
              const meanArm =
                lowerModel[arm].alpha /
                (lowerModel[arm].alpha + lowerModel[arm].beta);
              return meanArm > meanBest ? arm : best;
            });
            if (bestLowerArm > floored) {
              console.log(
                `[RL] Cross-energy floor: ${floored}m → ${bestLowerArm}m (proven at ${energyHierarchy[i]} energy)`,
              );
              floored = bestLowerArm;
            }
          }
        }
      }
    }

    // Clamp: during bootstrap, use global bounds (10-120m)
    // After bootstrap, clamp to zone actions
    let finalValue: number;
    if (isBootstrap) {
      finalValue = Math.max(10, Math.min(floored, 120));
    } else {
      finalValue = Math.max(
        Math.min(...actions),
        Math.min(floored, Math.max(...actions)),
      );
    }

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
  includeShortSessions: boolean = false,
): Promise<{ value: number; source: "heuristic" | "learned" }> {
  const breakContext: Context = {
    ...context,
    taskType: `${context.taskType}-break`,
  };
  const contextKey = createContextKey(breakContext);

  // Get available break actions based on focus duration
  let availableBreaks = getBreakActionsForFocus(focusDuration);

  // If ADHD mode is on, cap break options at 5 minutes
  if (includeShortSessions) {
    availableBreaks = availableBreaks.filter((b) => b <= 5);
  }

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

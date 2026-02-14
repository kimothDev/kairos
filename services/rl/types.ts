/**
 * Contextual Bandits RL System - Types & Constants
 */

import { EnergyLevel } from "@/types";

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
export type FocusZone = "short" | "long" | "extended";

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
export interface ModelParameters {
  alpha: number; // success evidence
  beta: number; // failure evidence
}

/**
 * Model state stores parameters for each action in each context.
 */
export interface ModelState {
  [contextKey: string]: {
    [action: number]: ModelParameters;
  };
}

/**
 * Zone state stores zone data for each context.
 */
export interface ZoneState {
  [contextKey: string]: ZoneData;
}

/**
 * Capacity state stores capacity stats for each context.
 */
export interface CapacityState {
  [contextKey: string]: CapacityStats;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const MODEL_STORAGE_KEY = "contextual_bandits_model_v2";
export const ZONE_STORAGE_KEY = "contextual_bandits_zones";
export const CAPACITY_STORAGE_KEY = "contextual_bandits_capacity";

// Pessimistic priors: unexplored arms start with mean=0.4 (1.0/(1.0+1.5))
// This prevents random high samples from beating proven winners
export const DEFAULT_ALPHA = 1.0;
export const DEFAULT_BETA = 1.5;
export const EARLY_EXPLORATION_THRESHOLD = 2;
export const BOOTSTRAP_THRESHOLD = 5;
export const EWMA_ALPHA = 0.7; // Weight for recent selections in EWMA bootstrap
export const CAPACITY_HISTORY_LIMIT = 10;

// Spillover: when a session succeeds, give partial credit to the next higher arm
export const SPILLOVER_THRESHOLD = 0.7; // Minimum reward to trigger spillover
export const SPILLOVER_FACTOR = 0.25; // Fraction of reward given to next arm

/**
 * Zone action sets - overlap at 25-30 for smooth transitions.
 * Minimum focus is 10 minutes (5 min removed as too short for meaningful work).
 */
export const ZONE_ACTIONS: Record<FocusZone, number[]> = {
  short: [10, 15, 20, 25, 30],
  long: [25, 30, 35, 40, 45, 50, 55, 60],
  extended: [50, 60, 70, 80, 90, 105, 120],
};

export const BREAK_ACTIONS: number[] = [5, 10, 15, 20, 25, 30];

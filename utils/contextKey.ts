import { Context } from "@/services/rl";

/**
 * Create a context key from a Context object.
 * Format: "taskType|energyLevel"
 *
 * Note: timeOfDay was removed as it's redundant with user-reported energy level
 * and was causing 4x context fragmentation, slowing learning.
 */
export function createContextKey(context: Context): string {
  return `${context.taskType}|${context.energyLevel}`;
}

/**
 * Create a context key from individual parts.
 * Used by the heuristic recommendation system.
 */
export function createContextKeyFromParts(
  taskType: string | undefined,
  energyLevel: string,
  isBreak: boolean = false,
): string {
  const baseKey = `${taskType?.toLowerCase() || "default"}|${energyLevel}`;
  return isBreak ? `${baseKey}-break` : baseKey;
}

/**
 * Parse a context key back into components.
 */
export function parseContextKey(key: string): {
  taskType: string;
  energyLevel: string;
  isBreak: boolean;
} {
  const isBreak = key.endsWith("-break");
  const cleanKey = isBreak ? key.replace(/-break$/, "") : key;
  const [taskType, energyLevel] = cleanKey.split("|");
  return { taskType, energyLevel, isBreak };
}

/**
 * RL Zone Management - Zone detection, transitions, and action spaces.
 */

import { EnergyLevel } from "@/types";
import { loadZones, saveZones } from "./storage";
import { FocusZone, ZONE_ACTIONS, ZoneData } from "./types";

/**
 * Detect which zone based on a selection and energy level.
 * Used for initial zone detection when no history exists.
 */
export function detectZone(
  selection: number,
  energyLevel: EnergyLevel,
): FocusZone {
  if (selection <= 25) return "short";
  if (selection >= 70) return "extended";
  if (selection >= 30) return "long";
  // 26-29 range: use energy level as tiebreaker
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
  const { zone } = zoneData;
  const selections = zoneData.selections || [];

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

  // Long → Short: user consistently choosing 25 or less
  if (zone === "long" && avgRecent <= 25) {
    console.log(
      "[RL] Zone transition: long → short (avg:",
      avgRecent.toFixed(1),
      ")",
    );
    return "short";
  }

  // Long → Extended: user consistently choosing 55+
  if (zone === "long" && avgRecent >= 55) {
    console.log(
      "[RL] Zone transition: long → extended (avg:",
      avgRecent.toFixed(1),
      ")",
    );
    return "extended";
  }

  // Extended → Long: user consistently choosing 55 or less
  if (zone === "extended" && avgRecent <= 55) {
    console.log(
      "[RL] Zone transition: extended → long (avg:",
      avgRecent.toFixed(1),
      ")",
    );
    return "long";
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

  return {
    ...zones[contextKey],
    selections: zones[contextKey].selections || [],
  };
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
      zone:
        selectedDuration <= 30
          ? "short"
          : selectedDuration >= 50
            ? "extended"
            : "long",
      confidence: 0,
      selections: [],
      transitionReady: false,
    };
  } else if (!zones[contextKey].selections) {
    zones[contextKey].selections = [];
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

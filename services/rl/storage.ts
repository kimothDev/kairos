/**
 * RL Model Storage - AsyncStorage persistence for model, zones, and capacity.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    CAPACITY_STORAGE_KEY,
    CapacityState,
    MODEL_STORAGE_KEY,
    ModelState,
    ZONE_STORAGE_KEY,
    ZoneState,
} from "./types";

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

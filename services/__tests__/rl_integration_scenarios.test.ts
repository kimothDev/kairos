import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContextKey } from "../../utils/contextKey";
import { applyCapacityScaling, calculateReward } from "../recommendations";
import {
    getCapacityStats,
    getModelState,
    getSmartRecommendation,
    getZoneData,
    updateCapacityStats,
    updateModel,
    updateZoneData,
} from "../rl";

// Mock the dependencies that might touch native code or DB
const mockStorage: Record<string, string> = {};
jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn((key, value) => {
    mockStorage[key] = value;
    return Promise.resolve();
  }),
  getItem: jest.fn((key) => {
    return Promise.resolve(mockStorage[key] || null);
  }),
  clear: jest.fn(() => {
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    return Promise.resolve();
  }),
  removeItem: jest.fn((key) => {
    delete mockStorage[key];
    return Promise.resolve();
  }),
}));

jest.mock("@/services/database", () => ({
  insertSession: jest.fn(),
  getAllSessions: jest.fn(() => Promise.resolve([])),
  deleteAllSessions: jest.fn(),
}));

describe("RL Integration Scenarios", () => {
  // Use lowercase to match heuristic patterns
  const context = { taskType: "coding", energyLevel: "mid" as const };
  const contextKey = "coding|mid";

  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  async function simulateSessionCompletion(
    sessionDuration: number,
    wasRecommended: boolean,
    energy: "low" | "mid" | "high" = "mid",
  ) {
    const ctx = { taskType: "coding", energyLevel: energy };
    const ctxKey = createContextKey(ctx);

    // 1. Calculate Reward
    const rec = wasRecommended ? sessionDuration : sessionDuration + 10;
    const baseReward = calculateReward(
      true,
      wasRecommended,
      sessionDuration,
      sessionDuration,
      rec,
      "none",
    );

    // 2. Apply Capacity Scaling
    const stats = await getCapacityStats(ctxKey);
    const reward = applyCapacityScaling(
      baseReward,
      sessionDuration,
      stats.averageCapacity,
    );

    // 3. Update Model
    await updateModel(ctx, sessionDuration, reward);

    // 4. Update Stats & Zones
    await updateCapacityStats(ctxKey, sessionDuration, sessionDuration, true);
    await updateZoneData(ctxKey, sessionDuration);

    // 5. Spillover
    if (reward >= 0.7) {
      const nextArm = sessionDuration + 5;
      await updateModel(ctx, nextArm, reward * 0.25);
    }

    return reward;
  }

  test("Scenario 1: Fresh Learning & Spillover", async () => {
    const rec = await getSmartRecommendation(context, 25);
    expect(rec.value).toBe(25);

    await simulateSessionCompletion(25, true);

    const model = await getModelState();
    expect(model[contextKey][25].alpha).toBeGreaterThan(1.0);
    expect(model[contextKey][30].alpha).toBeGreaterThan(1.0);
  });

  test("Scenario 2: Progression - Learned sources", async () => {
    // Increase to 50 sessions for strong convergence
    for (let i = 0; i < 50; i++) {
      await simulateSessionCompletion(25, true);
    }

    const rec = await getSmartRecommendation(context, 25);
    // Should be learned or capacity, definitely not heuristic
    expect(["learned", "capacity"]).toContain(rec.source);
    // Should be within short zone (10-30m) or slightly nudged (35m)
    expect(rec.value).toBeGreaterThanOrEqual(10);
    expect(rec.value).toBeLessThanOrEqual(35);
  });

  test("Scenario 3: Capacity Stretching - High Energy Nudge", async () => {
    const highEnergyCtx = { taskType: "coding", energyLevel: "high" as const };
    const highEnergyKey = "coding|high";

    for (let i = 0; i < 10; i++) {
      await simulateSessionCompletion(30, true, "high");
    }

    // Stabilize model at 30
    const rec = await getSmartRecommendation(highEnergyCtx, 30);

    expect(rec.source).toBe("capacity");
    expect(rec.value).toBeGreaterThan(30);
    expect(rec.value % 5).toBe(0);
  });

  test("Scenario 4: Comfort Penalty", async () => {
    for (let i = 0; i < 5; i++) {
      await simulateSessionCompletion(30, true);
    }

    // Coast at 10m
    const reward = await simulateSessionCompletion(10, true);
    expect(reward).toBeCloseTo(0.85, 2);
  });

  test("Scenario 5: Energy Guardrails", async () => {
    const lowEnergyCtx = { taskType: "coding", energyLevel: "low" as const };

    for (let i = 0; i < 10; i++) {
      await simulateSessionCompletion(15, true, "low");
    }

    const rec = await getSmartRecommendation(lowEnergyCtx, 15);

    // Should not be stretched to 20 (guardrail)
    // It might be 15 (learned) or 10 (random exploration), but NOT 20.
    expect(rec.value).toBeLessThanOrEqual(15);
    expect(rec.source).not.toBe("capacity");
  });

  test("Scenario 6: Zone Transition", async () => {
    // Force transition by doing heavy sessions
    for (let i = 0; i < 10; i++) {
      await simulateSessionCompletion(45, false, "mid");
    }

    const zoneInfo = await getZoneData(contextKey, "mid", 45);
    expect(zoneInfo.zone).toBe("long");

    const rec = await getSmartRecommendation(context, 25);
    // Should be >= 25 since that's the floor of the long zone
    expect(rec.value).toBeGreaterThanOrEqual(25);
  });
});

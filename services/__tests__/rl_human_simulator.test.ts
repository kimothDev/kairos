import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getSmartRecommendation,
  updateCapacityStats,
  updateModel,
  updateZoneData,
} from "../rl";

// Mock the dependencies
const mockStorage: Record<string, string> = {};
jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn((key, value) => {
    mockStorage[key] = value;
    return Promise.resolve();
  }),
  getItem: jest.fn((key) => Promise.resolve(mockStorage[key] || null)),
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
  insertSession: jest.fn().mockResolvedValue({ id: 1 }),
}));

/**
 * HUMAN SIMULATOR
 * This test simulates a "Messy Human" over a period of many sessions.
 * It uses probabilities to decide whether the user completes, skips, or customizes sessions.
 */

describe("RL Human Simulator - 'The Chaos Test'", () => {
  const context = { taskType: "coding", energyLevel: "mid" as const };
  const contextKey = "coding|mid";

  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  async function simulateHumanSession(
    targetMinutes: number,
    humanTrueCapacity: number,
    personality: {
      completionRate: number; // Probability of finishing
      customizationRate: number; // Probability of moving the wheel
      fatigueRate: number; // Probability of quitting early
    },
  ) {
    const roll = Math.random();
    let durationToAttempt = targetMinutes;
    let accepted = true;

    // 1. Roll for Customization (Moving the wheel)
    if (Math.random() < personality.customizationRate) {
      // Human thinks: "Nah, I want 10 mins more/less"
      const bias = Math.random() > 0.5 ? 5 : -5;
      durationToAttempt = Math.max(10, targetMinutes + bias);
      accepted = false;
    }

    // 2. Roll for Outcome
    let completed = false;
    let focusedMinutes = 0;

    if (roll < personality.completionRate) {
      completed = true;
      focusedMinutes = durationToAttempt;
    } else if (roll < personality.completionRate + personality.fatigueRate) {
      // Quits halfway
      completed = false;
      focusedMinutes = Math.floor(durationToAttempt * 0.5);
    } else {
      // Quits very early (Not saved)
      completed = false;
      focusedMinutes = 0.5; // 30 seconds
    }

    // Only process if > 1 min
    if (focusedMinutes >= 1) {
      // Calculate Reward (Simplified version of recommendations.ts calculateReward)
      let reward = completed ? 0.85 : 0.4;
      if (accepted && completed) reward += 0.15; // Acceptance bonus

      // 3. Update Model
      await updateModel(
        { taskType: "coding", energyLevel: "mid" },
        durationToAttempt,
        reward,
      );
      await updateCapacityStats(
        contextKey,
        durationToAttempt,
        focusedMinutes,
        completed,
      );
      await updateZoneData(contextKey, focusedMinutes);
    }

    return { durationToAttempt, completed, focusedMinutes, accepted };
  }

  test("Long-term Simulation: The 'Focus Student' (Inconsistent but trying)", async () => {
    console.log("\n🚀 Starting 50-Session 'Focus Student' Simulation...");

    // Personality: 70% completion, 20% customization, 10% fatigue
    const personality = {
      completionRate: 0.7,
      customizationRate: 0.2,
      fatigueRate: 0.1,
    };

    let currentRec = 25; // Start with heuristic
    let totalCompleted = 0;

    for (let i = 1; i <= 50; i++) {
      const recommendation = await getSmartRecommendation(context, 25);
      const result = await simulateHumanSession(
        recommendation.value,
        30,
        personality,
      );

      if (result.completed) totalCompleted++;

      if (i % 10 === 0) {
        console.log(
          `Session ${i}: Recommended=${recommendation.value}m (Source: ${recommendation.source}) | Completed: ${totalCompleted}/${i}`,
        );
      }
    }

    const finalRec = await getSmartRecommendation(context, 25);
    console.log(
      `🏁 Simulation Final: Recommended Duration = ${finalRec.value}m`,
    );

    // Convergence check: The model should have moved past basic heuristics
    expect(["learned", "capacity"]).toContain(finalRec.source);
    // Average completion should be within logic
    expect(totalCompleted).toBeGreaterThan(25);
  });

  test("Long-term Simulation: The 'Burnout Case' (High customization, low completion)", async () => {
    console.log("\n🚀 Starting 30-Session 'Burnout Case' Simulation...");

    // Personality: Only 30% completion, moves the wheel 50% of the time, quits often
    const personality = {
      completionRate: 0.3,
      customizationRate: 0.5,
      fatigueRate: 0.5,
    };

    for (let i = 1; i <= 30; i++) {
      const recommendation = await getSmartRecommendation(context, 25);
      await simulateHumanSession(recommendation.value, 20, personality);
    }

    const finalRec = await getSmartRecommendation(context, 25);
    console.log(
      `🏁 Burnout Simulation Final: Recommended = ${finalRec.value}m | Source: ${finalRec.source}`,
    );

    // For a burnout user, the model should ideally stay at lower durations
    expect(finalRec.value).toBeLessThanOrEqual(25);
  });

  test("Bootstrap Test: EWMA mirrors user from session 2", async () => {
    console.log("\n🚀 Starting 10-Session 'Bootstrap Test'...");
    console.log("Scenario: User consistently prefers 50-60m sessions\n");

    // Session 1: No data, gets heuristic
    const rec1 = await getSmartRecommendation(context, 25);
    console.log(`Session 1: Rec=${rec1.value}m (${rec1.source})`);

    // User overrides to 60m and completes it
    await updateModel(context, 60, 1.0);
    await updateCapacityStats(contextKey, 60, 60, true);
    await updateZoneData(contextKey, 60);

    // Session 2: Should now bootstrap from EWMA (≈60m)
    const rec2 = await getSmartRecommendation(context, 25);
    console.log(`Session 2: Rec=${rec2.value}m (${rec2.source})`);
    expect(rec2.value).toBeGreaterThanOrEqual(50); // EWMA should reflect 60m

    // User does 50m
    await updateModel(context, 50, 1.0);
    await updateCapacityStats(contextKey, 50, 50, true);
    await updateZoneData(contextKey, 50);

    // Session 3: EWMA of [60, 50] → 0.7*50 + 0.3*60 = 53 → rounds to 55
    const rec3 = await getSmartRecommendation(context, 25);
    console.log(`Session 3: Rec=${rec3.value}m (${rec3.source})`);
    expect(rec3.value).toBeGreaterThanOrEqual(45);

    // User does 60m again
    await updateModel(context, 60, 1.0);
    await updateCapacityStats(contextKey, 60, 60, true);
    await updateZoneData(contextKey, 60);

    // Session 4
    const rec4 = await getSmartRecommendation(context, 25);
    console.log(`Session 4: Rec=${rec4.value}m (${rec4.source})`);

    // User does 55m
    await updateModel(context, 55, 1.0);
    await updateCapacityStats(contextKey, 55, 55, true);
    await updateZoneData(contextKey, 55);

    // Session 5
    const rec5 = await getSmartRecommendation(context, 25);
    console.log(`Session 5: Rec=${rec5.value}m (${rec5.source})`);

    // User does 40m (bad day)
    await updateModel(context, 40, 0.85);
    await updateCapacityStats(contextKey, 40, 40, true);
    await updateZoneData(contextKey, 40);

    // Session 6: TS should now be in charge (5+ observations)
    const rec6 = await getSmartRecommendation(context, 25);
    console.log(`Session 6: Rec=${rec6.value}m (${rec6.source}) [TS Takeover]`);

    // After 5 sessions of 60, 50, 60, 55, 40 → TS should land in 40-60m range
    expect(rec6.value).toBeGreaterThanOrEqual(25);
    expect(rec6.value).toBeLessThanOrEqual(120);

    console.log("\n✅ Bootstrap test complete!");
  });
});

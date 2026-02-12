import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    getSmartRecommendation,
    updateCapacityStats,
    updateModel,
    updateZoneData
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
});

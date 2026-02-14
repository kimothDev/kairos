/**
 * Timer Store Tests
 *
 * Tests for the core timer store functionality.
 * These tests provide a safety net for the Option B refactoring.
 */

// Mock react-native before any imports
jest.mock("react-native", () => ({
  Platform: { OS: "android" },
  alert: jest.fn(),
  Vibration: { vibrate: jest.fn() },
}));

// Mock external dependencies
jest.mock("expo-notifications", () => ({
  scheduleNotificationAsync: jest.fn(() =>
    Promise.resolve("mock-notification-id"),
  ),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

jest.mock("@/services/sessionService", () => ({
  loadSessionsFromDB: jest.fn(() => Promise.resolve([])),
  clearAllSessionsFromDB: jest.fn(() => Promise.resolve()),
  createAndSaveSession: jest.fn(() => Promise.resolve({ id: 1, reward: 1.0 })),
}));

jest.mock("@/services/sessionCompletionService", () => ({
  completeSession: jest.fn(() => Promise.resolve()),
}));

jest.mock("@/services/sessionPlanner", () => ({
  getSessionRecommendation: jest.fn(() =>
    Promise.resolve({ focusDuration: 25, breakDuration: 5 }),
  ),
}));

jest.mock("@/services/rl", () => ({
  updateModel: jest.fn(() => Promise.resolve()),
  updateCapacityStats: jest.fn(() => Promise.resolve()),
  updateZoneData: jest.fn(() => Promise.resolve()),
  getSmartBreakRecommendation: jest.fn(() =>
    Promise.resolve({ value: 5, source: "heuristic" }),
  ),
}));

// Import after mocks
import useTimerStore from "../timerStore";

describe("Timer Store", () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useTimerStore.setState({
      isActive: false,
      isBreakTime: false,
      time: 0,
      initialTime: 0,
      focusSessionDuration: 0,
      taskType: "",
      energyLevel: "",
      showTimeAdjust: false,
      showCancel: false,
      showSkip: false,
      showTaskModal: false,
      showBreakModal: false,
      showSkipConfirm: false,
      previousTasks: [],
      sessions: [],
      isLoading: false,
      hasInteractedWithTimer: false,
      hasDismissedRecommendationCard: false,
      sessionStartTimestamp: undefined,
      includeShortSessions: false,
      dynamicFocusArms: [],
      notificationsEnabled: false,
      hasSavedSession: false,
      originalFocusDuration: 0,
      recommendedFocusDuration: 25,
      recommendedBreakDuration: 5,
      userAcceptedRecommendation: true,
      selectedBreakDuration: 5,
      sessionJustCompleted: false,
      scheduledNotificationId: null,
    });
  });

  describe("Initial State", () => {
    it("should have correct default values", () => {
      const state = useTimerStore.getState();

      expect(state.isActive).toBe(false);
      expect(state.isBreakTime).toBe(false);
      expect(state.time).toBe(0);
      expect(state.recommendedFocusDuration).toBe(25);
      expect(state.recommendedBreakDuration).toBe(5);
    });
  });

  describe("Task and Energy Selection", () => {
    it("should set task type", () => {
      useTimerStore.getState().setTaskType("Coding");
      expect(useTimerStore.getState().taskType).toBe("Coding");
    });

    it("should set energy level", () => {
      useTimerStore.getState().setEnergyLevel("high");
      expect(useTimerStore.getState().energyLevel).toBe("high");
    });

    it("should close task modal when setting task", () => {
      useTimerStore.setState({ showTaskModal: true });
      useTimerStore.getState().setTaskType("Writing");
      expect(useTimerStore.getState().showTaskModal).toBe(false);
    });
  });

  describe("Timer Controls", () => {
    beforeEach(() => {
      // Set up valid state for starting timer
      useTimerStore.setState({
        taskType: "Coding",
        energyLevel: "high",
        time: 25 * 60,
        recommendedFocusDuration: 25,
      });
    });

    it("should start timer and set isActive to true", async () => {
      await useTimerStore.getState().startTimer();
      expect(useTimerStore.getState().isActive).toBe(true);
    });

    it("should set sessionStartTimestamp when starting", async () => {
      await useTimerStore.getState().startTimer();
      expect(useTimerStore.getState().sessionStartTimestamp).toBeDefined();
    });

    it("should pause timer", async () => {
      await useTimerStore.getState().startTimer();
      useTimerStore.getState().pauseTimer();
      expect(useTimerStore.getState().isActive).toBe(false);
    });

    it("should cancel timer and reset state", async () => {
      await useTimerStore.getState().startTimer();
      await useTimerStore.getState().cancelTimer();

      const state = useTimerStore.getState();
      expect(state.isActive).toBe(false);
      expect(state.time).toBe(0);
      expect(state.taskType).toBeUndefined();
    });
  });

  describe("Time Adjustment", () => {
    beforeEach(() => {
      useTimerStore.setState({
        time: 25 * 60,
        initialTime: 25 * 60,
        includeShortSessions: false,
      });
    });

    it("should increase time by 5 minutes when adjusting up", () => {
      useTimerStore.getState().adjustTime("up");
      expect(useTimerStore.getState().time).toBe(30 * 60);
    });

    it("should decrease time by 5 minutes when adjusting down", () => {
      useTimerStore.getState().adjustTime("down");
      expect(useTimerStore.getState().time).toBe(20 * 60);
    });

    it("should not go below minimum (5 min in normal mode)", () => {
      useTimerStore.setState({ time: 5 * 60 });
      useTimerStore.getState().adjustTime("down");
      expect(useTimerStore.getState().time).toBe(5 * 60);
    });

    it("should not go above maximum (120 min in normal mode)", () => {
      useTimerStore.setState({ time: 120 * 60 });
      useTimerStore.getState().adjustTime("up");
      expect(useTimerStore.getState().time).toBe(120 * 60);
    });
  });

  describe("ADHD Mode Limits", () => {
    beforeEach(() => {
      useTimerStore.setState({
        time: 25 * 60,
        initialTime: 25 * 60,
        includeShortSessions: true, // ADHD mode
      });
    });

    it("should respect ADHD minimum (10 min)", () => {
      useTimerStore.setState({ time: 10 * 60 });
      useTimerStore.getState().adjustTime("down");
      expect(useTimerStore.getState().time).toBe(10 * 60);
    });

    it("should respect ADHD maximum (30 min)", () => {
      useTimerStore.setState({ time: 30 * 60 });
      useTimerStore.getState().adjustTime("up");
      expect(useTimerStore.getState().time).toBe(30 * 60);
    });
  });

  describe("Recommendations", () => {
    beforeEach(() => {
      useTimerStore.setState({
        recommendedFocusDuration: 25,
        time: 20 * 60,
        initialTime: 20 * 60,
      });
    });

    it("should accept recommendation and set time", () => {
      useTimerStore.getState().acceptRecommendation();

      const state = useTimerStore.getState();
      expect(state.time).toBe(25 * 60);
      expect(state.userAcceptedRecommendation).toBe(true);
    });

    it("should reject recommendation", () => {
      useTimerStore.getState().rejectRecommendation();
      expect(useTimerStore.getState().userAcceptedRecommendation).toBe(false);
    });
  });

  describe("Modal Toggles", () => {
    it("should toggle task modal", () => {
      useTimerStore.getState().toggleTaskModal(true);
      expect(useTimerStore.getState().showTaskModal).toBe(true);

      useTimerStore.getState().toggleTaskModal(false);
      expect(useTimerStore.getState().showTaskModal).toBe(false);
    });

    it("should toggle break modal", () => {
      useTimerStore.getState().toggleBreakModal(true);
      expect(useTimerStore.getState().showBreakModal).toBe(true);
    });

    it("should toggle skip confirm", () => {
      useTimerStore.getState().toggleSkipConfirm(true);
      expect(useTimerStore.getState().showSkipConfirm).toBe(true);
    });
  });

  describe("Settings Toggles", () => {
    it("should toggle ADHD mode (includeShortSessions)", () => {
      expect(useTimerStore.getState().includeShortSessions).toBe(false);

      useTimerStore.getState().toggleIncludeShortSessions();
      expect(useTimerStore.getState().includeShortSessions).toBe(true);

      useTimerStore.getState().toggleIncludeShortSessions();
      expect(useTimerStore.getState().includeShortSessions).toBe(false);
    });

    it("should toggle notifications", () => {
      expect(useTimerStore.getState().notificationsEnabled).toBe(false);

      useTimerStore.getState().toggleNotificationsEnabled();
      expect(useTimerStore.getState().notificationsEnabled).toBe(true);
    });
  });

  describe("Custom Tasks", () => {
    it("should add custom task (normalized to capitalize first letter)", () => {
      useTimerStore.setState({ previousTasks: ["Coding", "Writing"] });
      useTimerStore.getState().addCustomTask("NewTask");

      // Tasks are normalized to Title Case (first letter capital)
      expect(useTimerStore.getState().previousTasks).toContain("Newtask");
      expect(useTimerStore.getState().taskType).toBe("Newtask");
    });

    it("should remove custom task", () => {
      useTimerStore.setState({
        previousTasks: ["Coding", "Writing", "ToRemove"],
      });
      useTimerStore.getState().removeCustomTask("ToRemove");

      expect(useTimerStore.getState().previousTasks).not.toContain("ToRemove");
    });
  });

  describe("Break Flow", () => {
    it("should start break with given duration", async () => {
      useTimerStore.setState({
        taskType: "Coding",
        energyLevel: "high",
        originalFocusDuration: 25 * 60,
      });

      await useTimerStore.getState().startBreak(5 * 60);

      const state = useTimerStore.getState();
      expect(state.time).toBe(5 * 60);
      expect(state.isBreakTime).toBe(true);
      expect(state.selectedBreakDuration).toBe(5 * 60);
    });
  });

  describe("getLiveTime", () => {
    it("should return initialTime when timer is not active", () => {
      useTimerStore.setState({ initialTime: 25 * 60, isActive: false });
      expect(useTimerStore.getState().getLiveTime()).toBe(25 * 60);
    });

    it("should calculate remaining time when active", () => {
      const now = Date.now();
      useTimerStore.setState({
        initialTime: 25 * 60,
        isActive: true,
        sessionStartTimestamp: now - 5000, // 5 seconds ago
      });

      const liveTime = useTimerStore.getState().getLiveTime();
      // Should be around 24:55 (25*60 - 5 seconds)
      expect(liveTime).toBeLessThanOrEqual(25 * 60 - 4);
      expect(liveTime).toBeGreaterThanOrEqual(25 * 60 - 6);
    });
  });
});

// Jest setup file for mocking react-native and expo modules
// This file is automatically loaded by Jest before tests

// Mock react-native
jest.mock("react-native", () => ({
  Platform: { OS: "android" },
  alert: jest.fn(),
  Vibration: { vibrate: jest.fn() },
}));

// Mock expo-notifications
jest.mock("expo-notifications", () => ({
  scheduleNotificationAsync: jest.fn(() =>
    Promise.resolve("mock-notification-id"),
  ),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
}));

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

// Mock expo-sqlite (ES module that Jest can't parse without transformation)
jest.mock("expo-sqlite", () => ({
  openDatabaseSync: jest.fn(() => ({
    runSync: jest.fn(),
    getAllSync: jest.fn(() => []),
    getFirstSync: jest.fn(() => null),
    transaction: jest.fn(),
  })),
}));

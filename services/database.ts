/**
 * Database Service
 *
 * Handles all SQLite database operations for focus sessions, including
 * migrations, insertions, and queries for history and analytics.
 */
import * as SQLite from "expo-sqlite";

export interface DBSession {
  id?: number;
  taskType: string;
  energyLevel: string;
  timeOfDay: string;
  recommendedDuration: number;
  recommendedBreak: number;
  userSelectedDuration: number;
  userSelectedBreak: number;
  acceptedRecommendation: boolean;
  sessionCompleted: boolean;
  focusedUntilSkipped: number;
  reward: number;
  date: string;
  createdAt: string;
  skipReason?: "skippedFocus" | "skippedBreak" | "none";
  note?: string;
}

const db = SQLite.openDatabaseSync("smart_focus_timer.db");

let dbInitialized = false;
let initPromise: Promise<void> | null = null;

export const initDatabase = async (): Promise<void> => {
  if (dbInitialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          taskType TEXT NOT NULL,
          energyLevel TEXT NOT NULL,
          timeOfDay TEXT NOT NULL,
          recommendedDuration INTEGER NOT NULL,
          recommendedBreak INTEGER NOT NULL,
          userSelectedDuration INTEGER NOT NULL,
          userSelectedBreak INTEGER NOT NULL,
          acceptedRecommendation INTEGER NOT NULL,
          sessionCompleted INTEGER NOT NULL,
          focusedUntilSkipped INTEGER NOT NULL,
          reward REAL NOT NULL,
          date TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          skipReason TEXT DEFAULT 'none'
        )
      `);

      // Migration: Add note column if it doesn't exist
      try {
        await db.execAsync(`ALTER TABLE sessions ADD COLUMN note TEXT`);
      } catch (e) {
        // Column likely already exists, ignore
      }

      dbInitialized = true;
    } catch (error) {
      console.error("Error initializing database:", error);
      throw error;
    }
  })();

  return initPromise;
};

export const ensureDbInitialized = async (): Promise<void> => {
  if (!dbInitialized) {
    await initDatabase();
  }
};

export const insertSession = async (
  session: Omit<DBSession, "id">,
): Promise<number> => {
  await ensureDbInitialized();
  try {
    const result = await db.runAsync(
      `INSERT INTO sessions (
        taskType, energyLevel, timeOfDay, recommendedDuration, recommendedBreak,
        userSelectedDuration, userSelectedBreak, acceptedRecommendation,
        sessionCompleted, focusedUntilSkipped, reward, date, createdAt, skipReason, note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        session.taskType,
        session.energyLevel,
        session.timeOfDay,
        session.recommendedDuration,
        session.recommendedBreak,
        session.userSelectedDuration,
        session.userSelectedBreak,
        session.acceptedRecommendation ? 1 : 0,
        session.sessionCompleted ? 1 : 0,
        session.focusedUntilSkipped,
        session.reward,
        session.date,
        session.createdAt,
        session.skipReason || "none",
        session.note || null,
      ],
    );
    return result.lastInsertRowId;
  } catch (error) {
    console.error("Error inserting session:", error);
    throw error;
  }
};

export const getAllSessions = async (): Promise<DBSession[]> => {
  await ensureDbInitialized();
  try {
    const result = await db.getAllAsync<any>(
      `SELECT * FROM sessions ORDER BY createdAt DESC`,
    );
    return result.map((row) => ({
      ...row,
      acceptedRecommendation: !!row.acceptedRecommendation,
      sessionCompleted: !!row.sessionCompleted,
    }));
  } catch (error) {
    console.error("Error getting sessions:", error);
    throw error;
  }
};

export const getSessionsByDateRange = async (
  startDate: string,
  endDate: string,
): Promise<DBSession[]> => {
  await ensureDbInitialized();
  try {
    const result = await db.getAllAsync<any>(
      `SELECT * FROM sessions WHERE date >= ? AND date <= ? ORDER BY createdAt DESC`,
      [startDate, endDate],
    );
    return result.map((row) => ({
      ...row,
      acceptedRecommendation: !!row.acceptedRecommendation,
      sessionCompleted: !!row.sessionCompleted,
    }));
  } catch (error) {
    console.error("Error getting sessions by date range:", error);
    throw error;
  }
};

export const getSessionsByDate = async (date: string): Promise<DBSession[]> => {
  await ensureDbInitialized();
  try {
    const result = await db.getAllAsync<any>(
      `SELECT * FROM sessions WHERE date = ? ORDER BY createdAt DESC`,
      [date],
    );
    return result.map((row) => ({
      ...row,
      acceptedRecommendation: !!row.acceptedRecommendation,
      sessionCompleted: !!row.sessionCompleted,
    }));
  } catch (error) {
    console.error("Error getting sessions by date:", error);
    throw error;
  }
};

export const deleteAllSessions = async (): Promise<void> => {
  await ensureDbInitialized();
  try {
    await db.execAsync(`DELETE FROM sessions`);
  } catch (error) {
    console.error("Error deleting all sessions:", error);
    throw error;
  }
};

export const getSessionCount = async (): Promise<number> => {
  await ensureDbInitialized();
  try {
    const result = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM sessions`,
    );
    return result?.count || 0;
  } catch (error) {
    console.error("Error getting session count:", error);
    throw error;
  }
};

export const updateSessionNote = async (
  id: number,
  note: string,
): Promise<void> => {
  await ensureDbInitialized();
  try {
    await db.runAsync(`UPDATE sessions SET note = ? WHERE id = ?`, [note, id]);
  } catch (error) {
    console.error("Error updating session note:", error);
    throw error;
  }
};

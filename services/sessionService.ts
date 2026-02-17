/**
 * Session Service
 *
 * High-level service for interacting with session data, bridging
 * the database layer and the UI/Store layers.
 */
import {
    DBSession,
    deleteAllSessions,
    getAllSessions,
    insertSession,
    updateSessionNote,
} from "@/services/database";
import { EnergyLevel, Session } from "@/types";

export const loadSessionsFromDB = async (): Promise<Session[]> => {
  const dbSessions = await getAllSessions();
  return dbSessions.map((session) => ({
    ...session,
    energyLevel: session.energyLevel as EnergyLevel,
  }));
};

export const clearAllSessionsFromDB = async (): Promise<void> => {
  await deleteAllSessions();
};

export const createAndSaveSession = async (
  sessionData: Omit<DBSession, "id">,
): Promise<Session> => {
  await insertSession(sessionData);
  const dbSessions = await getAllSessions();
  const newSession = dbSessions[dbSessions.length - 1];
  return {
    ...newSession,
    energyLevel: newSession.energyLevel as EnergyLevel,
  };
};
export const updateSessionNoteInDB = async (
  id: number,
  note: string,
): Promise<void> => {
  await updateSessionNote(id, note);
};

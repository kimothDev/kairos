/**
 * Session Slice
 *
 * Manages the state of focus sessions loaded from the database
 * and provides actions to refresh or clear the session history.
 */
import {
    clearAllSessionsFromDB,
    loadSessionsFromDB,
    updateSessionNoteInDB,
} from "@/services/sessionService";
import { Session } from "@/types";
import { SessionSlice, SliceCreator } from "./sliceTypes";

export const createSessionSlice: SliceCreator<SessionSlice> = (set, get) => ({
  sessions: [] as Session[],
  isLoading: false,
  hasSavedSession: false,
  sessionJustCompleted: false,

  loadSessions: async () => {
    set({ isLoading: true });
    try {
      const sessions = await loadSessionsFromDB();
      set({ sessions: sessions, isLoading: false });
    } catch (error) {
      console.error("Failed to load sessions:", error);
      set({ isLoading: false });
    }
  },

  clearAllSessions: async () => {
    set({ isLoading: true });
    try {
      await clearAllSessionsFromDB();
      set({ sessions: [], isLoading: false });
    } catch (error) {
      console.error("Failed to clear sessions:", error);
      set({ isLoading: false });
    }
  },

  updateSessionNote: async (id, note) => {
    try {
      await updateSessionNoteInDB(id, note);
      const currentSessions = get().sessions;
      set({
        sessions: currentSessions.map((s) =>
          s.id === id ? { ...s, note } : s,
        ),
      });
    } catch (error) {
      console.error("Failed to update session note:", error);
    }
  },

  setHasSavedSession: (val) => set({ hasSavedSession: val }),
});

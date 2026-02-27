/**
 * Data Export Service
 *
 * Provides functionality to export app data (sessions, RL model, settings)
 * as a ZIP backup and import it back into the application.
 */
import {
    DBSession,
    deleteAllSessions,
    getAllSessions,
    insertSession,
} from "@/services/database";
import { exportRLState, importRLState } from "@/services/rl";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import JSZip from "jszip";
import { Platform } from "react-native";

// Key used by Zustand persist
const SETTINGS_STORAGE_KEY = "timer-storage";

export interface ParsedImportData {
  sessions: DBSession[];
  rlModel: any;
  settings: any;
  counts: {
    sessions: number;
    hasRLModel: boolean;
    hasSettings: boolean;
  };
}

export type ImportSelection = {
  sessions: boolean;
  rlModel: boolean;
  settings: boolean;
};

/**
 * Export all app data (Sessions, RL Model, Settings) as a ZIP file.
 */
export const exportAllDataAsZip = async (): Promise<void> => {
  try {
    const zip = new JSZip();

    // 1. Export Sessions
    const sessions = await getAllSessions();
    zip.file("sessions.json", JSON.stringify(sessions));

    // 2. Export RL Model
    const rlState = await exportRLState();
    zip.file("rl_model.json", JSON.stringify(rlState));

    // 3. Export Settings
    const settingsJson = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
    if (settingsJson) {
      zip.file("settings.json", settingsJson);
    }

    // Generate ZIP
    const base64 = await zip.generateAsync({ type: "base64" });
    const filename = `smart_focus_backup_${new Date().toISOString().split("T")[0]}.zip`;

    if (Platform.OS === "android") {
      // Use Storage Access Framework on Android to let user pick folder
      const permissions =
        await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

      if (permissions.granted) {
        // Create file in selected directory
        const uri = await FileSystem.StorageAccessFramework.createFileAsync(
          permissions.directoryUri,
          filename,
          "application/zip",
        );

        // Write data
        await FileSystem.writeAsStringAsync(uri, base64, {
          encoding: "base64",
        });
      }
    } else {
      // iOS: Use Share Sheet which includes "Save to Files"
      const fileUri = FileSystem.documentDirectory + filename;
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: "base64",
      });

      await Sharing.shareAsync(fileUri, {
        mimeType: "application/zip",
        dialogTitle: "Save Backup",
        UTI: "public.zip-archive",
      });
    }
  } catch (error) {
    console.error("Export failed:", error);
    throw error;
  }
};

/**
 * Pick a ZIP file and parse it to preview contents.
 */
export const pickAndParseZip = async (): Promise<ParsedImportData | null> => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/zip", "application/x-zip-compressed"],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.length) {
      return null;
    }

    const fileUri = result.assets[0].uri;
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: "base64",
    });

    console.log(`[Import] Read file, base64 length: ${base64.length}`);

    const zip = await JSZip.loadAsync(base64, { base64: true });

    const data: ParsedImportData = {
      sessions: [],
      rlModel: null,
      settings: null,
      counts: { sessions: 0, hasRLModel: false, hasSettings: false },
    };

    // Parse Sessions
    const sessionsFile = zip.file("sessions.json");
    if (sessionsFile) {
      const content = await sessionsFile.async("string");
      data.sessions = JSON.parse(content);
      data.counts.sessions = data.sessions.length;
    }

    // Parse RL Model
    const rlFile = zip.file("rl_model.json");
    if (rlFile) {
      const content = await rlFile.async("string");
      data.rlModel = JSON.parse(content);
      data.counts.hasRLModel = true;
    }

    // Parse Settings
    const settingsFile = zip.file("settings.json");
    if (settingsFile) {
      const content = await settingsFile.async("string");
      data.settings = JSON.parse(content);
      data.counts.hasSettings = true;
    }

    return data;
  } catch (error) {
    console.error("Parse ZIP failed:", error);
    throw new Error("Failed to read backup file. Is it a valid ZIP?");
  }
};

/**
 * Execute import of selected components.
 */
export const performImport = async (
  data: ParsedImportData,
  selection: ImportSelection,
): Promise<void> => {
  try {
    // 1. Import Sessions
    if (selection.sessions && data.sessions.length > 0) {
      await deleteAllSessions(); // Strategy: simple replace for now to avoid duplicates complexity with huge lists

      // Batch insert or sequential
      for (const session of data.sessions) {
        // Omit ID to let existing auto-increment work if we wanted to merge,
        // but since we cleared, we can just insert.
        // Actually insertSession ignores ID.
        const { id, ...sessionData } = session;
        // Ensure types match what insertSession expects
        // CSV import previously did parsing, but JSON preserves types better.
        // Just need to match DBSession Omit<id> type.
        // Date strings remain strings.
        await insertSession(sessionData);
      }
    }

    // 2. Import RL Model
    if (selection.rlModel && data.rlModel) {
      await importRLState(data.rlModel);
    }

    // 3. Import Settings
    if (selection.settings && data.settings) {
      // Restore Zustand persisted state
      await AsyncStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify(data.settings),
      );

      // We need to reload the store after this.
      // The easiest way is to trigger a reload or simple alert to restart,
      // but we can also hydrate manually if we expose a method.
      // For now, writing to storage is the persistent step.
    }
  } catch (error) {
    console.error("Import execution failed:", error);
    throw error;
  }
};

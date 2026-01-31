import { Context, updateModel } from '@/services/contextualBandits';
import { DBSession, getAllSessions, insertSession } from '@/services/database';
import { EnergyLevel } from '@/types';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

export type SkipReason = 'skippedFocus' | 'skippedBreak' | 'none';

export const convertSessionsToCSV = (sessions: DBSession[]): string => {
  if (sessions.length === 0) return '';
  const headers = Object.keys(sessions[0]).join(',');
  const rows = sessions.map(session =>
    Object.values(session)
      .map(value => `"${String(value).replace(/"/g, '""')}"`)
      .join(',')
  );
  return [headers, ...rows].join('\n');
};

const parseSkipReason = (value: string): SkipReason => {
  if (value === 'skippedFocus' || value === 'skippedBreak' || value === 'none') {
    return value as SkipReason;
  }
  return 'none';
};

const parseEnergyLevel = (value: string): EnergyLevel => {
  if (value === 'low' || value === 'mid' || value === 'high') return value;
  return '';
};

export const importSessionsFromCSV = async (): Promise<void> => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'text/csv',
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    const fileUri = result.assets[0].uri;
    const csvData = await FileSystem.readAsStringAsync(fileUri);

    const lines = csvData.split('\n').filter(line => line.trim() !== '');
    const headers = lines[0].split(',').map(h => h.trim());

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map(cell => cell.replace(/^"|"$/g, '').trim());
      if (row.length !== headers.length) continue;

      const session = Object.fromEntries(headers.map((h, idx) => [h, row[idx]]));


      const parsed: Omit<DBSession, 'id'> = {
        taskType: session.taskType,
        energyLevel: session.energyLevel,
        timeOfDay: session.timeOfDay,  // Still stored in DB for historical data
        recommendedDuration: Number(session.recommendedDuration),
        recommendedBreak: Number(session.recommendedBreak),
        userSelectedDuration: Number(session.userSelectedDuration),
        userSelectedBreak: Number(session.userSelectedBreak),
        acceptedRecommendation: session.acceptedRecommendation === 'true',
        sessionCompleted: session.sessionCompleted === 'true',
        focusedUntilSkipped: Number(session.focusedUntilSkipped),
        reward: Number(session.reward),
        date: session.date,
        createdAt: session.createdAt,
        skipReason: parseSkipReason(session.skipReason),
      };

      await insertSession(parsed);
    }

    await replayImportedSessions();
  } catch (err) {
    console.error('Import failed:', err);
    throw err;
  }
};

/**
 * Replay imported sessions to rebuild the RL model.
 * Uses simplified context (no timeOfDay) for consistency with new model.
 */
export const replayImportedSessions = async (): Promise<void> => {
  const sessions = await getAllSessions();
  for (const session of sessions) {
    if (!session.sessionCompleted || session.reward === 0) continue;

    // Use simplified context (no timeOfDay)
    const context: Context = {
      taskType: session.taskType,
      energyLevel: parseEnergyLevel(session.energyLevel),
    };

    await updateModel(context, session.userSelectedDuration, session.reward);
  }
};

export const exportSessionsToCSV = async (): Promise<void> => {
  try {
    const { status } = await MediaLibrary.requestPermissionsAsync();

    if (status !== 'granted') {
      throw new Error('Permission to access media library is required.');
    }

    const sessions = await getAllSessions();

    if (!sessions || sessions.length === 0) {
      throw new Error('No session data to export.');
    }

    const csv = convertSessionsToCSV(sessions);

    const fileName = 'focus_sessions.csv';
    const fileUri = FileSystem.documentDirectory + fileName;

    await FileSystem.writeAsStringAsync(fileUri, csv, {
      encoding: FileSystem.EncodingType.UTF8
    });

    const asset = await MediaLibrary.createAssetAsync(fileUri);
    await MediaLibrary.createAlbumAsync('Download', asset, false);
  } catch (err) {
    console.error('Export failed:', err);
    throw err;
  }
};

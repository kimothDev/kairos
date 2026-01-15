import Colors from '@/constants/colors';
import { Context, updateModel } from '@/services/contextualBandits';
import { DBSession, getAllSessions, insertSession } from '@/services/database';
import { TimeOfDay } from '@/services/recommendations';
import useTimerStore from '@/store/timerStore';
import { EnergyLevel } from '@/types';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { Bell, Brain, Download, Github, Info, Trash2, Upload } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

export default function SettingsScreen() {
  const { sessions, isLoading, clearAllSessions } = useTimerStore();
  const includeShortSessions = useTimerStore(s => s.includeShortSessions);
  const toggleShort = useTimerStore(s => s.toggleIncludeShortSessions);
  const notificationsEnabled = useTimerStore(s => s.notificationsEnabled);
  const toggleNotifications = useTimerStore(s => s.toggleNotificationsEnabled);
  
  const clearAllData = () => {
    Alert.alert(
      "Clear All Data",
      "Are you sure you want to clear all your session history? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Clear", 
          onPress: () => clearAllSessions(),
          style: "destructive"
        }
      ]
    );
  };
  const convertSessionsToCSV = (sessions: any[]): string => {
  const headers = Object.keys(sessions[0]).join(',');
  const rows = sessions.map(session =>
    Object.values(session)
      .map(value => `"${String(value).replace(/"/g, '""')}"`)
      .join(',')
  );
  return [headers, ...rows].join('\n');
};

//import dataset

type SkipReason = 'skippedFocus' | 'skippedBreak' | 'none';

const parseSkipReason = (value: string): SkipReason => {
  if (value === 'skippedFocus' || value === 'skippedBreak' || value === 'none') {
    return value as SkipReason;
  }
  return 'none';
};

const importSessionsFromCSV = async () => {
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
        timeOfDay: session.timeOfDay,
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
    //replay to rebuild the model
    await replayImportedSessions();
    alert('Import and model sync complete.');

  } catch (err) {
    console.error('Import failed:', err);
    alert('Failed to import sessions.');
  }
};

//rebuild the bandits again if you import sessions
const replayImportedSessions = async () => {
  const parseEnergyLevel = (value: string): EnergyLevel => {
    if (value === 'low' || value === 'mid' || value === 'high') return value;
    return ''; //fallback if invalid
  };

  const parseTimeOfDay = (value: string): TimeOfDay => {
    if (value === 'morning' || value === 'afternoon' || value === 'evening') return value;
    return 'morning'; //fallback
  };

  const sessions = await getAllSessions();
  for (const session of sessions) {
    if (!session.sessionCompleted || session.reward === 0) continue;

    const context: Context = {
      taskType: session.taskType,
      energyLevel: parseEnergyLevel(session.energyLevel),
      timeOfDay: parseTimeOfDay(session.timeOfDay),
    };

    const action = session.userSelectedDuration;
    const reward = session.reward;

    await updateModel(context, action, reward);
  }

  console.log('[Bandit] Model updated from imported sessions.');
};


//export dataset
const exportSessionsToCSV = async () => {
  try {
    //request permissions to save to media library
    const { status } = await MediaLibrary.requestPermissionsAsync();
    
    if (status !== 'granted') {
      alert('Permission to access media library is required.');
      return;
    }
    
    //get sessions data from your storage
    const sessions = await getAllSessions();
    
    if (!sessions || sessions.length === 0) {
      alert('No session data to export.');
      return;
    }
    
    //convert data to CSV
    const csv = convertSessionsToCSV(sessions);
    
    //create a temporary file
    const fileName = 'focus_sessions.csv';
    const fileUri = FileSystem.documentDirectory + fileName;
    
    //write CSV content to the file
    await FileSystem.writeAsStringAsync(fileUri, csv, { 
      encoding: FileSystem.EncodingType.UTF8 
    });
    
    //save to Downloads folder
    const asset = await MediaLibrary.createAssetAsync(fileUri);
    await MediaLibrary.createAlbumAsync('Download', asset, false);
    
    alert('CSV saved to your Downloads folder.');
  } catch (err) {
    console.error('Export failed:', err);
    alert('Failed to export sessions.');
  }
};


  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Bell size={20} color={Colors.text.primary} />
              <Text style={styles.settingText}>Notifications</Text>
            </View>
            <Switch 
              trackColor={{ false: Colors.inactive, true: Colors.primary }}
              thumbColor={Colors.card}
              ios_backgroundColor={Colors.inactive}
              value={notificationsEnabled}
              onValueChange={toggleNotifications}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Brain size={20} color={Colors.text.primary} />
              <Text style={styles.settingText}>ADHD Mode</Text>
            </View>
            <Switch
              trackColor={{ false: Colors.inactive, true: Colors.primary }}
              thumbColor={Colors.card}
              value={includeShortSessions}
              onValueChange={toggleShort}
            />
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data</Text>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={clearAllData}
            disabled={isLoading}
          >
            <View style={styles.settingInfo}>
              <Trash2 size={20} color={Colors.error} />
              <Text style={[styles.settingText, { color: Colors.error }]}>Clear all data</Text>
            </View>
            {isLoading && <ActivityIndicator size="small" color={Colors.primary} />}
          </TouchableOpacity>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Info size={20} color={Colors.text.primary} />
              <Text style={styles.settingText}>Sessions stored</Text>
            </View>
            {isLoading ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Text style={styles.settingValue}>{sessions.length}</Text>
            )}
          </View>
          <View style={styles.settingItem}>
          <TouchableOpacity 
            style={styles.settingInfo}
            onPress={exportSessionsToCSV}
          >
            <Upload size={20} color={Colors.text.primary} />
            <Text style={styles.settingText}>Export session data</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.settingItem}>
          <TouchableOpacity 
            style={styles.settingInfo}
            onPress={importSessionsFromCSV}
          >
            <Download size={20} color={Colors.text.primary} />
            <Text style={styles.settingText}>Import session data</Text>
          </TouchableOpacity>
        </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Github size={20} color={Colors.text.primary} />
              <Text style={styles.settingText}>Version</Text>
            </View>
            <Text style={styles.settingValue}>1.0.0</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 10,
  },
  section: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 15,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    fontSize: 16,
    color: Colors.text.primary,
    marginLeft: 12,
  },
  settingValue: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
  aboutFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  aboutText: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginLeft: 6,
  },
});
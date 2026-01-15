import Colors from '@/constants/colors';
import { exportSessionsToCSV, importSessionsFromCSV } from '@/services/dataExport';
import useTimerStore from '@/store/timerStore';
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

  const handleExport = async () => {
    try {
      await exportSessionsToCSV();
      alert('CSV saved to your Downloads folder.');
    } catch {
      alert('Failed to export sessions.');
    }
  };

  const handleImport = async () => {
    try {
      await importSessionsFromCSV();
      alert('Import and model sync complete.');
    } catch {
      alert('Failed to import sessions.');
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
              onPress={handleExport}
            >
              <Upload size={20} color={Colors.text.primary} />
              <Text style={styles.settingText}>Export session data</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.settingItem}>
            <TouchableOpacity 
              style={styles.settingInfo}
              onPress={handleImport}
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
            <Text style={styles.settingValue}>1.1.0</Text>
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
});

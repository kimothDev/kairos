import ImportModal from "@/components/ImportModal";
import Colors from "@/constants/colors";
import {
    exportAllDataAsZip,
    ImportSelection,
    ParsedImportData,
    performImport,
    pickAndParseZip,
} from "@/services/dataExport";
import useTimerStore from "@/store/timerStore";
import {
    Battery,
    Bell,
    Brain,
    Download,
    Github,
    Info,
    Trash2,
    Upload,
} from "lucide-react-native";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Linking,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function SettingsScreen() {
  const { sessions, isLoading, clearAllSessions, loadSessions } =
    useTimerStore();
  const includeShortSessions = useTimerStore((s) => s.includeShortSessions);
  const toggleShort = useTimerStore((s) => s.toggleIncludeShortSessions);
  const notificationsEnabled = useTimerStore((s) => s.notificationsEnabled);
  const toggleNotifications = useTimerStore(
    (s) => s.toggleNotificationsEnabled,
  );

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Import Modal State
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importData, setImportData] = useState<ParsedImportData | null>(null);

  const openBatterySettings = async () => {
    if (Platform.OS === "android") {
      // Show alert with instructions, then open app settings
      Alert.alert(
        "Disable Battery Optimization",
        'To ensure notifications work when the app is in background:\n\n1. Tap "Open Settings" below\n2. Select "Battery"\n3. Choose "Unrestricted"',
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Open Settings",
            onPress: () => Linking.openSettings(),
          },
        ],
      );
    }
  };

  const clearAllData = () => {
    Alert.alert(
      "Clear All Data",
      "Are you sure you want to clear all your session history? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Clear",
          onPress: () => clearAllSessions(),
          style: "destructive",
        },
      ],
    );
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await exportAllDataAsZip();
      // No alert needed as share sheet handles feedback
    } catch (error) {
      console.error(error);
      Alert.alert("Export Failed", "Could not create backup file.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportPick = async () => {
    try {
      setIsImporting(true);
      const data = await pickAndParseZip();

      if (data) {
        setImportData(data);
        setImportModalVisible(true);
      }
    } catch (error) {
      console.error(error);
      Alert.alert(
        "Import Failed",
        error instanceof Error ? error.message : "Failed to read backup file.",
      );
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportConfirm = async (selection: ImportSelection) => {
    if (!importData) return;

    try {
      setIsImporting(true);
      setImportModalVisible(false);

      await performImport(importData, selection);

      // Refresh state
      await loadSessions();

      Alert.alert(
        "Import Complete",
        "Your data has been successfully restored.",
      );
    } catch (error) {
      console.error(error);
      Alert.alert("Import Failed", "An error occurred while restoring data.");
    } finally {
      setIsImporting(false);
      setImportData(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Import Modal */}
      <ImportModal
        visible={importModalVisible}
        onClose={() => setImportModalVisible(false)}
        onImport={handleImportConfirm}
        data={importData}
      />

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

          {Platform.OS === "android" && notificationsEnabled && (
            <TouchableOpacity
              style={styles.settingItem}
              onPress={openBatterySettings}
            >
              <View style={styles.settingInfo}>
                <Battery size={20} color={Colors.text.primary} />
                <Text
                  style={[styles.settingText, { color: Colors.text.primary }]}
                >
                  Disable Battery Optimization
                </Text>
              </View>
            </TouchableOpacity>
          )}

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
              <Text style={[styles.settingText, { color: Colors.error }]}>
                Clear all data
              </Text>
            </View>
            {isLoading && (
              <ActivityIndicator size="small" color={Colors.primary} />
            )}
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
              disabled={isExporting}
            >
              <Upload size={20} color={Colors.text.primary} />
              <Text style={styles.settingText}>Export data backup</Text>
            </TouchableOpacity>
            {isExporting && (
              <ActivityIndicator size="small" color={Colors.primary} />
            )}
          </View>

          <View style={styles.settingItem}>
            <TouchableOpacity
              style={styles.settingInfo}
              onPress={handleImportPick}
              disabled={isImporting}
            >
              <Download size={20} color={Colors.text.primary} />
              <Text style={styles.settingText}>Import data backup</Text>
            </TouchableOpacity>
            {isImporting && (
              <ActivityIndicator size="small" color={Colors.primary} />
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Github size={20} color={Colors.text.primary} />
              <Text style={styles.settingText}>Version</Text>
            </View>
            <Text style={styles.settingValue}>1.3.0</Text>
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
    fontWeight: "bold",
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
    fontWeight: "600",
    color: Colors.text.primary,
    marginBottom: 15,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
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
  settingHint: {
    fontSize: 12,
    color: Colors.text.light,
    marginTop: 2,
  },
});

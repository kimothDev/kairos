import ImportModal from "@/components/ImportModal";
import { useThemeColor } from "@/hooks/useThemeColor";
import {
  exportAllDataAsZip,
  ImportSelection,
  ParsedImportData,
  performImport,
  pickAndParseZip,
} from "@/services/dataExport";
import { useThemeStore } from "@/store/themeStore";
import useTimerStore from "@/store/timerStore";
import {
  Battery,
  Bell,
  Brain,
  Download,
  Github,
  Info,
  Monitor,
  Moon,
  Sun,
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
  const colors = useThemeColor();
  const { themeMode, setThemeMode } = useThemeStore();
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

  const ThemeOption = ({
    mode,
    icon: Icon,
    label,
  }: {
    mode: "light" | "dark" | "system";
    icon: any;
    label: string;
  }) => (
    <TouchableOpacity
      onPress={() => setThemeMode(mode)}
      style={[
        styles.themeOption,
        {
          backgroundColor: themeMode === mode ? colors.primary : "transparent",
          borderColor: colors.border,
        },
      ]}
    >
      <Icon
        size={20}
        color={themeMode === mode ? "#FFF" : colors.text.primary}
      />
      <Text
        style={[
          styles.themeOptionLabel,
          {
            color: themeMode === mode ? "#FFF" : colors.text.primary,
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Import Modal */}
      <ImportModal
        visible={importModalVisible}
        onClose={() => setImportModalVisible(false)}
        onImport={handleImportConfirm}
        data={importData}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text.primary }]}>
            Settings
          </Text>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Appearance
          </Text>
          <View style={styles.themeSelector}>
            <ThemeOption mode="system" icon={Monitor} label="System" />
            <ThemeOption mode="light" icon={Sun} label="Light" />
            <ThemeOption mode="dark" icon={Moon} label="Dark" />
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            App
          </Text>

          <View
            style={[styles.settingItem, { borderBottomColor: colors.border }]}
          >
            <View style={styles.settingInfo}>
              <Bell size={20} color={colors.text.primary} />
              <Text
                style={[styles.settingText, { color: colors.text.primary }]}
              >
                Notifications
              </Text>
            </View>
            <Switch
              trackColor={{ false: colors.inactive, true: colors.primary }}
              thumbColor={colors.card}
              ios_backgroundColor={colors.inactive}
              value={notificationsEnabled}
              onValueChange={toggleNotifications}
            />
          </View>

          {Platform.OS === "android" && notificationsEnabled && (
            <TouchableOpacity
              style={[styles.settingItem, { borderBottomColor: colors.border }]}
              onPress={openBatterySettings}
            >
              <View style={styles.settingInfo}>
                <Battery size={20} color={colors.text.primary} />
                <Text
                  style={[styles.settingText, { color: colors.text.primary }]}
                >
                  Disable Battery Optimization
                </Text>
              </View>
            </TouchableOpacity>
          )}

          <View
            style={[
              styles.settingItem,
              { borderBottomColor: colors.border, borderBottomWidth: 0 },
            ]}
          >
            <View style={styles.settingInfo}>
              <Brain size={20} color={colors.text.primary} />
              <Text
                style={[styles.settingText, { color: colors.text.primary }]}
              >
                ADHD Mode
              </Text>
            </View>
            <Switch
              trackColor={{ false: colors.inactive, true: colors.primary }}
              thumbColor={colors.card}
              value={includeShortSessions}
              onValueChange={toggleShort}
            />
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            Data
          </Text>

          <TouchableOpacity
            style={[styles.settingItem, { borderBottomColor: colors.border }]}
            onPress={clearAllData}
            disabled={isLoading}
          >
            <View style={styles.settingInfo}>
              <Trash2 size={20} color={colors.error} />
              <Text style={[styles.settingText, { color: colors.error }]}>
                Clear all data
              </Text>
            </View>
            {isLoading && (
              <ActivityIndicator size="small" color={colors.primary} />
            )}
          </TouchableOpacity>

          <View
            style={[styles.settingItem, { borderBottomColor: colors.border }]}
          >
            <View style={styles.settingInfo}>
              <Info size={20} color={colors.text.primary} />
              <Text
                style={[styles.settingText, { color: colors.text.primary }]}
              >
                Sessions stored
              </Text>
            </View>
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text
                style={[styles.settingValue, { color: colors.text.secondary }]}
              >
                {sessions.length}
              </Text>
            )}
          </View>

          <View
            style={[styles.settingItem, { borderBottomColor: colors.border }]}
          >
            <TouchableOpacity
              style={styles.settingInfo}
              onPress={handleExport}
              disabled={isExporting}
            >
              <Upload size={20} color={colors.text.primary} />
              <Text
                style={[styles.settingText, { color: colors.text.primary }]}
              >
                Export data backup
              </Text>
            </TouchableOpacity>
            {isExporting && (
              <ActivityIndicator size="small" color={colors.primary} />
            )}
          </View>

          <View
            style={[
              styles.settingItem,
              { borderBottomColor: colors.border, borderBottomWidth: 0 },
            ]}
          >
            <TouchableOpacity
              style={styles.settingInfo}
              onPress={handleImportPick}
              disabled={isImporting}
            >
              <Download size={20} color={colors.text.primary} />
              <Text
                style={[styles.settingText, { color: colors.text.primary }]}
              >
                Import data backup
              </Text>
            </TouchableOpacity>
            {isImporting && (
              <ActivityIndicator size="small" color={colors.primary} />
            )}
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            About
          </Text>

          <View
            style={[
              styles.settingItem,
              { borderBottomColor: colors.border, borderBottomWidth: 0 },
            ]}
          >
            <View style={styles.settingInfo}>
              <Github size={20} color={colors.text.primary} />
              <Text
                style={[styles.settingText, { color: colors.text.primary }]}
              >
                Version
              </Text>
            </View>
            <Text
              style={[styles.settingValue, { color: colors.text.secondary }]}
            >
              1.4.0
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  section: {
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 15,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingText: {
    fontSize: 16,
    marginLeft: 12,
  },
  settingValue: {
    fontSize: 16,
  },
  settingHint: {
    fontSize: 12,
    marginTop: 2,
  },
  themeSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  themeOption: {
    flex: 1, // Distribute space evenly
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  themeOptionLabel: {
    marginTop: 5,
    fontSize: 12,
    fontWeight: "500",
  },
});

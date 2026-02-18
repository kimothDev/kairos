import { RADIUS, SPACING, TYPOGRAPHY } from "@/constants/layout";
import { useThemeColor } from "@/hooks/useThemeColor";
import { ImportSelection, ParsedImportData } from "@/services/dataExport";
import { TriangleAlert as AlertTriangle, X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

interface ImportModalProps {
  visible: boolean;
  onClose: () => void;
  onImport: (selection: ImportSelection) => void;
  data: ParsedImportData | null;
}

export default function ImportModal({
  visible,
  onClose,
  onImport,
  data,
}: ImportModalProps) {
  const colors = useThemeColor();
  const [selection, setSelection] = useState<ImportSelection>({
    sessions: true,
    rlModel: true,
    settings: false,
  });

  // Reset selection when data changes or modal opens
  useEffect(() => {
    if (visible && data) {
      setSelection({
        sessions: data.counts.sessions > 0,
        rlModel: data.counts.hasRLModel,
        settings: false, // Default to false for settings to avoid accidental overrides
      });
    }
  }, [visible, data]);

  if (!data) return null;

  const handleImport = () => {
    onImport(selection);
  };

  const toggleSelection = (key: keyof ImportSelection) => {
    setSelection((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={[styles.modalView, { backgroundColor: colors.card }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
              Import Backup
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
              Select what to restore:
            </Text>

            {/* Sessions Option */}
            <TouchableOpacity
              style={[
                styles.optionRow,
                !data.counts.sessions && styles.disabledOption,
              ]}
              onPress={() =>
                data.counts.sessions > 0 && toggleSelection("sessions")
              }
              disabled={data.counts.sessions === 0}
            >
              <View style={styles.optionInfo}>
                <Text
                  style={[styles.optionLabel, { color: colors.text.primary }]}
                >
                  Session History
                </Text>
                <Text
                  style={[styles.optionDetail, { color: colors.text.light }]}
                >
                  {data.counts.sessions} sessions found
                </Text>
              </View>
              <Switch
                value={selection.sessions}
                onValueChange={() => toggleSelection("sessions")}
                disabled={data.counts.sessions === 0}
                trackColor={{ false: colors.inactive, true: colors.primary }}
                thumbColor={colors.card}
              />
            </TouchableOpacity>

            {/* RL Model Option */}
            <TouchableOpacity
              style={[
                styles.optionRow,
                !data.counts.hasRLModel && styles.disabledOption,
              ]}
              onPress={() =>
                data.counts.hasRLModel && toggleSelection("rlModel")
              }
              disabled={!data.counts.hasRLModel}
            >
              <View style={styles.optionInfo}>
                <Text
                  style={[styles.optionLabel, { color: colors.text.primary }]}
                >
                  AI Learning Data
                </Text>
                <Text
                  style={[styles.optionDetail, { color: colors.text.light }]}
                >
                  {data.counts.hasRLModel ? "Available" : "Not found in backup"}
                </Text>
              </View>
              <Switch
                value={selection.rlModel}
                onValueChange={() => toggleSelection("rlModel")}
                disabled={!data.counts.hasRLModel}
                trackColor={{ false: colors.inactive, true: colors.primary }}
                thumbColor={colors.card}
              />
            </TouchableOpacity>

            {/* Settings Option */}
            <TouchableOpacity
              style={[
                styles.optionRow,
                !data.counts.hasSettings && styles.disabledOption,
              ]}
              onPress={() =>
                data.counts.hasSettings && toggleSelection("settings")
              }
              disabled={!data.counts.hasSettings}
            >
              <View style={styles.optionInfo}>
                <Text
                  style={[styles.optionLabel, { color: colors.text.primary }]}
                >
                  App Settings
                </Text>
                <Text
                  style={[styles.optionDetail, { color: colors.text.light }]}
                >
                  {data.counts.hasSettings
                    ? "Preferences & custom tasks"
                    : "Not found in backup"}
                </Text>
              </View>
              <Switch
                value={selection.settings}
                onValueChange={() => toggleSelection("settings")}
                disabled={!data.counts.hasSettings}
                trackColor={{ false: colors.inactive, true: colors.primary }}
                thumbColor={colors.card}
              />
            </TouchableOpacity>

            {/* Warning for Settings on Android */}
            {selection.settings && Platform.OS === "android" && (
              <View style={styles.warningContainer}>
                <AlertTriangle
                  size={20}
                  color={colors.warning}
                  style={styles.warningIcon}
                />
                <Text
                  style={[styles.warningText, { color: colors.text.primary }]}
                >
                  If you reinstalled the app, you may need to disable battery
                  optimization again for background notifications to work
                  reliably.
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[
                styles.cancelButton,
                { backgroundColor: colors.inactive + "40" },
              ]}
              onPress={onClose}
            >
              <Text
                style={[
                  styles.cancelButtonText,
                  { color: colors.text.primary },
                ]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.importButton,
                {
                  backgroundColor: colors.primary,
                  shadowColor: colors.primary,
                },
                !selection.sessions &&
                  !selection.rlModel &&
                  !selection.settings &&
                  styles.disabledButton,
                !selection.sessions &&
                  !selection.rlModel &&
                  !selection.settings && { backgroundColor: colors.inactive },
              ]}
              onPress={handleImport}
              disabled={
                !selection.sessions && !selection.rlModel && !selection.settings
              }
            >
              <Text style={styles.importButtonText}>Import Selected</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalView: {
    width: "90%",
    maxHeight: "80%",
    borderRadius: RADIUS.xxl,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: SPACING.xl,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.size.xxl,
    fontFamily: "Outfit_700Bold",
  },
  closeButton: {
    padding: SPACING.xs,
  },
  content: {
    padding: SPACING.xl,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontFamily: "Outfit_400Regular",
    marginBottom: SPACING.p15,
  },
  optionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.xl,
    paddingVertical: SPACING.xs,
  },
  disabledOption: {
    opacity: 0.5,
  },
  optionInfo: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  optionLabel: {
    fontSize: TYPOGRAPHY.size.lg,
    fontFamily: "Outfit_600SemiBold",
    marginBottom: SPACING.xs,
  },
  optionDetail: {
    fontSize: TYPOGRAPHY.size.md,
    fontFamily: "Outfit_400Regular",
  },
  warningContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 152, 0, 0.1)",
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginTop: 5,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: "rgba(255, 152, 0, 0.3)",
  },
  warningIcon: {
    marginRight: SPACING.sm,
    marginTop: 2,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Outfit_400Regular",
    lineHeight: 18,
  },
  footer: {
    flexDirection: "row",
    padding: SPACING.xl,
    borderTopWidth: 1,
    gap: SPACING.md,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: RADIUS.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: TYPOGRAPHY.size.lg,
    fontFamily: "Outfit_600SemiBold",
  },
  importButton: {
    flex: 1,
    height: 48,
    borderRadius: RADIUS.lg,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    shadowOpacity: 0,
    elevation: 0,
  },
  importButtonText: {
    fontSize: TYPOGRAPHY.size.lg,
    fontFamily: "Outfit_600SemiBold",
    color: "#FFFFFF",
  },
});

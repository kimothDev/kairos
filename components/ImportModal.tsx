import Colors from "@/constants/colors";
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
        <View style={styles.modalView}>
          <View style={styles.header}>
            <Text style={styles.modalTitle}>Import Backup</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={Colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            <Text style={styles.subtitle}>Select what to restore:</Text>

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
                <Text style={styles.optionLabel}>Session History</Text>
                <Text style={styles.optionDetail}>
                  {data.counts.sessions} sessions found
                </Text>
              </View>
              <Switch
                value={selection.sessions}
                onValueChange={() => toggleSelection("sessions")}
                disabled={data.counts.sessions === 0}
                trackColor={{ false: Colors.inactive, true: Colors.primary }}
                thumbColor={Colors.card}
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
                <Text style={styles.optionLabel}>AI Learning Data</Text>
                <Text style={styles.optionDetail}>
                  {data.counts.hasRLModel ? "Available" : "Not found in backup"}
                </Text>
              </View>
              <Switch
                value={selection.rlModel}
                onValueChange={() => toggleSelection("rlModel")}
                disabled={!data.counts.hasRLModel}
                trackColor={{ false: Colors.inactive, true: Colors.primary }}
                thumbColor={Colors.card}
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
                <Text style={styles.optionLabel}>App Settings</Text>
                <Text style={styles.optionDetail}>
                  {data.counts.hasSettings
                    ? "Preferences & custom tasks"
                    : "Not found in backup"}
                </Text>
              </View>
              <Switch
                value={selection.settings}
                onValueChange={() => toggleSelection("settings")}
                disabled={!data.counts.hasSettings}
                trackColor={{ false: Colors.inactive, true: Colors.primary }}
                thumbColor={Colors.card}
              />
            </TouchableOpacity>

            {/* Warning for Settings on Android */}
            {selection.settings && Platform.OS === "android" && (
              <View style={styles.warningContainer}>
                <AlertTriangle
                  size={20}
                  color={Colors.warning}
                  style={styles.warningIcon}
                />
                <Text style={styles.warningText}>
                  If you reinstalled the app, you may need to disable battery
                  optimization again for background notifications to work
                  reliably.
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.importButton,
                !selection.sessions &&
                  !selection.rlModel &&
                  !selection.settings &&
                  styles.disabledButton,
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
    backgroundColor: Colors.card,
    borderRadius: 20,
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
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.text.primary,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
    marginBottom: 15,
  },
  optionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingVertical: 4,
  },
  disabledOption: {
    opacity: 0.5,
  },
  optionInfo: {
    flex: 1,
    marginRight: 10,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text.primary,
    marginBottom: 4,
  },
  optionDetail: {
    fontSize: 14,
    color: Colors.text.light,
  },
  warningContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 152, 0, 0.1)",
    padding: 12,
    borderRadius: 8,
    marginTop: 5,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 152, 0, 0.3)",
  },
  warningIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: Colors.text.primary,
    lineHeight: 18,
  },
  footer: {
    flexDirection: "row",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.inactive + "40", // lighter inactive
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text.primary,
  },
  importButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    backgroundColor: Colors.inactive,
    shadowOpacity: 0,
    elevation: 0,
  },
  importButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});

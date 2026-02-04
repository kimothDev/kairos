import { useThemeColor } from "@/hooks/useThemeColor";
import { X } from "lucide-react-native";
import React from "react";
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";

interface HistoryFilterModalProps {
  visible: boolean;
  onClose: () => void;
  selectedTaskTypes: string[];
  selectedEnergyLevels: string[];
  availableTaskTypes: string[];
  onApply: (taskTypes: string[], energyLevels: string[]) => void;
}

export default function HistoryFilterModal({
  visible,
  onClose,
  availableTaskTypes,
  selectedTaskTypes,
  selectedEnergyLevels,
  onApply,
}: HistoryFilterModalProps) {
  const colors = useThemeColor();
  const [taskTypes, setTaskTypes] = React.useState<string[]>(selectedTaskTypes);
  const [energyLevels, setEnergyLevels] =
    React.useState<string[]>(selectedEnergyLevels);

  // Sync state when modal opens
  React.useEffect(() => {
    if (visible) {
      setTaskTypes(selectedTaskTypes);
      setEnergyLevels(selectedEnergyLevels);
    }
  }, [visible, selectedTaskTypes, selectedEnergyLevels]);

  const toggleTaskType = (type: string) => {
    setTaskTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  const toggleEnergyLevel = (level: string) => {
    setEnergyLevels((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level],
    );
  };

  const handleReset = () => {
    setTaskTypes([]);
    setEnergyLevels([]);
  };

  const handleApply = () => {
    onApply(taskTypes, energyLevels);
    onClose();
  };

  const renderChip = (
    label: string,
    selected: boolean,
    onPress: () => void,
  ) => (
    <TouchableOpacity
      style={[
        styles.chip,
        {
          backgroundColor: selected
            ? colors.primary
            : colors.text.secondary + "20",
          borderColor: selected ? colors.primary : "transparent",
        },
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.chipText,
          {
            color: selected ? colors.card : colors.text.primary,
            fontWeight: selected ? "600" : "400",
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.modalContent,
                { backgroundColor: colors.background },
              ]}
            >
              <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text.primary }]}>
                  Filters
                </Text>
                <TouchableOpacity onPress={onClose}>
                  <X size={24} color={colors.text.secondary} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Task Types */}
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: colors.text.secondary },
                  ]}
                >
                  Task Type
                </Text>
                <View style={styles.chipContainer}>
                  {availableTaskTypes.map((type) =>
                    renderChip(type, taskTypes.includes(type), () =>
                      toggleTaskType(type),
                    ),
                  )}
                </View>

                {/* Energy Levels */}
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: colors.text.secondary, marginTop: 20 },
                  ]}
                >
                  Energy Level
                </Text>
                <View style={styles.chipContainer}>
                  {["high", "mid", "low"].map((level) =>
                    renderChip(
                      level.charAt(0).toUpperCase() + level.slice(1),
                      energyLevels.includes(level),
                      () => toggleEnergyLevel(level),
                    ),
                  )}
                </View>
              </ScrollView>

              <View style={styles.footer}>
                <TouchableOpacity
                  style={styles.resetButton}
                  onPress={handleReset}
                >
                  <Text
                    style={[styles.resetText, { color: colors.text.secondary }]}
                  >
                    Reset
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.applyButton,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={handleApply}
                >
                  <Text style={[styles.applyText, { color: colors.card }]}>
                    Apply Filters
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    borderRadius: 16,
    maxHeight: "80%",
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  scrollContent: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 14,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  resetButton: {
    padding: 10,
  },
  resetText: {
    fontSize: 16,
    fontWeight: "500",
  },
  applyButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  applyText: {
    fontSize: 16,
    fontWeight: "bold",
  },
});

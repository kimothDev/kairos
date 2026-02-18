import { RADIUS, SPACING, TYPOGRAPHY } from "@/constants/layout";
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
            fontFamily: selected ? "Outfit_600SemiBold" : "Outfit_400Regular",
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
                  {availableTaskTypes.map((type) => (
                    <React.Fragment key={type}>
                      {renderChip(type, taskTypes.includes(type), () =>
                        toggleTaskType(type),
                      )}
                    </React.Fragment>
                  ))}
                </View>

                {/* Energy Levels */}
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: colors.text.secondary, marginTop: 20 },
                  ]}
                >
                  Focus Mood
                </Text>
                <View style={styles.chipContainer}>
                  {["high", "mid", "low"].map((level) => (
                    <React.Fragment key={level}>
                      {renderChip(
                        level === "high"
                          ? "Intense"
                          : level === "mid"
                            ? "Steady"
                            : "Relaxed",
                        energyLevels.includes(level),
                        () => toggleEnergyLevel(level),
                      )}
                    </React.Fragment>
                  ))}
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
    padding: SPACING.xl,
  },
  modalContent: {
    borderRadius: RADIUS.xl,
    maxHeight: "80%",
    padding: SPACING.xl,
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
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: TYPOGRAPHY.size.xxl,
    fontFamily: "Outfit_700Bold",
  },
  scrollContent: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontFamily: "Outfit_600SemiBold",
    marginBottom: SPACING.md,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  chip: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: TYPOGRAPHY.size.md,
    fontFamily: "Outfit_400Regular",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  resetButton: {
    padding: SPACING.sm + 2,
  },
  resetText: {
    fontSize: TYPOGRAPHY.size.lg,
    fontFamily: "Outfit_600SemiBold",
  },
  applyButton: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xxl,
    borderRadius: RADIUS.lg,
  },
  applyText: {
    fontSize: TYPOGRAPHY.size.lg,
    fontFamily: "Outfit_700Bold",
  },
});

/**
 * Energy Level Selector
 *
 * Provides an interface for users to report their current focus capacity (mood).
 * This data is used to tailor the session recommendations.
 */
import { RADIUS, SPACING, TYPOGRAPHY } from "@/constants/layout";
import { useThemeColor } from "@/hooks/useThemeColor";
import useTimerStore from "@/store/timerStore";
import { EnergyLevel } from "@/types";
import { Activity, Feather, Zap } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function EnergyLevelSelector() {
  const colors = useThemeColor();
  const {
    energyLevel,
    setEnergyLevel,
    isActive,
    isBreakTime,
    showThemedAlert,
  } = useTimerStore();
  const isTimerRunning = isActive || isBreakTime;

  const handleSelect = (level: EnergyLevel) => {
    const { taskType } = useTimerStore.getState();
    if (!taskType) {
      showThemedAlert(
        "Setting Mood",
        "Please select a task type before setting your focus mood.",
      );
      return;
    }
    setEnergyLevel(level);
  };

  return (
    <View style={[styles.slotButton, { backgroundColor: colors.card }]}>
      <View>
        <Text style={[styles.slotLabel, { color: colors.text.secondary }]}>
          Focus Mood
        </Text>
        <View style={styles.energySelector}>
          <View style={styles.energyButtons}>
            <TouchableOpacity
              disabled={isTimerRunning}
              style={[
                styles.energyButton,
                energyLevel === "low" && {
                  borderColor: colors.primary,
                  backgroundColor: colors.primary + "1A", // 10% opacity hex
                }, // Dynamic selected style
                isTimerRunning && { opacity: 0.5 },
              ]}
              onPress={() => !isTimerRunning && handleSelect("low")}
            >
              <Feather
                size={20}
                color={
                  energyLevel === "low" ? colors.primary : colors.text.secondary
                }
              />
              <Text
                style={[
                  styles.energyText,
                  { color: colors.text.secondary },
                  energyLevel === "low" && {
                    color: colors.text.primary,
                    fontFamily: "Outfit_600SemiBold",
                  },
                ]}
              >
                Relaxed
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.energyButton,
                energyLevel === "mid" && {
                  borderColor: colors.primary,
                  backgroundColor: colors.primary + "1A",
                },
                isTimerRunning && { opacity: 0.5 },
              ]}
              onPress={() => !isTimerRunning && handleSelect("mid")}
            >
              <Activity
                size={20}
                color={
                  energyLevel === "mid" ? colors.primary : colors.text.secondary
                }
              />
              <Text
                style={[
                  styles.energyText,
                  { color: colors.text.secondary },
                  energyLevel === "mid" && {
                    color: colors.text.primary,
                    fontWeight: "600",
                  },
                ]}
              >
                Steady
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.energyButton,
                energyLevel === "high" && {
                  borderColor: colors.primary,
                  backgroundColor: colors.primary + "1A",
                },
                isTimerRunning && { opacity: 0.5 },
              ]}
              onPress={() => !isTimerRunning && handleSelect("high")}
            >
              <Zap
                size={20}
                color={
                  energyLevel === "high"
                    ? colors.primary
                    : colors.text.secondary
                }
              />
              <Text
                style={[
                  styles.energyText,
                  { color: colors.text.secondary },
                  energyLevel === "high" && {
                    color: colors.text.primary,
                    fontWeight: "600",
                  },
                ]}
              >
                Intense
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  slotButton: {
    padding: SPACING.p4,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.p4,
  },
  slotLabel: {
    fontSize: TYPOGRAPHY.size.md,
    fontFamily: "Outfit_600SemiBold",
    marginBottom: 2,
  },
  energySelector: {
    marginTop: 2,
  },
  energyButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: SPACING.xs,
  },
  energyButton: {
    flexDirection: "column",
    alignItems: "center",
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs / 2,
    borderRadius: RADIUS.md,
    flex: 1,
    marginHorizontal: SPACING.xs / 2,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  energyText: {
    marginTop: SPACING.xs + 2,
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: "Outfit_400Regular",
    textAlign: "center",
  },
});

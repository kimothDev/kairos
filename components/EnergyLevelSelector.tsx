import { useThemeColor } from "@/hooks/useThemeColor";
import useTimerStore from "@/store/timerStore";
import { EnergyLevel } from "@/types";
import { BatteryFull, BatteryLow, BatteryMedium } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function EnergyLevelSelector() {
  const colors = useThemeColor();
  const { energyLevel, setEnergyLevel, isActive, isBreakTime } =
    useTimerStore();
  const isTimerRunning = isActive || isBreakTime;

  const handleSelect = (level: EnergyLevel) => {
    setEnergyLevel(level);
  };

  return (
    <View style={[styles.slotButton, { backgroundColor: colors.card }]}>
      <View>
        <Text style={[styles.slotLabel, { color: colors.text.secondary }]}>
          Energy Level
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
              <BatteryLow
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
                    fontWeight: "600",
                  },
                ]}
              >
                Low
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
              <BatteryMedium
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
                Mid
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
              <BatteryFull
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
                High
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
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  slotLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  energySelector: {
    marginTop: 2,
  },
  energyButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  energyButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  energyText: {
    marginLeft: 5,
    fontSize: 14,
  },
});

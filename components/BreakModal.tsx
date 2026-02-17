/**
 * Break Modal
 *
 * Displayed after a successful focus session. Offers various break
 * duration options influenced by the duration of the completed session.
 */
import { useThemeColor } from "@/hooks/useThemeColor";
import useTimerStore from "@/store/timerStore";
import { getBreakOptions } from "@/utils/options";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function BreakModal() {
  const colors = useThemeColor();
  const {
    showBreakModal,
    startBreak,
    recommendedBreakDuration,
    includeShortSessions,
  } = useTimerStore();

  if (!showBreakModal) return null;

  // use utility for break options, filtered by focus duration
  const focusMinutes = Math.round(
    useTimerStore.getState().focusSessionDuration / 60,
  );
  const breakOptions = getBreakOptions(includeShortSessions, focusMinutes);

  return (
    <View style={styles.modalOverlay}>
      <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
        <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
          Great Job!
        </Text>
        <Text style={[styles.modalText, { color: colors.text.primary }]}>
          You completed your focus session. Take a break!
        </Text>
        <View style={styles.breakOptions}>
          {breakOptions.map((option) => (
            <TouchableOpacity
              key={option.duration}
              style={[
                styles.breakOption,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.primary,
                },
                option.duration === recommendedBreakDuration * 60 && {
                  backgroundColor: colors.primary + "1A", // 10% opacity, hex
                  borderWidth: 2,
                  borderColor: colors.primary, // Explicitly set border color for recommended
                },
                option.duration === 0 && {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => startBreak(option.duration)}
            >
              <Text
                style={[
                  styles.breakOptionText,
                  { color: colors.text.primary },
                  option.duration === 0 && { color: colors.text.secondary },
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalContent: {
    borderRadius: 16,
    width: "85%",
    maxWidth: 400,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: "Outfit_700Bold",
    marginBottom: 10,
    textAlign: "center",
  },
  modalText: {
    fontSize: 16,
    fontFamily: "Outfit_400Regular",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  breakOptions: {
    marginTop: 20,
    width: "100%",
  },
  breakOption: {
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: "center",
    borderWidth: 1,
  },
  breakOptionText: {
    fontSize: 16,
    fontFamily: "Outfit_600SemiBold",
  },
});

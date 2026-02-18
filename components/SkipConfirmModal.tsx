import { RADIUS, SPACING, TYPOGRAPHY } from "@/constants/layout";
import { useThemeColor } from "@/hooks/useThemeColor";
import useTimerStore from "@/store/timerStore";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function SkipConfirmModal({
  onConfirmSkip,
}: {
  onConfirmSkip: () => void;
}) {
  const colors = useThemeColor();
  const { showSkipConfirm, toggleSkipConfirm, cancelTimer } = useTimerStore();

  if (!showSkipConfirm) return null;

  const handleConfirm = () => {
    onConfirmSkip();
    toggleSkipConfirm(false);
  };

  return (
    <View style={styles.confirmOverlay}>
      <View style={[styles.confirmBox, { backgroundColor: colors.card }]}>
        <Text style={[styles.confirmText, { color: colors.text.primary }]}>
          Are you sure you want to skip?
        </Text>
        <View style={styles.confirmButtons}>
          <TouchableOpacity
            style={[
              styles.confirmButton,
              {
                backgroundColor: colors.inactive + "1A",
              },
            ]}
            onPress={() => toggleSkipConfirm(false)}
            activeOpacity={0.7}
          >
            <Text
              style={[styles.confirmNoText, { color: colors.text.primary }]}
            >
              No
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.confirmButton,
              { backgroundColor: colors.secondary },
            ]}
            onPress={handleConfirm}
            activeOpacity={0.7}
          >
            <Text style={[styles.confirmYesText, { color: "#FFFFFF" }]}>
              Yes
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  confirmOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  confirmBox: {
    padding: SPACING.xl,
    borderRadius: RADIUS.xl,
    width: "85%",
    maxWidth: 400,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
  },
  confirmText: {
    fontSize: TYPOGRAPHY.size.xl,
    fontFamily: "Outfit_600SemiBold",
    marginBottom: SPACING.xl,
    textAlign: "center",
  },
  confirmButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
  confirmButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  confirmNoText: {
    fontSize: TYPOGRAPHY.size.lg,
    fontFamily: "Outfit_700Bold",
  },
  confirmYesText: {
    fontSize: TYPOGRAPHY.size.lg,
    fontFamily: "Outfit_700Bold",
  },
});

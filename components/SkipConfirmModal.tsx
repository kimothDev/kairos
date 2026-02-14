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
              styles.confirmNo,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
            onPress={() => toggleSkipConfirm(false)}
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
              styles.confirmYes,
              { backgroundColor: colors.secondary },
            ]}
            onPress={handleConfirm}
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
    padding: 20,
    borderRadius: 16,
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
    fontSize: 18,
    fontFamily: "Outfit_600SemiBold",
    marginBottom: 20,
    textAlign: "center",
  },
  confirmButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
  confirmButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    minWidth: 100,
    alignItems: "center",
  },
  confirmNo: {
    marginRight: 10,
    borderWidth: 1,
  },
  confirmYes: {
    marginLeft: 10,
  },
  confirmNoText: {
    fontSize: 16,
    fontFamily: "Outfit_700Bold",
  },
  confirmYesText: {
    fontSize: 16,
    fontFamily: "Outfit_700Bold",
  },
});

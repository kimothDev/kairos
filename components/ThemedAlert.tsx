import { RADIUS, SPACING, TYPOGRAPHY } from "@/constants/layout";
import { useThemeColor } from "@/hooks/useThemeColor";
import useTimerStore from "@/store/timerStore";
import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function ThemedAlert() {
  const colors = useThemeColor();
  const { themedAlert, hideThemedAlert } = useTimerStore();

  if (!themedAlert) return null;

  return (
    <Modal
      transparent
      visible={!!themedAlert}
      animationType="fade"
      onRequestClose={hideThemedAlert}
    >
      <View style={styles.overlay}>
        <View style={[styles.alertContainer, { backgroundColor: colors.card }]}>
          {themedAlert.title && (
            <Text
              style={[
                styles.alertTitle,
                { color: colors.text.primary, fontFamily: "Outfit_700Bold" },
              ]}
            >
              {themedAlert.title}
            </Text>
          )}
          <Text
            style={[
              styles.alertMessage,
              {
                color: colors.text.secondary,
                fontFamily: "Outfit_400Regular",
                textAlign: themedAlert.alignment || "center",
              },
            ]}
          >
            {themedAlert.message}
          </Text>

          <View
            style={
              themedAlert.buttons && themedAlert.buttons.length > 2
                ? styles.buttonColumn
                : styles.buttonRow
            }
          >
            {themedAlert.buttons && themedAlert.buttons.length > 0 ? (
              themedAlert.buttons.map((btn, idx) => (
                <TouchableOpacity
                  key={`${btn.text}-${idx}`}
                  activeOpacity={0.7}
                  style={[
                    styles.button,
                    {
                      backgroundColor:
                        btn.style === "destructive"
                          ? colors.error + "20"
                          : btn.style === "cancel"
                            ? colors.inactive + "1A"
                            : colors.primary,
                      flex:
                        themedAlert.buttons && themedAlert.buttons.length > 2
                          ? 0
                          : 1,
                    },
                  ]}
                  onPress={() => {
                    hideThemedAlert();
                    if (btn.onPress) btn.onPress();
                  }}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      {
                        fontFamily: "Outfit_600SemiBold",
                        color:
                          btn.style === "destructive"
                            ? colors.error
                            : btn.style === "cancel"
                              ? colors.text.primary
                              : "#FFF",
                      },
                    ]}
                  >
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <TouchableOpacity
                style={[
                  styles.button,
                  { backgroundColor: colors.primary, flex: 1 },
                ]}
                activeOpacity={0.7}
                onPress={hideThemedAlert}
              >
                <Text
                  style={[
                    styles.buttonText,
                    { fontFamily: "Outfit_600SemiBold", color: "#FFF" },
                  ]}
                >
                  Got it
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.xl,
  },
  alertContainer: {
    width: "100%",
    maxWidth: 320,
    borderRadius: RADIUS.xxl,
    padding: SPACING.xxl,
    alignItems: "center",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  alertTitle: {
    fontSize: TYPOGRAPHY.size.xxl,
    marginBottom: SPACING.md,
    textAlign: "center",
  },
  alertMessage: {
    fontSize: TYPOGRAPHY.size.lg,
    lineHeight: 24,
    marginBottom: SPACING.xxl,
    width: "100%",
  },
  buttonRow: {
    flexDirection: "row",
    gap: SPACING.md,
    width: "100%",
  },
  buttonColumn: {
    flexDirection: "column",
    gap: SPACING.md,
    width: "100%",
  },
  button: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.xl,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  buttonText: {
    fontSize: TYPOGRAPHY.size.lg,
    letterSpacing: 0.2,
  },
});

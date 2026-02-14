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
              { color: colors.text.secondary, fontFamily: "Outfit_400Regular" },
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
                  style={[
                    styles.button,
                    {
                      backgroundColor:
                        btn.style === "destructive"
                          ? colors.error || "#FF4B4B"
                          : btn.style === "cancel"
                            ? "transparent"
                            : colors.primary,
                      flex:
                        themedAlert.buttons && themedAlert.buttons.length > 2
                          ? 0
                          : 1,
                      borderWidth: btn.style === "cancel" ? 1 : 0,
                      borderColor: colors.border,
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
                          btn.style === "cancel"
                            ? colors.text.secondary
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
    padding: 20,
  },
  alertContainer: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  alertTitle: {
    fontSize: 20,
    marginBottom: 12,
    textAlign: "center",
  },
  alertMessage: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  buttonColumn: {
    flexDirection: "column",
    gap: 12,
    width: "100%",
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFF",
    fontSize: 16,
  },
});

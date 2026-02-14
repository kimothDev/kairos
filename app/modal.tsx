import { useThemeColor } from "@/hooks/useThemeColor";
import { StatusBar } from "expo-status-bar";
import { Platform, StyleSheet, Text, View } from "react-native";

export default function ModalScreen() {
  const colors = useThemeColor();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text.primary }]}>Modal</Text>
      <View style={[styles.separator, { backgroundColor: colors.border }]} />
      <Text
        style={{
          color: colors.text.secondary,
          fontFamily: "Outfit_400Regular",
        }}
      >
        This is an example modal. You can edit it in app/modal.tsx.
      </Text>

      {/* Use a light status bar on iOS to account for the black space above the modal */}
      <StatusBar style={Platform.OS === "ios" ? "light" : "auto"} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontFamily: "Outfit_700Bold",
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: "80%",
  },
});

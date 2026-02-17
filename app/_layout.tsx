/**
 * Root Layout
 *
 * Sets up the application's foundational providers, including fonts,
 * theme-aware background colors, and the root navigation stack.
 */
import ThemedAlert from "@/components/ThemedAlert";
import { useIsDark, useThemeColor } from "@/hooks/useThemeColor";
import {
    Outfit_300Light,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_900Black,
    useFonts,
} from "@expo-google-fonts/outfit";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect } from "react";
import { Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  const colors = useThemeColor();
  const isDark = useIsDark();

  const [fontsLoaded] = useFonts({
    Outfit_300Light,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_900Black,
  });

  useEffect(() => {
    // Set the root view background color to match the theme
    // This helps prevent white flashes and ensures the system UI matches
    SystemUI.setBackgroundColorAsync(colors.background);
  }, [colors.background]);

  if (!fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            color: colors.text.primary,
            fontSize: 64,
            fontFamily: "Outfit_900Black",
            letterSpacing: -3,
          }}
        >
          Kairos
        </Text>
        <Text
          style={{
            color: colors.text.secondary,
            fontSize: 16,
            fontFamily: "Outfit_400Regular",
            opacity: 0.8,
            marginTop: -10,
          }}
        >
          Master your focus rhythm
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal"
          options={{
            presentation: "modal",
            animation: "slide_from_bottom",
          }}
        />
      </Stack>
      <StatusBar
        style={isDark ? "light" : "dark"}
        translucent
        backgroundColor="transparent"
      />
      <ThemedAlert />
    </SafeAreaProvider>
  );
}

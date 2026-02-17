/**
 * Tabs Layout
 *
 * Defines the main tab navigation structure for the app, including
 * styling for the bottom tab bar and screen options.
 */
import { useThemeColor } from "@/hooks/useThemeColor";
import { Tabs } from "expo-router";
import { Clock, History, Settings, TrendingUp } from "lucide-react-native";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColor();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text.secondary,
        tabBarStyle: {
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: colors.card,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          borderTopWidth: 0,
        },

        headerStyle: {
          backgroundColor: colors.card,
        },
        headerTitleStyle: {
          color: colors.text.primary,
          fontFamily: "Outfit_700Bold",
        },
        headerShown: false, //hide the header for all screens
        tabBarLabelStyle: {
          fontSize: 11.5,
          fontFamily: "Outfit_500Medium",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Focus Timer",
          tabBarLabel: "Timer",
          tabBarIcon: ({ color }) => <Clock size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarLabel: "History",
          tabBarIcon: ({ color }) => <History size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="performance"
        options={{
          title: "Performance",
          tabBarLabel: "Performance",
          tabBarIcon: ({ color }) => <TrendingUp size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarLabel: "Settings",
          tabBarIcon: ({ color }) => <Settings size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}

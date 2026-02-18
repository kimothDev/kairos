import { RADIUS, SPACING, TYPOGRAPHY } from "@/constants/layout";
import { useThemeColor } from "@/hooks/useThemeColor";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface InsightCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  color?: string;
}

export default function InsightCard({
  icon,
  title,
  value,
  color,
}: InsightCardProps) {
  const colors = useThemeColor();
  const iconColor = color || colors.primary;

  return (
    <View style={styles.insightItem}>
      <View
        style={[styles.insightIconContainer, { backgroundColor: iconColor }]}
      >
        {icon}
      </View>
      <View style={styles.insightContent}>
        <Text style={[styles.insightLabel, { color: colors.text.secondary }]}>
          {title}
        </Text>
        <Text style={[styles.insightValue, { color: colors.text.primary }]}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  insightItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  insightIconContainer: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.md,
  },
  insightContent: {
    flex: 1,
  },
  insightLabel: {
    fontSize: TYPOGRAPHY.size.md,
    fontFamily: "Outfit_400Regular",
    marginBottom: 2,
  },
  insightValue: {
    fontSize: TYPOGRAPHY.size.lg,
    fontFamily: "Outfit_600SemiBold",
  },
});

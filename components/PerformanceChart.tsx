import { RADIUS, SPACING, TYPOGRAPHY } from "@/constants/layout";
import { useThemeColor } from "@/hooks/useThemeColor";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface PerformanceChartProps {
  data: {
    label: string;
    value: number;
  }[];
  maxValue?: number;
  barColor?: string;
  barWidth?: number;
  height?: number;
}

export default function PerformanceChart({
  data,
  maxValue: propMaxValue,
  barColor,
  barWidth = 20,
  height = 150,
}: PerformanceChartProps) {
  const colors = useThemeColor();
  //calculate max value if not provided
  const maxValue =
    propMaxValue || Math.max(...data.map((item) => item.value), 1);
  const actualBarColor = barColor || colors.primary;

  return (
    <View style={[styles.container, { height }]}>
      {data.map((item, index) => (
        <View key={index} style={styles.barColumn}>
          <View
            style={[
              styles.barContainer,
              { height: height * 0.8, backgroundColor: colors.primary + "1A" },
            ]}
          >
            <View
              style={[
                styles.bar,
                {
                  height: `${(item.value / maxValue) * 100}%`,
                  backgroundColor:
                    item.value > 0 ? actualBarColor : colors.inactive,
                  width: barWidth,
                },
              ]}
            />
          </View>
          <Text style={[styles.barLabel, { color: colors.text.secondary }]}>
            {item.label}
          </Text>
          <Text style={[styles.barValue, { color: colors.text.light }]}>
            {Math.round(item.value)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingTop: SPACING.xl,
  },
  barColumn: {
    flex: 1,
    alignItems: "center",
  },
  barContainer: {
    borderRadius: RADIUS.md,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  bar: {
    width: "100%",
    borderTopLeftRadius: RADIUS.md,
    borderTopRightRadius: RADIUS.md,
  },
  barLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: "Outfit_400Regular",
    marginTop: SPACING.sm,
  },
  barValue: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: "Outfit_400Regular",
    marginTop: 2,
  },
});

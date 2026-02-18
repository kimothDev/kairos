/**
 * Adaptive Bar Chart
 *
 * A responsive bar chart component that visualizes focus time across
 * different historical views (Day, Week, Month, Year).
 */
import { RADIUS, SPACING, TYPOGRAPHY } from "@/constants/layout";
import { useThemeColor } from "@/hooks/useThemeColor";
import React, { useState } from "react";
import { LayoutChangeEvent, StyleSheet, Text, View } from "react-native";
import Svg, {
    Defs,
    LinearGradient,
    Rect,
    Stop,
    Text as SvgText,
} from "react-native-svg";

interface AdaptiveBarChartProps {
  data: {
    labels: string[];
    values: number[];
    maxValue: number;
    dateRange: string;
  };
  height?: number;
  barColor?: string;
}

const DEFAULT_CHART_HEIGHT = 180;
const BOTTOM_LABEL_HEIGHT = 25;

export default function AdaptiveBarChart({
  data,
  height = DEFAULT_CHART_HEIGHT,
  barColor,
}: AdaptiveBarChartProps) {
  const Colors = useThemeColor();
  const activeBarColor = barColor || Colors.primary;

  const [width, setWidth] = useState(0);

  const onLayout = (event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  };

  const { labels, values, maxValue: dataMax } = data;

  // USER REQUEST: Vertical goes 5 by 5, upto 25 default.
  // Scale based on actual data if > 25, otherwise default to 25
  const chartMax = Math.max(dataMax, 25);

  // Use a PADDING_RIGHT to avoid text cutoff on the edge
  const Y_AXIS_WIDTH = 32;
  const PADDING_RIGHT = 12; // Extra padding on the right for last label

  // The drawing width for bars/grid is total width minus edges
  // Ensure we don't go negative on initial render
  const chartDrawingWidth = Math.max(0, width - Y_AXIS_WIDTH - PADDING_RIGHT);

  // Calculate bar dimensions
  const barCount = values.length;
  // Dynamic spacing based on density
  let gapPercent = 0.2;
  if (barCount > 20) gapPercent = 0.15;
  if (barCount > 100) gapPercent = 0;

  const totalBarWidth = chartDrawingWidth / barCount;
  const barWidth = totalBarWidth * (1 - gapPercent);
  const gapWidth = totalBarWidth * gapPercent;

  // Calculate graph height relative to container height (approx 75% for graph area)
  const GRAPH_HEIGHT = height * 0.7;

  // Generate Y-axis grid lines (0, 25%, 50%, 75%, 100% of chartMax)
  const gridLines = [0, 1, 2, 3, 4].map((i) => {
    const val = (chartMax / 4) * i;
    const y = GRAPH_HEIGHT - (val / chartMax) * GRAPH_HEIGHT;
    return { y, val };
  });

  return (
    <View style={[styles.container, { backgroundColor: Colors.card }]}>
      <View style={styles.chartHeader}>
        <Text style={[styles.chartTitle, { color: Colors.text.primary }]}>
          Focused Time Distribution
        </Text>
      </View>

      {/* Wrapper to measure available width */}
      <View
        style={{
          width: "100%",
          height,
          alignItems: "center",
          justifyContent: "center",
        }}
        onLayout={onLayout}
      >
        {width > 0 && (
          <Svg width={width} height={height}>
            <Defs>
              <LinearGradient
                id={`barGradient-${activeBarColor}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <Stop offset="0" stopColor={activeBarColor} stopOpacity="0.8" />
                <Stop offset="1" stopColor={activeBarColor} stopOpacity="0.4" />
              </LinearGradient>
            </Defs>

            {/* Grid Lines & Labels */}
            {gridLines.map((line, i) => (
              <React.Fragment key={`grid-${i}`}>
                {/* Line (starts after Y-axis padding) */}
                <Rect
                  x={Y_AXIS_WIDTH}
                  y={line.y + 10} // +10 top padding
                  width={chartDrawingWidth}
                  height="1"
                  fill={Colors.text.light}
                  opacity="0.1"
                />
                {/* Y-Axis Label (in the gutter) */}
                <SvgText
                  x={Y_AXIS_WIDTH - 6} // Right-align in gutter with some padding
                  y={line.y + 10 + 3} // Center vertically relative to line
                  fontSize={TYPOGRAPHY.size.xs}
                  fontFamily="Outfit_400Regular"
                  fill={Colors.text.secondary}
                  textAnchor="end"
                  opacity="0.8"
                >
                  {chartMax > 59
                    ? line.val === 0
                      ? "0"
                      : `${(line.val / 60).toFixed(1)}h`
                    : Math.round(line.val)}
                </SvgText>
              </React.Fragment>
            ))}

            {/* Bars */}
            {values.map((val, i) => {
              const barHeight = (val / Math.max(chartMax, 1)) * GRAPH_HEIGHT;

              // Shift x by Y_AXIS_WIDTH
              const barLeft = Y_AXIS_WIDTH + i * totalBarWidth;
              const barX = barLeft + gapWidth / 2;
              const barY = GRAPH_HEIGHT - barHeight + 10; // +10 top padding

              return (
                <React.Fragment key={`bar-${i}`}>
                  {/* Visible Bar */}
                  <Rect
                    x={barX}
                    y={barY}
                    width={Math.max(barWidth, 1)}
                    height={Math.max(barHeight, 0)}
                    fill={`url(#barGradient-${activeBarColor})`}
                    opacity={0.8}
                    rx={2}
                  />

                  {/* X-Axis Label */}
                  {labels[i] ? (
                    <SvgText
                      x={barX + barWidth / 2}
                      y={GRAPH_HEIGHT + 25}
                      fontSize="9"
                      fontFamily="Outfit_400Regular"
                      fill={Colors.text.secondary}
                      textAnchor="middle"
                    >
                      {labels[i]}
                    </SvgText>
                  ) : null}
                </React.Fragment>
              );
            })}
          </Svg>
        )}

        {/* No Data Text */}
        {dataMax === 0 || (dataMax === 1 && values.every((v) => v === 0)) ? (
          <View
            style={[
              styles.noDataContainer,
              {
                width: chartDrawingWidth,
                height: GRAPH_HEIGHT,
                left: Y_AXIS_WIDTH, // Adjusted for inner view
              },
            ]}
          >
            <Text
              style={[
                styles.noDataText,
                { color: Colors.text.light, fontFamily: "Outfit_400Regular" },
              ]}
            >
              No data
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: RADIUS.xl,
    padding: SPACING.p4,
    marginVertical: SPACING.p2,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    marginBottom: SPACING.sm,
    width: "100%",
  },
  chartTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontFamily: "Outfit_600SemiBold",
  },
  selectedData: {
    fontSize: TYPOGRAPHY.size.sm,
  },
  noDataContainer: {
    position: "absolute",
    top: 40,
    left: 16,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  noDataText: {
    fontSize: TYPOGRAPHY.size.md,
  },
});

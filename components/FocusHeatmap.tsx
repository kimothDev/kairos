import { RADIUS, SPACING, TYPOGRAPHY } from "@/constants/layout";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Session } from "@/types";
import { getHeatmapData } from "@/utils/performanceUtils";
import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Rect, Text as SvgText } from "react-native-svg";

interface FocusHeatmapProps {
  sessions: Session[];
  daysCount?: number; // Default ~1 year
}

const SQUARE_SIZE = 12;
const GAP_SIZE = SPACING.xs;
const DAYS_IN_WEEK = 7;
const LABEL_WIDTH = 30; // Width for day labels
const MONTH_LABEL_HEIGHT = 20;

export default function FocusHeatmap({
  sessions,
  daysCount = 365,
}: FocusHeatmapProps) {
  const colors = useThemeColor();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(null);
  const scrollViewRef = React.useRef<ScrollView>(null);

  React.useEffect(() => {
    // Auto-scroll to the end (today) after render
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: false });
    }, 100);
  }, []);

  // Process data for the heatmap
  const { data, maxMinutes } = useMemo(
    () => getHeatmapData(sessions, daysCount),
    [sessions, daysCount],
  );

  // Determine color intensity
  const getCellVisuals = (minutes: number, cellDate: string) => {
    // Base Calculation (Standard View)
    // Use border color or a light/dark adjusted opacity for empty cells
    let fill = colors.border;
    let opacity = 1;

    if (minutes > 0) {
      fill = colors.primary;
      const intensity = maxMinutes > 0 ? minutes / maxMinutes : 0;
      // GitHub-like shades via opacity
      if (intensity < 0.25) opacity = 0.4;
      else if (intensity < 0.5) opacity = 0.6;
      else if (intensity < 0.75) opacity = 0.8;
      else opacity = 1.0;
    }

    // Interaction Logic (Focus Mode)
    if (selectedDate) {
      if (cellDate === selectedDate) {
        // SELECTED: Boost brightness by ~50% (capped at 1.0)
        if (minutes > 0) {
          opacity = Math.min(1.0, opacity * 1.5);
        } else {
          // If selecting an empty cell, darken/lighten slightly
          // For dynamic themes, maybe just change opacity of border color or use secondary
          fill = colors.text.light;
        }
      } else {
        // NOT SELECTED:
        if (minutes > 0) {
          // Dim other colored cells but preserve relative brightness
          opacity = opacity * 0.5;
        }
        // Empty cells: "Keep as it is like grey", do not change
      }
    }

    return { fill, opacity };
  };

  // Generate grid cells and month labels
  const { gridCells, monthLabels, totalWidth } = useMemo(() => {
    const cells = [];
    const labels = [];

    // Calculate start date
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysCount + 1);

    // Keep track of visited months to avoid duplicate labels close together
    let lastMonth = -1;

    for (let i = 0; i < daysCount; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dateKey = currentDate.toISOString().split("T")[0];
      const minutes = data[dateKey] || 0;

      // Grid Position
      const colIndex = Math.floor(i / DAYS_IN_WEEK);
      let dayRow = currentDate.getDay() - 1; // 0=Mon, 6=Sun
      if (dayRow === -1) dayRow = 6;

      const x = colIndex * (SQUARE_SIZE + GAP_SIZE);
      const y = dayRow * (SQUARE_SIZE + GAP_SIZE) + MONTH_LABEL_HEIGHT;

      cells.push({
        date: dateKey,
        minutes,
        x,
        y,
      });

      // Month Labels (Show on first week of month)
      // Only if it's the first row (Monday) or close to it, to align with column top
      if (dayRow === 0) {
        const currentMonth = currentDate.getMonth();
        if (currentMonth !== lastMonth) {
          const monthName = currentDate.toLocaleDateString(undefined, {
            month: "short",
          });
          // We render text at x = column start
          labels.push({
            text: monthName,
            x: x,
            y: MONTH_LABEL_HEIGHT - 6, // Slightly above grid
          });
          lastMonth = currentMonth;
        }
      }
    }

    // Total width is based on number of weeks
    const weeksCount = Math.ceil(daysCount / DAYS_IN_WEEK);
    const width = weeksCount * (SQUARE_SIZE + GAP_SIZE);

    return { gridCells: cells, monthLabels: labels, totalWidth: width };
  }, [data, daysCount]);

  const totalHeight = 7 * (SQUARE_SIZE + GAP_SIZE) + MONTH_LABEL_HEIGHT;

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.text.primary }]}>
          Consistency
        </Text>
        {selectedDate && (
          <Text style={[styles.stats, { color: colors.text.secondary }]}>
            {new Date(selectedDate).toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
            :{" "}
            <Text style={{ color: colors.primary }}>
              {selectedMinutes
                ? selectedMinutes >= 60
                  ? `${(selectedMinutes / 60).toFixed(1)} hrs`
                  : `${Math.round(selectedMinutes)} min`
                : "0 min"}
            </Text>
          </Text>
        )}
      </View>

      <View style={styles.chartLayout}>
        {/* Fixed Left Column: Day Labels */}
        <View style={styles.dayLabelsColumn}>
          <Text
            style={[
              styles.dayLabel,
              { top: MONTH_LABEL_HEIGHT + 0, color: colors.text.secondary },
            ]}
          >
            Mon
          </Text>
          <Text
            style={[
              styles.dayLabel,
              {
                top: MONTH_LABEL_HEIGHT + 2 * (SQUARE_SIZE + GAP_SIZE),
                color: colors.text.secondary,
              },
            ]}
          >
            Wed
          </Text>
          <Text
            style={[
              styles.dayLabel,
              {
                top: MONTH_LABEL_HEIGHT + 4 * (SQUARE_SIZE + GAP_SIZE),
                color: colors.text.secondary,
              },
            ]}
          >
            Fri
          </Text>
        </View>

        {/* Scrollable Heatmap */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{}}
        >
          <Svg width={totalWidth} height={totalHeight}>
            {/* Month Labels */}
            {monthLabels.map((l, i) => (
              <SvgText
                key={`m-${i}`}
                x={l.x}
                y={l.y}
                fontSize={TYPOGRAPHY.size.xs}
                fontFamily="Outfit_600SemiBold"
                fill={colors.text.secondary}
              >
                {l.text}
              </SvgText>
            ))}

            {/* Grid */}
            {gridCells.map((cell) => {
              const visuals = getCellVisuals(cell.minutes, cell.date);
              // Removed selection stroke logic as requested

              return (
                <Rect
                  key={cell.date}
                  x={cell.x}
                  y={cell.y}
                  width={SQUARE_SIZE}
                  height={SQUARE_SIZE}
                  rx={2}
                  fill={visuals.fill}
                  fillOpacity={visuals.opacity}
                  onPressIn={() => {
                    if (selectedDate === cell.date) {
                      setSelectedDate(null);
                      setSelectedMinutes(null);
                    } else {
                      setSelectedDate(cell.date);
                      setSelectedMinutes(cell.minutes);
                    }
                  }}
                />
              );
            })}
          </Svg>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING.p4,
    borderRadius: RADIUS.xl,
    margin: SPACING.p4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: TYPOGRAPHY.size.lg,
    fontFamily: "Outfit_700Bold",
  },
  stats: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: "Outfit_600SemiBold",
  },
  chartLayout: {
    flexDirection: "row",
  },
  dayLabelsColumn: {
    width: LABEL_WIDTH,
    height: "100%",
    position: "relative",
  },
  dayLabel: {
    position: "absolute",
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: "Outfit_400Regular",
    lineHeight: SQUARE_SIZE,
    width: "100%",
  },
});

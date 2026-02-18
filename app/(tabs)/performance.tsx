/**
 * Performance Screen
 *
 * Provides detailed analytics and AI-driven insights into focus habits,
 * including trends, metrics comparison, and optimal focus duration discovery.
 */
import AdaptiveBarChart from "@/components/AdaptiveBarChart";
import { RADIUS, SPACING, TYPOGRAPHY } from "@/constants/layout";
// import FocusHeatmap from "@/components/FocusHeatmap"; // Preserved for future use
import Colors, { lightColors } from "@/constants/colors";
import { useThemeColor } from "@/hooks/useThemeColor";
import useTimerStore from "@/store/timerStore";
import { generateInsights } from "@/utils/insightEngine";
import {
  calculatePeriodDelta,
  calculatePeriodMetrics,
  formatMinutes,
  getAdaptiveChartData,
  getPeriodDates,
} from "@/utils/performanceUtils";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TimeRanges = ["day", "week", "month", "year"] as const;
type TimeRange = (typeof TimeRanges)[number];

// Utility to display trend icons
const MetricItemWithDelta = ({
  icon,
  value,
  label,
  delta,
  colors,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  delta: { percentage: number; trend: "up" | "down" | "neutral" };
  colors: typeof lightColors;
}) => {
  const getTrendColor = () => {
    if (delta.trend === "up") return colors.success;
    if (delta.trend === "down") return colors.error;
    return colors.text.secondary;
  };

  const getTrendIcon = () => {
    if (delta.trend === "up")
      return <ArrowUpRight size={12} color={colors.success} />;
    if (delta.trend === "down")
      return <ArrowDownRight size={12} color={colors.error} />;
    return <ArrowRight size={12} color={colors.text.secondary} />;
  };

  return (
    <View style={styles.metricItem}>
      {icon}
      <Text style={[styles.metricValue, { color: colors.text.primary }]}>
        {value}
      </Text>
      <Text style={[styles.metricLabel, { color: colors.text.secondary }]}>
        {label}
      </Text>

      <View style={styles.deltaContainer}>
        {getTrendIcon()}
        <Text style={[styles.deltaText, { color: getTrendColor() }]}>
          {Math.abs(delta.percentage) === 999
            ? ">999"
            : Math.abs(delta.percentage)}
          %
        </Text>
      </View>
    </View>
  );
};

export default function PerformanceScreen() {
  const activeColors = useThemeColor();
  const insets = useSafeAreaInsets();

  const { sessions, isLoading } = useTimerStore();
  const [timeRange, setTimeRange] = useState<TimeRange>("week");
  const [offset, setOffset] = useState(0);

  // -- Derived Data --

  // 1. Chart Data
  const chartData = useMemo(() => {
    return getAdaptiveChartData(sessions, timeRange, offset);
  }, [sessions, timeRange, offset]);

  // 2. Metrics
  const metrics = useMemo(() => {
    // Current period metrics
    const { startDate, endDate } = getPeriodDates(timeRange, offset);
    const filteredSessions = sessions.filter((s) => {
      const d = new Date(s.createdAt || s.date);
      return d >= startDate && d <= endDate;
    });

    const currentMetrics = calculatePeriodMetrics(filteredSessions);

    // Previous period metrics
    const { startDate: prevStart, endDate: prevEnd } = getPeriodDates(
      timeRange,
      offset + 1,
    );
    const prevSessions = sessions.filter((s) => {
      const d = new Date(s.createdAt || s.date);
      return d >= prevStart && d <= prevEnd;
    });
    const prevMetrics = calculatePeriodMetrics(prevSessions);

    const focusDelta = calculatePeriodDelta(
      currentMetrics.totalFocusTime,
      prevMetrics.totalFocusTime,
    );
    const sessionsDelta = calculatePeriodDelta(
      currentMetrics.sessionCount,
      prevMetrics.sessionCount,
    );
    const completionDelta = calculatePeriodDelta(
      currentMetrics.completionRate,
      prevMetrics.completionRate,
    );

    return {
      ...currentMetrics,
      deltas: {
        focus: focusDelta,
        sessions: sessionsDelta,
        completion: completionDelta,
      },
    };
  }, [sessions, timeRange, offset]);

  // 3. AI Insights
  const insights = useMemo(() => {
    return generateInsights(sessions);
  }, [sessions]);

  // Handlers
  const handleRangeChange = (range: TimeRange) => {
    setTimeRange(range);
    setOffset(0);
  };
  const handleNextPeriod = () => {
    if (offset > 0) setOffset(offset - 1);
  };
  const handlePrevPeriod = () => {
    setOffset(offset + 1);
  };

  if (isLoading) {
    return (
      <View
        style={[styles.container, { backgroundColor: activeColors.background }]}
      >
        <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
          <ActivityIndicator size="large" color={activeColors.primary} />
          <Text
            style={[styles.loadingText, { color: activeColors.text.secondary }]}
          >
            Loading performance data...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: activeColors.background }]}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 70 }}>
        {/* Header & Controls */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: activeColors.background,
              paddingTop: insets.top + 20,
            },
          ]}
        >
          <Text style={[styles.title, { color: activeColors.text.primary }]}>
            Overview
          </Text>

          {/* Time Range Selector */}
          <View
            style={[
              styles.timeRangeSelector,
              { backgroundColor: activeColors.card },
            ]}
          >
            {TimeRanges.map((range) => (
              <TouchableOpacity
                key={range}
                style={[
                  styles.timeRangeButton,
                  timeRange === range && {
                    backgroundColor: activeColors.primary,
                  },
                ]}
                onPress={() => handleRangeChange(range)}
              >
                <Text
                  style={[
                    styles.timeRangeText,
                    { color: activeColors.text.secondary },
                    timeRange === range && {
                      color: activeColors.card,
                      fontFamily: "Outfit_700Bold",
                    },
                  ]}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Date Navigation */}
        <View style={styles.dateNavRow}>
          <TouchableOpacity onPress={handlePrevPeriod} style={styles.navButton}>
            <ChevronLeft size={24} color={activeColors.text.primary} />
          </TouchableOpacity>
          <Text
            style={[styles.dateRangeText, { color: activeColors.text.primary }]}
          >
            {chartData.dateRange}
          </Text>
          <TouchableOpacity
            onPress={handleNextPeriod}
            style={[styles.navButton, offset === 0 && styles.disabledNav]}
            disabled={offset === 0}
          >
            <ChevronRight
              size={24}
              color={
                offset === 0 ? activeColors.inactive : activeColors.text.primary
              }
            />
          </TouchableOpacity>
        </View>

        {/* --- Main Chart --- */}
        <View style={{ marginHorizontal: 16 }}>
          <AdaptiveBarChart data={chartData} />
        </View>

        {/* --- Summary Metrics --- */}
        <View
          style={[styles.summaryCard, { backgroundColor: activeColors.card }]}
        >
          <View style={styles.summaryHeader}>
            <View>
              <Text
                style={[
                  styles.summaryTitle,
                  { color: activeColors.text.primary },
                ]}
              >
                Statistics
              </Text>
              <Text
                style={[
                  styles.summarySubtitle,
                  { color: activeColors.text.secondary, marginTop: 4 },
                ]}
              >
                vs{" "}
                {timeRange === "day"
                  ? "Yesterday"
                  : timeRange === "week"
                    ? "Last Week"
                    : timeRange === "month"
                      ? "Last Month"
                      : "Last Year"}
              </Text>
            </View>
          </View>

          <View style={styles.metricsRow}>
            <MetricItemWithDelta
              icon={<Clock size={20} color={activeColors.primary} />}
              value={formatMinutes(metrics.totalFocusTime)}
              label="Focus Time"
              delta={metrics.deltas.focus}
              colors={activeColors}
            />
            <MetricItemWithDelta
              icon={<Calendar size={20} color={activeColors.primary} />}
              value={metrics.sessionCount}
              label="Sessions"
              delta={metrics.deltas.sessions}
              colors={activeColors}
            />
            <MetricItemWithDelta
              icon={<Target size={20} color={activeColors.primary} />}
              value={`${Math.round(metrics.completionRate)}%`}
              label="Completion"
              delta={metrics.deltas.completion}
              colors={activeColors}
            />
          </View>
        </View>

        {/* --- Insights --- */}
        <View
          style={[styles.insightsCard, { backgroundColor: activeColors.card }]}
        >
          <Text
            style={[styles.insightsTitle, { color: activeColors.text.primary }]}
          >
            Performance Insights
          </Text>

          {/* Coming Soon State */}
          <View style={styles.comingSoonContainer}>
            <View
              style={[
                styles.comingSoonIcon,
                { backgroundColor: activeColors.primary + "1A" },
              ]}
            >
              <Sparkles size={32} color={activeColors.primary} />
            </View>
            <Text
              style={[
                styles.comingSoonText,
                { color: activeColors.text.primary },
              ]}
            >
              Coming Soon
            </Text>
            <Text
              style={[
                styles.comingSoonSubtext,
                { color: activeColors.text.secondary },
              ]}
            >
              Stay tuned! We're building advanced analytics to help you master
              your focus habits in a future update.
            </Text>
          </View>

          {/* Preserved Insights Code - Set to false to hide while keeping code intact */}
          {/* @ts-ignore */}
          {false && (
            <>
              {/* Energy Correlation */}
              <View style={styles.insightItem}>
                <View
                  style={[
                    styles.insightIconContainer,
                    { backgroundColor: activeColors.warning },
                  ]}
                >
                  <Sparkles size={20} color={activeColors.card} />
                </View>
                <View style={styles.insightContent}>
                  <Text
                    style={[
                      styles.insightLabel,
                      { color: activeColors.text.secondary },
                    ]}
                  >
                    Mood Impact
                  </Text>
                  <Text
                    style={[
                      styles.insightValue,
                      { color: activeColors.text.primary },
                    ]}
                  >
                    {insights.energyCorrelation.isSignificant
                      ? `${insights.energyCorrelation.bestTask ? `For ${insights.energyCorrelation.bestTask}, intense` : "Intense"} sessions are ${insights.energyCorrelation.diffPercent}% longer`
                      : "Mood hasn't significantly impacted duration yet."}
                  </Text>
                </View>
              </View>

              {/* Time of Day */}
              <View style={styles.insightItem}>
                <View
                  style={[
                    styles.insightIconContainer,
                    { backgroundColor: activeColors.primary },
                  ]}
                >
                  <Zap size={20} color={activeColors.card} />
                </View>
                <View style={styles.insightContent}>
                  <Text
                    style={[
                      styles.insightLabel,
                      { color: activeColors.text.secondary },
                    ]}
                  >
                    Peak Performance
                  </Text>
                  <Text
                    style={[
                      styles.insightValue,
                      { color: activeColors.text.primary },
                    ]}
                  >
                    {insights.timeOfDay.bestPeriod !== "N/A"
                      ? `You focus best in the ${insights.timeOfDay.bestPeriod}`
                      : "Keep focusing to find your peak time."}
                  </Text>
                </View>
              </View>

              {/* Streak */}
              <View style={styles.insightItem}>
                <View
                  style={[
                    styles.insightIconContainer,
                    { backgroundColor: activeColors.error },
                  ]}
                >
                  <Flame size={20} color={activeColors.card} />
                </View>
                <View style={styles.insightContent}>
                  <Text
                    style={[
                      styles.insightLabel,
                      { color: activeColors.text.secondary },
                    ]}
                  >
                    Consistency Streak
                  </Text>
                  <Text
                    style={[
                      styles.insightValue,
                      { color: activeColors.text.primary },
                    ]}
                  >
                    {insights.streak.current > 1
                      ? `${insights.streak.current} day streak! (Best: ${insights.streak.best})`
                      : insights.streak.best > 1
                        ? `Best streak: ${insights.streak.best} days. Start a new one!`
                        : "Focus today to start a streak!"}
                  </Text>
                </View>
              </View>

              {/* Duration Optimization */}
              <View style={styles.insightItem}>
                <View
                  style={[
                    styles.insightIconContainer,
                    { backgroundColor: activeColors.success },
                  ]}
                >
                  <Target size={20} color={activeColors.card} />
                </View>
                <View style={styles.insightContent}>
                  <Text
                    style={[
                      styles.insightLabel,
                      { color: activeColors.text.secondary },
                    ]}
                  >
                    Duration Optimization
                  </Text>
                  <Text
                    style={[
                      styles.insightValue,
                      { color: activeColors.text.primary },
                    ]}
                  >
                    {insights.durationOptimization.isSignificant
                      ? `For ${insights.durationOptimization.taskType}, your sweet spot is ${insights.durationOptimization.bestDuration} min (${insights.durationOptimization.completionRate}% completion)`
                      : "Collect more data to find your optimal session length."}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* empty state */}
        {chartData.values.every((v) => v === 0) && (
          <View
            style={[styles.emptyState, { backgroundColor: activeColors.card }]}
          >
            <TrendingUp size={50} color={activeColors.inactive} />
            <Text
              style={[
                styles.emptyStateTitle,
                { color: activeColors.text.primary },
              ]}
            >
              No data available
            </Text>
            <Text
              style={[
                styles.emptyStateText,
                { color: activeColors.text.secondary },
              ]}
            >
              Complete focus sessions to see your performance analytics
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: SPACING.sm,
    fontSize: TYPOGRAPHY.size.lg,
    fontFamily: "Outfit_400Regular",
    color: Colors.text.secondary,
  },
  header: {
    paddingHorizontal: SPACING.p5,
    paddingTop: SPACING.p5,
    paddingBottom: SPACING.p2,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: TYPOGRAPHY.size.title,
    fontFamily: "Outfit_700Bold",
    color: Colors.text.primary,
    marginBottom: SPACING.lg,
  },
  timeRangeSelector: {
    flexDirection: "row",
    backgroundColor: Colors.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.xs,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: "center",
    borderRadius: RADIUS.md,
  },
  timeRangeText: {
    fontSize: TYPOGRAPHY.size.md,
    fontFamily: "Outfit_600SemiBold",
    color: Colors.text.secondary,
  },
  dateNavRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.p5,
    marginBottom: SPACING.p2,
  },
  dateRangeText: {
    fontSize: TYPOGRAPHY.size.lg,
    fontFamily: "Outfit_600SemiBold",
    color: Colors.text.primary,
  },
  navButton: {
    padding: SPACING.sm,
  },
  disabledNav: {
    opacity: 0.3,
  },
  summaryCard: {
    backgroundColor: Colors.card,
    borderRadius: RADIUS.xl,
    margin: SPACING.p4,
    padding: SPACING.p4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  summaryTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontFamily: "Outfit_700Bold",
    color: Colors.text.primary,
  },
  summarySubtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: "Outfit_400Regular",
    color: Colors.text.secondary,
  },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metricItem: {
    alignItems: "center",
    flex: 1,
  },
  metricValue: {
    fontSize: TYPOGRAPHY.size.xl,
    fontFamily: "Outfit_700Bold",
    color: Colors.text.primary,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  metricLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: "Outfit_400Regular",
    color: Colors.text.secondary,
  },
  deltaContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: SPACING.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.md,
    backgroundColor: "rgba(128, 128, 128, 0.05)",
  },
  deltaText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontFamily: "Outfit_700Bold",
    marginLeft: 2,
  },
  insightsCard: {
    backgroundColor: Colors.card,
    borderRadius: RADIUS.xl,
    margin: SPACING.p4,
    marginTop: 0,
    padding: SPACING.p4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  insightsTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontFamily: "Outfit_700Bold",
    color: Colors.text.primary,
    marginBottom: SPACING.lg,
  },
  insightItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  insightIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    color: Colors.text.secondary,
    marginBottom: 2,
  },
  insightValue: {
    fontSize: TYPOGRAPHY.size.md,
    fontFamily: "Outfit_600SemiBold",
    color: Colors.text.primary,
    lineHeight: 20,
  },
  comingSoonContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.xl,
  },
  comingSoonIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.md,
  },
  comingSoonText: {
    fontSize: TYPOGRAPHY.size.xl,
    fontFamily: "Outfit_700Bold",
    marginBottom: SPACING.xs,
  },
  comingSoonSubtext: {
    fontSize: TYPOGRAPHY.size.md,
    fontFamily: "Outfit_400Regular",
    textAlign: "center",
    paddingHorizontal: SPACING.lg,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    backgroundColor: Colors.card,
    borderRadius: RADIUS.xl,
    margin: SPACING.lg,
    marginTop: 0,
  },
  emptyStateTitle: {
    fontSize: TYPOGRAPHY.size.xl,
    fontFamily: "Outfit_700Bold",
    color: Colors.text.primary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  emptyStateText: {
    fontSize: TYPOGRAPHY.size.md,
    fontFamily: "Outfit_400Regular",
    color: Colors.text.secondary,
    textAlign: "center",
  },
});

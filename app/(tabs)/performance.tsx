import FocusHeatmap from "@/components/FocusHeatmap";
import { useThemeColor } from "@/hooks/useThemeColor";
import useTimerStore from "@/store/timerStore";
import { TimeRange } from "@/types";
import {
  calculatePeriodDelta,
  calculatePeriodMetrics,
  filterSessionsInDateRange,
  findBestEnergyLevel,
  findMostProductiveTask,
  formatMinutes,
  getPeriodDates,
} from "@/utils/performanceUtils";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Award,
  Battery,
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  Calendar,
  Clock,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const MetricItemWithDelta = ({
  icon,
  value,
  label,
  delta,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  delta: { percentage: number; trend: "up" | "down" | "neutral" };
}) => {
  const colors = useThemeColor();

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
          {Math.abs(delta.percentage)}%
        </Text>
      </View>
    </View>
  );
};

export default function PerformanceScreen() {
  const colors = useThemeColor();
  const { sessions, isLoading } = useTimerStore();
  const [timeRange, setTimeRange] = useState<TimeRange>("week");

  //utility to map energy level to battery icon and color
  const getEnergyLevelProps = (level: string) => {
    switch (level) {
      case "high":
        return {
          color: colors.success,
          icon: <BatteryFull size={20} color={colors.card} />,
          label: "High energy",
        };
      case "mid":
        return {
          color: colors.warning,
          icon: <BatteryMedium size={20} color={colors.card} />,
          label: "Mid energy",
        };
      case "low":
        return {
          color: colors.error,
          icon: <BatteryLow size={20} color={colors.card} />,
          label: "Low energy",
        };
      default:
        return {
          color: colors.inactive,
          icon: <Battery size={20} color={colors.card} />,
          label: "Not enough data",
        };
    }
  };

  // Get filtered sessions based on time range (calendar based)
  const filteredSessions = useMemo(() => {
    const { startDate, endDate } = getPeriodDates(timeRange, 0); // Current period
    return filterSessionsInDateRange(sessions, startDate, endDate);
  }, [sessions, timeRange]);

  //calculate performance metrics
  const metrics = useMemo(() => {
    // Current period metrics
    const currentMetrics = calculatePeriodMetrics(filteredSessions);

    // Previous period metrics
    const { startDate: prevStart, endDate: prevEnd } = getPeriodDates(
      timeRange,
      1,
    );
    const prevSessions = filterSessionsInDateRange(
      sessions,
      prevStart,
      prevEnd,
    );
    const prevMetrics = calculatePeriodMetrics(prevSessions);

    // Calculate deltas
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

    // Other existing metrics...
    const mostProductiveTask = findMostProductiveTask(filteredSessions);
    const bestEnergyLevel = findBestEnergyLevel(filteredSessions);

    // --- IMPROVED: Smart Recommendation Acceptance Rate ---
    //only count focus sessions (not breaks), with a valid recommendedDuration, and user made a choice
    const recommendationSessions = filteredSessions.filter(
      (s) =>
        s.recommendedDuration &&
        s.recommendedDuration > 0 &&
        !s.taskType.endsWith("-break") &&
        s.userSelectedDuration > 0, // user made a choice
    );
    const acceptedRecommendations = recommendationSessions.filter(
      (s) =>
        s.acceptedRecommendation &&
        s.userSelectedDuration === s.recommendedDuration,
    ).length;
    const recommendationAcceptanceRate =
      recommendationSessions.length > 0
        ? (acceptedRecommendations / recommendationSessions.length) * 100
        : 0;

    return {
      ...currentMetrics,
      avgSessionLength:
        currentMetrics.sessionCount > 0
          ? currentMetrics.totalFocusTime / currentMetrics.sessionCount
          : 0,
      mostProductiveTask,
      bestEnergyLevel,
      recommendationAcceptanceRate,
      deltas: {
        focus: focusDelta,
        sessions: sessionsDelta,
        completion: completionDelta,
      },
    };
  }, [filteredSessions, sessions, timeRange]);

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
            Loading performance data...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        <View style={[styles.header, { backgroundColor: colors.card }]}>
          <Text style={[styles.title, { color: colors.text.primary }]}>
            Performance Analytics
          </Text>

          <View
            style={[
              styles.timeRangeSelector,
              { backgroundColor: colors.background },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.timeRangeButton,
                timeRange === "week" && { backgroundColor: colors.primary },
              ]}
              onPress={() => setTimeRange("week")}
            >
              <Text
                style={[
                  styles.timeRangeText,
                  { color: colors.text.secondary },
                  timeRange === "week" && {
                    color: colors.card,
                    fontWeight: "600",
                  },
                ]}
              >
                Week
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.timeRangeButton,
                timeRange === "month" && { backgroundColor: colors.primary },
              ]}
              onPress={() => setTimeRange("month")}
            >
              <Text
                style={[
                  styles.timeRangeText,
                  { color: colors.text.secondary },
                  timeRange === "month" && {
                    color: colors.card,
                    fontWeight: "600",
                  },
                ]}
              >
                Month
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.timeRangeButton,
                timeRange === "year" && { backgroundColor: colors.primary },
              ]}
              onPress={() => setTimeRange("year")}
            >
              <Text
                style={[
                  styles.timeRangeText,
                  { color: colors.text.secondary },
                  timeRange === "year" && {
                    color: colors.card,
                    fontWeight: "600",
                  },
                ]}
              >
                Year
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* summary card */}
        <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
          <View style={styles.summaryHeader}>
            <Text style={[styles.summaryTitle, { color: colors.text.primary }]}>
              Focus Summary
            </Text>
            <Text
              style={[styles.summarySubtitle, { color: colors.text.secondary }]}
            >
              vs previous period
            </Text>
          </View>

          <View style={styles.metricsRow}>
            <MetricItemWithDelta
              icon={<Clock size={20} color={colors.primary} />}
              value={formatMinutes(metrics.totalFocusTime)}
              label="Total Focus"
              delta={metrics.deltas.focus}
            />
            <MetricItemWithDelta
              icon={<Calendar size={20} color={colors.primary} />}
              value={metrics.sessionCount}
              label="Sessions"
              delta={metrics.deltas.sessions}
            />
            <MetricItemWithDelta
              icon={<Target size={20} color={colors.primary} />}
              value={`${Math.round(metrics.completionRate)}%`}
              label="Completion"
              delta={metrics.deltas.completion}
            />
          </View>
        </View>

        {/* heatmap visualization */}
        <FocusHeatmap sessions={sessions} />

        {/* insights */}
        <View style={[styles.insightsCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.insightsTitle, { color: colors.text.primary }]}>
            Performance Insights
          </Text>
          {/* most productive task */}
          <View style={styles.insightItem}>
            <View
              style={[
                styles.insightIconContainer,
                { backgroundColor: colors.primary },
              ]}
            >
              <Award size={20} color={"#FFFFFF"} />
            </View>
            <View style={styles.insightContent}>
              <Text
                style={[styles.insightLabel, { color: colors.text.secondary }]}
              >
                Most Productive Task
              </Text>
              <Text
                style={[styles.insightValue, { color: colors.text.primary }]}
              >
                {metrics.mostProductiveTask}
              </Text>
            </View>
          </View>
          {/* typical energy level */}
          {(() => {
            const { color, icon, label } = getEnergyLevelProps(
              metrics.bestEnergyLevel,
            );
            return (
              <View style={[styles.insightItem]}>
                <View
                  style={[
                    styles.insightIconContainer,
                    { backgroundColor: color },
                  ]}
                >
                  {icon}
                </View>
                <View style={styles.insightContent}>
                  <Text
                    style={[
                      styles.insightLabel,
                      { color: colors.text.secondary },
                    ]}
                  >
                    Typical Energy Level
                  </Text>
                  <Text
                    style={[
                      styles.insightValue,
                      { color: colors.text.primary },
                    ]}
                  >
                    {label}
                  </Text>
                </View>
              </View>
            );
          })()}
          {/* average session length */}
          <View style={styles.insightItem}>
            <View
              style={[
                styles.insightIconContainer,
                { backgroundColor: colors.warning },
              ]}
            >
              <Clock size={20} color={colors.card} />
            </View>
            <View style={styles.insightContent}>
              <Text
                style={[styles.insightLabel, { color: colors.text.secondary }]}
              >
                Average Session Length
              </Text>
              <Text
                style={[styles.insightValue, { color: colors.text.primary }]}
              >
                {metrics.avgSessionLength > 0
                  ? formatMinutes(Math.round(metrics.avgSessionLength))
                  : "Not enough data"}
              </Text>
            </View>
          </View>
          {/* smart recommendations */}
          <View style={styles.insightItem}>
            <View
              style={[
                styles.insightIconContainer,
                { backgroundColor: colors.success },
              ]}
            >
              <Zap size={20} color={colors.card} />
            </View>
            <View style={styles.insightContent}>
              <Text
                style={[styles.insightLabel, { color: colors.text.secondary }]}
              >
                Smart Recommendations
              </Text>
              <Text
                style={[styles.insightValue, { color: colors.text.primary }]}
              >
                {metrics.recommendationAcceptanceRate > 0
                  ? `${Math.round(metrics.recommendationAcceptanceRate)}% accepted`
                  : "Not enough data"}
              </Text>
            </View>
          </View>
        </View>

        {/* empty state for no data */}
        {filteredSessions.length === 0 && (
          <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
            <TrendingUp size={50} color={colors.inactive} />
            <Text
              style={[styles.emptyStateTitle, { color: colors.text.primary }]}
            >
              No data available
            </Text>
            <Text
              style={[styles.emptyStateText, { color: colors.text.secondary }]}
            >
              Complete focus sessions to see your performance analytics
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 15,
  },
  timeRangeSelector: {
    flexDirection: "row",
    borderRadius: 20,
    padding: 4,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 16,
  },
  timeRangeText: {
    fontSize: 14,
  },
  summaryCard: {
    borderRadius: 16,
    margin: 16,
    padding: 16,
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
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(46, 204, 113, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trendText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
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
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 8,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
  },
  chartCard: {
    borderRadius: 16,
    margin: 16,
    marginTop: 0,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
  chartContainer: {
    flexDirection: "row",
    height: 200,
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingTop: 20,
  },
  chartColumn: {
    flex: 1,
    alignItems: "center",
  },
  barContainer: {
    height: 150,
    width: 20,
    borderRadius: 10,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  bar: {
    width: "100%",
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  barLabel: {
    fontSize: 12,
    marginTop: 8,
  },
  barValue: {
    fontSize: 10,
    marginTop: 2,
  },
  insightsCard: {
    borderRadius: 16,
    margin: 16,
    marginTop: 0,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  insightsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
  insightItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  insightIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  insightContent: {
    flex: 1,
  },
  insightLabel: {
    fontSize: 14,
    marginBottom: 2,
  },
  insightValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    borderRadius: 16,
    margin: 16,
    marginTop: 0,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: "center",
  },
  deltaContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: "rgba(128, 128, 128, 0.05)",
  },
  deltaText: {
    fontSize: 10,
    fontWeight: "700",
    marginLeft: 2,
  },
  summarySubtitle: {
    fontSize: 12,
  },
});

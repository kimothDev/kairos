/**
 * History Screen
 *
 * Displays a list of past focus sessions, allowing users to filter by
 * timeframe, task type, and energy level.
 */
import HistoryFilterModal from "@/components/HistoryFilterModal";
import SessionHistoryItem from "@/components/SessionHistoryItem";
import Colors from "@/constants/colors";
import { RADIUS, SPACING, TYPOGRAPHY } from "@/constants/layout";
import { DEFAULT_TASKS } from "@/constants/timer";
import { useThemeColor } from "@/hooks/useThemeColor";
import useTimerStore from "@/store/timerStore";
import { Filter, History } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type FilterPeriod = "day" | "week" | "month" | "year";

export default function HistoryScreen() {
  const activeColors = useThemeColor();
  const insets = useSafeAreaInsets();

  const { sessions, isLoading, loadSessions, previousTasks } = useTimerStore();
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>("week");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedTaskTypes, setSelectedTaskTypes] = useState<string[]>([]);
  const [selectedEnergyLevels, setSelectedEnergyLevels] = useState<string[]>(
    [],
  );

  // Calculate available task types from history + defaults
  const availableTaskTypes = useMemo(() => {
    const historicalTasks = Array.from(
      new Set(sessions.map((s) => s.taskType)),
    );
    return Array.from(
      new Set([...DEFAULT_TASKS, ...historicalTasks, ...previousTasks]),
    ).sort();
  }, [sessions, previousTasks]);

  //refresh sessions when the screen is focused
  useEffect(() => {
    loadSessions();
  }, []);

  const filteredSessions = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    let filtered = sessions;

    if (filterPeriod === "day") {
      filtered = sessions.filter((s) => new Date(s.createdAt) >= todayStart);
    } else if (filterPeriod === "week") {
      const oneWeekAgo = new Date(now);
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      filtered = sessions.filter((s) => new Date(s.createdAt) >= oneWeekAgo);
    } else if (filterPeriod === "month") {
      const oneMonthAgo = new Date(now);
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      filtered = sessions.filter((s) => new Date(s.createdAt) >= oneMonthAgo);
    } else if (filterPeriod === "year") {
      const oneYearAgo = new Date(now);
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      filtered = sessions.filter((s) => new Date(s.createdAt) >= oneYearAgo);
    }

    if (selectedTaskTypes.length > 0) {
      filtered = filtered.filter((s) => selectedTaskTypes.includes(s.taskType));
    }

    if (selectedEnergyLevels.length > 0) {
      filtered = filtered.filter((s) =>
        selectedEnergyLevels.includes(s.energyLevel),
      );
    }

    // Sort Descending
    return filtered.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [sessions, filterPeriod, selectedTaskTypes, selectedEnergyLevels]);

  const handleApplyFilters = (taskTypes: string[], energyLevels: string[]) => {
    setSelectedTaskTypes(taskTypes);
    setSelectedEnergyLevels(energyLevels);
  };

  const renderItem = useCallback(
    ({ item }: { item: any }) => <SessionHistoryItem session={item} />,
    [],
  );

  return (
    <View
      style={[styles.container, { backgroundColor: activeColors.background }]}
    >
      <View
        style={[
          styles.headerContainer,
          {
            backgroundColor: activeColors.background,
            paddingTop: insets.top + 20,
          },
        ]}
      >
        <View style={styles.headerTop}>
          <Text style={[styles.title, { color: activeColors.text.primary }]}>
            Session History
          </Text>
          <TouchableOpacity onPress={() => setShowFilterModal(true)}>
            <Filter
              size={24}
              color={
                selectedTaskTypes.length > 0 || selectedEnergyLevels.length > 0
                  ? activeColors.primary
                  : activeColors.text.primary
              }
            />
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.timeRangeSelector,
            { backgroundColor: activeColors.card },
          ]}
        >
          {(["day", "week", "month", "year"] as FilterPeriod[]).map((p) => (
            <TouchableOpacity
              key={p}
              style={[
                styles.timeRangeButton,
                filterPeriod === p && { backgroundColor: activeColors.primary },
              ]}
              onPress={() => setFilterPeriod(p)}
            >
              <Text
                style={[
                  styles.timeRangeText,
                  { color: activeColors.text.secondary },
                  filterPeriod === p && {
                    color: activeColors.card,
                    fontFamily: "Outfit_700Bold",
                  },
                ]}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.historyContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={activeColors.primary} />
            <Text
              style={[
                styles.loadingText,
                { color: activeColors.text.secondary },
              ]}
            >
              Loading sessions...
            </Text>
          </View>
        ) : filteredSessions.length > 0 ? (
          <FlatList
            data={filteredSessions}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 70 }}
            showsVerticalScrollIndicator={false}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews={true}
          />
        ) : (
          <View
            style={[styles.emptyState, { backgroundColor: activeColors.card }]}
          >
            <History size={50} color={activeColors.inactive} />
            <Text
              style={[
                styles.emptyStateText,
                { color: activeColors.text.primary },
              ]}
            >
              No sessions found
            </Text>
            <Text
              style={[
                styles.emptyStateSubtext,
                { color: activeColors.text.secondary },
              ]}
            >
              Complete focus sessions to see your history here
            </Text>
          </View>
        )}
      </View>

      <HistoryFilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        availableTaskTypes={availableTaskTypes}
        selectedTaskTypes={selectedTaskTypes}
        selectedEnergyLevels={selectedEnergyLevels}
        onApply={handleApplyFilters}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerContainer: {
    paddingHorizontal: SPACING.p5,
    paddingBottom: SPACING.p5,
    backgroundColor: Colors.background,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: TYPOGRAPHY.size.title,
    fontFamily: "Outfit_700Bold",
    color: Colors.text.primary,
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
  historyContainer: {
    flex: 1,
    paddingHorizontal: SPACING.p5,
    paddingTop: SPACING.p2,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: SPACING.sm,
    fontSize: TYPOGRAPHY.size.lg,
    fontFamily: "Outfit_400Regular",
    color: Colors.text.secondary,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: SPACING.p15,
    paddingVertical: SPACING.p10,
    backgroundColor: Colors.card,
    borderRadius: RADIUS.lg,
  },
  emptyStateText: {
    fontSize: TYPOGRAPHY.size.xl,
    fontFamily: "Outfit_700Bold",
    color: Colors.text.primary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  emptyStateSubtext: {
    fontSize: TYPOGRAPHY.size.md,
    fontFamily: "Outfit_400Regular",
    color: Colors.text.secondary,
    textAlign: "center",
    paddingHorizontal: SPACING.p5,
  },
});

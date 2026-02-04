import HistoryFilterModal from "@/components/HistoryFilterModal";
import SessionHistoryItem from "@/components/SessionHistoryItem";
import Colors from "@/constants/colors";
import { DEFAULT_TASKS } from "@/constants/timer";
import { useThemeColor } from "@/hooks/useThemeColor";
import useTimerStore from "@/store/timerStore";
import { Filter, History } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type FilterPeriod = "day" | "week" | "month" | "year";

export default function HistoryScreen() {
  const activeColors = useThemeColor();

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

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: activeColors.background }]}
    >
      <View style={[styles.header, { backgroundColor: activeColors.card }]}>
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
          styles.header,
          { backgroundColor: activeColors.card, paddingTop: 0 },
        ]}
      >
        <View style={styles.filterContainer}>
          {(["day", "week", "month", "year"] as FilterPeriod[]).map((p) => (
            <TouchableOpacity
              key={p}
              style={[
                styles.filterButton,
                { backgroundColor: activeColors.background },
                filterPeriod === p && { backgroundColor: activeColors.primary },
              ]}
              onPress={() => setFilterPeriod(p)}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: activeColors.text.secondary },
                  filterPeriod === p && {
                    color: activeColors.card,
                    fontWeight: "600",
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
            renderItem={({ item }) => <SessionHistoryItem session={item} />}
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    backgroundColor: Colors.card,
    zIndex: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.text.primary,
  },
  filterContainer: {
    flexDirection: "row",
    marginBottom: 10,
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: Colors.background,
  },
  filterText: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  historyContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.text.secondary,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 60,
    paddingVertical: 40,
    backgroundColor: Colors.card,
    borderRadius: 12,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: "center",
    paddingHorizontal: 20,
  },
});

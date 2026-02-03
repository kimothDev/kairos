import SessionHistoryItem from "@/components/SessionHistoryItem";
import { useThemeColor } from "@/hooks/useThemeColor";
import useTimerStore from "@/store/timerStore";
import { Filter, History } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

type FilterPeriod = "all" | "today" | "week" | "month";

export default function HistoryScreen() {
  const colors = useThemeColor();
  const { sessions, isLoading, loadSessions } = useTimerStore();
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>("all");

  //refresh sessions when the screen is focused
  useEffect(() => {
    loadSessions();
  }, []);

  const getFilteredSessions = () => {
    const now = new Date();

    switch (filterPeriod) {
      case "today":
        const today = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        );
        return sessions.filter(
          (session) => new Date(session.createdAt) >= today,
        );

      case "week":
        const oneWeekAgo = new Date(now);
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        return sessions.filter(
          (session) => new Date(session.createdAt) >= oneWeekAgo,
        );

      case "month":
        const oneMonthAgo = new Date(now);
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        return sessions.filter(
          (session) => new Date(session.createdAt) >= oneMonthAgo,
        );

      default:
        return sessions;
    }
  };

  const filteredSessions = getFilteredSessions();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        <View style={[styles.header, { backgroundColor: colors.card }]}>
          <Text style={[styles.title, { color: colors.text.primary }]}>
            Session History
          </Text>

          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                { backgroundColor: colors.background },
                filterPeriod === "all" && { backgroundColor: colors.primary },
              ]}
              onPress={() => setFilterPeriod("all")}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: colors.text.secondary },
                  filterPeriod === "all" && {
                    color: "#FFFFFF",
                    fontWeight: "600",
                  },
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                { backgroundColor: colors.background },
                filterPeriod === "today" && { backgroundColor: colors.primary },
              ]}
              onPress={() => setFilterPeriod("today")}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: colors.text.secondary },
                  filterPeriod === "today" && {
                    color: "#FFFFFF",
                    fontWeight: "600",
                  },
                ]}
              >
                Today
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                { backgroundColor: colors.background },
                filterPeriod === "week" && { backgroundColor: colors.primary },
              ]}
              onPress={() => setFilterPeriod("week")}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: colors.text.secondary },
                  filterPeriod === "week" && {
                    color: "#FFFFFF",
                    fontWeight: "600",
                  },
                ]}
              >
                Week
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                { backgroundColor: colors.background },
                filterPeriod === "month" && { backgroundColor: colors.primary },
              ]}
              onPress={() => setFilterPeriod("month")}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: colors.text.secondary },
                  filterPeriod === "month" && {
                    color: "#FFFFFF",
                    fontWeight: "600",
                  },
                ]}
              >
                Month
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.historyContainer}>
          <View style={styles.historyHeader}>
            <Text style={[styles.historyTitle, { color: colors.text.primary }]}>
              Your Sessions
            </Text>
            <Filter size={18} color={colors.text.secondary} />
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text
                style={[styles.loadingText, { color: colors.text.secondary }]}
              >
                Loading sessions...
              </Text>
            </View>
          ) : filteredSessions.length > 0 ? (
            filteredSessions
              .sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime(),
              )
              .map((session) => (
                <SessionHistoryItem key={session.id} session={session} />
              ))
          ) : (
            <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
              <History size={50} color={colors.inactive} />
              <Text
                style={[styles.emptyStateText, { color: colors.text.primary }]}
              >
                No sessions found
              </Text>
              <Text
                style={[
                  styles.emptyStateSubtext,
                  { color: colors.text.secondary },
                ]}
              >
                Complete focus sessions to see your history here
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 15,
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
  },
  filterText: {
    fontSize: 14,
  },
  historyContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    borderRadius: 12,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 20,
  },
});

import SessionHistoryItem from "@/components/SessionHistoryItem";
import Colors, { darkColors, lightColors } from "@/constants/colors";
import useTimerStore from "@/store/timerStore";
import { History } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";

type FilterPeriod = "all" | "today" | "week" | "month";

export default function HistoryScreen() {
  const colorScheme = useColorScheme();
  const activeColors = colorScheme === "dark" ? darkColors : lightColors;

  const { sessions, isLoading, loadSessions } = useTimerStore();
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>("all");

  //refresh sessions when the screen is focused
  useEffect(() => {
    loadSessions();
  }, []);

  const sections = useMemo(() => {
    // 1. Filter
    const now = new Date();
    let filtered = sessions;

    if (filterPeriod === "today") {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      filtered = sessions.filter((s) => new Date(s.createdAt) >= today);
    } else if (filterPeriod === "week") {
      const oneWeekAgo = new Date(now);
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      filtered = sessions.filter((s) => new Date(s.createdAt) >= oneWeekAgo);
    } else if (filterPeriod === "month") {
      const oneMonthAgo = new Date(now);
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      filtered = sessions.filter((s) => new Date(s.createdAt) >= oneMonthAgo);
    }

    // 2. Sort Descending
    filtered.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    // 3. Group
    const groups: { [key: string]: typeof sessions } = {};

    const todayStr = now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    const result: { title: string; data: typeof sessions }[] = [];
    let currentSection: { title: string; data: typeof sessions } | null = null;

    filtered.forEach((session) => {
      const date = new Date(session.createdAt);
      const dateStr = date.toDateString();
      let title = dateStr;
      if (dateStr === todayStr) title = "Today";
      else if (dateStr === yesterdayStr) title = "Yesterday";
      else {
        title = date.toLocaleDateString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
        });
      }

      if (!currentSection || currentSection.title !== title) {
        if (currentSection) result.push(currentSection);
        currentSection = { title, data: [session] };
      } else {
        currentSection.data.push(session);
      }
    });
    if (currentSection) result.push(currentSection);

    return result;
  }, [sessions, filterPeriod]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: activeColors.background }]}
    >
      <View style={[styles.header, { backgroundColor: activeColors.card }]}>
        <Text style={[styles.title, { color: activeColors.text.primary }]}>
          Session History
        </Text>

        <View style={styles.filterContainer}>
          {["all", "today", "week", "month"].map((p) => (
            <TouchableOpacity
              key={p}
              style={[
                styles.filterButton,
                { backgroundColor: activeColors.background },
                filterPeriod === p && { backgroundColor: activeColors.primary },
              ]}
              onPress={() => setFilterPeriod(p as FilterPeriod)}
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
        ) : sections.length > 0 ? (
          <SectionList
            sections={sections}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => <SessionHistoryItem session={item} />}
            renderSectionHeader={({ section: { title } }) => (
              <Text
                style={[
                  styles.sectionHeader,
                  { color: activeColors.text.secondary },
                ]}
              >
                {title}
              </Text>
            )}
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={false}
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
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.text.primary,
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
  sectionHeader: {
    fontSize: 14,
    fontWeight: "bold",
    color: Colors.text.secondary,
    marginTop: 20,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 1,
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

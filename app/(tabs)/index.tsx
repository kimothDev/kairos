import BreakModal from "@/components/BreakModal";
import CircularTimer from "@/components/CircularTimer";
import EnergyLevelSelector from "@/components/EnergyLevelSelector";
import RecommendationCard from "@/components/RecommendationCard";
import SkipConfirmModal from "@/components/SkipConfirmModal";
import TaskSelector from "@/components/TaskSelector";
import { useThemeColor } from "@/hooks/useThemeColor";
import useTimerStore, { loadDynamicFocusArms } from "@/store/timerStore";
import * as Notifications from "expo-notifications";
import React, { useEffect, useRef } from "react";
import {
    AppState,
    AppStateStatus,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function TimerScreen() {
  const colors = useThemeColor();
  const {
    energyLevel,
    taskType,
    hasInteractedWithTimer,
    userAcceptedRecommendation,
    hasDismissedRecommendationCard,
  } = useTimerStore();

  useEffect(() => {
    loadDynamicFocusArms();
  }, []);

  useEffect(() => {
    (async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") {
        alert("Please enable notifications in system settings.");
      }

      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
        });
      }
    })();
  }, []);

  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const timerStore = useTimerStore.getState();

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        timerStore.restoreTimerState();
      }

      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );
    return () => subscription.remove();
  }, []);

  const handleSkipConfirm = async (confirmed: boolean) => {
    if (confirmed) {
      const { isBreakTime } = useTimerStore.getState();
      await useTimerStore.getState().skipFocusSession(isBreakTime);
    } else {
      useTimerStore.getState().toggleSkipConfirm(false);
    }
  };

  const confirmSkip = () => handleSkipConfirm(true);
  const cancelSkip = () => handleSkipConfirm(false);
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.title, { color: colors.text.primary }]}>
          Smart Focus Timer
        </Text>

        <View style={styles.slotsContainer}>
          <TaskSelector />
          <EnergyLevelSelector />
        </View>

        {/* show recommendation card if both task type and energy level are set */}
        {taskType &&
          energyLevel &&
          hasInteractedWithTimer &&
          !userAcceptedRecommendation &&
          !hasDismissedRecommendationCard && <RecommendationCard />}
        <CircularTimer />

        <BreakModal />
        <SkipConfirmModal onConfirmSkip={confirmSkip} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  slotsContainer: {
    paddingHorizontal: 20,
    marginBottom: -60,
  },
});

/**
 * Timer Screen
 *
 * The main screen of the application. Integrates the Circular Timer,
 * Task/Energy selectors, and handles notification permissions and app state changes.
 */
import BreakModal from "@/components/BreakModal";
import CircularTimer from "@/components/CircularTimer";
import EnergyLevelSelector from "@/components/EnergyLevelSelector";
import RecommendationCard from "@/components/RecommendationCard";
import SkipConfirmModal from "@/components/SkipConfirmModal";
import TaskSelector from "@/components/TaskSelector";
import { SPACING } from "@/constants/layout";
import { useThemeColor } from "@/hooks/useThemeColor";
import useTimerStore, { loadDynamicFocusArms } from "@/store/timerStore";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import React, { useEffect, useRef } from "react";
import {
    AppState,
    AppStateStatus,
    Platform,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function TimerScreen() {
  const colors = useThemeColor();
  const insets = useSafeAreaInsets();
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
        const { showThemedAlert } = useTimerStore.getState();
        showThemedAlert(
          "Notifications",
          "Please enable notifications in system settings to get focus reminders.",
        );
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

  const topInset = insets.top > 0 ? insets.top : Constants.statusBarHeight;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.slotsContainer, { paddingTop: topInset + 20 }]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: SPACING.p25,
  },
  slotsContainer: {
    paddingHorizontal: SPACING.p5,
    marginBottom: SPACING.p5,
  },
});

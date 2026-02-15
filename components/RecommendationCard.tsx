import { useThemeColor } from "@/hooks/useThemeColor";
import useTimerStore from "@/store/timerStore";
import { ThumbsDown, ThumbsUp, Zap } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
const safeNum = (x: any): number => {
  const n = Number(x);
  return isNaN(n) ? 0 : n;
};

export default function RecommendationModal() {
  const colors = useThemeColor();
  const {
    recommendedFocusDuration,
    recommendedBreakDuration,
    userAcceptedRecommendation,
    energyLevel,
    taskType,
    acceptRecommendation,
    rejectRecommendation,
    toggleTimeAdjust,
    setHasDismissedRecommendationCard,
    hasDismissedRecommendationCard,
    hasInteractedWithTimer,
  } = useTimerStore();

  const focus = safeNum(recommendedFocusDuration);
  const breakDur = safeNum(recommendedBreakDuration);

  //don't show if user hasn't selected energy level or task type yet
  if (!energyLevel || !taskType) {
    return null;
  }

  //don't show if user hasn't interacted with the timer (clicked to customize)
  if (!hasInteractedWithTimer) {
    return null;
  }

  //don't show if the recommendation has been handled already
  if (userAcceptedRecommendation || hasDismissedRecommendationCard) {
    return null;
  }

  const formatTimeOfDay = (tod: string): string => {
    return tod.charAt(0).toUpperCase() + tod.slice(1);
  };

  return (
    <View style={styles.modalOverlay}>
      <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
        <View style={styles.header}>
          <Zap size={20} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text.primary }]}>
            Smart Recommendation
          </Text>
        </View>

        <Text style={[styles.description, { color: colors.text.secondary }]}>
          Based on your{" "}
          <Text style={[styles.highlight, { color: colors.primary }]}>
            {taskType}
          </Text>{" "}
          task and
          <Text style={[styles.highlight, { color: colors.primary }]}>
            {" "}
            {energyLevel === "high"
              ? "Intense"
              : energyLevel === "mid"
                ? "Steady"
                : "Relaxed"}{" "}
            mood
          </Text>
          :
        </Text>

        <View style={styles.recommendationRow}>
          <View style={styles.recommendationItem}>
            <Text
              style={[
                styles.recommendationLabel,
                { color: colors.text.secondary },
              ]}
            >
              Focus
            </Text>
            <Text
              style={[
                styles.recommendationValue,
                { color: colors.text.primary },
              ]}
            >
              {focus} min
            </Text>
          </View>
          <View style={styles.recommendationItem}>
            <Text
              style={[
                styles.recommendationLabel,
                { color: colors.text.secondary },
              ]}
            >
              Break
            </Text>
            <Text
              style={[
                styles.recommendationValue,
                { color: colors.text.primary },
              ]}
            >
              {breakDur} min
            </Text>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.rejectButton,
              { backgroundColor: colors.background },
            ]}
            onPress={() => {
              rejectRecommendation();
              setHasDismissedRecommendationCard(true);
              useTimerStore.setState({ showTimeAdjust: true });
            }}
          >
            <ThumbsDown size={16} color={colors.text.secondary} />
            <Text
              style={[
                styles.rejectButtonText,
                { color: colors.text.secondary },
              ]}
            >
              Customise
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.acceptButton,
              { backgroundColor: colors.primary },
            ]}
            onPress={() => {
              acceptRecommendation();
              setHasDismissedRecommendationCard(true);
              useTimerStore.setState({ showTimeAdjust: false });
            }}
          >
            <ThumbsUp size={16} color={"#FFFFFF"} />
            <Text style={styles.acceptButtonText}>Accept</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalContent: {
    borderRadius: 16,
    padding: "5%",
    width: "90%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontFamily: "Outfit_700Bold",
    marginLeft: 8,
  },
  description: {
    fontSize: 14,
    fontFamily: "Outfit_400Regular",
    marginBottom: 20,
    lineHeight: 20,
  },
  highlight: {
    fontFamily: "Outfit_600SemiBold",
  },
  recommendationRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 24,
  },
  recommendationItem: {
    alignItems: "center",
  },
  recommendationLabel: {
    fontSize: 14,
    fontFamily: "Outfit_400Regular",
    marginBottom: 4,
  },
  recommendationValue: {
    fontSize: 22,
    fontFamily: "Outfit_700Bold",
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
    flex: 1,
  },
  acceptButton: {
    marginLeft: 10,
  },
  rejectButton: {
    marginRight: 10,
  },
  acceptButtonText: {
    color: "#FFFFFF",
    fontFamily: "Outfit_600SemiBold",
    marginLeft: 5,
    fontSize: 13,
  },
  rejectButtonText: {
    fontFamily: "Outfit_600SemiBold",
    marginLeft: 5,
    fontSize: 13,
  },
});

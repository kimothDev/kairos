import Colors from "@/constants/colors";
import { EnergyLevel, Session } from "@/types";
import {
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface SessionHistoryItemProps {
  session: Session;
}

export default function SessionHistoryItem({
  session,
}: SessionHistoryItemProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Helper to format duration with context ("X of Y min")
  const getDurationText = () => {
    const actual = Math.round(session.focusedUntilSkipped);
    const goal = session.userSelectedDuration;

    // If focus was completed (e.g. break skipped) or actual met goal
    if (session.skipReason === "skippedBreak" || actual >= goal) {
      return `${actual} min`;
    }

    if (!session.sessionCompleted && goal > 0) {
      return `${actual} of ${goal} min`;
    }
    return `${actual} min`;
  };

  const renderEnergyIcon = (level: EnergyLevel) => {
    switch (level) {
      case "low":
        return <BatteryLow size={16} color={Colors.text.secondary} />;
      case "mid":
        return <BatteryMedium size={16} color={Colors.text.secondary} />;
      case "high":
        return <BatteryFull size={16} color={Colors.text.secondary} />;
      default:
        return null;
    }
  };

  const getSessionStatus = () => {
    if (session.sessionCompleted) {
      return {
        status: "Completed",
        color: Colors.success,
        icon: <CheckCircle size={16} color={Colors.success} />,
      };
    }

    switch (session.skipReason) {
      case "skippedFocus":
        return {
          status: "Focus Skipped",
          color: Colors.error,
          icon: <XCircle size={16} color={Colors.error} />,
        };
      case "skippedBreak":
        return {
          status: "Break Skipped",
          color: Colors.warning,
          icon: <XCircle size={16} color={Colors.warning} />,
        };
      default:
        return {
          status: "Skipped",
          color: Colors.error,
          icon: <XCircle size={16} color={Colors.error} />,
        };
    }
  };

  const { status, color, icon } = getSessionStatus();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.taskType}>{session.taskType}</Text>
        <Text style={styles.date}>{formatDate(session.createdAt)}</Text>
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Clock size={16} color={Colors.text.secondary} />
            <Text style={styles.detailText}>{getDurationText()}</Text>
          </View>

          <View style={styles.detailItem}>
            {renderEnergyIcon(session.energyLevel as EnergyLevel)}
            <Text style={styles.detailText}>
              {session.energyLevel || "Not set"}
            </Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            {icon}
            <Text style={[styles.detailText, { color }]}>{status}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  taskType: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.text.primary,
  },
  date: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  details: {
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailText: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginLeft: 4,
  },
});

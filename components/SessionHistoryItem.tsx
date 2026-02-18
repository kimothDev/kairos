/**
 * Session History Item
 *
 * A summary component for a single focus session. Facilitates viewing
 * session details and adding/editing session notes.
 */
import { RADIUS, SPACING, TYPOGRAPHY } from "@/constants/layout";
import { useThemeColor } from "@/hooks/useThemeColor";
import { EnergyLevel, Session } from "@/types";
import {
    Activity,
    CheckCircle,
    Clock,
    Feather,
    SquarePen,
    StickyNote,
    XCircle,
    Zap,
} from "lucide-react-native";
import React, { memo, useCallback } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface SessionHistoryItemProps {
  session: Session;
}

import useTimerStore from "@/store/timerStore";
import NoteEditModal from "./NoteEditModal";

const SessionHistoryItem = ({ session }: SessionHistoryItemProps) => {
  const colors = useThemeColor();
  const { updateSessionNote } = useTimerStore();
  const [showNoteModal, setShowNoteModal] = React.useState(false);

  const handleSaveNote = async (note: string) => {
    if (session.id === undefined) return;
    await updateSessionNote(session.id, note);
  };

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

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
        return <Feather size={16} color={colors.text.secondary} />;
      case "mid":
        return <Activity size={16} color={colors.text.secondary} />;
      case "high":
        return <Zap size={16} color={colors.text.secondary} />;
      default:
        return null;
    }
  };

  const getSessionStatus = () => {
    if (session.sessionCompleted) {
      return {
        status: "Completed",
        color: colors.success,
        icon: <CheckCircle size={16} color={colors.success} />,
      };
    }

    switch (session.skipReason) {
      case "skippedFocus":
        return {
          status: "Focus Skipped",
          color: colors.error,
          icon: <XCircle size={16} color={colors.error} />,
        };
      case "skippedBreak":
        return {
          status: "Break Skipped",
          color: colors.warning,
          icon: <XCircle size={16} color={colors.warning} />,
        };
      default:
        return {
          status: "Skipped",
          color: colors.error,
          icon: <XCircle size={16} color={colors.error} />,
        };
    }
  };

  const { status, color, icon } = getSessionStatus();

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <View style={styles.header}>
        <Text style={[styles.taskType, { color: colors.text.primary }]}>
          {session.taskType}
        </Text>
        <Text style={[styles.date, { color: colors.text.secondary }]}>
          {formatDate(session.createdAt)}
        </Text>
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Clock size={16} color={colors.text.secondary} />
            <Text style={[styles.detailText, { color: colors.text.secondary }]}>
              {getDurationText()}
            </Text>
          </View>

          <View style={styles.detailItem}>
            {renderEnergyIcon(session.energyLevel as EnergyLevel)}
            <Text style={[styles.detailText, { color: colors.text.secondary }]}>
              {session.energyLevel === "high"
                ? "Intense"
                : session.energyLevel === "mid"
                  ? "Steady"
                  : session.energyLevel === "low"
                    ? "Relaxed"
                    : "Not set"}
            </Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            {icon}
            <Text style={[styles.detailText, { color }]}>{status}</Text>
          </View>

          <TouchableOpacity
            style={styles.noteButton}
            onPress={() => setShowNoteModal(true)}
          >
            {session.note ? (
              <View style={styles.noteContent}>
                <Text style={[styles.noteText, { color: colors.primary }]}>
                  Note
                </Text>
                <StickyNote size={16} color={colors.primary} />
              </View>
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text
                  style={{
                    color: colors.text.secondary,
                    fontSize: 12,
                    marginRight: 4,
                    fontFamily: "Outfit_400Regular",
                  }}
                >
                  Add Note
                </Text>
                <SquarePen size={16} color={colors.text.secondary} />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <NoteEditModal
        visible={showNoteModal}
        initialNote={session.note}
        onClose={() => setShowNoteModal(false)}
        onSave={handleSaveNote}
      />
    </View>
  );
};

export default memo(SessionHistoryItem);

const styles = StyleSheet.create({
  container: {
    borderRadius: RADIUS.lg,
    padding: SPACING.p4,
    marginBottom: SPACING.p4,
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
    marginBottom: SPACING.md,
  },
  taskType: {
    fontSize: TYPOGRAPHY.size.lg,
    fontFamily: "Outfit_700Bold",
  },
  date: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: "Outfit_400Regular",
  },
  details: {
    gap: SPACING.sm,
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
    fontSize: TYPOGRAPHY.size.md,
    fontFamily: "Outfit_400Regular",
    marginLeft: SPACING.xs,
  },
  noteButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  noteContent: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: 150,
  },
  noteText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontFamily: "Outfit_400Regular",
    fontStyle: "italic",
    marginRight: SPACING.xs,
  },
});

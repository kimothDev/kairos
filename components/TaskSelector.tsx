import { useThemeColor } from "@/hooks/useThemeColor";
import useTimerStore from "@/store/timerStore";
import { ChevronRight } from "lucide-react-native";
import React, { useState } from "react";

import {
    Dimensions,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function TaskSelector() {
  const colors = useThemeColor();
  const [customTask, setCustomTask] = useState("");

  const {
    taskType,
    previousTasks,
    showTaskModal,
    setTaskType,
    toggleTaskModal,
    addCustomTask,
    isActive,
    isBreakTime,
    removeCustomTask,
    hasMigratedTasks,
    migrateTasks,
    showThemedAlert,
  } = useTimerStore();

  React.useEffect(() => {
    if (!hasMigratedTasks) {
      migrateTasks();
    }
  }, [hasMigratedTasks]);

  // Use previousTasks as the single source of truth after migration
  // but ensure we have unique values just in case
  const taskList = [...new Set(previousTasks)];

  const isTimerRunning = isActive || isBreakTime;

  const handleDeleteTask = (task: string) => {
    showThemedAlert(
      "Delete Task",
      `Are you sure you want to delete "${task}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => removeCustomTask(task),
        },
      ],
    );
  };

  return (
    <>
      <TouchableOpacity
        style={[
          styles.slotButton,
          isTimerRunning && { opacity: 0.5 },
          { backgroundColor: colors.card },
        ]}
        onPress={() => !isTimerRunning && toggleTaskModal(true)}
        disabled={isTimerRunning}
      >
        <View>
          <Text style={[styles.slotLabel, { color: colors.text.secondary }]}>
            Task Type
          </Text>
          <Text style={[styles.slotValue, { color: colors.text.secondary }]}>
            {taskType || "Select Task Type"}
          </Text>
        </View>
        <ChevronRight size={24} color={colors.text.secondary} />
      </TouchableOpacity>

      {/* Task Selection Modal */}
      <Modal
        visible={showTaskModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => toggleTaskModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
              Select Task Type
            </Text>

            <ScrollView
              style={styles.taskList}
              contentContainerStyle={styles.taskListContent}
              showsVerticalScrollIndicator={false}
            >
              {taskList.map((task, index) => (
                <View
                  key={`task-${index}`}
                  style={[
                    styles.taskItemRow,
                    { backgroundColor: colors.background },
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      styles.taskItem,
                      { backgroundColor: colors.background, flex: 1 },
                    ]}
                    onPress={() => {
                      setTaskType(task);
                      toggleTaskModal(false);
                    }}
                    onLongPress={() => handleDeleteTask(task)}
                    delayLongPress={500}
                  >
                    <Text
                      style={[
                        styles.taskItemText,
                        { color: colors.text.primary },
                      ]}
                    >
                      {task}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            <View style={styles.addTaskContainer}>
              <TextInput
                style={[
                  styles.taskInput,
                  {
                    borderColor: colors.border,
                    color: colors.text.primary,
                    backgroundColor: colors.background,
                  },
                ]}
                placeholder="Add new task type"
                placeholderTextColor={colors.text.light}
                value={customTask}
                onChangeText={(text) =>
                  setCustomTask(text.charAt(0).toUpperCase() + text.slice(1))
                }
                onSubmitEditing={() => {
                  addCustomTask(customTask);
                  setCustomTask("");
                }}
              />
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.primary }]}
                onPress={() => {
                  addCustomTask(customTask);
                  setCustomTask("");
                }}
              >
                <Text style={styles.addButtonText}>+</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: colors.card }]}
              onPress={() => toggleTaskModal(false)}
            >
              <Text
                style={[styles.closeButtonText, { color: colors.text.primary }]}
              >
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const screenHeight = Dimensions.get("window").height;

const styles = StyleSheet.create({
  slotButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  slotLabel: {
    fontSize: 14,
    fontFamily: "Outfit_400Regular",
  },
  slotValue: {
    fontSize: 15,
    fontFamily: "Outfit_700Bold",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    padding: 20,
    borderRadius: 16,
    width: "85%",
    maxWidth: 400,
    maxHeight: screenHeight * 0.7,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Outfit_700Bold",
    marginBottom: 12,
    textAlign: "center",
  },
  taskList: {
    flexGrow: 0,
    maxHeight: 260,
    marginBottom: 12,
  },
  taskListContent: {
    paddingBottom: 8,
  },
  taskItem: {
    padding: 12,
    marginVertical: 4,
    borderRadius: 8,
  },
  taskItemText: {
    fontSize: 16,
    fontFamily: "Outfit_400Regular",
  },
  addTaskContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 12,
  },
  taskInput: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginRight: 8,
    fontFamily: "Outfit_400Regular",
  },
  addButton: {
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonText: {
    color: "white",
    fontSize: 24,
    lineHeight: 30,
  },
  closeButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 16,
    fontFamily: "Outfit_700Bold",
  },
  taskItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 4,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  deleteIcon: {
    padding: 8,
  },
});

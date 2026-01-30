import Colors from '@/constants/colors';
import { DEFAULT_TASKS } from '@/constants/timer';
import useTimerStore from '@/store/timerStore';
import { ChevronRight, Trash2 } from 'lucide-react-native';
import React from 'react';

import {
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

export default function TaskSelector() {
  const {
    taskType,
    previousTasks,
    customTask,
    showTaskModal,
    setTaskType,
    toggleTaskModal,
    addCustomTask,
    isActive,
    isBreakTime,
    removeCustomTask,
  } = useTimerStore();

  // Unified task list: custom tasks first (excluding default ones), then default tasks
  const customTasks = previousTasks.filter(
    task => !DEFAULT_TASKS.includes(task)
  );

  const unifiedTaskList = [...customTasks, ...DEFAULT_TASKS].filter(
    (task, index, self) => self.indexOf(task) === index
  );
  const isTimerRunning = isActive || isBreakTime;

  return (
    <>
      <TouchableOpacity
        style={[styles.slotButton, isTimerRunning && { opacity: 0.5 }]}
        onPress={() => !isTimerRunning && toggleTaskModal(true)}
        disabled={isTimerRunning}
      >
        <View>
          <Text style={styles.slotLabel}>Task Type</Text>
          <Text style={styles.slotValue}>
            {taskType || 'Select Task Type'}
          </Text>
        </View>
        <ChevronRight size={24} color={Colors.text.secondary} />
      </TouchableOpacity>

      {/* Task Selection Modal */}
      <Modal
        visible={showTaskModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => toggleTaskModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Task Type</Text>

            <ScrollView
              style={styles.taskList}
              contentContainerStyle={styles.taskListContent}
              showsVerticalScrollIndicator={true}
            >
              {unifiedTaskList.map((task, index) => (
                <View key={`task-${index}`} style={styles.taskItemRow}>
                  <TouchableOpacity
                    style={styles.taskItem}
                    onPress={() => {
                      setTaskType(task);
                      toggleTaskModal(false);
                    }}
                  >
                    <Text style={styles.taskItemText}>{task}</Text>
                  </TouchableOpacity>

                  {!DEFAULT_TASKS.includes(task) && (
                    <TouchableOpacity
                      onPress={() => removeCustomTask(task)}
                      style={styles.deleteIcon}
                    >
                      <Trash2 size={20} color="red" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </ScrollView>


            <View style={styles.addTaskContainer}>
              <TextInput
                style={styles.taskInput}
                placeholder="Add new task type"
                value={customTask}
                onChangeText={(text) => useTimerStore.setState({ customTask: text })}
                onSubmitEditing={() => {
                  addCustomTask(customTask);
                }}
              />
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => {
                  addCustomTask(customTask);
                }}
              >
                <Text style={styles.addButtonText}>+</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => toggleTaskModal(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const screenHeight = Dimensions.get('window').height;

const styles = StyleSheet.create({
  slotButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  slotLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  slotValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.text.secondary,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: Colors.card,
    padding: 20,
    borderRadius: 16,
    width: '85%',
    maxWidth: 400,
    maxHeight: screenHeight * 0.7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: Colors.text.primary,
    textAlign: 'center',
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
    backgroundColor: Colors.background,
  },
  taskItemText: {
    fontSize: 16,
    color: Colors.text.primary,
  },
  addTaskContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  taskInput: {
    flex: 1,
    padding: 12,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 8,
    marginRight: 8,
    color: Colors.text.primary,
    backgroundColor: Colors.background,
  },
  addButton: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 24,
    lineHeight: 30,
  },
  closeButton: {
    padding: 12,
    backgroundColor: Colors.card,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  taskItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 4,
    borderRadius: 8,
    backgroundColor: Colors.background,
    paddingHorizontal: 12,
  },
  deleteIcon: {
    padding: 8,
  },

});
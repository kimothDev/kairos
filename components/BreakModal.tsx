import Colors from '@/constants/colors';
import useTimerStore from '@/store/timerStore';
import { getBreakOptions } from '@/utils/options';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function BreakModal() {
  const {
    showBreakModal,
    startBreak,
    recommendedBreakDuration,
    includeShortSessions
  } = useTimerStore();

  if (!showBreakModal) return null;

  //use utility for break options
  const breakOptions = getBreakOptions(includeShortSessions);

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Great Job!</Text>
        <Text style={styles.modalText}>
          You completed your focus session. Take a break!
        </Text>
        <View style={styles.breakOptions}>
          {breakOptions.map((option) => (
            <TouchableOpacity
              key={option.duration}
              style={[
                styles.breakOption,
                option.duration === recommendedBreakDuration * 60 && styles.recommendedOption,
                option.duration === 0 && styles.skipOption
              ]}
              onPress={() => startBreak(option.duration)}
            >
              <Text style={[
                styles.breakOptionText,
                option.duration === 0 && styles.skipOptionText
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    width: '85%',
    maxWidth: 400,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 10,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    color: Colors.text.primary,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  breakOptions: {
    marginTop: 20,
    width: '100%',
  },
  breakOption: {
    backgroundColor: Colors.background,
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  recommendedOption: {
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
    borderWidth: 2,
  },
  skipOption: {
    backgroundColor: Colors.background,
    borderColor: Colors.border,
  },
  breakOptionText: {
    fontSize: 16,
    color: Colors.text.primary,
    fontWeight: '600',
  },
  skipOptionText: {
    color: Colors.text.secondary,
  },
});
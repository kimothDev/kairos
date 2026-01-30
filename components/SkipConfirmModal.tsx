import Colors from '@/constants/colors';
import useTimerStore from '@/store/timerStore';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function SkipConfirmModal({ onConfirmSkip }: { onConfirmSkip: () => void }) {
  const { showSkipConfirm, toggleSkipConfirm, cancelTimer } = useTimerStore();

  if (!showSkipConfirm) return null;

  const handleConfirm = () => {
    onConfirmSkip();
    toggleSkipConfirm(false);
  };

  return (
    <View style={styles.confirmOverlay}>
      <View style={styles.confirmBox}>
        <Text style={styles.confirmText}>Are you sure you want to skip?</Text>
        <View style={styles.confirmButtons}>
          <TouchableOpacity
            style={[styles.confirmButton, styles.confirmNo]}
            onPress={() => toggleSkipConfirm(false)}
          >
            <Text style={styles.confirmNoText}>No</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.confirmButton, styles.confirmYes]}
            onPress={handleConfirm}
          >
            <Text style={styles.confirmYesText}>Yes</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  confirmOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  confirmBox: {
    backgroundColor: Colors.card,
    padding: 20,
    borderRadius: 16,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
  },
  confirmText: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
    color: Colors.text.primary,
  },
  confirmButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  confirmButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    minWidth: 100,
    alignItems: 'center',
  },
  confirmNo: {
    backgroundColor: Colors.background,
    marginRight: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  confirmYes: {
    backgroundColor: Colors.secondary,
    marginLeft: 10,
  },
  confirmNoText: {
    color: Colors.text.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  confirmYesText: {
    color: Colors.card,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
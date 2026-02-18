import { RADIUS, SPACING, TYPOGRAPHY } from "@/constants/layout";
import { useThemeColor } from "@/hooks/useThemeColor";
import React, { useEffect, useState } from "react";
import {
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";

interface NoteEditModalProps {
  visible: boolean;
  initialNote?: string;
  onClose: () => void;
  onSave: (note: string) => void;
}

export default function NoteEditModal({
  visible,
  initialNote = "",
  onClose,
  onSave,
}: NoteEditModalProps) {
  const colors = useThemeColor();
  const [note, setNote] = useState(initialNote);
  const [isEditing, setIsEditing] = useState(false);

  // Sync state when modal opens or initialNote changes
  useEffect(() => {
    if (visible) {
      setNote(initialNote || "");
      setIsEditing(!initialNote); // Edit immediately if no note exists
    }
  }, [visible, initialNote]);

  const handleSave = () => {
    onSave(note.trim());
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={[styles.modalContent, { backgroundColor: colors.card }]}
            >
              <Text style={[styles.title, { color: colors.text.primary }]}>
                Session Note
              </Text>

              {isEditing ? (
                <>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        color: colors.text.primary,
                        borderColor: colors.text.secondary + "40", // 25% opacity
                        backgroundColor: colors.background,
                      },
                    ]}
                    placeholder="What did you work on?"
                    placeholderTextColor={colors.text.secondary}
                    multiline
                    numberOfLines={4}
                    value={note}
                    onChangeText={setNote}
                    autoFocus
                  />

                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={[styles.button, styles.cancelButton]}
                      onPress={() => {
                        if (initialNote) {
                          setIsEditing(false);
                          setNote(initialNote); // Reset changes
                        } else {
                          onClose();
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.buttonText,
                          { color: colors.text.secondary },
                        ]}
                      >
                        Cancel
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.button,
                        { backgroundColor: colors.primary },
                      ]}
                      onPress={handleSave}
                    >
                      <Text style={[styles.buttonText, { color: colors.card }]}>
                        Save Note
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <View
                    style={[
                      styles.viewContainer,
                      { backgroundColor: colors.background },
                    ]}
                  >
                    <Text
                      style={{
                        color: colors.text.primary,
                        fontSize: 16,
                        fontFamily: "Outfit_400Regular",
                      }}
                    >
                      {note}
                    </Text>
                  </View>

                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={[styles.button, styles.cancelButton]}
                      onPress={onClose}
                    >
                      <Text
                        style={[
                          styles.buttonText,
                          { color: colors.text.secondary },
                        ]}
                      >
                        Close
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.button,
                        { backgroundColor: colors.primary },
                      ]}
                      onPress={() => setIsEditing(true)}
                    >
                      <Text style={[styles.buttonText, { color: colors.card }]}>
                        Edit Note
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: SPACING.xl,
  },
  modalContent: {
    padding: SPACING.xxl,
    borderRadius: RADIUS.xl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: TYPOGRAPHY.size.xxl,
    fontFamily: "Outfit_700Bold",
    marginBottom: SPACING.lg,
  },
  input: {
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    fontSize: TYPOGRAPHY.size.lg,
    fontFamily: "Outfit_400Regular",
    minHeight: 100,
    textAlignVertical: "top",
    marginBottom: SPACING.xl,
  },
  viewContainer: {
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    minHeight: 100,
    marginBottom: SPACING.xl,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: SPACING.md,
  },
  button: {
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.md,
  },
  cancelButton: {
    backgroundColor: "transparent",
  },
  buttonText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: TYPOGRAPHY.size.lg,
  },
});

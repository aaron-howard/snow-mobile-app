import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

export interface EnrollmentLimitWarningProps {
  visible: boolean;
  onDismiss: () => void;
}

/**
 * Modal shown when the user tries to enroll in more than five active exams (Req 2.6).
 */
export function EnrollmentLimitWarning({ visible, onDismiss }: EnrollmentLimitWarningProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      accessibilityViewIsModal
    >
      <View style={styles.backdrop}>
        <View
          style={styles.card}
          accessibilityRole="alert"
          accessibilityLabel="You already have five active courses enrolled."
        >
          <Text style={styles.title} accessibilityRole="header">
            Enrollment limit reached
          </Text>
          <Text style={styles.body}>
            You can study up to five certification tracks at once. Leave a track before adding
            another.
          </Text>
          <Pressable
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel="Dismiss enrollment limit dialog"
            style={styles.button}
          >
            <Text style={styles.buttonLabel}>OK</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 20,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  body: {
    color: '#CBD5E1',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  button: {
    alignSelf: 'flex-end',
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  buttonLabel: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '600',
  },
});

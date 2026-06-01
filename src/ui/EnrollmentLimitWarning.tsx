import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from './theme';
import type { Theme } from './theme';

export interface EnrollmentLimitWarningProps {
  visible: boolean;
  onDismiss: () => void;
}

/**
 * Modal shown when the user tries to enroll in more than five active exams (Req 2.6).
 */
export function EnrollmentLimitWarning({ visible, onDismiss }: EnrollmentLimitWarningProps) {
  const styles = useThemedStyles(makeStyles);
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

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      justifyContent: 'center',
      padding: 24,
    },
    card: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: 20,
    },
    title: {
      color: theme.textPrimary,
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 8,
    },
    body: {
      color: theme.textBody,
      fontSize: 15,
      lineHeight: 22,
      marginBottom: 16,
    },
    button: {
      alignSelf: 'flex-end',
      backgroundColor: theme.accentStrong,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    buttonLabel: {
      color: theme.onAccentStrong,
      fontSize: 16,
      fontWeight: '600',
    },
  });

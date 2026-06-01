import { useProfile } from '@/domain/analytics/useProfile';
import { useNotificationSettings } from '@/domain/notifications/useNotificationSettings';
import { useTheme, useThemedStyles, type Theme } from '@ui/theme';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

interface StatProps {
  label: string;
  value: number;
  unit?: string;
}

function StatCard({ label, value, unit }: StatProps) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View
      style={styles.statCard}
      accessibilityRole="text"
      accessibilityLabel={`${label}: ${value}${unit ? ` ${unit}` : ''}`}
    >
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

interface ToggleRowProps {
  label: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
}

function ToggleRow({ label, value, onValueChange }: ToggleRowProps) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        accessibilityRole="switch"
        accessibilityLabel={label}
        accessibilityState={{ checked: value }}
      />
    </View>
  );
}

interface TimeFieldProps {
  label: string;
  value: string;
  onCommit: (next: string) => void;
}

function TimeField({ label, value, onCommit }: TimeFieldProps) {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <TextInput
        defaultValue={value}
        onEndEditing={(e) => onCommit(e.nativeEvent.text)}
        placeholder="HH:MM"
        placeholderTextColor={theme.textSecondary}
        keyboardType="numbers-and-punctuation"
        style={styles.timeInput}
        accessibilityLabel={`${label}, 24-hour HH:MM`}
      />
    </View>
  );
}

function NotificationSettingsSection() {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { loading, error, settings, permission, update, requestPermission } =
    useNotificationSettings();

  if (loading) {
    return (
      <ActivityIndicator color={theme.accent} accessibilityLabel="Loading notification settings" />
    );
  }
  if (error) {
    return (
      <Text style={styles.errorBanner} accessibilityRole="alert">
        {error}
      </Text>
    );
  }
  if (!settings) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionHeading} accessibilityRole="header">
        Notifications
      </Text>

      {permission === 'denied' ? (
        <Pressable
          style={styles.permissionPrompt}
          onPress={() => void requestPermission()}
          accessibilityRole="button"
          accessibilityLabel="Notifications are blocked. Tap to enable them in Settings."
        >
          <Text style={styles.permissionPromptText}>
            Notifications are blocked. Enable them to receive study reminders.
          </Text>
        </Pressable>
      ) : null}

      <ToggleRow
        label="Daily reminder"
        value={settings.dailyReminderEnabled}
        onValueChange={(v) => void update({ dailyReminderEnabled: v })}
      />
      {settings.dailyReminderEnabled ? (
        <TimeField
          label="Reminder time"
          value={settings.dailyReminderTime}
          onCommit={(t) => void update({ dailyReminderTime: t })}
        />
      ) : null}
      <ToggleRow
        label="Streak-risk alerts"
        value={settings.streakRiskEnabled}
        onValueChange={(v) => void update({ streakRiskEnabled: v })}
      />
      <ToggleRow
        label="Milestone congratulations"
        value={settings.congratulatoryEnabled}
        onValueChange={(v) => void update({ congratulatoryEnabled: v })}
      />
      <ToggleRow
        label="Exam-ready (80%) alert"
        value={settings.readiness80Enabled}
        onValueChange={(v) => void update({ readiness80Enabled: v })}
      />
      <TimeField
        label="Quiet hours start"
        value={settings.quietHoursStart ?? ''}
        onCommit={(t) => void update({ quietHoursStart: t.trim() === '' ? null : t })}
      />
      <TimeField
        label="Quiet hours end"
        value={settings.quietHoursEnd ?? ''}
        onCommit={(t) => void update({ quietHoursEnd: t.trim() === '' ? null : t })}
      />
    </View>
  );
}

export default function ProfileScreen() {
  const {
    loading,
    error,
    currentStreak,
    longestStreak,
    totalQuestionsAnswered,
    totalStudySessions,
  } = useProfile();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.heading} accessibilityRole="header">
        Profile
      </Text>

      {loading ? (
        <ActivityIndicator color={theme.accent} accessibilityLabel="Loading your profile" />
      ) : null}

      {error ? (
        <Text style={styles.errorBanner} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      {!loading && !error ? (
        <View style={styles.grid}>
          <StatCard label="Current streak" value={currentStreak} unit="days" />
          <StatCard label="Longest streak" value={longestStreak} unit="days" />
          <StatCard label="Questions answered" value={totalQuestionsAnswered} />
          <StatCard label="Study sessions" value={totalStudySessions} />
        </View>
      ) : null}

      <NotificationSettingsSection />
      <AccessibilitySection />
    </ScrollView>
  );
}

function AccessibilitySection() {
  const { highContrast, setHighContrast } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.section}>
      <Text style={styles.sectionHeading} accessibilityRole="header">
        Accessibility
      </Text>
      <ToggleRow
        label="High-contrast theme"
        value={highContrast}
        onValueChange={setHighContrast}
      />
    </View>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: {
      backgroundColor: theme.background,
      flex: 1,
    },
    content: {
      gap: 14,
      padding: 16,
    },
    heading: {
      color: theme.textPrimary,
      fontSize: 22,
      fontWeight: '700',
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    statCard: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      flexBasis: '47%',
      flexGrow: 1,
      gap: 6,
      padding: 18,
    },
    statValue: {
      color: theme.textPrimary,
      fontSize: 32,
      fontWeight: '800',
    },
    statLabel: {
      color: theme.textSecondary,
      fontSize: 14,
      fontWeight: '600',
    },
    errorBanner: {
      backgroundColor: theme.dangerSurface,
      borderRadius: 8,
      color: theme.onDangerSurface,
      padding: 12,
    },
    section: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      gap: 4,
      marginTop: 8,
      padding: 16,
    },
    sectionHeading: {
      color: theme.textPrimary,
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 6,
    },
    row: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
    },
    rowLabel: {
      color: theme.textBody,
      flexShrink: 1,
      fontSize: 15,
    },
    timeInput: {
      backgroundColor: theme.background,
      borderRadius: 8,
      color: theme.textPrimary,
      minWidth: 90,
      paddingHorizontal: 12,
      paddingVertical: 8,
      textAlign: 'center',
    },
    permissionPrompt: {
      backgroundColor: theme.warningSurface,
      borderRadius: 8,
      marginBottom: 8,
      padding: 12,
    },
    permissionPromptText: {
      color: theme.onWarningSurface,
      fontSize: 14,
    },
  });

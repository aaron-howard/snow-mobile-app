import { useProfile } from '@/domain/analytics/useProfile';
import { useNotificationSettings } from '@/domain/notifications/useNotificationSettings';
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
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <TextInput
        defaultValue={value}
        onEndEditing={(e) => onCommit(e.nativeEvent.text)}
        placeholder="HH:MM"
        placeholderTextColor="#64748B"
        keyboardType="numbers-and-punctuation"
        style={styles.timeInput}
        accessibilityLabel={`${label}, 24-hour HH:MM`}
      />
    </View>
  );
}

function NotificationSettingsSection() {
  const { loading, error, settings, permission, update, requestPermission } =
    useNotificationSettings();

  if (loading) {
    return <ActivityIndicator color="#60A5FA" accessibilityLabel="Loading notification settings" />;
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

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.heading} accessibilityRole="header">
        Profile
      </Text>

      {loading ? (
        <ActivityIndicator color="#60A5FA" accessibilityLabel="Loading your profile" />
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#0F172A',
    flex: 1,
  },
  content: {
    gap: 14,
    padding: 16,
  },
  heading: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    flexBasis: '47%',
    flexGrow: 1,
    gap: 6,
    padding: 18,
  },
  statValue: {
    color: '#F8FAFC',
    fontSize: 32,
    fontWeight: '800',
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: '#7F1D1D',
    borderRadius: 8,
    color: '#FEE2E2',
    padding: 12,
  },
  section: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    gap: 4,
    marginTop: 8,
    padding: 16,
  },
  sectionHeading: {
    color: '#F8FAFC',
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
    color: '#E2E8F0',
    flexShrink: 1,
    fontSize: 15,
  },
  timeInput: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    color: '#F8FAFC',
    minWidth: 90,
    paddingHorizontal: 12,
    paddingVertical: 8,
    textAlign: 'center',
  },
  permissionPrompt: {
    backgroundColor: '#78350F',
    borderRadius: 8,
    marginBottom: 8,
    padding: 12,
  },
  permissionPromptText: {
    color: '#FEF3C7',
    fontSize: 14,
  },
});

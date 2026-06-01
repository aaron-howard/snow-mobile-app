import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useHomeDashboard, type HomeExamSummary } from '@domain/analytics/useHomeDashboard';
import { ProgressRing } from '@ui/ProgressRing';
import { useTheme, useThemedStyles, type Theme } from '@ui/theme';

const ACTIONS = [
  { key: 'quiz', label: 'Quiz', to: (id: string) => `/exam/${id}/quiz` },
  { key: 'flashcards', label: 'Flashcards', to: (id: string) => `/exam/${id}/flashcards` },
  { key: 'simulator', label: 'Simulator', to: (id: string) => `/exam/${id}/simulator` },
] as const;

function ExamCard({ exam }: { exam: HomeExamSummary }) {
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.card}>
      <Text style={styles.examName} accessibilityRole="header">
        {exam.name}
      </Text>

      <View style={styles.cardBody}>
        <ProgressRing score={exam.readinessScore} size={104} />
        <View
          style={styles.streakBox}
          accessibilityRole="text"
          accessibilityLabel={`Current streak: ${exam.currentStreak} ${
            exam.currentStreak === 1 ? 'day' : 'days'
          }`}
        >
          <Text style={styles.streakValue}>{'\uD83D\uDD25'} {exam.currentStreak}</Text>
          <Text style={styles.streakLabel}>day streak</Text>
        </View>
      </View>

      <View style={styles.actions}>
        {ACTIONS.map((action) => (
          <Pressable
            key={action.key}
            style={styles.actionButton}
            onPress={() => router.push(action.to(exam.examId))}
            accessibilityRole="button"
            accessibilityLabel={`Start ${action.label} for ${exam.name}`}
          >
            <Text style={styles.actionLabel}>{action.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { loading, error, exams } = useHomeDashboard();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.heading} accessibilityRole="header">
        Your study list
      </Text>
      <Text style={styles.disclaimer}>Unofficial — not affiliated with or endorsed by ServiceNow, Inc.</Text>

      {loading ? (
        <ActivityIndicator color={theme.accent} accessibilityLabel="Loading your study list" />
      ) : null}

      {error ? (
        <Text style={styles.errorBanner} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      {!loading && !error && exams.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            You haven&apos;t enrolled in any exams yet. Browse the catalog to get started.
          </Text>
          <Pressable
            style={styles.actionButton}
            onPress={() => router.push('/(tabs)/catalog')}
            accessibilityRole="button"
            accessibilityLabel="Browse the exam catalog"
          >
            <Text style={styles.actionLabel}>Browse catalog</Text>
          </Pressable>
        </View>
      ) : null}

      {!loading && !error
        ? exams.map((exam) => <ExamCard key={exam.examId} exam={exam} />)
        : null}
    </ScrollView>
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
    disclaimer: {
      color: theme.textSecondary,
      fontSize: 12,
    },
    card: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      gap: 14,
      padding: 16,
    },
    examName: {
      color: theme.textPrimary,
      fontSize: 18,
      fontWeight: '700',
    },
    cardBody: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 20,
    },
    streakBox: {
      flex: 1,
    },
    streakValue: {
      color: theme.warning,
      fontSize: 28,
      fontWeight: '800',
    },
    streakLabel: {
      color: theme.textSecondary,
      fontSize: 14,
      fontWeight: '600',
    },
    actions: {
      flexDirection: 'row',
      gap: 10,
    },
    actionButton: {
      alignItems: 'center',
      backgroundColor: theme.accentStrong,
      borderRadius: 8,
      flexGrow: 1,
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    actionLabel: {
      color: theme.onAccentStrong,
      fontSize: 15,
      fontWeight: '600',
    },
    errorBanner: {
      backgroundColor: theme.dangerSurface,
      borderRadius: 8,
      color: theme.onDangerSurface,
      padding: 12,
    },
    empty: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      gap: 12,
      padding: 16,
    },
    emptyText: {
      color: theme.textBody,
      fontSize: 15,
      lineHeight: 22,
    },
  });

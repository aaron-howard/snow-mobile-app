import { useEnrolledExams } from '@/domain/catalog/useEnrolledExams';
import { useProgress } from '@/domain/analytics/useProgress';
import { DomainAccuracyChart } from '@ui/DomainAccuracyChart';
import { ProgressRing } from '@ui/ProgressRing';
import { StudyCalendar } from '@ui/StudyCalendar';
import { useTheme, useThemedStyles, type Theme } from '@ui/theme';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function ProgressScreen() {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { exams, loading: examsLoading } = useEnrolledExams();
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedExamId === null && exams.length > 0) {
      setSelectedExamId(exams[0]!.id);
    }
  }, [exams, selectedExamId]);

  const {
    loading,
    error,
    hasData,
    readinessScore,
    domainAccuracy,
    studyDays,
    showReadiness80,
    dismissReadiness80,
  } = useProgress(selectedExamId ?? undefined);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.heading} accessibilityRole="header">
        Progress
      </Text>

      {examsLoading ? (
        <ActivityIndicator color={theme.accent} accessibilityLabel="Loading your exams" />
      ) : null}

      {!examsLoading && exams.length === 0 ? (
        <Text style={styles.empty}>
          Enroll in an exam from the Catalog to start tracking your progress.
        </Text>
      ) : null}

      {exams.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.picker}>
          <View style={styles.pickerRow}>
            {exams.map((exam) => {
              const selected = exam.id === selectedExamId;
              return (
                <Pressable
                  key={exam.id}
                  style={[styles.chip, selected ? styles.chipSelected : null]}
                  onPress={() => setSelectedExamId(exam.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Show progress for ${exam.name}`}
                >
                  <Text style={styles.chipLabel}>{exam.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      ) : null}

      {loading && selectedExamId ? (
        <ActivityIndicator color={theme.accent} accessibilityLabel="Loading progress" />
      ) : null}

      {error ? (
        <Text style={styles.errorBanner} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      {!loading && !error && selectedExamId && !hasData ? (
        <Text style={styles.empty} accessibilityRole="text">
          No study data is available yet. Complete a quiz or exam simulator to see your progress.
        </Text>
      ) : null}

      {!loading && !error && selectedExamId && hasData ? (
        <>
          {showReadiness80 ? (
            <View style={styles.readinessBanner} accessibilityRole="alert" accessibilityLiveRegion="polite">
              <Text style={styles.readinessText}>
                You&apos;ve reached a readiness score of {readinessScore}. Consider scheduling your
                official exam.
              </Text>
              <Pressable
                onPress={dismissReadiness80}
                accessibilityRole="button"
                accessibilityLabel="Dismiss exam readiness recommendation"
              >
                <Text style={styles.readinessDismiss}>Dismiss</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.card}>
            <ProgressRing score={readinessScore} tone="onCard" />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle} accessibilityRole="header">
              Accuracy by domain
            </Text>
            {domainAccuracy.length > 0 ? (
              <DomainAccuracyChart data={domainAccuracy} />
            ) : (
              <Text style={styles.muted}>No domain data yet.</Text>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle} accessibilityRole="header">
              Study activity
            </Text>
            <StudyCalendar studyDays={studyDays} />
          </View>
        </>
      ) : null}
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
    picker: {
      flexGrow: 0,
    },
    pickerRow: {
      flexDirection: 'row',
      gap: 8,
    },
    chip: {
      borderColor: theme.borderStrong,
      borderRadius: 20,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    chipSelected: {
      backgroundColor: theme.accentStrong,
      borderColor: theme.accentStrong,
    },
    chipLabel: {
      color: theme.textBody,
      fontSize: 13,
    },
    card: {
      backgroundColor: theme.card,
      borderRadius: 12,
      gap: 10,
      padding: 16,
    },
    cardTitle: {
      color: theme.cardText,
      fontSize: 16,
      fontWeight: '700',
    },
    muted: {
      color: theme.cardMuted,
      fontSize: 14,
    },
    empty: {
      color: theme.textSecondary,
      fontSize: 15,
      lineHeight: 22,
      marginTop: 12,
    },
    errorBanner: {
      backgroundColor: theme.dangerSurface,
      borderRadius: 8,
      color: theme.onDangerSurface,
      padding: 12,
    },
    readinessBanner: {
      backgroundColor: theme.successSurface,
      borderRadius: 10,
      gap: 8,
      padding: 14,
    },
    readinessText: {
      color: theme.onSuccessSurface,
      fontSize: 15,
      lineHeight: 21,
    },
    readinessDismiss: {
      color: theme.onSuccessSurface,
      fontWeight: '700',
    },
  });

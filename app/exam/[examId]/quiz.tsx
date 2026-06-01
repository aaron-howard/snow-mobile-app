import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { QuestionCard } from '@ui/QuestionCard';
import { BookmarkButton } from '@ui/BookmarkButton';
import { useQuiz, type QuizMode } from '@domain/practice/useQuiz';
import { useBookmarkToggle } from '@domain/bookmarks/useBookmarkToggle';
import { useTheme, useThemedStyles, type Theme } from '@ui/theme';

export default function QuizScreen() {
  const { examId, mode } = useLocalSearchParams<{ examId: string; mode?: string }>();
  const router = useRouter();
  const quizMode: QuizMode = mode === 'bookmark' ? 'bookmark' : 'standard';
  const { isBookmarked, toggle } = useBookmarkToggle(examId);
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const {
    loading,
    error,
    session,
    currentIndex,
    result,
    selectedAnswerId,
    submitting,
    isLastQuestion,
    summary,
    select,
    next,
    finish,
  } = useQuiz(examId, quizMode);

  const current = session?.questions[currentIndex];
  const total = session?.questions.length ?? 0;

  return (
    <View style={styles.screen}>
      <Text style={styles.heading} accessibilityRole="header">
        {quizMode === 'bookmark' ? 'Bookmarked questions' : 'Quiz'}
      </Text>

      {loading ? (
        <View style={styles.centered} accessibilityLabel="Starting quiz">
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : null}

      {error ? (
        <Text style={styles.errorBanner} accessibilityRole="alert" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      {!loading && !error && session && total === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.empty} accessibilityRole="text">
            {quizMode === 'bookmark'
              ? 'You have no bookmarked questions for this exam yet.'
              : 'No questions are available for this exam yet.'}
          </Text>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={styles.secondaryLabel}>Back</Text>
          </Pressable>
        </View>
      ) : null}

      {summary ? (
        <ScrollView contentContainerStyle={styles.summary}>
          <Text style={styles.summaryScore} accessibilityRole="header">
            {summary.scorePercent}%
          </Text>
          <Text
            style={styles.summaryLine}
            accessibilityLabel={`${summary.correctAnswers} correct, ${summary.incorrectAnswers} incorrect`}
          >
            {summary.correctAnswers} correct · {summary.incorrectAnswers} incorrect
          </Text>

          {summary.domainBreakdown.length > 0 ? (
            <View style={styles.breakdown}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                By topic domain
              </Text>
              {summary.domainBreakdown.map((d) => (
                <Text
                  key={d.domainId}
                  style={styles.breakdownRow}
                  accessibilityLabel={`Domain ${d.domainId}: ${d.correct} of ${d.total} correct`}
                >
                  {d.correct}/{d.total} correct
                </Text>
              ))}
            </View>
          ) : null}

          <Pressable
            style={styles.primaryButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Finish and return"
          >
            <Text style={styles.primaryLabel}>Done</Text>
          </Pressable>
        </ScrollView>
      ) : null}

      {!loading && !error && !summary && current ? (
        <ScrollView contentContainerStyle={styles.body}>
          {session?.poolWasReset ? (
            <Text
              style={styles.resetBanner}
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
            >
              You&apos;ve answered every question — the pool has been refreshed.
            </Text>
          ) : null}

          <View style={styles.progressRow}>
            <Text style={styles.progress} accessibilityLabel={`Question ${currentIndex + 1} of ${total}`}>
              Question {currentIndex + 1} of {total}
            </Text>
            {examId ? (
              <BookmarkButton
                active={isBookmarked('question', current.question.id)}
                itemLabel="question"
                onToggle={() =>
                  void toggle({ id: current.question.id, itemType: 'question', examId })
                }
              />
            ) : null}
          </View>

          <QuestionCard
            question={current.question}
            choices={current.choices}
            selectedAnswerId={selectedAnswerId}
            result={result}
            onSelect={(answerId) => void select(answerId)}
          />

          {submitting ? (
            <ActivityIndicator style={styles.inlineSpinner} color={theme.accent} accessibilityLabel="Checking answer" />
          ) : null}

          {result ? (
            isLastQuestion ? (
              <Pressable
                style={styles.primaryButton}
                onPress={() => void finish()}
                accessibilityRole="button"
                accessibilityLabel="Finish quiz and see summary"
              >
                <Text style={styles.primaryLabel}>Finish</Text>
              </Pressable>
            ) : (
              <Pressable
                style={styles.primaryButton}
                onPress={next}
                accessibilityRole="button"
                accessibilityLabel="Next question"
              >
                <Text style={styles.primaryLabel}>Next</Text>
              </Pressable>
            )
          ) : null}
        </ScrollView>
      ) : null}
    </View>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: {
      backgroundColor: theme.background,
      flex: 1,
      padding: 16,
    },
    heading: {
      color: theme.textPrimary,
      fontSize: 22,
      fontWeight: '700',
      marginBottom: 12,
    },
    centered: {
      alignItems: 'center',
      paddingVertical: 32,
    },
    errorBanner: {
      backgroundColor: theme.dangerSurface,
      borderRadius: 8,
      color: theme.onDangerSurface,
      marginBottom: 12,
      padding: 12,
    },
    empty: {
      color: theme.textSecondary,
      fontSize: 15,
      marginBottom: 16,
      textAlign: 'center',
    },
    body: {
      paddingBottom: 32,
    },
    resetBanner: {
      backgroundColor: theme.infoSurface,
      borderRadius: 8,
      color: theme.onInfoSurface,
      marginBottom: 12,
      padding: 12,
    },
    progressRow: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    progress: {
      color: theme.textSecondary,
      fontSize: 14,
    },
    inlineSpinner: {
      marginTop: 16,
    },
    primaryButton: {
      alignItems: 'center',
      backgroundColor: theme.accentStrong,
      borderRadius: 8,
      marginTop: 20,
      paddingVertical: 14,
    },
    primaryLabel: {
      color: theme.onAccentStrong,
      fontSize: 16,
      fontWeight: '600',
    },
    secondaryButton: {
      borderColor: theme.borderStrong,
      borderRadius: 8,
      borderWidth: 1,
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    secondaryLabel: {
      color: theme.textBody,
      fontSize: 15,
      fontWeight: '600',
    },
    summary: {
      alignItems: 'center',
      paddingBottom: 32,
      paddingTop: 16,
    },
    summaryScore: {
      color: theme.textPrimary,
      fontSize: 48,
      fontWeight: '800',
    },
    summaryLine: {
      color: theme.textBody,
      fontSize: 16,
      marginTop: 8,
    },
    breakdown: {
      alignSelf: 'stretch',
      marginTop: 24,
    },
    sectionTitle: {
      color: theme.textBody,
      fontSize: 15,
      fontWeight: '600',
      marginBottom: 8,
    },
    breakdownRow: {
      color: theme.textBody,
      fontSize: 14,
      marginBottom: 4,
    },
  });

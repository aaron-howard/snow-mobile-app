import { useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { QuestionCard } from '@ui/QuestionCard';
import { TimerDisplay } from '@ui/TimerDisplay';
import { useSimulator } from '@domain/simulator/useSimulator';

export default function SimulatorScreen() {
  const { examId } = useLocalSearchParams<{ examId: string }>();
  const {
    phase,
    error,
    session,
    currentIndex,
    remainingSeconds,
    paused,
    confirmation,
    result,
    start,
    select,
    toggleFlag,
    goNext,
    goPrev,
    requestSubmit,
    cancelSubmit,
    confirmSubmit,
    restart,
    discard,
  } = useSimulator(examId);

  const current = session?.questions[currentIndex] ?? null;
  const total = session?.questions.length ?? 0;
  const isFlagged = current ? session?.flaggedQuestions.includes(current.question.id) : false;
  const questionTextById = (id: string) =>
    session?.questions.find((q) => q.question.id === id)?.question.text ?? id;

  return (
    <View style={styles.screen}>
      {phase === 'active' ? <TimerDisplay remainingSeconds={remainingSeconds} paused={paused} /> : null}

      {phase === 'loading' ? (
        <View style={styles.centered} accessibilityLabel="Loading simulator">
          <ActivityIndicator size="large" color="#60A5FA" />
        </View>
      ) : null}

      {phase === 'idle' ? (
        <View style={styles.body}>
          <Text style={styles.heading} accessibilityRole="header">
            Exam simulator
          </Text>
          <Text style={styles.intro}>
            A timed, full-length mock exam under official conditions. The countdown stays visible
            while you work, and you can flag questions to revisit before submitting.
          </Text>
          {error ? (
            <Text style={styles.errorBanner} accessibilityRole="alert">
              {error}
            </Text>
          ) : null}
          <Pressable
            style={styles.primaryButton}
            onPress={() => void start()}
            accessibilityRole="button"
            accessibilityLabel="Start exam simulator"
          >
            <Text style={styles.primaryLabel}>Start simulator</Text>
          </Pressable>
        </View>
      ) : null}

      {phase === 'restore_error' ? (
        <View style={styles.body}>
          <Text style={styles.heading} accessibilityRole="header">
            Couldn&apos;t restore your session
          </Text>
          <Text style={styles.errorBanner} accessibilityRole="alert" accessibilityLiveRegion="polite">
            {error ?? 'Your previous simulator session could not be restored.'}
          </Text>
          <View style={styles.row}>
            <Pressable
              style={[styles.secondaryButton, styles.flex1]}
              onPress={() => void discard()}
              accessibilityRole="button"
              accessibilityLabel="Discard session"
            >
              <Text style={styles.secondaryLabel}>Discard</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryButton, styles.flex1]}
              onPress={() => void restart()}
              accessibilityRole="button"
              accessibilityLabel="Restart session"
            >
              <Text style={styles.primaryLabel}>Restart</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {phase === 'submitting' ? (
        <View style={styles.centered} accessibilityLabel="Submitting simulator">
          <ActivityIndicator size="large" color="#60A5FA" />
          <Text style={styles.intro}>Scoring your exam…</Text>
        </View>
      ) : null}

      {phase === 'active' && current ? (
        <ScrollView contentContainerStyle={styles.body}>
          {paused ? (
            <Text style={styles.pausedBanner} accessibilityLiveRegion="polite">
              Paused — return to the app to continue.
            </Text>
          ) : null}

          <View style={styles.progressRow}>
            <Text style={styles.progress} accessibilityRole="header">
              Question {currentIndex + 1} of {total}
            </Text>
            <Pressable
              onPress={() => void toggleFlag(current.question.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: isFlagged }}
              accessibilityLabel={isFlagged ? 'Unflag this question' : 'Flag this question for review'}
              style={[styles.flagButton, isFlagged ? styles.flagButtonActive : null]}
            >
              <Text style={styles.flagLabel}>{isFlagged ? '⚑ Flagged' : '⚐ Flag'}</Text>
            </Pressable>
          </View>

          <QuestionCard
            question={current.question}
            choices={current.choices}
            selectedAnswerId={session?.answers[current.question.id] ?? null}
            result={null}
            onSelect={(answerId) => void select(current.question.id, answerId)}
          />

          <View style={styles.navRow}>
            <Pressable
              onPress={goPrev}
              disabled={currentIndex === 0}
              accessibilityRole="button"
              accessibilityLabel="Previous question"
              style={[styles.navButton, currentIndex === 0 ? styles.navDisabled : null]}
            >
              <Text style={styles.navLabel}>Previous</Text>
            </Pressable>
            {currentIndex < total - 1 ? (
              <Pressable
                onPress={goNext}
                accessibilityRole="button"
                accessibilityLabel="Next question"
                style={styles.navButton}
              >
                <Text style={styles.navLabel}>Next</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={requestSubmit}
                accessibilityRole="button"
                accessibilityLabel="Submit exam"
                style={[styles.navButton, styles.submitButton]}
              >
                <Text style={styles.navLabel}>Submit</Text>
              </Pressable>
            )}
          </View>

          <Pressable
            onPress={requestSubmit}
            accessibilityRole="button"
            accessibilityLabel="Submit exam now"
            style={styles.submitLink}
          >
            <Text style={styles.submitLinkLabel}>Submit exam</Text>
          </Pressable>
        </ScrollView>
      ) : null}

      {phase === 'result' && result ? (
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.heading} accessibilityRole="header">
            Results
          </Text>
          <View
            style={[styles.resultBadge, result.passed ? styles.passBadge : styles.failBadge]}
            accessibilityLabel={`${result.passed ? 'Passed' : 'Failed'}. Score ${result.scorePercent} percent. Passing threshold ${result.passingThreshold} percent.`}
          >
            <Text style={styles.resultScore}>{result.scorePercent}%</Text>
            <Text style={styles.resultStatus}>
              {result.passed ? 'PASS' : 'FAIL'} · threshold {result.passingThreshold}%
            </Text>
          </View>

          <Text style={styles.sectionHeading} accessibilityRole="header">
            Per-domain breakdown
          </Text>
          {result.domainBreakdown.map((d) => (
            <Text key={d.domainId} style={styles.domainLine}>
              {d.domainId}: {d.correct}/{d.total}
            </Text>
          ))}

          <Text style={styles.sectionHeading} accessibilityRole="header">
            Review incorrect questions ({result.incorrectQuestions.length})
          </Text>
          {result.incorrectQuestions.map((q) => (
            <View key={q.questionId} style={styles.incorrectItem}>
              <Text style={styles.incorrectQuestion}>{questionTextById(q.questionId)}</Text>
              <Text style={styles.incorrectExplanation}>{q.explanation}</Text>
            </View>
          ))}
        </ScrollView>
      ) : null}

      <Modal
        visible={confirmation !== null}
        transparent
        animationType="fade"
        onRequestClose={cancelSubmit}
        accessibilityViewIsModal
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle} accessibilityRole="header">
              Submit exam?
            </Text>
            <Text style={styles.modalBody} accessibilityLiveRegion="polite">
              {confirmation
                ? `You have ${confirmation.unanswered} unanswered and ${confirmation.flagged} flagged question${
                    confirmation.flagged === 1 ? '' : 's'
                  }.`
                : ''}
            </Text>
            <View style={styles.row}>
              <Pressable
                onPress={cancelSubmit}
                accessibilityRole="button"
                accessibilityLabel="Keep working"
                style={[styles.secondaryButton, styles.flex1]}
              >
                <Text style={styles.secondaryLabel}>Keep working</Text>
              </Pressable>
              <Pressable
                onPress={() => void confirmSubmit()}
                accessibilityRole="button"
                accessibilityLabel="Confirm submission"
                style={[styles.primaryButton, styles.flex1]}
              >
                <Text style={styles.primaryLabel}>Submit</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#0F172A',
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    padding: 24,
  },
  body: {
    gap: 12,
    padding: 16,
  },
  heading: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '700',
  },
  intro: {
    color: '#CBD5E1',
    fontSize: 15,
    lineHeight: 22,
  },
  errorBanner: {
    backgroundColor: '#7F1D1D',
    borderRadius: 8,
    color: '#FEE2E2',
    padding: 12,
  },
  pausedBanner: {
    backgroundColor: '#78350F',
    borderRadius: 8,
    color: '#FEF3C7',
    padding: 10,
    textAlign: 'center',
  },
  progressRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progress: {
    color: '#E2E8F0',
    fontSize: 16,
    fontWeight: '600',
  },
  flagButton: {
    borderColor: '#475569',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  flagButtonActive: {
    backgroundColor: '#B45309',
    borderColor: '#F59E0B',
  },
  flagLabel: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
  },
  navRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  navButton: {
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 8,
    flex: 1,
    paddingVertical: 12,
  },
  navDisabled: {
    opacity: 0.4,
  },
  submitButton: {
    backgroundColor: '#1D4ED8',
  },
  navLabel: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '600',
  },
  submitLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  submitLinkLabel: {
    color: '#93C5FD',
    fontSize: 14,
    fontWeight: '600',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  primaryLabel: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#475569',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  secondaryLabel: {
    color: '#E2E8F0',
    fontSize: 16,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  resultBadge: {
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 20,
  },
  passBadge: {
    backgroundColor: '#14532D',
  },
  failBadge: {
    backgroundColor: '#7F1D1D',
  },
  resultScore: {
    color: '#F8FAFC',
    fontSize: 40,
    fontWeight: '800',
  },
  resultStatus: {
    color: '#E2E8F0',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  sectionHeading: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '700',
    marginTop: 12,
  },
  domainLine: {
    color: '#CBD5E1',
    fontSize: 15,
  },
  incorrectItem: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    gap: 6,
    padding: 12,
  },
  incorrectQuestion: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '600',
  },
  incorrectExplanation: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 20,
  },
  modalBackdrop: {
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    gap: 16,
    padding: 20,
  },
  modalTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
  },
  modalBody: {
    color: '#CBD5E1',
    fontSize: 15,
    lineHeight: 22,
  },
});

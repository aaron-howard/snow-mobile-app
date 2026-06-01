import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { AnswerChoiceRecord, AnswerResult, QuestionRecord } from '@domain/practice';

import { useThemedStyles } from './theme';
import type { Theme } from './theme';

export interface QuestionCardProps {
  question: QuestionRecord;
  choices: AnswerChoiceRecord[];
  /** The answer the user has selected, or null before they answer. */
  selectedAnswerId: string | null;
  /** Grading result once answered; null while the question is unanswered. */
  result: AnswerResult | null;
  onSelect: (answerId: string) => void;
}

/**
 * Shared quiz/simulator question card (Requirements 3.1, 3.2, 3.10, 3.11, 10.1,
 * 10.4).
 *
 * - Renders the question text and, when present, an image at full card width.
 * - Always renders the provided answer choices (callers guarantee ≥4 — Req 3.1,
 *   Property 7).
 * - After an answer, shows correct/incorrect feedback conveyed by text + icon
 *   (not color alone — Req 10.4) plus the explanation (Req 3.2), announced via
 *   an `accessibilityLiveRegion` (Req 10.1).
 */
export function QuestionCard({
  question,
  choices,
  selectedAnswerId,
  result,
  onSelect,
}: QuestionCardProps) {
  const styles = useThemedStyles(makeStyles);
  const answered = result !== null;

  return (
    <View style={styles.card}>
      {question.imageUrl ? (
        <Image
          source={{ uri: question.imageUrl }}
          style={styles.image}
          resizeMode="contain"
          accessible
          accessibilityRole="image"
          accessibilityLabel={question.imageAltText}
        />
      ) : null}

      <Text style={styles.questionText} accessibilityRole="header">
        {question.text}
      </Text>

      <View style={styles.choices}>
        {choices.map((choice) => {
          const isSelected = selectedAnswerId === choice.id;
          const showCorrect = answered && choice.isCorrect;
          const showWrongSelection = answered && isSelected && !choice.isCorrect;

          return (
            <Pressable
              key={choice.id}
              testID="answer-choice"
              disabled={answered}
              onPress={() => onSelect(choice.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected, disabled: answered }}
              accessibilityLabel={choiceA11yLabel(choice.text, {
                isSelected,
                showCorrect,
                showWrongSelection,
              })}
              style={[
                styles.choice,
                isSelected ? styles.choiceSelected : null,
                showCorrect ? styles.choiceCorrect : null,
                showWrongSelection ? styles.choiceWrong : null,
              ]}
            >
              <View style={styles.choiceRow}>
                {answered && (showCorrect || showWrongSelection) ? (
                  <Text style={styles.choiceIcon} accessibilityElementsHidden importantForAccessibility="no">
                    {showCorrect ? '\u2713' : '\u2717'}
                  </Text>
                ) : null}
                <Text style={styles.choiceText}>{choice.text}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {answered ? (
        <View
          style={styles.feedback}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
        >
          <Text
            style={[styles.feedbackHeading, result.isCorrect ? styles.correctText : styles.wrongText]}
          >
            {result.isCorrect ? '\u2713 Correct' : '\u2717 Incorrect'}
          </Text>
          <Text style={styles.explanation}>{question.explanation}</Text>
        </View>
      ) : null}
    </View>
  );
}

function choiceA11yLabel(
  text: string,
  state: { isSelected: boolean; showCorrect: boolean; showWrongSelection: boolean },
): string {
  if (state.showCorrect) return `${text}. Correct answer.`;
  if (state.showWrongSelection) return `${text}. Your answer, incorrect.`;
  if (state.isSelected) return `${text}. Selected.`;
  return text;
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: 16,
    },
    image: {
      width: '100%',
      height: 180,
      borderRadius: 8,
      marginBottom: 12,
      backgroundColor: theme.background,
    },
    questionText: {
      color: theme.textPrimary,
      fontSize: 18,
      fontWeight: '600',
      lineHeight: 25,
      marginBottom: 16,
    },
    choices: {
      gap: 10,
    },
    choice: {
      borderColor: theme.borderStrong,
      borderRadius: 10,
      borderWidth: 1,
      padding: 14,
    },
    choiceSelected: {
      borderColor: theme.accentStrong,
    },
    choiceCorrect: {
      backgroundColor: theme.successSurface,
      borderColor: theme.success,
    },
    choiceWrong: {
      backgroundColor: theme.dangerSurface,
      borderColor: theme.danger,
    },
    choiceRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 10,
    },
    choiceIcon: {
      color: theme.textPrimary,
      fontSize: 16,
      fontWeight: '700',
    },
    choiceText: {
      color: theme.textBody,
      flexShrink: 1,
      fontSize: 16,
    },
    feedback: {
      borderTopColor: theme.border,
      borderTopWidth: StyleSheet.hairlineWidth,
      marginTop: 16,
      paddingTop: 12,
    },
    feedbackHeading: {
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 6,
    },
    correctText: {
      color: theme.success,
    },
    wrongText: {
      color: theme.danger,
    },
    explanation: {
      color: theme.textBody,
      fontSize: 15,
      lineHeight: 21,
    },
  });

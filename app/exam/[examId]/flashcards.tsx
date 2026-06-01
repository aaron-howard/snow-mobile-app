import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { FlashcardDeck } from '@ui/FlashcardDeck';
import { BookmarkButton } from '@ui/BookmarkButton';
import { useFlashcards, type FlashcardMode } from '@domain/flashcards/useFlashcards';
import { useBookmarkToggle } from '@domain/bookmarks/useBookmarkToggle';
import { useTheme, useThemedStyles, type Theme } from '@ui/theme';

export default function FlashcardsScreen() {
  const { examId, mode } = useLocalSearchParams<{ examId: string; mode?: string }>();
  const fcMode: FlashcardMode = mode === 'bookmark' ? 'bookmark' : 'standard';
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const {
    loading,
    error,
    decks,
    selectedDeckId,
    selectDeck,
    currentCard,
    remaining,
    knownCount,
    stillLearningCount,
    summary,
    swipeKnown,
    swipeStillLearning,
    endSession,
    createCustomCard,
    creating,
    createError,
  } = useFlashcards(examId, fcMode);
  const isBookmarkMode = fcMode === 'bookmark';
  const { isBookmarked, toggle } = useBookmarkToggle(examId);

  const [createVisible, setCreateVisible] = useState(false);
  const [term, setTerm] = useState('');
  const [definition, setDefinition] = useState('');

  const openCreate = () => {
    setTerm('');
    setDefinition('');
    setCreateVisible(true);
  };

  const submitCreate = async () => {
    const ok = await createCustomCard(term, definition);
    if (ok) setCreateVisible(false);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.headerRow}>
        <Text style={styles.heading} accessibilityRole="header">
          {isBookmarkMode ? 'Bookmarked flashcards' : 'Flashcards'}
        </Text>
        {!isBookmarkMode ? (
          <Pressable
            onPress={openCreate}
            accessibilityRole="button"
            accessibilityLabel="Add a custom flashcard"
            style={styles.addButton}
          >
            <Text style={styles.addLabel}>+ Add</Text>
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.centered} accessibilityLabel="Loading flashcards">
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : null}

      {error ? (
        <Text style={styles.errorBanner} accessibilityRole="alert" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      {!loading && decks.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.deckRow}>
          <View style={styles.chips}>
            {decks.map((deck) => {
              const selected = deck.id === selectedDeckId;
              return (
                <Pressable
                  key={deck.id}
                  onPress={() => selectDeck(deck.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Study deck ${deck.name}`}
                  style={[styles.chip, selected ? styles.chipSelected : null]}
                >
                  <Text style={styles.chipLabel}>{deck.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      ) : null}

      {!loading && !summary ? (
        <View style={styles.sessionBar}>
          <Text style={styles.stat} accessibilityLabel={`${knownCount} known`}>
            ✓ {knownCount}
          </Text>
          <Text style={styles.stat} accessibilityLabel={`${stillLearningCount} still learning`}>
            ↺ {stillLearningCount}
          </Text>
          <Text style={styles.stat} accessibilityLabel={`${remaining} remaining`}>
            {remaining} left
          </Text>
          {currentCard && examId ? (
            <BookmarkButton
              active={isBookmarked('flashcard', currentCard.id)}
              itemLabel="flashcard"
              onToggle={() => void toggle({ id: currentCard.id, itemType: 'flashcard', examId })}
            />
          ) : null}
          {currentCard ? (
            <Pressable
              onPress={endSession}
              accessibilityRole="button"
              accessibilityLabel="End session"
              style={styles.endButton}
            >
              <Text style={styles.endLabel}>End</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {!loading && summary ? (
        <View style={styles.summary}>
          <Text style={styles.summaryHeading} accessibilityRole="header">
            Session complete
          </Text>
          <Text style={styles.summaryLine} accessibilityLabel={`${summary.known} known`}>
            ✓ Known: {summary.known}
          </Text>
          <Text
            style={styles.summaryLine}
            accessibilityLabel={`${summary.stillLearning} still learning`}
          >
            ↺ Still learning: {summary.stillLearning}
          </Text>
          <Pressable
            onPress={() => selectedDeckId && selectDeck(selectedDeckId)}
            accessibilityRole="button"
            accessibilityLabel="Study this deck again"
            style={styles.primaryButton}
          >
            <Text style={styles.primaryLabel}>Study again</Text>
          </Pressable>
        </View>
      ) : null}

      {!loading && !summary ? (
        <FlashcardDeck
          card={currentCard}
          onSwipeKnown={() => void swipeKnown()}
          onSwipeStillLearning={() => void swipeStillLearning()}
          onCreateRequest={openCreate}
        />
      ) : null}

      <Modal
        visible={createVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCreateVisible(false)}
        accessibilityViewIsModal
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle} accessibilityRole="header">
              New flashcard
            </Text>

            {createError ? (
              <Text style={styles.createError} accessibilityRole="alert" accessibilityLiveRegion="polite">
                {createError}
              </Text>
            ) : null}

            <Text style={styles.inputLabel}>Term</Text>
            <TextInput
              value={term}
              onChangeText={setTerm}
              style={styles.input}
              placeholder="e.g. GlideRecord"
              placeholderTextColor={theme.textSecondary}
              accessibilityLabel="Flashcard term"
            />

            <Text style={styles.inputLabel}>Definition</Text>
            <TextInput
              value={definition}
              onChangeText={setDefinition}
              style={[styles.input, styles.inputMultiline]}
              placeholder="What does it mean?"
              placeholderTextColor={theme.textSecondary}
              multiline
              accessibilityLabel="Flashcard definition"
            />

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setCreateVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryLabel}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => void submitCreate()}
                disabled={creating}
                accessibilityRole="button"
                accessibilityLabel="Save flashcard"
                style={styles.primaryButton}
              >
                {creating ? (
                  <ActivityIndicator color={theme.onAccentStrong} />
                ) : (
                  <Text style={styles.primaryLabel}>Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    headerRow: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    heading: {
      color: theme.textPrimary,
      fontSize: 22,
      fontWeight: '700',
    },
    addButton: {
      backgroundColor: theme.surface,
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    addLabel: {
      color: theme.accent,
      fontSize: 14,
      fontWeight: '600',
    },
    centered: {
      paddingVertical: 32,
    },
    errorBanner: {
      backgroundColor: theme.dangerSurface,
      borderRadius: 8,
      color: theme.onDangerSurface,
      marginBottom: 12,
      padding: 12,
    },
    deckRow: {
      flexGrow: 0,
      marginBottom: 12,
    },
    chips: {
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
    sessionBar: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 16,
      marginBottom: 16,
    },
    stat: {
      color: theme.textBody,
      fontSize: 15,
      fontWeight: '600',
    },
    endButton: {
      borderColor: theme.borderStrong,
      borderRadius: 8,
      borderWidth: 1,
      marginLeft: 'auto',
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    endLabel: {
      color: theme.textBody,
      fontSize: 13,
      fontWeight: '600',
    },
    summary: {
      alignItems: 'center',
      paddingVertical: 32,
    },
    summaryHeading: {
      color: theme.textPrimary,
      fontSize: 20,
      fontWeight: '700',
      marginBottom: 16,
    },
    summaryLine: {
      color: theme.textBody,
      fontSize: 16,
      marginBottom: 8,
    },
    primaryButton: {
      alignItems: 'center',
      backgroundColor: theme.accentStrong,
      borderRadius: 8,
      marginTop: 16,
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    primaryLabel: {
      color: theme.onAccentStrong,
      fontSize: 16,
      fontWeight: '600',
    },
    modalBackdrop: {
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      flex: 1,
      justifyContent: 'center',
      padding: 24,
    },
    modalCard: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: 20,
    },
    modalTitle: {
      color: theme.textPrimary,
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 12,
    },
    createError: {
      color: theme.danger,
      fontSize: 14,
      marginBottom: 12,
    },
    inputLabel: {
      color: theme.textSecondary,
      fontSize: 13,
      marginBottom: 6,
      marginTop: 10,
    },
    input: {
      backgroundColor: theme.background,
      borderColor: theme.border,
      borderRadius: 8,
      borderWidth: 1,
      color: theme.textPrimary,
      fontSize: 15,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    inputMultiline: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    modalActions: {
      flexDirection: 'row',
      gap: 12,
      justifyContent: 'flex-end',
      marginTop: 8,
    },
    secondaryButton: {
      alignItems: 'center',
      alignSelf: 'flex-end',
      borderColor: theme.borderStrong,
      borderRadius: 8,
      borderWidth: 1,
      marginTop: 16,
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    secondaryLabel: {
      color: theme.textBody,
      fontSize: 15,
      fontWeight: '600',
    },
  });

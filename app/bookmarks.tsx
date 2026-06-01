import { useBookmarks } from '@/domain/bookmarks/useBookmarks';
import { BookmarkButton } from '@ui/BookmarkButton';
import { useTheme, useThemedStyles, type Theme } from '@ui/theme';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString();
}

export default function BookmarksScreen() {
  const { loading, error, groups, removeBookmark } = useBookmarks();
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.heading} accessibilityRole="header">
        Bookmarks
      </Text>

      {loading ? (
        <ActivityIndicator color={theme.accent} accessibilityLabel="Loading your bookmarks" />
      ) : null}

      {error ? (
        <Text style={styles.errorBanner} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      {!loading && !error && groups.length === 0 ? (
        <Text style={styles.empty} accessibilityRole="text">
          You haven&apos;t bookmarked anything yet. Tap the star on a question or flashcard to save it
          for later review.
        </Text>
      ) : null}

      {groups.map((group) => (
        <View key={group.examId} style={styles.card}>
          <Text style={styles.examName} accessibilityRole="header">
            {group.examName}
          </Text>
          <Text style={styles.counts}>
            {group.questionCount} question{group.questionCount === 1 ? '' : 's'} ·{' '}
            {group.flashcardCount} flashcard{group.flashcardCount === 1 ? '' : 's'}
          </Text>

          <View style={styles.actions}>
            <Pressable
              style={[styles.startButton, group.questionCount === 0 ? styles.startDisabled : null]}
              disabled={group.questionCount === 0}
              onPress={() => router.push(`/exam/${group.examId}/quiz?mode=bookmark`)}
              accessibilityRole="button"
              accessibilityState={{ disabled: group.questionCount === 0 }}
              accessibilityLabel={`Start a quiz from bookmarked questions for ${group.examName}`}
            >
              <Text style={styles.startLabel}>Start quiz</Text>
            </Pressable>
            <Pressable
              style={[styles.startButton, group.flashcardCount === 0 ? styles.startDisabled : null]}
              disabled={group.flashcardCount === 0}
              onPress={() => router.push(`/exam/${group.examId}/flashcards?mode=bookmark`)}
              accessibilityRole="button"
              accessibilityState={{ disabled: group.flashcardCount === 0 }}
              accessibilityLabel={`Review bookmarked flashcards for ${group.examName}`}
            >
              <Text style={styles.startLabel}>Review flashcards</Text>
            </Pressable>
          </View>

          {group.bookmarks.map((bookmark) => (
            <View key={bookmark.id} style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.rowType}>
                  {bookmark.itemType === 'question' ? 'Question' : 'Flashcard'}
                </Text>
                <Text style={styles.rowDate}>Saved {formatDate(bookmark.createdAt)}</Text>
              </View>
              <BookmarkButton
                active
                itemLabel={bookmark.itemType}
                onToggle={() => void removeBookmark(bookmark)}
              />
            </View>
          ))}
        </View>
      ))}
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
    card: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      gap: 10,
      padding: 16,
    },
    examName: {
      color: theme.textPrimary,
      fontSize: 17,
      fontWeight: '700',
    },
    counts: {
      color: theme.textSecondary,
      fontSize: 13,
    },
    actions: {
      flexDirection: 'row',
      gap: 10,
    },
    startButton: {
      backgroundColor: theme.accentStrong,
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    startDisabled: {
      backgroundColor: theme.border,
    },
    startLabel: {
      color: theme.onAccentStrong,
      fontSize: 14,
      fontWeight: '600',
    },
    row: {
      alignItems: 'center',
      borderTopColor: theme.border,
      borderTopWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingTop: 10,
    },
    rowText: {
      flexShrink: 1,
      gap: 2,
    },
    rowType: {
      color: theme.textBody,
      fontSize: 15,
      fontWeight: '600',
    },
    rowDate: {
      color: theme.textSecondary,
      fontSize: 12,
    },
  });

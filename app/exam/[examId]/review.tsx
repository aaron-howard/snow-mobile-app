import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useCallback, useState } from 'react';
import { useReviewQueue } from '@domain/practice/useReviewQueue';
import { useTheme, useThemedStyles, type Theme } from '@ui/theme';

export default function ReviewScreen() {
  const { examId } = useLocalSearchParams<{ examId: string }>();
  const { loading, error, questions, refresh } = useReviewQueue(examId);
  const [refreshing, setRefreshing] = useState(false);
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  return (
    <View style={styles.screen}>
      <Text style={styles.heading} accessibilityRole="header">
        Review queue
      </Text>
      <Text style={styles.subhead}>
        Questions you&apos;ve missed, hardest first.
      </Text>

      {loading && questions.length === 0 ? (
        <View style={styles.centered} accessibilityLabel="Loading review queue">
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : null}

      {error ? (
        <Text style={styles.errorBanner} accessibilityRole="alert" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      <FlatList
        data={questions}
        keyExtractor={(q) => q.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          !loading && !error ? (
            <Text style={styles.empty} accessibilityRole="text">
              Nothing to review yet. Answer some questions and any you miss will show up here.
            </Text>
          ) : null
        }
        renderItem={({ item, index }) => (
          <View style={styles.row}>
            <Text style={styles.rowIndex} accessibilityElementsHidden importantForAccessibility="no">
              {index + 1}
            </Text>
            <Text
              style={styles.rowText}
              numberOfLines={3}
              accessibilityLabel={`Review question ${index + 1}: ${item.text}`}
            >
              {item.text}
            </Text>
          </View>
        )}
      />
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
    },
    subhead: {
      color: theme.textSecondary,
      fontSize: 14,
      marginBottom: 16,
      marginTop: 4,
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
    empty: {
      color: theme.textSecondary,
      fontSize: 15,
      marginTop: 24,
      textAlign: 'center',
    },
    row: {
      backgroundColor: theme.surface,
      borderRadius: 10,
      flexDirection: 'row',
      gap: 12,
      marginBottom: 10,
      padding: 14,
    },
    rowIndex: {
      color: theme.accent,
      fontSize: 16,
      fontWeight: '700',
    },
    rowText: {
      color: theme.textBody,
      flexShrink: 1,
      fontSize: 15,
      lineHeight: 21,
    },
  });

import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useCallback, useState } from 'react';
import { useReviewQueue } from '@domain/practice/useReviewQueue';

export default function ReviewScreen() {
  const { examId } = useLocalSearchParams<{ examId: string }>();
  const { loading, error, questions, refresh } = useReviewQueue(examId);
  const [refreshing, setRefreshing] = useState(false);

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
          <ActivityIndicator size="large" color="#60A5FA" />
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

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#0F172A',
    flex: 1,
    padding: 16,
  },
  heading: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '700',
  },
  subhead: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 16,
    marginTop: 4,
  },
  centered: {
    paddingVertical: 32,
  },
  errorBanner: {
    backgroundColor: '#7F1D1D',
    borderRadius: 8,
    color: '#FEE2E2',
    marginBottom: 12,
    padding: 12,
  },
  empty: {
    color: '#94A3B8',
    fontSize: 15,
    marginTop: 24,
    textAlign: 'center',
  },
  row: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
    padding: 14,
  },
  rowIndex: {
    color: '#60A5FA',
    fontSize: 16,
    fontWeight: '700',
  },
  rowText: {
    color: '#E2E8F0',
    flexShrink: 1,
    fontSize: 15,
    lineHeight: 21,
  },
});

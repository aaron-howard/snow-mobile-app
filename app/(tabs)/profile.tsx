import { useProfile } from '@/domain/analytics/useProfile';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

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
});

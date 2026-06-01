import { useCatalog } from '@/domain/catalog/useCatalog';
import { EnrollmentLimitWarning } from '@ui/EnrollmentLimitWarning';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function CatalogScreen() {
  const {
    exams,
    loading,
    loadError,
    enrollError,
    clearEnrollError,
    selectedExamId,
    selectExam,
    detail,
    detailLoading,
    domainByExam,
    setDomainForExam,
    enrollmentLimitVisible,
    dismissEnrollmentLimit,
    enroll,
    contentUpdates,
    dismissContentUpdate,
    refresh,
  } = useCatalog();

  const examNameById = (id: string) => exams.find((e) => e.id === id)?.name ?? 'this exam';

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
        Exam catalog
      </Text>
      <Text style={styles.disclaimer} accessibilityLabel="Unofficial study app disclaimer">
        Unofficial — not affiliated with ServiceNow, Inc.
      </Text>

      {loading && exams.length === 0 ? (
        <View style={styles.centered} accessibilityLabel="Loading exam catalog">
          <ActivityIndicator size="large" color="#60A5FA" />
        </View>
      ) : null}

      {loadError ? (
        <Text style={styles.errorBanner} accessibilityRole="alert">
          {loadError}
        </Text>
      ) : null}

      {enrollError ? (
        <View
          style={styles.errorBanner}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
        >
          <Text style={styles.errorText}>{enrollError}</Text>
          <Pressable
            onPress={clearEnrollError}
            accessibilityRole="button"
            accessibilityLabel="Dismiss enrollment error"
          >
            <Text style={styles.dismissLink}>Dismiss</Text>
          </Pressable>
        </View>
      ) : null}

      {contentUpdates.map((update) => {
        const name = examNameById(update.examId);
        return (
          <View
            key={update.notificationId}
            style={styles.updateBanner}
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
          >
            <Text
              style={styles.updateText}
              accessibilityLabel={`Updated content for ${name} has been downloaded for offline use.`}
            >
              {name} content was updated and refreshed for offline use.
            </Text>
            <Pressable
              onPress={() => dismissContentUpdate(update.notificationId)}
              accessibilityRole="button"
              accessibilityLabel={`Dismiss content update notice for ${name}`}
            >
              <Text style={styles.updateDismissLink}>Dismiss</Text>
            </Pressable>
          </View>
        );
      })}

      <FlatList
        data={exams}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.empty}>No exams available yet. Pull to refresh.</Text>
          ) : null
        }
        renderItem={({ item }) => {
          const expanded = selectedExamId === item.id;
          const showDetailBlock = expanded && detail && detail.examId === item.id;
          const showDetailSpinner =
            expanded && (detailLoading || !detail || detail.examId !== item.id);

          return (
            <View style={styles.card}>
              <Pressable
                onPress={() => selectExam(expanded ? null : item.id)}
                accessibilityRole="button"
                accessibilityLabel={`${item.name}, ${item.certificationLevel}. Estimated ${item.estimatedStudyHours} study hours. Tap for details.`}
                accessibilityState={{ expanded }}
              >
                <Text style={styles.examTitle}>{item.name}</Text>
                <Text style={styles.meta}>
                  {item.certificationLevel} · ~{item.estimatedStudyHours}h study
                </Text>
                {item.isEnrolled ? (
                  <Text style={styles.enrolledPill} accessibilityLabel="You are enrolled in this exam">
                    Enrolled
                  </Text>
                ) : null}
              </Pressable>

              {expanded ? (
                <View style={styles.detail}>
                  {showDetailSpinner ? (
                    <ActivityIndicator color="#93C5FD" accessibilityLabel="Loading exam details" />
                  ) : null}
                  {showDetailBlock ? (
                    <>
                      <Text style={styles.sectionTitle} accessibilityRole="header">
                        Topic domains
                      </Text>
                      {detail.domains.map((d) => (
                        <Text
                          key={d.id}
                          style={styles.domainRow}
                          accessibilityLabel={`${d.name}, ${d.weightPercent} percent of the exam`}
                        >
                          {d.name} — {d.weightPercent}%
                        </Text>
                      ))}
                      <Text style={styles.sectionTitle} accessibilityRole="header">
                        Published question pool
                      </Text>
                      <Text
                        style={styles.count}
                        accessibilityLabel={`${detail.publishedQuestionCount} published questions available offline`}
                      >
                        {detail.publishedQuestionCount} questions
                      </Text>

                      <Text style={styles.sectionTitle} accessibilityRole="header">
                        Domain filter for study sessions
                      </Text>
                      <Text style={styles.helper}>
                        Quiz and simulator sessions will prefer questions in the domain you select. Choose
                        &quot;All topics&quot; to use the full published pool.
                      </Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={styles.chipRow}>
                          <Pressable
                            style={[
                              styles.chip,
                              (domainByExam[item.id] ?? null) === null ? styles.chipSelected : null,
                            ]}
                            onPress={() => void setDomainForExam(item.id, null)}
                            accessibilityRole="button"
                            accessibilityState={{ selected: (domainByExam[item.id] ?? null) === null }}
                            accessibilityLabel="Study all topics for this exam"
                          >
                            <Text style={styles.chipLabel}>All topics</Text>
                          </Pressable>
                          {detail.domains.map((d) => {
                            const selected = domainByExam[item.id] === d.id;
                            return (
                              <Pressable
                                key={d.id}
                                style={[styles.chip, selected ? styles.chipSelected : null]}
                                onPress={() => void setDomainForExam(item.id, d.id)}
                                accessibilityRole="button"
                                accessibilityState={{ selected }}
                                accessibilityLabel={`Filter study sessions to ${d.name}`}
                              >
                                <Text style={styles.chipLabel}>{d.name}</Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </ScrollView>

                      {!item.isEnrolled ? (
                        <Pressable
                          style={styles.enrollButton}
                          onPress={() => void enroll(item.id)}
                          accessibilityRole="button"
                          accessibilityLabel={`Enroll in ${item.name}`}
                        >
                          <Text style={styles.enrollLabel}>Enroll</Text>
                        </Pressable>
                      ) : (
                        <Text style={styles.enrolledHint}>You are enrolled — open Home to start studying.</Text>
                      )}
                    </>
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        }}
      />

      <EnrollmentLimitWarning visible={enrollmentLimitVisible} onDismiss={dismissEnrollmentLimit} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0F172A',
    padding: 16,
    paddingTop: 8,
  },
  heading: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  disclaimer: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 12,
  },
  centered: {
    paddingVertical: 24,
  },
  errorBanner: {
    backgroundColor: '#7F1D1D',
    borderRadius: 8,
    marginBottom: 12,
    padding: 12,
  },
  errorText: {
    color: '#FEE2E2',
    marginBottom: 8,
  },
  dismissLink: {
    color: '#FCA5A5',
    fontWeight: '600',
  },
  updateBanner: {
    backgroundColor: '#0C4A6E',
    borderRadius: 8,
    marginBottom: 12,
    padding: 12,
  },
  updateText: {
    color: '#E0F2FE',
    marginBottom: 8,
  },
  updateDismissLink: {
    color: '#7DD3FC',
    fontWeight: '600',
  },
  empty: {
    color: '#94A3B8',
    marginTop: 24,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    marginBottom: 12,
    padding: 14,
  },
  examTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '600',
  },
  meta: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 4,
  },
  enrolledPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#14532D',
    borderRadius: 6,
    color: '#BBF7D0',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  detail: {
    borderTopColor: '#334155',
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 12,
    paddingTop: 12,
  },
  sectionTitle: {
    color: '#E2E8F0',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 10,
  },
  domainRow: {
    color: '#CBD5E1',
    fontSize: 14,
    marginBottom: 4,
  },
  count: {
    color: '#CBD5E1',
    fontSize: 15,
  },
  helper: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    borderColor: '#475569',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipSelected: {
    backgroundColor: '#1D4ED8',
    borderColor: '#3B82F6',
  },
  chipLabel: {
    color: '#E2E8F0',
    fontSize: 13,
  },
  enrollButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#2563EB',
    borderRadius: 8,
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  enrollLabel: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '600',
  },
  enrolledHint: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 16,
  },
});

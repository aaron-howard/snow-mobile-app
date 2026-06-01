import { useCatalog } from '@/domain/catalog/useCatalog';
import { EnrollmentLimitWarning } from '@ui/EnrollmentLimitWarning';
import { useTheme, useThemedStyles, type Theme } from '@ui/theme';
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
    downloadStates,
    downloadExam,
    refresh,
  } = useCatalog();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);

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
          <ActivityIndicator size="large" color={theme.accent} />
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
                    <ActivityIndicator color={theme.accent} accessibilityLabel="Loading exam details" />
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
                        Offline access
                      </Text>
                      {(() => {
                        const download = downloadStates[item.id];
                        const downloading = download?.status === 'downloading';
                        const downloaded =
                          download?.status === 'done' || item.contentDownloadedAt !== null;
                        return (
                          <>
                            <Pressable
                              style={[styles.downloadButton, downloading ? styles.downloadButtonBusy : null]}
                              onPress={() => void downloadExam(item.id)}
                              disabled={downloading}
                              accessibilityRole="button"
                              accessibilityState={{ disabled: downloading, busy: downloading }}
                              accessibilityLabel={
                                downloaded
                                  ? `Re-download ${item.name} for offline use`
                                  : `Download ${item.name} for offline use`
                              }
                            >
                              {downloading ? (
                                <ActivityIndicator color={theme.onAccentStrong} accessibilityLabel="Downloading exam content" />
                              ) : (
                                <Text style={styles.downloadLabel}>
                                  {downloaded ? 'Downloaded — re-download' : 'Download for offline use'}
                                </Text>
                              )}
                            </Pressable>
                            {download?.status === 'error' ? (
                              <Text style={styles.downloadError} accessibilityRole="alert">
                                {download.message}
                              </Text>
                            ) : null}
                            {download?.status === 'done' ? (
                              <Text style={styles.downloadDone} accessibilityLiveRegion="polite">
                                Saved for offline use.
                              </Text>
                            ) : null}
                          </>
                        );
                      })()}

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

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.background,
      padding: 16,
      paddingTop: 8,
    },
    heading: {
      color: theme.textPrimary,
      fontSize: 22,
      fontWeight: '700',
      marginBottom: 4,
    },
    disclaimer: {
      color: theme.textSecondary,
      fontSize: 12,
      marginBottom: 12,
    },
    centered: {
      paddingVertical: 24,
    },
    errorBanner: {
      backgroundColor: theme.dangerSurface,
      borderRadius: 8,
      marginBottom: 12,
      padding: 12,
    },
    errorText: {
      color: theme.onDangerSurface,
      marginBottom: 8,
    },
    dismissLink: {
      color: theme.onDangerSurface,
      fontWeight: '600',
    },
    updateBanner: {
      backgroundColor: theme.infoSurface,
      borderRadius: 8,
      marginBottom: 12,
      padding: 12,
    },
    updateText: {
      color: theme.onInfoSurface,
      marginBottom: 8,
    },
    updateDismissLink: {
      color: theme.onInfoSurface,
      fontWeight: '600',
    },
    empty: {
      color: theme.textSecondary,
      marginTop: 24,
      textAlign: 'center',
    },
    card: {
      backgroundColor: theme.surface,
      borderRadius: 10,
      marginBottom: 12,
      padding: 14,
    },
    examTitle: {
      color: theme.textPrimary,
      fontSize: 17,
      fontWeight: '600',
    },
    meta: {
      color: theme.textSecondary,
      fontSize: 14,
      marginTop: 4,
    },
    enrolledPill: {
      alignSelf: 'flex-start',
      backgroundColor: theme.successSurface,
      borderRadius: 6,
      color: theme.onSuccessSurface,
      fontSize: 12,
      fontWeight: '600',
      marginTop: 8,
      overflow: 'hidden',
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    detail: {
      borderTopColor: theme.border,
      borderTopWidth: StyleSheet.hairlineWidth,
      marginTop: 12,
      paddingTop: 12,
    },
    sectionTitle: {
      color: theme.textBody,
      fontSize: 15,
      fontWeight: '600',
      marginBottom: 6,
      marginTop: 10,
    },
    domainRow: {
      color: theme.textBody,
      fontSize: 14,
      marginBottom: 4,
    },
    count: {
      color: theme.textBody,
      fontSize: 15,
    },
    helper: {
      color: theme.textSecondary,
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
    downloadButton: {
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: theme.accentStrong,
      borderRadius: 8,
      marginTop: 8,
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    downloadButtonBusy: {
      opacity: 0.7,
    },
    downloadLabel: {
      color: theme.onAccentStrong,
      fontSize: 14,
      fontWeight: '600',
    },
    downloadError: {
      color: theme.danger,
      fontSize: 13,
      marginTop: 6,
    },
    downloadDone: {
      color: theme.success,
      fontSize: 13,
      marginTop: 6,
    },
    enrollButton: {
      alignSelf: 'flex-start',
      backgroundColor: theme.accentStrong,
      borderRadius: 8,
      marginTop: 16,
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    enrollLabel: {
      color: theme.onAccentStrong,
      fontSize: 16,
      fontWeight: '600',
    },
    enrolledHint: {
      color: theme.textSecondary,
      fontSize: 14,
      marginTop: 16,
    },
  });

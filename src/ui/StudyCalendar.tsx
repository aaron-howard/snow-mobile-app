import { StyleSheet, Text, View } from 'react-native';

export interface StudyCalendarProps {
  /** Dates on which at least one session was completed. */
  studyDays: readonly Date[];
  /** Any date within the month to render (defaults to today). */
  month?: Date;
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function dayKey(year: number, month: number, day: number): string {
  return `${year}-${month}-${day}`;
}

/**
 * Monthly activity calendar highlighting days with at least one completed
 * session (Requirement 6.3). Highlighted cells carry a distinct background plus
 * an accessibility label so the state isn't color-only (Req 10.1).
 */
export function StudyCalendar({ studyDays, month = new Date() }: StudyCalendarProps) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();

  const studied = new Set(
    studyDays
      .filter((d) => d.getFullYear() === year && d.getMonth() === monthIndex)
      .map((d) => dayKey(year, monthIndex, d.getDate())),
  );

  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);

  return (
    <View style={styles.wrap} accessibilityRole="summary">
      <Text style={styles.title} accessibilityRole="header">
        {MONTH_NAMES[monthIndex]} {year}
      </Text>
      <View style={styles.weekRow}>
        {WEEKDAYS.map((label, i) => (
          <Text key={`wd-${i}`} style={styles.weekday}>
            {label}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((day, index) => {
          if (day === null) {
            return <View key={`blank-${index}`} style={styles.cell} />;
          }
          const isStudied = studied.has(dayKey(year, monthIndex, day));
          return (
            <View
              key={`day-${day}`}
              style={[styles.cell, isStudied ? styles.studied : null]}
              accessibilityRole="text"
              accessibilityLabel={`${MONTH_NAMES[monthIndex]} ${day}${isStudied ? ', studied' : ''}`}
            >
              <Text style={[styles.dayText, isStudied ? styles.studiedText : null]}>{day}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  title: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700',
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekday: {
    color: '#94A3B8',
    flexBasis: '14.28%',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    alignItems: 'center',
    aspectRatio: 1,
    flexBasis: '14.28%',
    justifyContent: 'center',
    padding: 2,
  },
  studied: {
    backgroundColor: '#DCFCE7',
    borderRadius: 8,
  },
  dayText: {
    color: '#334155',
    fontSize: 13,
  },
  studiedText: {
    color: '#166534',
    fontWeight: '700',
  },
});

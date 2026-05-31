import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

// Placeholder. Wired in task 8.7.
export default function SimulatorScreen() {
  const { examId } = useLocalSearchParams<{ examId: string }>();
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text accessibilityRole="header">Exam simulator</Text>
      <Text>Exam: {examId}</Text>
      <Text>Placeholder — wired in task 8.7.</Text>
    </View>
  );
}

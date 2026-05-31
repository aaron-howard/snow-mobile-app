import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

// Placeholder. Wired in task 5.10.
export default function ReviewScreen() {
  const { examId } = useLocalSearchParams<{ examId: string }>();
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text accessibilityRole="header">Review queue</Text>
      <Text>Exam: {examId}</Text>
      <Text>Placeholder — wired in task 5.10.</Text>
    </View>
  );
}

import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

// Placeholder. Wired in task 6.9.
export default function FlashcardsScreen() {
  const { examId } = useLocalSearchParams<{ examId: string }>();
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text accessibilityRole="header">Flashcards</Text>
      <Text>Exam: {examId}</Text>
      <Text>Placeholder — wired in task 6.9.</Text>
    </View>
  );
}

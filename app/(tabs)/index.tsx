import { Text, View } from 'react-native';

// Placeholder home screen. Wired in task 15.1.
export default function HomeScreen() {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text accessibilityRole="header">SN Cert Prep (Unofficial)</Text>
      <Text style={{ marginTop: 8 }}>
        Not affiliated with or endorsed by ServiceNow, Inc.
      </Text>
      <Text style={{ marginTop: 16 }}>
        Active study list lands in task 15.1.
      </Text>
    </View>
  );
}

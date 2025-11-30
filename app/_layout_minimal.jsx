import { Stack } from 'expo-router';
import { View, Text } from 'react-native';
import '../global.css';

// Minimal test layout - no contexts, no services
export default function RootLayout() {
    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
            <Text style={{ color: '#fff', fontSize: 24 }}>🎉 App Started!</Text>
            <Text style={{ color: '#0f0', fontSize: 16, marginTop: 20 }}>
                If you see this, the crash is in AuthContext or ChatContext
            </Text>
        </View>
    );
}

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('❌ App Error Boundary caught error:', error);
    console.error('❌ Error stack:', errorInfo.componentStack);
    this.setState({
      error,
      errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#0F172A',
            padding: 20,
          }}
        >
          <Text style={{ color: '#EF4444', fontSize: 24, fontWeight: 'bold', marginBottom: 10 }}>
            App Crashed
          </Text>
          <Text style={{ color: '#94A3B8', fontSize: 16, textAlign: 'center', marginBottom: 20 }}>
            Something went wrong. Please restart the app.
          </Text>

          <TouchableOpacity
            onPress={() => this.setState({ hasError: false, error: null, errorInfo: null })}
            style={{
              backgroundColor: '#3B82F6',
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 8,
              marginBottom: 20,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Try Again</Text>
          </TouchableOpacity>

          <ScrollView style={{ width: '100%', maxHeight: 300 }}>
            <Text style={{ color: '#EF4444', fontSize: 12, fontFamily: 'monospace' }}>
              {this.state.error?.toString()}
            </Text>
            <Text
              style={{ color: '#94A3B8', fontSize: 10, fontFamily: 'monospace', marginTop: 10 }}
            >
              {this.state.errorInfo?.componentStack}
            </Text>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

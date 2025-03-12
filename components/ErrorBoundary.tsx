import React from "react";
import { View, Text, Button } from "react-native";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error("App crashed:", error, info);
    // You could log this to a service
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
            backgroundColor: "#000",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 18, marginBottom: 10 }}>
            Something went wrong
          </Text>
          <Text style={{ color: "#ddd", marginBottom: 20 }}>
            {this.state.error?.toString()}
          </Text>
          <Button
            title="Restart App"
            onPress={() => this.setState({ hasError: false })}
          />
        </View>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

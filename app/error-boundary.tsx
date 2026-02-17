/**
 * Error Boundary
 *
 * Catches application-level crashes and displays a fallback UI
 * while reporting the error for debugging purposes.
 */
import { useThemeColor } from "@/hooks/useThemeColor";
import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

interface Props {
  children: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const IFRAME_ID = "web-preview";

const webTargetOrigins = ["http://localhost:3000"];

function sendErrorToIframeParent(error: any, errorInfo?: any) {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    console.debug("Sending error to parent:", {
      error,
      errorInfo,
      referrer: document.referrer,
    });

    const errorMessage = {
      type: "ERROR",
      error: {
        message: error?.message || error?.toString() || "Unknown error",
        stack: error?.stack,
        componentStack: errorInfo?.componentStack,
        timestamp: new Date().toISOString(),
      },
      iframeId: IFRAME_ID,
    };

    try {
      window.parent.postMessage(
        errorMessage,
        webTargetOrigins.includes(document.referrer) ? document.referrer : "*",
      );
    } catch (postMessageError) {
      console.error("Failed to send error to parent:", postMessageError);
    }
  }
}

if (Platform.OS === "web" && typeof window !== "undefined") {
  window.addEventListener(
    "error",
    (event) => {
      event.preventDefault();
      const errorDetails = event.error ?? {
        message: event.message ?? "Unknown error",
        filename: event.filename ?? "Unknown file",
        lineno: event.lineno ?? "Unknown line",
        colno: event.colno ?? "Unknown column",
      };
      sendErrorToIframeParent(errorDetails);
    },
    true,
  );

  window.addEventListener(
    "unhandledrejection",
    (event) => {
      event.preventDefault();
      sendErrorToIframeParent(event.reason);
    },
    true,
  );

  const originalConsoleError = console.error;
  console.error = (...args) => {
    sendErrorToIframeParent(args.join(" "));
    originalConsoleError.apply(console, args);
  };
}

// Wrapper for ErrorBoundary to use hooks
const ErrorBoundaryWrapper = (props: Props) => {
  const colors = useThemeColor();
  return <ErrorBoundaryClass {...props} colors={colors} />;
};

class ErrorBoundaryClass extends React.Component<
  Props & { colors: any },
  State
> {
  constructor(props: Props & { colors: any }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    sendErrorToIframeParent(error, errorInfo);
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    const { colors } = this.props;
    if (this.state.hasError) {
      return (
        <View
          style={[styles.container, { backgroundColor: colors.background }]}
        >
          <View style={styles.content}>
            <Text style={[styles.title, { color: colors.text.primary }]}>
              Something went wrong
            </Text>
            <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
              {this.state.error?.message}
            </Text>
            {Platform.OS !== "web" && (
              <Text
                style={[styles.description, { color: colors.text.secondary }]}
              >
                Please check your device logs for more details.
              </Text>
            )}
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 36,
    textAlign: "center",
    fontFamily: "Outfit_700Bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Outfit_400Regular",
    marginBottom: 12,
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    fontFamily: "Outfit_400Regular",
    textAlign: "center",
    marginTop: 8,
  },
});

export default ErrorBoundaryWrapper;

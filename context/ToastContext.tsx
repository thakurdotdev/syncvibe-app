import { LinearGradient } from "expo-linear-gradient";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Animated, Dimensions, Text, StyleSheet } from "react-native";

// Define a global toast function that can be called anywhere
let globalToast: ((message: string, duration?: number) => void) | null = null;

// Simple function to show toast without hooks
export const toast = (message: string, duration = 3000) => {
  if (globalToast) {
    globalToast(message, duration);
  } else {
    console.warn(
      "Toast not initialized yet. Make sure ToastProvider is mounted.",
    );
  }
};

interface ToastContextType {
  toast: (message: string, duration?: number) => void;
}

interface ToastProviderProps {
  children: ReactNode;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [visible, setVisible] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(20)).current;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string, toastDuration: number = 3000) => {
    setMessage(msg);
    setVisible(true);

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Show toast with animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Hide toast after duration
    timeoutRef.current = setTimeout(() => {
      hideToast();
    }, toastDuration);
  };

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 20,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
    });
  };

  // Set the global toast function
  useEffect(() => {
    globalToast = showToast;
    return () => {
      globalToast = null;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toast: showToast }}>
      {children}
      {visible && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: translateYAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={["rgba(25, 25, 35, 0.95)", "rgba(18, 18, 25, 0.95)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.toastGradient}
          >
            <Text style={styles.toastText}>{message}</Text>
          </LinearGradient>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: "absolute",
    bottom: 50,
    alignSelf: "center",
    width: Dimensions.get("window").width - 40,
    maxWidth: 380,
    zIndex: 9999,
  },
  toastGradient: {
    padding: 14,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    backgroundColor: "rgba(22, 22, 30, 0.9)",
  },
  toastText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 20,
  },
});

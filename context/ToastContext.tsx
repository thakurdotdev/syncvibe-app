import { LinearGradient } from "expo-linear-gradient";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Dimensions,
  PanResponder,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
} from "react-native";

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
  const translateYAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const swipeAnim = useRef(new Animated.Value(0)).current;

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Pan responder for swipe to dismiss
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        // Allow horizontal swiping
        if (Math.abs(gestureState.dx) > Math.abs(gestureState.dy)) {
          swipeAnim.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (Math.abs(gestureState.dx) > 100) {
          // If swiped far enough, dismiss the toast
          Animated.timing(swipeAnim, {
            toValue: gestureState.dx > 0 ? 400 : -400,
            duration: 200,
            useNativeDriver: true,
          }).start(() => hideToast(false));
        } else {
          // Otherwise, return to center
          Animated.spring(swipeAnim, {
            toValue: 0,
            friction: 5,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  const showToast = (msg: string, toastDuration: number = 3000) => {
    setMessage(msg);
    setVisible(true);

    // Reset swipe animation
    swipeAnim.setValue(0);

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Enhanced show animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();

    // Hide toast after duration
    timeoutRef.current = setTimeout(() => {
      hideToast();
    }, toastDuration);
  };

  const hideToast = (withAnimation: boolean = true) => {
    if (withAnimation) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: 30,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setVisible(false);
      });
    } else {
      // Instant hide without animation
      setVisible(false);
    }
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
              transform: [
                { translateY: translateYAnim },
                { scale: scaleAnim },
                { translateX: swipeAnim },
              ],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <TouchableWithoutFeedback onPress={() => hideToast()}>
            <LinearGradient
              colors={["rgba(59, 130, 246, 0.6)", "rgba(30, 30, 60, 0.8)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.toastGradient}
            >
              <Text style={styles.toastText}>{message}</Text>
            </LinearGradient>
          </TouchableWithoutFeedback>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: "absolute",
    bottom: 80,
    alignSelf: "center",
    width: Dimensions.get("window").width - 40,
    maxWidth: 380,
    zIndex: 9999,
  },
  toastGradient: {
    padding: 10,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 12,
    backgroundColor: "transparent",
  },
  toastText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 22,
  },
});

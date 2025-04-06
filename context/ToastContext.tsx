import { LinearGradient } from "expo-linear-gradient";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import {
  Animated,
  Dimensions,
  PanResponder,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";

// Toast types for different scenarios
export type ToastType = "default" | "success" | "error" | "info";

interface ToastOptions {
  type?: ToastType;
  duration?: number;
}

type ToastFunction = (message: string, options?: ToastOptions) => void;

// Define a global toast function that can be called anywhere
let globalToast: ToastFunction | null = null;

// Simple function to show toast without hooks
export const toast = (message: string, options?: ToastOptions) => {
  if (globalToast) {
    globalToast(message, options);
  } else {
    console.warn(
      "Toast not initialized yet. Make sure ToastProvider is mounted.",
    );
  }
};

interface ToastContextType {
  toast: ToastFunction;
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
  const [toastType, setToastType] = useState<ToastType>("default");

  // Animation properties
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const swipeAnim = useRef(new Animated.Value(0)).current;

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const animationInProgressRef = useRef<boolean>(false);

  // Color themes for different toast types
  const colorThemes = useMemo(
    () => ({
      default: {
        start: "rgba(59, 130, 246, 1)",
        end: "rgba(30, 30, 60, 1)",
      },
      success: {
        start: "rgba(22, 163, 74, 1)",
        end: "rgba(21, 87, 36, 1)",
      },
      error: {
        start: "rgba(220, 38, 38, 1)",
        end: "rgba(127, 29, 29, 1)",
      },
      info: {
        start: "rgba(79, 70, 229, 1)",
        end: "rgba(49, 46, 129, 1)",
      },
    }),
    [],
  );

  // Enhanced pan responder for better swipe handling
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          // Only respond to horizontal movements
          return Math.abs(gestureState.dx) > Math.abs(gestureState.dy * 2);
        },
        onPanResponderGrant: () => {
          // Pause hide timer when user starts interaction
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
        },
        onPanResponderMove: Animated.event([null, { dx: swipeAnim }], {
          useNativeDriver: false,
        }),
        onPanResponderRelease: (_, gestureState) => {
          if (Math.abs(gestureState.dx) > 80) {
            // If swiped far enough, dismiss with velocity-based animation
            const velocity =
              Math.sign(gestureState.dx) *
              Math.min(Math.abs(gestureState.vx), 5);
            Animated.decay(swipeAnim, {
              velocity: velocity,
              deceleration: 0.997,
              useNativeDriver: true,
            }).start(() => hideToast(false));
          } else {
            // Spring back to center with physics-based animation
            Animated.spring(swipeAnim, {
              toValue: 0,
              tension: 120,
              friction: 8,
              useNativeDriver: true,
            }).start();

            // Resume hide timer
            if (visible && !animationInProgressRef.current) {
              timeoutRef.current = setTimeout(() => {
                hideToast();
              }, 2000);
            }
          }
        },
      }),
    [swipeAnim, visible],
  );

  const showToast = useCallback(
    (msg: string, options?: ToastOptions) => {
      const type = options?.type || "default";
      const duration = options?.duration || 3000;

      setMessage(msg);
      setToastType(type);
      setVisible(true);
      animationInProgressRef.current = true;

      // Reset swipe animation
      swipeAnim.setValue(0);

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Enhanced entrance animation with spring physics
      Animated.parallel([
        Animated.spring(fadeAnim, {
          toValue: 1,
          tension: 120,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(translateYAnim, {
          toValue: 0,
          tension: 100,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 200,
          friction: 12,
          useNativeDriver: true,
        }),
      ]).start(() => {
        animationInProgressRef.current = false;
      });

      // Hide toast after duration
      timeoutRef.current = setTimeout(() => {
        hideToast();
      }, duration);
    },
    [fadeAnim, translateYAnim, scaleAnim, swipeAnim],
  );

  const hideToast = useCallback(
    (withAnimation: boolean = true) => {
      if (animationInProgressRef.current) return;

      animationInProgressRef.current = true;

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
          animationInProgressRef.current = false;
        });
      } else {
        // Instant hide without animation
        setVisible(false);
        animationInProgressRef.current = false;
      }
    },
    [fadeAnim, translateYAnim, scaleAnim],
  );

  // Set the global toast function
  useEffect(() => {
    globalToast = showToast;
    return () => {
      globalToast = null;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [showToast]);

  const toastTheme = colorThemes[toastType];

  const contextValue = useMemo(
    () => ({
      toast: showToast,
    }),
    [showToast],
  );

  return (
    <ToastContext.Provider value={contextValue}>
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
              colors={[toastTheme.start, toastTheme.end]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.toastGradient}
            >
              <View style={styles.toastContent}>
                {toastType !== "default" && (
                  <View
                    style={[styles.indicator, styles[`${toastType}Indicator`]]}
                  />
                )}
                <Text style={styles.toastText} numberOfLines={2}>
                  {message}
                </Text>
              </View>
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 12,
  },
  toastGradient: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    backgroundColor: "transparent",
  },
  toastContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  toastText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 22,
    flex: 1,
  },
  indicator: {
    width: 4,
    height: 20,
    marginRight: 10,
    borderRadius: 2,
  },
  successIndicator: {
    backgroundColor: "#4ade80",
  },
  errorIndicator: {
    backgroundColor: "#f87171",
  },
  infoIndicator: {
    backgroundColor: "#93c5fd",
  },
});

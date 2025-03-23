import { BlurView } from "expo-blur";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import * as MediaLibrary from "expo-media-library";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  XIcon,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import {
  PanGestureHandler,
  PinchGestureHandler,
  State,
} from "react-native-gesture-handler";
import * as Notifications from "expo-notifications";
const { width, height } = Dimensions.get("window");

const BlurLoadingPlaceholder = () => (
  <View style={styles.loadingContainer}>
    <BlurView intensity={80} style={StyleSheet.absoluteFill} tint="dark" />
    <ActivityIndicator size="large" color="white" />
  </View>
);

const BlurFade = ({
  children,
  delay,
  inView,
}: {
  children: React.ReactNode;
  delay: number;
  inView: boolean;
}) => {
  const opacity = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    if (inView) {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        delay: delay * 1000,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }).start();
    } else {
      opacity.setValue(0);
    }
  }, [inView, delay, opacity]);

  return (
    <Animated.View
      style={{
        opacity,
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </Animated.View>
  );
};

const ImageGallery = ({
  images,
  initialIndex = 0,
  onClose,
}: {
  images: string[] | undefined;
  initialIndex?: number;
  onClose: () => void;
}) => {
  if (!images || images.length === 0) {
    return null;
  }

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scale] = useState(new Animated.Value(1));
  const [translateX] = useState(new Animated.Value(0));
  const [hasPermissions, setHasPermissions] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") {
        console.log("Notification permissions not granted");
      }

      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      });
    })();
  }, []);

  // Request media library permissions
  useEffect(() => {
    (async () => {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      setHasPermissions(status === "granted");
    })();
  }, []);

  // Preload adjacent images
  const preloadImages = useCallback(
    (index: number) => {
      const imagesToPreload = [
        index > 0 ? images[index - 1] : null,
        images[index],
        index < images.length - 1 ? images[index + 1] : null,
      ].filter(Boolean);

      imagesToPreload.forEach((src) => {
        if (typeof src !== "string") return;
        Image.prefetch(src);
      });
    },
    [images],
  );

  useEffect(() => {
    preloadImages(currentIndex);
  }, [currentIndex, preloadImages]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleImageLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleZoom = useCallback(
    (event: any) => {
      if (event.nativeEvent.state === State.ACTIVE) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setIsZoomed((prev) => !prev);

        Animated.spring(scale, {
          toValue: isZoomed ? 1 : 2,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }).start();
      }
    },
    [isZoomed, scale],
  );

  const handlePanGesture = useCallback(
    (event: any) => {
      if (isZoomed) return;

      if (event.nativeEvent.state === State.END) {
        const { translationX, velocityX } = event.nativeEvent;

        // Threshold for swipe
        if (
          Math.abs(translationX) > width * 0.25 ||
          Math.abs(velocityX) > 800
        ) {
          if (translationX > 0 && currentIndex > 0) {
            // Swipe right to go to previous
            handlePrevious();
          } else if (translationX < 0 && currentIndex < images.length - 1) {
            // Swipe left to go to next
            handleNext();
          } else {
            // Reset position if at end of gallery
            Animated.spring(translateX, {
              toValue: 0,
              friction: 6,
              tension: 80,
              useNativeDriver: true,
            }).start();
          }
        } else {
          // Reset position if swipe not far enough
          Animated.spring(translateX, {
            toValue: 0,
            friction: 6,
            tension: 80,
            useNativeDriver: true,
          }).start();
        }
      } else {
        // Track finger while swiping
        translateX.setValue(event.nativeEvent.translationX);
      }
    },
    [currentIndex, images.length, isZoomed, translateX],
  );

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      // Removed haptic feedback
      setCurrentIndex((prev) => prev - 1);
      setIsZoomed(false);
      scale.setValue(1);
    }
  }, [currentIndex, scale]);

  const handleNext = useCallback(() => {
    if (currentIndex < images.length - 1) {
      // Removed haptic feedback
      setCurrentIndex((prev) => prev + 1);
      setIsZoomed(false);
      scale.setValue(1);
    }
  }, [currentIndex, images.length, scale]);

  const handleDownload = useCallback(async () => {
    try {
      // Check if we have permission before attempting to download
      if (!hasPermissions) {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permission Required",
            "This app needs permission to save images to your gallery.",
            [{ text: "OK" }],
          );
          return;
        }
        setHasPermissions(true);
      }

      // Define the file URI for the downloaded image
      const fileUri = FileSystem.documentDirectory + `image-${Date.now()}.jpg`;

      // Start the download
      const downloadResumable = FileSystem.createDownloadResumable(
        images[currentIndex],
        fileUri,
      );

      const uri = await downloadResumable.downloadAsync();

      if (!uri) {
        throw new Error("Download failed");
      }

      // Save the image to the media library
      await MediaLibrary.createAssetAsync(uri.uri);

      // Show success alert instead of notification
      Alert.alert(
        "Download Complete",
        `Image has been saved to your gallery.`,
        [{ text: "OK" }],
      );

      // Also try notifications as a backup
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Download Complete",
          body: `Image has been saved to your gallery.`,
        },
        trigger: null, // Show the notification immediately
      });
    } catch (error) {
      console.error("Download failed:", error);

      // Show error alert
      Alert.alert(
        "Download Failed",
        "An error occurred while downloading the image.",
        [{ text: "OK" }],
      );
    }
  }, [currentIndex, images, hasPermissions]);

  const handleClose = useCallback(() => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  }, [fadeAnim, onClose]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Background blur and gradients */}
      <BlurView intensity={90} style={StyleSheet.absoluteFill} tint="dark" />
      <View style={styles.topGradient} />
      <View style={styles.bottomGradient} />

      {/* Close button */}
      <TouchableOpacity
        style={styles.closeButton}
        onPress={handleClose}
        activeOpacity={0.7}
      >
        <XIcon color="white" size={24} />
      </TouchableOpacity>

      {/* Navigation buttons */}
      {images.length > 1 && (
        <>
          <TouchableOpacity
            style={[styles.navButton, styles.leftButton]}
            onPress={handlePrevious}
            disabled={currentIndex === 0}
            activeOpacity={0.7}
          >
            <ChevronLeftIcon color="white" size={28} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navButton, styles.rightButton]}
            onPress={handleNext}
            disabled={currentIndex === images.length - 1}
            activeOpacity={0.7}
          >
            <ChevronRightIcon color="white" size={28} />
          </TouchableOpacity>
        </>
      )}

      {/* Main image with gesture handlers */}
      <PanGestureHandler
        onHandlerStateChange={handlePanGesture}
        enabled={!isZoomed}
      >
        <Animated.View
          style={[styles.imageContainer, { transform: [{ translateX }] }]}
        >
          <PinchGestureHandler onHandlerStateChange={handleZoom}>
            <Animated.View style={styles.imageWrapper}>
              {isLoading && <BlurLoadingPlaceholder />}

              <BlurFade key={currentIndex} delay={0.2} inView={true}>
                <Animated.Image
                  source={{ uri: images[currentIndex] }}
                  style={[styles.image, { transform: [{ scale }] }]}
                  resizeMode="contain"
                  onLoad={handleImageLoad}
                />
              </BlurFade>
            </Animated.View>
          </PinchGestureHandler>
        </Animated.View>
      </PanGestureHandler>

      {/* Image counter */}
      <View style={styles.counter}>
        <Text style={styles.counterText}>
          {currentIndex + 1} / {images.length}
        </Text>
      </View>

      {/* Download button */}
      <TouchableOpacity
        style={styles.downloadButton}
        onPress={handleDownload}
        activeOpacity={0.7}
      >
        <DownloadIcon color="white" size={22} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },
  imageContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  imageWrapper: {
    width: width,
    height: height,
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: width * 0.9,
    height: height * 0.8,
  },
  closeButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 20,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  navButton: {
    position: "absolute",
    top: "50%",
    marginTop: -25,
    zIndex: 10,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  leftButton: {
    left: 20,
  },
  rightButton: {
    right: 20,
  },
  counter: {
    position: "absolute",
    bottom: 30,
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  counterText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  downloadButton: {
    position: "absolute",
    bottom: 30,
    right: 20,
    zIndex: 10,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  topGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    zIndex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  bottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    zIndex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
});

export default ImageGallery;

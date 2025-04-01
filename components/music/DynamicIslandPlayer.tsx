import React, { useCallback, useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  Image,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
  interpolate,
  Extrapolation,
  FadeIn,
  FadeOut,
  runOnJS,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PanGestureHandler } from "react-native-gesture-handler";
import { useAnimatedGestureHandler } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { usePlayerState, usePlayer } from "@/context/MusicContext";
import TrackPlayer, {
  State,
  usePlaybackState,
} from "react-native-track-player";
import { ProgressBar, SongControls } from "./MusicCards";

const { width, height } = Dimensions.get("window");
const COLLAPSED_HEIGHT = 56;
const EXPANDED_HEIGHT = 380;
const ANIMATION_DURATION = 300;
const SWIPE_THRESHOLD = 50;

export default function DynamicIslandPlayer() {
  const { currentSong } = usePlayerState();
  const { handleNextSong } = usePlayer();
  const [isExpanded, setIsExpanded] = useState(false);
  const insets = useSafeAreaInsets();
  const playbackState = usePlaybackState();
  const isPlaying = playbackState.state === State.Playing;

  // Animation values
  const animationProgress = useSharedValue(0);
  const gestureY = useSharedValue(0);

  // Get artist name from current song
  const artistName =
    currentSong?.artist_map?.artists
      ?.slice(0, 3)
      ?.map((artist) => artist.name)
      .join(", ") || "";

  // Toggle expanded state with animation
  const toggleExpanded = useCallback(() => {
    const newValue = !isExpanded;
    setIsExpanded(newValue);

    animationProgress.value = withTiming(newValue ? 1 : 0, {
      duration: ANIMATION_DURATION,
      easing: Easing.bezier(0.33, 0.01, 0.66, 1),
    });
  }, [isExpanded, animationProgress]);

  // Handle play/pause
  const handlePlayPause = useCallback(
    async (e) => {
      e.stopPropagation();
      if (isPlaying) {
        await TrackPlayer.pause();
      } else {
        await TrackPlayer.play();
      }
    },
    [isPlaying],
  );

  // Gesture handler for swipe interactions
  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, ctx) => {
      ctx.startY = gestureY.value;
    },
    onActive: (event, ctx) => {
      // Apply resistance to make it feel more natural
      const dragY = event.translationY;

      // Different resistance based on direction and current state
      if ((isExpanded && dragY > 0) || (!isExpanded && dragY < 0)) {
        const resistance = isExpanded ? 0.8 : 0.5;
        gestureY.value = ctx.startY + dragY * resistance;
      }
    },
    onEnd: (event) => {
      if (isExpanded && event.translationY > SWIPE_THRESHOLD) {
        // Swipe down to collapse
        gestureY.value = withSpring(0, { damping: 18, stiffness: 250 });
        animationProgress.value = withTiming(0, {
          duration: ANIMATION_DURATION,
          easing: Easing.bezier(0.33, 0.01, 0.66, 1),
        });
        runOnJS(setIsExpanded)(false);
      } else if (!isExpanded && event.translationY < -SWIPE_THRESHOLD) {
        // Swipe up to expand
        gestureY.value = withSpring(0, { damping: 18, stiffness: 250 });
        animationProgress.value = withTiming(1, {
          duration: ANIMATION_DURATION,
          easing: Easing.bezier(0.33, 0.01, 0.66, 1),
        });
        runOnJS(setIsExpanded)(true);
      } else {
        // Return to current state
        gestureY.value = withSpring(0, { damping: 18, stiffness: 250 });
      }
    },
  });

  // Container animation
  const containerStyle = useAnimatedStyle(() => {
    const height = interpolate(
      animationProgress.value,
      [0, 1],
      [COLLAPSED_HEIGHT, EXPANDED_HEIGHT],
      Extrapolation.CLAMP,
    );

    const width = interpolate(
      animationProgress.value,
      [0, 1],
      [width * 0.9, width * 0.95],
      Extrapolation.CLAMP,
    );

    const borderRadius = interpolate(
      animationProgress.value,
      [0, 1],
      [28, 24],
      Extrapolation.CLAMP,
    );

    // Apply gesture translation
    const translateY = gestureY.value;

    return {
      height,
      width,
      borderRadius,
      transform: [{ translateY }],
    };
  });

  // Album image animation
  const imageStyle = useAnimatedStyle(() => {
    const size = interpolate(
      animationProgress.value,
      [0, 1],
      [40, 280],
      Extrapolation.CLAMP,
    );

    const borderRadius = interpolate(
      animationProgress.value,
      [0, 1],
      [20, 16],
      Extrapolation.CLAMP,
    );

    const opacity = interpolate(
      animationProgress.value,
      [0, 0.2, 0.4],
      [1, 0, 1],
      Extrapolation.CLAMP,
    );

    return {
      width: size,
      height: size,
      borderRadius,
      opacity,
    };
  });

  // Text container animation
  const textContainerStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      animationProgress.value,
      [0, 0.2],
      [1, 0],
      Extrapolation.CLAMP,
    );

    const marginLeft = interpolate(
      animationProgress.value,
      [0, 0.2],
      [12, 0],
      Extrapolation.CLAMP,
    );

    return {
      opacity: isExpanded ? 0 : opacity,
      marginLeft,
      flex: 1,
    };
  });

  // Controls container animation
  const controlsStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      animationProgress.value,
      [0, 0.2],
      [1, 0],
      Extrapolation.CLAMP,
    );

    return {
      opacity: isExpanded ? 0 : opacity,
    };
  });

  // Progress indicator for music
  const progressBarStyle = useAnimatedStyle(() => {
    const height = interpolate(
      animationProgress.value,
      [0, 0.1],
      [3, 0],
      Extrapolation.CLAMP,
    );

    return {
      height,
    };
  });

  if (!currentSong) return null;

  return (
    <PanGestureHandler onGestureEvent={gestureHandler}>
      <Animated.View
        style={[
          styles.container,
          containerStyle,
          { marginTop: insets.top + 10 },
        ]}
      >
        <LinearGradient
          colors={["#262429", "#1A1922", "#0F0F15"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Progress bar - only visible in collapsed mode */}
        <Animated.View style={[styles.progressBar, progressBarStyle]}>
          <ProgressBar compact />
        </Animated.View>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={toggleExpanded}
          style={styles.touchableArea}
        >
          {/* Collapsed view content */}
          {!isExpanded && (
            <>
              <View style={styles.collapsedContent}>
                <Image
                  source={{ uri: currentSong?.image[1]?.link }}
                  style={styles.miniImage}
                />

                <Animated.View
                  style={[styles.textContainer, textContainerStyle]}
                >
                  <Text style={styles.title} numberOfLines={1}>
                    {currentSong?.name}
                  </Text>
                  <Text style={styles.artist} numberOfLines={1}>
                    {artistName}
                  </Text>
                </Animated.View>

                <Animated.View
                  style={[styles.controlsContainer, controlsStyle]}
                >
                  <TouchableOpacity
                    style={styles.controlButton}
                    onPress={handlePlayPause}
                  >
                    <Ionicons
                      name={isPlaying ? "pause" : "play"}
                      size={22}
                      color="white"
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.controlButton, { marginLeft: 8 }]}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleNextSong();
                    }}
                  >
                    <Ionicons
                      name="play-skip-forward"
                      size={22}
                      color="white"
                    />
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </>
          )}

          {/* Expanded view content */}
          {isExpanded && (
            <Animated.View
              style={styles.expandedContent}
              entering={FadeIn.duration(300).delay(150)}
            >
              <Animated.Image
                source={{ uri: currentSong?.image[2]?.link }}
                style={[styles.expandedImage, imageStyle]}
                resizeMode="cover"
              />

              <View style={styles.expandedInfoContainer}>
                <Text style={styles.expandedTitle} numberOfLines={2}>
                  {currentSong?.name}
                </Text>
                <Text style={styles.expandedArtist}>{artistName}</Text>
              </View>

              <SongControls isCompact />

              <TouchableOpacity
                style={styles.closeButton}
                onPress={toggleExpanded}
              >
                <View style={styles.closeButtonIndicator} />
              </TouchableOpacity>
            </Animated.View>
          )}
        </TouchableOpacity>
      </Animated.View>
    </PanGestureHandler>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    alignSelf: "center",
    zIndex: 999,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 12,
    width: width * 0.9,
  },
  progressBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  touchableArea: {
    flex: 1,
    width: "100%",
    height: "100%",
    justifyContent: "center",
    overflow: "hidden",
  },
  collapsedContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: "100%",
  },
  miniImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  textContainer: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  artist: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 13,
    marginTop: 2,
  },
  controlsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  controlButton: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  expandedContent: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    paddingTop: 20,
    paddingHorizontal: 16,
  },
  expandedImage: {
    width: 280,
    height: 280,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  expandedInfoContainer: {
    width: "100%",
    alignItems: "center",
    marginBottom: 24,
  },
  expandedTitle: {
    color: "white",
    fontWeight: "bold",
    fontSize: 20,
    textAlign: "center",
  },
  expandedArtist: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 16,
    textAlign: "center",
    marginTop: 6,
  },
  closeButton: {
    position: "absolute",
    bottom: 16,
    alignItems: "center",
    width: "100%",
  },
  closeButtonIndicator: {
    width: 40,
    height: 5,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 3,
  },
});

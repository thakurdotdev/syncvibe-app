import { SONG_URL } from "@/constants";
import { usePlayer, usePlayerState, usePlaylist } from "@/context/MusicContext";
import { useTheme } from "@/context/ThemeContext";
import { Song } from "@/types/song";
import { ensureHttpsForSongUrls } from "@/utils/getHttpsUrls";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useFocusEffect, usePathname } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  BackHandler,
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  Extrapolation,
  FadeIn,
  FadeOut,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TrackPlayer from "react-native-track-player";
import Button from "../ui/button";
import { ProgressBar, SongControls } from "./MusicCards";
import { MusicQueue, SimilarSongs } from "./MusicLists";
import NewPlayerDrawer from "./NewPlayerDrawer";

const { height, width } = Dimensions.get("window");
const ANIMATION_DURATION = 300;
const TAB_ANIMATION_DURATION = 200;
const SWIPE_THRESHOLD = 150;
const HORIZONTAL_SWIPE_THRESHOLD = 50;

// Tab constants for easier reference
const TABS = ["player", "queue", "recommendations"] as const;
type TabType = (typeof TABS)[number];

// Helper function to get next/previous tab
const getAdjacentTab = (
  currentTab: TabType,
  direction: "next" | "prev",
): TabType => {
  const currentIndex = TABS.indexOf(currentTab);
  if (direction === "next") {
    return currentIndex < TABS.length - 1
      ? TABS[currentIndex + 1]
      : TABS[currentIndex];
  } else {
    return currentIndex > 0 ? TABS[currentIndex - 1] : TABS[currentIndex];
  }
};

const PlayerTab = React.memo(
  ({
    currentSong,
    artistName,
  }: {
    currentSong: Song | null;
    artistName: string;
  }) => {
    const { colors } = useTheme();

    return (
      <View style={styles.playerTabContainer}>
        <Animated.Image
          entering={FadeIn.duration(400)}
          source={{ uri: currentSong?.image[2]?.link }}
          style={[
            styles.albumArt,
            {
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.2,
              shadowRadius: 12,
            },
          ]}
          resizeMode="cover"
        />
        <View style={styles.songInfoContainer}>
          <Text
            style={[styles.songTitle, { color: colors.text }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {currentSong?.name}
          </Text>
          <Text
            style={[styles.artistName, { color: colors.mutedForeground }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {artistName}
          </Text>
        </View>
        <SongControls />
      </View>
    );
  },
);

const QueueTab = React.memo(({ playlist }: { playlist: Song[] }) => (
  <Animated.View
    entering={FadeIn.duration(TAB_ANIMATION_DURATION)}
    exiting={FadeOut.duration(TAB_ANIMATION_DURATION)}
    style={styles.tabContentContainer}
  >
    <MusicQueue playlist={playlist} />
  </Animated.View>
));

const RecommendationsTab = React.memo(
  ({
    recommendations,
    loading,
    fetchRecommendations,
  }: {
    recommendations: Song[];
    loading: boolean;
    fetchRecommendations: () => void;
  }) => (
    <Animated.View
      entering={FadeIn.duration(TAB_ANIMATION_DURATION)}
      exiting={FadeOut.duration(TAB_ANIMATION_DURATION)}
      style={styles.tabContentContainer}
    >
      <SimilarSongs
        recommendations={recommendations}
        loading={loading}
        fetchRecommendations={fetchRecommendations}
      />
    </Animated.View>
  ),
);

export default function Player() {
  const { theme, colors } = useTheme();
  const { addToQueue, handleNextSong } = usePlayer();
  const { currentSong, isPlaying, isLoading } = usePlayerState();
  const { playlist } = usePlaylist();
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("player");
  const insets = useSafeAreaInsets();
  const [playerDrawerOpen, setPlayerDrawerOpen] = useState(false);
  const [isPlayerVisible, setIsPlayerVisible] = useState(true);
  const lastPathRef = useRef("");

  // Prevent multiple tab changes in quick succession
  const isTabChanging = useRef(false);

  // For horizontal swiping between tabs
  const horizontalGestureTranslateX = useSharedValue(0);
  const horizontalStartX = useSharedValue(0);
  const isSwiping = useSharedValue(false);

  const handlePlayPauseSong = async () => {
    if (isPlaying) {
      await TrackPlayer.pause();
    } else {
      await TrackPlayer.play();
    }
  };

  const pathname = usePathname();
  const isHomeActive = pathname.includes("/home");

  useFocusEffect(
    useCallback(() => {
      if (pathname.includes("/home") && currentSong) {
        setIsPlayerVisible(true);
      }

      if (lastPathRef.current !== pathname) {
        lastPathRef.current = pathname;

        const timer = setTimeout(() => {
          if (currentSong && pathname.includes("/home")) {
            setIsPlayerVisible(true);
          }
        }, 100);

        return () => clearTimeout(timer);
      }
    }, [pathname, currentSong]),
  );

  useEffect(() => {
    if (currentSong && isHomeActive) {
      setIsPlayerVisible(true);
    }
  }, [currentSong, isHomeActive]);

  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);

  // Animation values
  const translateY = useSharedValue(height);
  const gestureTranslateY = useSharedValue(0);
  const miniPlayerOpacity = useSharedValue(1);
  const scale = useSharedValue(1);
  const startY = useSharedValue(0);

  const getRecommendations = useCallback(async () => {
    if (!currentSong?.id) return;

    try {
      setLoading(true);
      const response = await axios.get(
        `${SONG_URL}/song/recommend?id=${currentSong.id}`,
      );
      if (response.data?.data) {
        const newRecommendations = response.data.data?.map(
          ensureHttpsForSongUrls,
        );
        setRecommendations(newRecommendations);

        // Only add to queue if we have 0 or 1 songs in playlist
        if (playlist.length <= 1 && newRecommendations.length > 0) {
          // Filter out songs that are already in playlist or current song
          const filteredRecommendations = newRecommendations.filter(
            (rec: Song) =>
              rec.id !== currentSong.id &&
              !playlist.some((item) => item.id === rec.id),
          );

          // If we have valid recommendations after filtering
          if (filteredRecommendations.length > 0) {
            // Add up to 2 random songs if queue is empty, or 1 if queue has 1 song
            const songsToAdd = playlist.length === 0 ? 2 : 1;
            const shuffledRecommendations = [...filteredRecommendations]
              .sort(() => Math.random() - 0.5)
              .slice(0, songsToAdd);

            addToQueue(shuffledRecommendations);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching recommendations:", error);
    } finally {
      setLoading(false);
    }
  }, [currentSong?.id, playlist.length, addToQueue]);

  useEffect(() => {
    getRecommendations();
  }, [getRecommendations]);

  const openPlayer = useCallback(() => {
    setIsExpanded(true);
    translateY.value = withTiming(0, {
      duration: ANIMATION_DURATION,
      easing: Easing.bezier(0.17, 0.67, 0.23, 0.96),
    });
    miniPlayerOpacity.value = withTiming(0, {
      duration: ANIMATION_DURATION * 0.6,
      easing: Easing.out(Easing.ease),
    });
    scale.value = withSpring(1.02, { damping: 20, stiffness: 300 });
  }, [translateY, miniPlayerOpacity, scale]);

  const closePlayer = useCallback(() => {
    translateY.value = withTiming(
      height,
      {
        duration: ANIMATION_DURATION,
        easing: Easing.bezier(0.33, 0.01, 0.66, 1),
      },
      () => {
        runOnJS(setIsExpanded)(false);
        gestureTranslateY.value = 0;
      },
    );
    miniPlayerOpacity.value = withTiming(1, {
      duration: ANIMATION_DURATION,
      easing: Easing.bezier(0.33, 0.01, 0.66, 1),
    });
    scale.value = withSpring(1, { damping: 20, stiffness: 300 });
  }, [translateY, miniPlayerOpacity, gestureTranslateY, scale]);

  const handleTabPress = useCallback(
    (tab: TabType) => {
      if (tab !== activeTab && !isTabChanging.current) {
        isTabChanging.current = true;
        setActiveTab(tab);

        // Reset after animation
        setTimeout(() => {
          isTabChanging.current = false;
        }, TAB_ANIMATION_DURATION + 50);
      }
    },
    [activeTab],
  );

  const handleTabSwitch = useCallback(
    (direction: "next" | "prev") => {
      if (isTabChanging.current) return;

      const nextTab = getAdjacentTab(activeTab, direction);
      if (nextTab !== activeTab) {
        handleTabPress(nextTab);
      }
    },
    [activeTab, handleTabPress],
  );

  const artistName = useMemo(
    () =>
      currentSong?.artist_map?.artists
        ?.slice(0, 3)
        ?.map((artist) => artist.name)
        .join(", ") || "",
    [currentSong],
  );

  // Vertical gesture for expanding/collapsing player
  const verticalGesture = Gesture.Pan()
    .onStart(() => {
      "worklet";
      startY.value = gestureTranslateY.value;
    })
    .onUpdate((e) => {
      "worklet";
      if (e.translationY > 0) {
        const dampenedDrag = e.translationY * 0.8;
        gestureTranslateY.value = startY.value + dampenedDrag;
      }
    })
    .onEnd((e) => {
      "worklet";
      if (e.translationY > SWIPE_THRESHOLD || e.velocityY > 500) {
        runOnJS(closePlayer)();
      } else {
        gestureTranslateY.value = withSpring(0, {
          damping: 20,
          stiffness: 300,
          mass: 0.8,
        });
      }
    });

  // Horizontal gesture for tab switching
  const horizontalGesture = Gesture.Pan()
    .activeOffsetX([-15, 15]) // Start recognizing after small horizontal movement
    .failOffsetY([-20, 20]) // Fail if vertical movement is detected first
    .onStart(() => {
      "worklet";
      horizontalStartX.value = horizontalGestureTranslateX.value;
      isSwiping.value = true;
    })
    .onUpdate((e) => {
      "worklet";
      // Apply dampening at edges to provide resistance feedback
      const currentIndex = TABS.indexOf(activeTab as TabType);
      const isAtLeftEdge = currentIndex === 0 && e.translationX > 0;
      const isAtRightEdge =
        currentIndex === TABS.length - 1 && e.translationX < 0;

      if (isAtLeftEdge || isAtRightEdge) {
        // Apply stronger dampening at edges
        horizontalGestureTranslateX.value =
          horizontalStartX.value + e.translationX * 0.2;
      } else {
        horizontalGestureTranslateX.value =
          horizontalStartX.value + e.translationX;
      }
    })
    .onEnd((e) => {
      "worklet";
      isSwiping.value = false;

      // Reset horizontal position with animation
      horizontalGestureTranslateX.value = withSpring(0, {
        damping: 20,
        stiffness: 300,
      });

      // Determine if swipe was intentional
      if (
        Math.abs(e.velocityX) > 500 ||
        Math.abs(e.translationX) > HORIZONTAL_SWIPE_THRESHOLD
      ) {
        const currentIndex = TABS.indexOf(activeTab as TabType);
        const isAtLeftEdge = currentIndex === 0 && e.translationX > 0;
        const isAtRightEdge =
          currentIndex === TABS.length - 1 && e.translationX < 0;

        // Don't switch tabs if at edge
        if (!isAtLeftEdge && !isAtRightEdge) {
          if (e.translationX > 0) {
            runOnJS(handleTabSwitch)("prev");
          } else {
            runOnJS(handleTabSwitch)("next");
          }
        }
      }
    });

  const expandedPlayerStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: translateY.value + gestureTranslateY.value },
        { scale: scale.value },
      ],
      position: "absolute",
      width: "100%",
      height: "100%",
      zIndex: isExpanded ? 10 : -1,
    };
  });

  const miniPlayerStyle = useAnimatedStyle(() => {
    const calculatedOpacity = interpolate(
      translateY.value,
      [0, height * 0.2, height * 0.5],
      [0, 0, 1],
      Extrapolation.CLAMP,
    );

    return {
      opacity: isExpanded ? calculatedOpacity : miniPlayerOpacity.value,
      transform: [
        {
          translateY: interpolate(
            translateY.value,
            [height * 0.7, height],
            [10, 0],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  const tabContentStyle = useAnimatedStyle(() => {
    return {
      flex: 1,
      transform: [{ translateX: horizontalGestureTranslateX.value }],
    };
  });

  const tabContents = useMemo(
    () => ({
      player: (
        <Animated.View
          entering={FadeIn.duration(TAB_ANIMATION_DURATION)}
          exiting={FadeOut.duration(TAB_ANIMATION_DURATION)}
          style={[
            styles.tabContentContainer,
            { transform: [{ perspective: 1000 }] },
          ]}
        >
          <PlayerTab currentSong={currentSong} artistName={artistName} />
        </Animated.View>
      ),
      queue: (
        <Animated.View
          entering={FadeIn.duration(TAB_ANIMATION_DURATION)}
          exiting={FadeOut.duration(TAB_ANIMATION_DURATION)}
          style={[
            styles.tabContentContainer,
            { transform: [{ perspective: 1000 }] },
          ]}
        >
          <QueueTab playlist={playlist} />
        </Animated.View>
      ),
      recommendations: (
        <Animated.View
          entering={FadeIn.duration(TAB_ANIMATION_DURATION)}
          exiting={FadeOut.duration(TAB_ANIMATION_DURATION)}
          style={[
            styles.tabContentContainer,
            { transform: [{ perspective: 1000 }] },
          ]}
        >
          <RecommendationsTab
            recommendations={recommendations}
            loading={loading}
            fetchRecommendations={getRecommendations}
          />
        </Animated.View>
      ),
    }),
    [
      currentSong,
      artistName,
      playlist,
      recommendations,
      loading,
      getRecommendations,
    ],
  );

  const renderMiniPlayer = () => (
    <Animated.View
      style={[
        styles.miniPlayerContainer,
        miniPlayerStyle,
        {
          bottom: isHomeActive ? 70 : 10,
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderWidth: 1,
        },
      ]}
    >
      <Pressable
        style={styles.miniPlayerContent}
        onPress={openPlayer}
        android_ripple={{ color: colors.primary + "20" }}
      >
        <Image
          source={{ uri: currentSong?.image[1]?.link }}
          style={styles.miniPlayerImage}
        />
        <View style={styles.miniPlayerTextContainer}>
          <Text
            style={[
              styles.miniPlayerTitle,
              {
                color: colors.text,
              },
            ]}
            numberOfLines={1}
          >
            {currentSong?.name}
          </Text>
          <Text
            style={[styles.miniPlayerArtist, { color: colors.mutedForeground }]}
            numberOfLines={1}
          >
            {artistName}
          </Text>
        </View>
        <Button
          onPress={(e) => {
            e.stopPropagation();
            handlePlayPauseSong();
          }}
          variant="secondary"
          size="icon"
        >
          {isLoading ? (
            <ActivityIndicator
              size={22}
              color={colors.text}
              style={{ opacity: 0.5 }}
              aria-disabled={true}
            />
          ) : (
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={22}
              color={colors.text}
            />
          )}
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onPress={(e) => {
            e.stopPropagation();
            handleNextSong();
          }}
          style={{ marginLeft: 8 }}
        >
          <Ionicons name="play-skip-forward" size={22} color={colors.text} />
        </Button>
      </Pressable>
      <ProgressBar />
    </Animated.View>
  );

  const renderExpandedPlayer = () => (
    <Animated.View
      style={[
        expandedPlayerStyle,
        {
          backfaceVisibility: "hidden",
        },
      ]}
    >
      <View
        style={[
          styles.expandedPlayerBackground,
          {
            paddingTop: insets.top,
            transform: [{ perspective: 1000 }],
            backgroundColor: colors.background,
          },
        ]}
      >
        <GestureDetector gesture={verticalGesture}>
          <Animated.View>
            <View style={styles.header}>
              <Button onPress={closePlayer} variant="ghost" size="icon">
                <Ionicons name="chevron-down" size={24} color={colors.text} />
              </Button>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                Now Playing
              </Text>
              <Button
                variant="ghost"
                size="icon"
                onPress={() => {
                  setPlayerDrawerOpen(true);
                }}
              >
                <Ionicons
                  name="ellipsis-horizontal"
                  size={20}
                  color={colors.text}
                />
              </Button>
            </View>
          </Animated.View>
        </GestureDetector>

        <View
          style={[styles.tabsContainer, { borderBottomColor: colors.border }]}
        >
          {TABS.map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? "secondary" : "ghost"}
              style={styles.tab}
              onPress={() => handleTabPress(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color:
                      activeTab === tab
                        ? colors.primary
                        : colors.mutedForeground,
                  },
                  activeTab === tab ? styles.activeTabText : undefined,
                ]}
              >
                {tab === "player"
                  ? "Now Playing"
                  : tab === "queue"
                  ? "Queue"
                  : "For You"}
              </Text>
              {activeTab === tab && (
                <Animated.View
                  entering={FadeIn.duration(150)}
                  style={[
                    styles.activeTabIndicator,
                    { backgroundColor: colors.primary },
                  ]}
                />
              )}
            </Button>
          ))}
        </View>

        <GestureDetector gesture={horizontalGesture}>
          <Animated.View style={[styles.contentContainer, tabContentStyle]}>
            {tabContents[activeTab]}
          </Animated.View>
        </GestureDetector>
      </View>
    </Animated.View>
  );

  useEffect(() => {
    const backAction = () => {
      if (isExpanded) {
        closePlayer();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction,
    );

    return () => backHandler.remove();
  }, [isExpanded, closePlayer]);

  if (!currentSong || !isHomeActive || !isPlayerVisible) return null;

  return (
    <>
      {renderExpandedPlayer()}
      {renderMiniPlayer()}
      {playerDrawerOpen && (
        <NewPlayerDrawer
          isVisible={playerDrawerOpen}
          onClose={() => setPlayerDrawerOpen(false)}
          song={currentSong}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  miniPlayerContainer: {
    position: "absolute",
    width: "100%",
    overflow: "hidden",
    zIndex: 5,
  },
  miniPlayerContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    width: "100%",
  },
  miniPlayerImage: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  miniPlayerTextContainer: {
    flex: 1,
    paddingHorizontal: 12,
  },
  miniPlayerTitle: {
    fontWeight: "600",
    fontSize: 15,
    letterSpacing: 0.2,
  },
  miniPlayerArtist: {
    fontSize: 13,
    marginTop: 2,
  },

  expandedPlayerBackground: {
    flex: 1,
    height: "100%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  tabsContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 16,
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    position: "relative",
    borderRadius: 0,
  },
  tabText: {
    textAlign: "center",
    fontWeight: "500",
    fontSize: 15,
    letterSpacing: 0.3,
  },
  activeTabText: {
    fontWeight: "600",
  },
  activeTabIndicator: {
    position: "absolute",
    bottom: -1,
    height: 3,
    width: "50%",
    borderRadius: 3,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 10,
  },
  tabContentContainer: {
    flex: 1,
  },

  playerTabContainer: {
    alignItems: "center",
  },
  albumArt: {
    width: "90%",
    aspectRatio: 1,
    borderRadius: 20,
    alignSelf: "center",
    maxHeight: height * 0.45,
    marginTop: 10,
  },
  songInfoContainer: {
    width: "100%",
    marginTop: 36,
    marginBottom: 20,
  },
  songTitle: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    letterSpacing: 0.4,
    paddingHorizontal: 10,
  },
  artistName: {
    fontSize: 18,
    textAlign: "center",
    marginTop: 10,
  },
});

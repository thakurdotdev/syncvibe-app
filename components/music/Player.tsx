import { SONG_URL } from "@/constants";
import { usePlayer, usePlayerState, usePlaylist } from "@/context/MusicContext";
import { Song } from "@/types/song";
import { ensureHttpsForSongUrls } from "@/utils/getHttpsUrls";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useFocusEffect, usePathname, useRouter } from "expo-router";
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
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { PanGestureHandler } from "react-native-gesture-handler";
import Animated, {
  Easing,
  Extrapolation,
  FadeIn,
  FadeOut,
  interpolate,
  runOnJS,
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TrackPlayer from "react-native-track-player";
import { ProgressBar, SongControls } from "./MusicCards";
import { MusicQueue, SimilarSongs } from "./MusicLists";
import NewPlayerDrawer from "./NewPlayerDrawer";

const { height, width } = Dimensions.get("window");
const ANIMATION_DURATION = 250;
const TAB_ANIMATION_DURATION = 150;
const SWIPE_THRESHOLD = 150;

const PlayerTab = React.memo(
  ({
    currentSong,
    artistName,
  }: {
    currentSong: Song | null;
    artistName: string;
  }) => (
    <View style={styles.playerTabContainer}>
      <Animated.Image
        entering={FadeIn.duration(300)}
        source={{ uri: currentSong?.image[2]?.link }}
        style={[
          styles.albumArt,
          {
            transform: [{ perspective: 1000 }], // Hardware acceleration hint
          },
        ]}
        resizeMode="cover"
      />
      <View style={styles.songInfoContainer}>
        <Text style={styles.songTitle} numberOfLines={1} ellipsizeMode="tail">
          {currentSong?.name}
        </Text>
        <Text style={styles.artistName} numberOfLines={1} ellipsizeMode="tail">
          {artistName}
        </Text>
      </View>
      <SongControls />
    </View>
  ),
);

const QueueTab = React.memo(({ playlist }: { playlist: Song[] }) => (
  <Animated.View style={styles.tabContentContainer}>
    {playlist.length > 0 && (
      <View style={styles.dragInstructionsContainer}>
        <Ionicons
          name="menu-outline"
          size={22}
          color="rgba(255, 255, 255, 0.7)"
        />
        <Text style={styles.dragInstructionsText}>Drag to reorder songs</Text>
      </View>
    )}
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
  const { addToQueue, handleNextSong } = usePlayer();
  const { currentSong, isPlaying, isLoading } = usePlayerState();
  const { playlist } = usePlaylist();
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "player" | "queue" | "recommendations"
  >("player");
  const insets = useSafeAreaInsets();
  const [playerDrawerOpen, setPlayerDrawerOpen] = useState(false);
  const [isPlayerVisible, setIsPlayerVisible] = useState(true);
  const lastPathRef = useRef("");

  const handlePlayPauseSong = async () => {
    if (isPlaying) {
      await TrackPlayer.pause();
    } else {
      await TrackPlayer.play();
    }
  };

  const pathname = usePathname();

  // Determine active tab based on pathname
  const isHomeActive = pathname.includes("/home");

  // Force re-render on route change or when song changes
  useFocusEffect(
    useCallback(() => {
      // Reset visibility when we navigate back to home
      if (pathname.includes("/home") && currentSong) {
        setIsPlayerVisible(true);
      }

      // Track path changes to detect navigation events
      if (lastPathRef.current !== pathname) {
        lastPathRef.current = pathname;

        // Small delay to ensure context is stable after navigation
        const timer = setTimeout(() => {
          if (currentSong && pathname.includes("/home")) {
            setIsPlayerVisible(true);
          }
        }, 100);

        return () => clearTimeout(timer);
      }
    }, [pathname, currentSong]),
  );

  // Additional effect to monitor currentSong changes
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

  const getRecommendations = useCallback(async () => {
    if (!currentSong?.id || playlist.length > 2) return;

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
        if (playlist.length < 2 && newRecommendations.length > 0) {
          const filteredRecommendations = newRecommendations.filter(
            (rec: Song) =>
              rec.id !== currentSong.id &&
              !playlist.some((item) => item.id === rec.id),
          );

          if (filteredRecommendations.length > 0) {
            const randomIndex = Math.floor(
              Math.random() * filteredRecommendations.length,
            );
            const songToAdd = filteredRecommendations[randomIndex];
            addToQueue(songToAdd);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching recommendations:", error);
    } finally {
      setLoading(false);
    }
  }, [currentSong?.id]);

  useEffect(() => {
    getRecommendations();
  }, [getRecommendations]);

  // Open player function
  const openPlayer = useCallback(() => {
    setIsExpanded(true);

    // YouTube-like animation: fast at the beginning, slower at the end
    translateY.value = withTiming(0, {
      duration: ANIMATION_DURATION,
      easing: Easing.bezier(0.17, 0.67, 0.23, 0.96),
    });

    // Fade out the mini player
    miniPlayerOpacity.value = withTiming(0, {
      duration: ANIMATION_DURATION * 0.6,
      easing: Easing.out(Easing.ease),
    });
  }, [translateY, miniPlayerOpacity]);

  // Close player function - YouTube-like dismissal
  const closePlayer = useCallback(() => {
    // Single smooth animation that doesn't bounce
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

    // Fade in mini player slightly before the expanded player is completely gone
    miniPlayerOpacity.value = withTiming(1, {
      duration: ANIMATION_DURATION,
      easing: Easing.bezier(0.33, 0.01, 0.66, 1),
    });
  }, [translateY, miniPlayerOpacity, gestureTranslateY]);

  const handleTabPress = useCallback(
    (tab: "player" | "queue" | "recommendations") => {
      if (tab !== activeTab) {
        setActiveTab(tab);
      }
    },
    [activeTab],
  );

  const artistName = useMemo(
    () =>
      currentSong?.artist_map?.artists
        ?.slice(0, 3)
        ?.map((artist) => artist.name)
        .join(", ") || "",
    [currentSong],
  );

  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, ctx) => {
      ctx.startY = gestureTranslateY.value;
    },
    onActive: (event, ctx: any) => {
      if (event.translationY > 0) {
        const dampenedDrag = event.translationY * 0.8;
        gestureTranslateY.value = ctx.startY + dampenedDrag;
      }
    },
    onEnd: (event, velocity: any) => {
      if (event.translationY > SWIPE_THRESHOLD || velocity.velocityY > 500) {
        runOnJS(closePlayer)();
      } else {
        gestureTranslateY.value = withSpring(0, {
          damping: 20,
          stiffness: 300,
          mass: 0.8,
        });
      }
    },
  });

  const expandedPlayerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value + gestureTranslateY.value }],
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

  // Pre-render all tabs for instant switching
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
        },
      ]}
    >
      <ProgressBar />
      <TouchableOpacity
        style={styles.miniPlayerContent}
        onPress={openPlayer}
        activeOpacity={0.9}
      >
        <Image
          source={{ uri: currentSong?.image[1]?.link }}
          style={styles.miniPlayerImage}
        />
        <View style={styles.miniPlayerTextContainer}>
          <Text style={styles.miniPlayerTitle} numberOfLines={1}>
            {currentSong?.name}
          </Text>
          <Text style={styles.miniPlayerArtist} numberOfLines={1}>
            {artistName}
          </Text>
        </View>
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            handlePlayPauseSong();
          }}
          style={styles.playPauseButton}
        >
          {isLoading ? (
            <ActivityIndicator
              size={22}
              color="white"
              style={{ opacity: 0.5 }}
              aria-disabled={true}
            />
          ) : (
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={22}
              color="white"
            />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            handleNextSong();
          }}
          style={styles.playPauseButton}
          className="ml-2"
        >
          <Ionicons name="play-skip-forward" size={22} color="white" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderExpandedPlayer = () => (
    <Animated.View
      style={[
        expandedPlayerStyle,
        {
          backfaceVisibility: "hidden", // Hardware acceleration hint
        },
      ]}
    >
      <View
        style={[
          styles.expandedPlayerBackground,
          { paddingTop: insets.top, transform: [{ perspective: 1000 }] },
        ]}
      >
        <PanGestureHandler onGestureEvent={gestureHandler}>
          <Animated.View>
            <View style={styles.header}>
              <TouchableOpacity
                onPress={closePlayer}
                style={styles.headerButton}
              >
                <Ionicons name="chevron-down" size={24} color="white" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Now Playing</Text>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => {
                  setPlayerDrawerOpen(true);
                }}
              >
                <Ionicons name="ellipsis-horizontal" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </PanGestureHandler>

        <View style={styles.tabsContainer}>
          {["player", "queue", "recommendations"].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={styles.tab}
              onPress={() =>
                optimizedHandleTabPress(
                  tab as "player" | "queue" | "recommendations",
                )
              }
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab ? styles.activeTabText : null,
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
                  style={styles.activeTabIndicator}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.contentContainer}>{tabContents[activeTab]}</View>
      </View>
    </Animated.View>
  );

  useEffect(() => {
    const backAction = () => {
      if (isExpanded) {
        closePlayer();
        return true; // Prevents app from closing
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction,
    );

    return () => backHandler.remove();
  }, [isExpanded, closePlayer]);

  // Optimize tab switching for instant response
  const optimizedHandleTabPress = useCallback(
    (tab: "player" | "queue" | "recommendations") => {
      if (tab !== activeTab) {
        // Instant tab switch with no delay
        requestAnimationFrame(() => {
          setActiveTab(tab);
        });
      }
    },
    [activeTab],
  );

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
    width: "100%", // Make it narrower for a more modern look
    // left: "2.5%", // Center it horizontally
    // borderRadius: 16, // Rounded corners for modern appearance
    overflow: "hidden", // Ensure contents respect border radius
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 5,
  },
  miniPlayerContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: "rgba(18, 18, 18, 0.98)", // Slightly transparent black
    // borderRadius: 16,
  },
  miniPlayerImage: {
    width: 48,
    height: 48,
    borderRadius: 12, // More rounded image corners
  },
  miniPlayerTextContainer: {
    flex: 1,
    paddingHorizontal: 12,
  },
  miniPlayerTitle: {
    color: "white",
    fontWeight: "600",
    fontSize: 15,
    letterSpacing: 0.2, // Slightly better readability
  },
  miniPlayerArtist: {
    color: "rgba(255, 255, 255, 0.7)", // Slightly more visible text
    fontSize: 13,
    marginTop: 2,
  },
  playPauseButton: {
    backgroundColor: "rgba(255, 255, 255, 0.18)", // Slightly more visible
    padding: 10,
    borderRadius: 24,
    marginLeft: 8,
    transform: [{ scale: 1.05 }], // Slightly larger buttons
  },

  // Expanded Player styles
  expandedPlayerBackground: {
    flex: 1,
    backgroundColor: "rgb(12, 12, 12)", // Slightly lighter than pure black
    height: "100%",
  },
  swipeHandleContainer: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 10,
  },
  swipeHandle: {
    width: 40,
    height: 5,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 3,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12, // More padding
    marginBottom: 4,
  },
  headerButton: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    padding: 10,
    borderRadius: 24,
  },
  headerTitle: {
    color: "white",
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: 0.3, // Better text spacing
  },
  tabsContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  tab: {
    flex: 1,
    paddingVertical: 14, // Taller tabs
    alignItems: "center",
    position: "relative",
  },
  tabText: {
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    fontWeight: "500",
    fontSize: 15, // Larger font
    letterSpacing: 0.3, // Better text spacing
  },
  activeTabText: {
    color: "white",
    fontWeight: "600", // Bolder when active
  },
  activeTabIndicator: {
    position: "absolute",
    bottom: -1,
    height: 3,
    width: "50%", // Narrower indicator
    backgroundColor: "#ffffff",
    borderRadius: 3,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 10, // More horizontal padding
  },
  tabContentContainer: {
    flex: 1,
  },

  playerTabContainer: {
    alignItems: "center",
  },
  albumArt: {
    width: "90%", // Slightly narrower for better appearance
    aspectRatio: 1,
    borderRadius: 20, // More rounded corners
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.48,
    shadowRadius: 12,
    elevation: 18,
    alignSelf: "center",
    maxHeight: height * 0.45,
    marginTop: 10, // Add some top margin
  },
  songInfoContainer: {
    width: "100%",
    marginTop: 36, // More spacing
    marginBottom: 20,
  },
  songTitle: {
    color: "white",
    fontSize: 26, // Larger font
    fontWeight: "bold",
    textAlign: "center",
    letterSpacing: 0.4, // Better text spacing
    paddingHorizontal: 10, // Add some padding
  },
  artistName: {
    color: "rgba(255, 255, 255, 0.7)", // More visible
    fontSize: 18,
    textAlign: "center",
    marginTop: 10, // More spacing
  },
  dragInstructionsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center", // Center the text
    marginBottom: 12,
    marginTop: 4,
    backgroundColor: "rgba(255, 255, 255, 0.08)", // Slight background
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: "center", // Center in the container
  },
  dragInstructionsText: {
    color: "rgba(255, 255, 255, 0.8)", // More visible
    fontSize: 14,
    marginLeft: 8,
    fontWeight: "500", // Medium weight
  },
});

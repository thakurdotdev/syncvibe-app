import { SONG_URL } from "@/constants";
import { usePlayer, usePlayerState, usePlaylist } from "@/context/MusicContext";
import { Song } from "@/types/song";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { usePathname } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
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
import TrackPlayer, {
  State,
  usePlaybackState,
} from "react-native-track-player";
import { ProgressBar, SongControls } from "./MusicCards";
import { MusicQueue, SimilarSongs } from "./MusicLists";
import PlayerDrawer from "./PlayerDrawer";
import { LinearGradient } from "expo-linear-gradient";
import {
  blendColors,
  darkenColor,
  extractImageColors,
} from "@/utils/getImageColors";

const { height, width } = Dimensions.get("window");
const ANIMATION_DURATION = 250;
const TAB_ANIMATION_DURATION = 150;
const SWIPE_THRESHOLD = 80;

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
        style={styles.albumArt}
        resizeMode="cover"
      />
      <View style={styles.songInfoContainer}>
        <Text style={styles.songTitle}>{currentSong?.name}</Text>
        <Text style={styles.artistName}>{artistName}</Text>
      </View>
      <SongControls />
    </View>
  ),
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
  }: {
    recommendations: Song[];
    loading: boolean;
  }) => (
    <Animated.View
      entering={FadeIn.duration(TAB_ANIMATION_DURATION)}
      exiting={FadeOut.duration(TAB_ANIMATION_DURATION)}
      style={styles.tabContentContainer}
    >
      <SimilarSongs recommendations={recommendations} loading={loading} />
    </Animated.View>
  ),
);

export default function Player() {
  const { addToPlaylist, handleNextSong } = usePlayer();
  const { currentSong } = usePlayerState();
  const { playlist } = usePlaylist();
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState("player");
  const insets = useSafeAreaInsets();
  const playbackState = usePlaybackState();
  const isPlaying = playbackState.state === State.Playing;
  const [playerDrawerOpen, setPlayerDrawerOpen] = useState(false);
  const [albumColors, setAlbumColors] = useState({
    primary: "#42353A",
    secondary: "#092B31",
    background: "#121212",
    isLight: false,
  });

  useEffect(() => {
    async function getColors() {
      if (currentSong?.image?.[2]?.link) {
        try {
          const colors = await extractImageColors(currentSong.image[2].link);
          setAlbumColors(colors);
        } catch (error) {
          console.error("Failed to extract image colors:", error);
        }
      }
    }

    getColors();
  }, [currentSong?.id]);

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

  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);

  // Animation values
  const translateY = useSharedValue(height);
  const gestureTranslateY = useSharedValue(0);
  const miniPlayerOpacity = useSharedValue(1);

  const getRecommendations = useCallback(async () => {
    if (!currentSong?.id) return;

    try {
      setLoading(true);
      const response = await axios.get(
        `${SONG_URL}/song/recommend?id=${currentSong.id}`,
      );
      if (response.data?.data) {
        setRecommendations(response.data.data);
        if (playlist.length < 2 && response.data.data.length > 0) {
          addToPlaylist(response.data.data[0]);
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
    (tab: string) => {
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

  // Swipe gesture handler for closing expanded player - YouTube style
  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, ctx) => {
      ctx.startY = gestureTranslateY.value;
    },
    onActive: (event, ctx: any) => {
      if (event.translationY > 0) {
        // Only allow downward swipes
        // Add some resistance to the drag
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
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={22}
            color="white"
          />
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
    <Animated.View style={expandedPlayerStyle}>
      <View
        style={[styles.expandedPlayerBackground, { paddingTop: insets.top }]}
      >
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            height: "100%",
            zIndex: 0,
          }}
        >
          <LinearGradient
            colors={[
              darkenColor(albumColors.primary, 0.1),
              albumColors.secondary,
              blendColors(albumColors.secondary, "#000000", 0.7),
              "#080808",
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{
              height: "100%",
              width: "100%",
            }}
          />
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.15)", // Very subtle dark overlay
            }}
          />
        </Animated.View>
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
              onPress={() => handleTabPress(tab)}
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

        <View style={styles.contentContainer}>
          {activeTab === "player" && (
            <Animated.View
              entering={FadeIn.duration(TAB_ANIMATION_DURATION)}
              exiting={FadeOut.duration(TAB_ANIMATION_DURATION)}
              style={styles.tabContentContainer}
            >
              <PlayerTab currentSong={currentSong} artistName={artistName} />
            </Animated.View>
          )}
          {activeTab === "queue" && <QueueTab playlist={playlist} />}
          {activeTab === "recommendations" && (
            <RecommendationsTab
              recommendations={recommendations}
              loading={loading}
            />
          )}
        </View>
      </View>
    </Animated.View>
  );

  if (!currentSong || !isHomeActive) return null;

  return (
    <>
      {renderExpandedPlayer()}
      {renderMiniPlayer()}
      {playerDrawerOpen && (
        <PlayerDrawer
          isOpen={playerDrawerOpen}
          onClose={() => setPlayerDrawerOpen(false)}
          closePlayer={closePlayer}
          currentSong={currentSong}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  miniPlayerContainer: {
    position: "absolute",
    width: "100%",
    left: 0,
    zIndex: 5,
  },
  miniPlayerContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#000",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    elevation: 8,
    marginHorizontal: 8,
  },
  miniPlayerImage: {
    width: 48,
    height: 48,
    borderRadius: 6,
  },
  miniPlayerTextContainer: {
    flex: 1,
    paddingHorizontal: 12,
  },
  miniPlayerTitle: {
    color: "white",
    fontWeight: "600",
    fontSize: 15,
  },
  miniPlayerArtist: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 13,
    marginTop: 2,
  },
  playPauseButton: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    padding: 10,
    borderRadius: 24,
    marginLeft: 8,
  },

  // Expanded Player styles
  expandedPlayerBackground: {
    flex: 1,
    backgroundColor: "#000",
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
    paddingBottom: 8,
  },
  headerButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    padding: 8,
    borderRadius: 24,
  },
  headerTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
  tabsContainer: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    position: "relative",
  },
  tabText: {
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    fontWeight: "500",
    fontSize: 14,
  },
  activeTabText: {
    color: "white",
  },
  activeTabIndicator: {
    position: "absolute",
    bottom: -1,
    height: 3,
    width: "70%",
    backgroundColor: "#1DB954",
    borderRadius: 3,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  tabContentContainer: {
    flex: 1,
  },

  playerTabContainer: {
    alignItems: "center",
  },
  albumArt: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.44,
    shadowRadius: 10.32,
    elevation: 16,
    maxHeight: height * 0.45,
  },
  songInfoContainer: {
    width: "100%",
    marginTop: 32,
    marginBottom: 16,
  },
  songTitle: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
  },
  artistName: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 18,
    textAlign: "center",
    marginTop: 8,
  },
});

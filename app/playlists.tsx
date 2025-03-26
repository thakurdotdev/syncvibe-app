import { SongCard } from "@/components/music/MusicCards";
import { SONG_URL } from "@/constants";
import { usePlayer } from "@/context/MusicContext";
import { Song } from "@/types/song";
import axios from "axios";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  Text,
  View,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

interface PlaylistData {
  id: string;
  name: string;
  header_desc: string;
  image: string;
  list_count: number;
  follower_count: number;
  songs: Song[];
}

export default function PlaylistScreen() {
  const { id } = useLocalSearchParams();
  const [playlistData, setPlaylistData] = useState<PlaylistData | null>(null);
  const { addToPlaylist, playSong } = usePlayer();
  const [loading, setLoading] = useState(true);
  const { width } = useWindowDimensions();
  const scrollY = useSharedValue(0);

  const fetchPlaylistData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${SONG_URL}/playlist?id=${id}`);
      const data = response.data;
      setPlaylistData(data.data);
    } catch (error) {
      console.error("Error fetching playlist data:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchPlaylistData();
    }
  }, [id, fetchPlaylistData]);

  const handlePlayAll = useCallback(() => {
    if (playlistData?.songs?.length) {
      const songsWithPlaylistInfo = playlistData.songs.map((song) => ({
        ...song,
        isPlaylist: true,
        playlistId: playlistData.id,
      }));
      addToPlaylist(songsWithPlaylistInfo);
      playSong(songsWithPlaylistInfo[0]);
    }
  }, [playlistData, addToPlaylist, playSong]);

  const handleShuffle = useCallback(() => {
    if (playlistData?.songs?.length) {
      const shuffledSongs = [...playlistData.songs]
        .sort(() => Math.random() - 0.5)
        .map((song) => ({
          ...song,
          isPlaylist: true,
          playlistId: playlistData.id,
        }));
      addToPlaylist(shuffledSongs);
      playSong(shuffledSongs[0]);
    }
  }, [playlistData, addToPlaylist, playSong]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const formatCount = useCallback((count: any) => {
    if (count === undefined || count === null) return "N/A";
    if (count >= 1000000000) return (count / 1000000000).toFixed(1) + "B";
    if (count >= 1000000) return (count / 1000000).toFixed(1) + "M";
    if (count >= 1000) return (count / 1000).toFixed(1) + "K";
    return count.toString();
  }, []);

  const headerHeight = useMemo(() => Math.min(width * 0.8, 250), [width]);
  const imageSize = useMemo(() => Math.min(width * 0.4, 240), [width]);

  const headerAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, headerHeight * 0.5, headerHeight],
      [1, 0.8, 0],
      Extrapolation.CLAMP,
    );

    const scale = interpolate(
      scrollY.value,
      [0, headerHeight],
      [1, 0.85],
      Extrapolation.CLAMP,
    );

    return {
      opacity,
      transform: [
        { scale },
        {
          translateY: interpolate(
            scrollY.value,
            [0, headerHeight],
            [0, -50],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  const imageAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: interpolate(
            scrollY.value,
            [0, headerHeight],
            [1, 0.9],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1DB954" />
        <Text style={styles.loadingText}>Loading playlist...</Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.FlatList
        data={playlistData?.songs}
        renderItem={({ item, index }) => <SongCard song={item} />}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
        style={{ paddingHorizontal: 20 }}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        ListHeaderComponent={
          <View>
            <Animated.View
              style={[
                { height: headerHeight },
                styles.headerContainer,
                headerAnimatedStyle,
              ]}
            >
              <LinearGradient
                colors={["#1E1E1E", "#121212"]}
                style={[styles.headerGradient, { height: headerHeight }]}
              >
                <Image
                  source={{ uri: playlistData?.image }}
                  style={[styles.backgroundImage, { height: headerHeight }]}
                  blurRadius={30}
                />
                <BlurView intensity={80} style={styles.blurOverlay}>
                  <View style={styles.headerContent}>
                    <Animated.View style={imageAnimatedStyle}>
                      <Image
                        source={{ uri: playlistData?.image }}
                        style={[
                          styles.playlistImage,
                          { width: imageSize, height: imageSize },
                        ]}
                        resizeMode="cover"
                      />
                    </Animated.View>
                    <View style={styles.infoContainer}>
                      <Text style={styles.playlistName} numberOfLines={2}>
                        {playlistData?.name}
                      </Text>
                      <Text style={styles.description} numberOfLines={3}>
                        {playlistData?.header_desc}
                      </Text>
                      <View style={styles.statsContainer}>
                        <Text style={styles.statText}>
                          {playlistData?.list_count} songs
                        </Text>
                        <Text style={styles.statText}>
                          {formatCount(playlistData?.follower_count)} followers
                        </Text>
                      </View>
                    </View>
                  </View>
                </BlurView>
              </LinearGradient>
            </Animated.View>

            {/* Action buttons */}
            <View style={styles.actionsContainer}>
              <Pressable
                style={[styles.button, styles.playButton]}
                onPress={handlePlayAll}
                disabled={!playlistData?.songs?.length}
              >
                <Ionicons name="play" size={22} color="white" />
                <Text style={styles.buttonText}>Play All</Text>
              </Pressable>

              <Pressable
                style={[styles.button, styles.shuffleButton]}
                onPress={handleShuffle}
                disabled={!playlistData?.songs?.length}
              >
                <Ionicons name="shuffle" size={22} color="white" />
                <Text style={styles.buttonText}>Shuffle</Text>
              </Pressable>
            </View>

            {/* Songs header */}
            <View style={styles.songsHeader}>
              <Text style={styles.songsHeaderText}>Songs</Text>
            </View>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#121212",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "white",
    marginTop: 16,
    fontSize: 16,
  },
  headerContainer: {
    width: "100%",
    position: "relative",
    overflow: "hidden",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerGradient: {
    width: "100%",
    position: "relative",
    overflow: "hidden",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backgroundImage: {
    position: "absolute",
    width: "100%",
    opacity: 0.6,
  },
  blurOverlay: {
    width: "100%",
    height: "100%",
    justifyContent: "flex-end",
    padding: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 16,
  },
  playlistImage: {
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  infoContainer: {
    flex: 1,
    justifyContent: "flex-end",
    paddingBottom: 4,
  },
  playlistName: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  description: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    marginBottom: 12,
  },
  statsContainer: {
    flexDirection: "row",
    gap: 16,
    marginTop: 4,
  },
  statText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 13,
  },
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 16,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 50,
    minWidth: 140,
    gap: 8,
  },
  playButton: {
    backgroundColor: "#1DB954", // Spotify green
  },
  shuffleButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  songsHeader: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  songsHeaderText: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
  separator: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    marginHorizontal: 20,
  },
  listContent: {
    paddingBottom: 120,
  },
});

import { SongCard } from "@/components/music/MusicCards";
import { SONG_URL } from "@/constants";
import { usePlayer } from "@/context/MusicContext";
import { Song } from "@/types/song";
import axios from "axios";
import { useLocalSearchParams } from "expo-router";
import { Music2Icon } from "lucide-react-native";
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

interface AlbumData {
  id: string;
  name: string;
  year: string;
  songcount: number;
  image: Array<{ link: string }>;
  songs: Song[];
  artist_map?: {
    artists?: Array<{ name: string }>;
  };
}

export default function AlbumScreen() {
  const { id } = useLocalSearchParams();
  const [albumData, setAlbumData] = useState<AlbumData | null>(null);
  const { addToPlaylist, playSong } = usePlayer();
  const [loading, setLoading] = useState(true);
  const { width } = useWindowDimensions();

  const fetchAlbumData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${SONG_URL}/album?id=${id}`);
      const data = response.data;
      setAlbumData(data.data);
    } catch (error) {
      console.error("Error fetching album data:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchAlbumData();
    }
  }, [id, fetchAlbumData]);

  const handlePlayAll = useCallback(() => {
    if (albumData?.songs?.length) {
      const songsWithAlbumInfo = albumData.songs.map((song) => ({
        ...song,
        isAlbum: true,
        albumId: albumData.id,
      }));
      addToPlaylist(songsWithAlbumInfo);
      playSong(songsWithAlbumInfo[0]);
    }
  }, [albumData, addToPlaylist, playSong]);

  const handleShuffle = useCallback(() => {
    if (albumData?.songs?.length) {
      const shuffledSongs = [...albumData.songs]
        .sort(() => Math.random() - 0.5)
        .map((song) => ({
          ...song,
          isAlbum: true,
          albumId: albumData.id,
        }));
      addToPlaylist(shuffledSongs);
      playSong(shuffledSongs[0]);
    }
  }, [albumData, addToPlaylist, playSong]);

  const headerHeight = useMemo(() => Math.min(width * 0.8, 250), [width]);
  const imageSize = useMemo(() => Math.min(width * 0.4, 250), [width]);

  const albumCoverUrl = useMemo(() => {
    return albumData?.image?.[2]?.link || albumData?.image?.[0]?.link;
  }, [albumData]);

  const artistName = useMemo(() => {
    return albumData?.artist_map?.artists
      ?.slice(0, 2)
      ?.map((artist) => artist.name)
      .join(", ");
  }, [albumData]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1DB954" />
        <Text style={styles.loadingText}>Loading album...</Text>
      </SafeAreaView>
    );
  }

  if (!albumData) {
    return (
      <SafeAreaView style={styles.emptyContainer}>
        <Music2Icon size={100} color="white" />
        <Text style={styles.emptyText}>No album found</Text>
        <Pressable style={styles.retryButton} onPress={fetchAlbumData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={albumData.songs}
        renderItem={({ item, index }) => <SongCard song={item} />}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <LinearGradient
              colors={["#1E1E1E", "#121212"]}
              style={[styles.headerContainer, { height: headerHeight }]}
            >
              <Image
                source={{ uri: albumCoverUrl }}
                style={[styles.backgroundImage, { height: headerHeight }]}
                blurRadius={25}
              />
              <BlurView intensity={70} style={styles.blurOverlay}>
                <View style={styles.headerContent}>
                  <View style={styles.albumCoverContainer}>
                    <Image
                      source={{ uri: albumCoverUrl }}
                      style={[
                        styles.albumCover,
                        { width: imageSize, height: imageSize },
                      ]}
                      resizeMode="cover"
                    />
                  </View>
                  <View style={styles.infoContainer}>
                    <Text style={styles.albumTitle} numberOfLines={2}>
                      {albumData.name}
                    </Text>
                    {artistName && (
                      <Text style={styles.artistName} numberOfLines={2}>
                        {artistName}
                      </Text>
                    )}
                    <View style={styles.statsContainer}>
                      {albumData.year && (
                        <View style={styles.stat}>
                          <Ionicons
                            name="calendar-outline"
                            size={14}
                            color="rgba(255,255,255,0.6)"
                          />
                          <Text style={styles.statText}>{albumData.year}</Text>
                        </View>
                      )}
                      <View style={styles.stat}>
                        <Ionicons
                          name="musical-note"
                          size={14}
                          color="rgba(255,255,255,0.6)"
                        />
                        <Text style={styles.statText}>
                          {albumData.songcount}{" "}
                          {albumData.songcount === 1 ? "song" : "songs"}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </BlurView>
            </LinearGradient>

            {/* Action buttons */}
            <View style={styles.actionsContainer}>
              <Pressable
                style={[styles.button, styles.playButton]}
                onPress={handlePlayAll}
                disabled={!albumData?.songs?.length}
              >
                <Ionicons name="play" size={22} color="white" />
                <Text style={styles.buttonText}>Play All</Text>
              </Pressable>

              <Pressable
                style={[styles.button, styles.shuffleButton]}
                onPress={handleShuffle}
                disabled={!albumData?.songs?.length}
              >
                <Ionicons name="shuffle" size={22} color="white" />
                <Text style={styles.buttonText}>Shuffle</Text>
              </Pressable>
            </View>

            {/* Songs header */}
            <View style={styles.songsHeader}>
              <Text style={styles.songsHeaderText}>Tracks</Text>
            </View>
          </>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    paddingHorizontal: 20,
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
  emptyContainer: {
    flex: 1,
    backgroundColor: "#121212",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  emptyText: {
    color: "white",
    fontSize: 18,
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: "#1DB954",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 50,
  },
  retryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  headerContainer: {
    width: "100%",
    position: "relative",
    overflow: "hidden",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
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
    gap: 10,
  },
  albumCoverContainer: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  albumCover: {
    borderRadius: 12,
  },
  infoContainer: {
    flex: 1,
    justifyContent: "flex-end",
    paddingBottom: 4,
  },
  albumTitle: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  artistName: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 12,
  },
  statsContainer: {
    flexDirection: "row",
    gap: 16,
    marginTop: 8,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 14,
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
    paddingVertical: 14,
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
    fontSize: 22,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  listContent: {
    paddingBottom: 120,
  },
});

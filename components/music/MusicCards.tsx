import { useGroupMusic } from "@/context/GroupMusicContext";
import { usePlayer, usePlayerState } from "@/context/MusicContext";
import { Song } from "@/types/song";
import {
  ensureHttpsForAlbumUrls,
  ensureHttpsForArtistUrls,
  ensureHttpsForPlaylistUrls,
  ensureHttpsForSongUrls,
} from "@/utils/getHttpsUrls";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { SkipBackIcon, SkipForwardIcon } from "lucide-react-native";
import {
  memo,
  default as React,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Slider } from "react-native-awesome-slider";
import { TouchableOpacity } from "react-native-gesture-handler";
import { useSharedValue, withTiming } from "react-native-reanimated";
import TrackPlayer, {
  State,
  usePlaybackState,
  useProgress,
} from "react-native-track-player";
import NewPlayerDrawer from "./NewPlayerDrawer";

interface SongCardProps {
  song: Song;
}

interface AlbumCardProps {
  album: any;
}

interface PlaylistCardProps {
  playlist: any;
  isUser?: boolean;
}

interface ImageType {
  link: string;
}

interface ArtistCardProps {
  artist: { id: string; name: string; image: ImageType[] };
}

const formatTime = (time: number) => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
};

interface CardContainerProps {
  children: React.ReactNode;
  onPress: () => void | Promise<void>;
  onLongPress?: () => void | Promise<void>;
  width?: number | `${number}%`;
}

const CardContainer = ({
  children,
  onPress,
  width = 160,
  onLongPress,
}: CardContainerProps) => (
  <Pressable
    style={{
      width: width,
      backgroundColor: "rgba(24, 24, 27, 0.8)",
      borderRadius: 8,
      marginBottom: 16,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    }}
    onPress={onPress}
    android_ripple={{ color: "rgba(255, 255, 255, 0.5)", borderless: false }}
    onLongPress={onLongPress}
  >
    {children}
  </Pressable>
);
export const SongCard = memo(({ song }: SongCardProps) => {
  const { playSong } = usePlayer();
  const { currentSong } = usePlayerState();
  const playbackState = usePlaybackState();
  const isPlaying = playbackState.state === State.Playing;

  const [playerDrawerOpen, setPlayerDrawerOpen] = useState(false);

  // Apply HTTPS conversion to the song object
  const securedSong = useMemo(() => ensureHttpsForSongUrls(song), [song]);

  const isCurrentSong = currentSong?.id === securedSong.id;

  const handlePress = async () => {
    if (isCurrentSong) {
      if (isPlaying) {
        await TrackPlayer.pause();
      } else {
        await TrackPlayer.play();
      }
    } else {
      playSong(securedSong);
    }
  };

  const handleLongPress = () => {
    setPlayerDrawerOpen(true);
  };

  return (
    <>
      <Pressable
        onPress={handlePress}
        onLongPress={handleLongPress}
        style={{
          backgroundColor: "rgba(24, 24, 27, 0.8)",
          borderRadius: 8,
          overflow: "hidden",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 2,
        }}
        android_ripple={{
          color: "rgba(255, 255, 255, 0.5)",
          borderless: false,
        }}
        className="flex-row items-center rounded-xl mb-2 overflow-hidden"
        key={securedSong.id}
      >
        <BlurView intensity={20} tint="dark" className="absolute inset-0" />
        <LinearGradient
          colors={["rgba(30, 30, 40, 0.7)", "rgba(20, 20, 28, 0.8)"]}
          className="w-full flex-row border border-gray-800/30 rounded-xl p-2"
        >
          <Image
            source={{ uri: securedSong.image[0]?.link }}
            className="w-12 h-12 rounded-md"
            alt="Song cover"
          />
          <View className="flex-1 px-4 justify-center">
            <Text className="text-white font-semibold" numberOfLines={1}>
              {securedSong.name}
            </Text>
            <Text className="text-gray-400 text-sm" numberOfLines={1}>
              {securedSong.subtitle ||
                securedSong.artist_map?.artists?.[0]?.name}
            </Text>
          </View>
          {isCurrentSong && (
            <View className="justify-center pr-2">
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={24}
                color="white"
              />
            </View>
          )}
        </LinearGradient>
      </Pressable>
      {playerDrawerOpen && (
        <NewPlayerDrawer
          isVisible={playerDrawerOpen}
          onClose={() => setPlayerDrawerOpen(false)}
          song={securedSong}
        />
      )}
    </>
  );
});

const CardImage = ({ uri, alt }: { uri: string; alt: string }) => (
  <View
    style={{ width: "100%", height: 140, borderRadius: 6, overflow: "hidden" }}
  >
    <Image
      source={{ uri: uri || "https://via.placeholder.com/140" }}
      style={{ width: "100%", height: "100%" }}
      resizeMode="cover"
      alt={alt}
    />
  </View>
);

export const AlbumCard = memo(({ album }: AlbumCardProps) => {
  const handlePress = useCallback(() => {
    router.push({
      pathname: "/albums",
      params: { id: album.id },
    });
  }, [album?.id]);

  if (!album) return null;

  // Apply HTTPS conversion to the album object
  const securedAlbum = useMemo(() => ensureHttpsForAlbumUrls(album), [album]);

  const name = securedAlbum.name || securedAlbum.title || "";
  const imageUrl =
    securedAlbum.image?.[2]?.link || securedAlbum.image?.[2]?.url;

  return (
    <CardContainer onPress={handlePress}>
      <View style={{ padding: 12, gap: 8 }}>
        <CardImage uri={imageUrl} alt={`Album: ${name}`} />
        <Text
          style={{
            color: "white",
            fontWeight: "600",
            fontSize: 14,
            paddingHorizontal: 4,
          }}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {name}
        </Text>
      </View>
    </CardContainer>
  );
});

export const PlaylistCard = memo(
  ({ playlist, isUser = false }: PlaylistCardProps) => {
    const handlePress = useCallback(() => {
      router.push({
        pathname: isUser ? "/user-playlist" : "/playlists",
        params: { id: playlist.id },
      });
    }, [playlist?.id]);

    if (!playlist?.name || !playlist?.image) return null;

    // Apply HTTPS conversion to the playlist object
    const securedPlaylist = useMemo(
      () => ensureHttpsForPlaylistUrls(playlist),
      [playlist],
    );

    const subtitle =
      securedPlaylist.subtitle || securedPlaylist.description || "Playlist";
    const imageUrl = Array.isArray(securedPlaylist.image)
      ? securedPlaylist.image[2]?.link
      : securedPlaylist.image;

    return (
      <CardContainer
        onPress={handlePress}
        key={securedPlaylist.id}
        width={isUser ? "100%" : 160}
      >
        <View style={{ padding: 12, gap: 8 }}>
          <CardImage uri={imageUrl} alt={`Playlist: ${securedPlaylist.name}`} />
          <View style={{ gap: 4, paddingHorizontal: 4 }}>
            <Text
              style={{ color: "white", fontWeight: "600", fontSize: 14 }}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {securedPlaylist.name}
            </Text>
            <Text
              style={{ color: "rgb(156, 163, 175)", fontSize: 12 }}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {subtitle}
            </Text>
          </View>
        </View>
      </CardContainer>
    );
  },
);

export const NewSongCard = memo(({ song }: SongCardProps) => {
  const { playSong } = usePlayer();
  const { currentSong } = usePlayerState();
  const isCurrentSong = currentSong?.id === song.id;
  const [playerDrawerOpen, setPlayerDrawerOpen] = useState(false);

  const playbackState = usePlaybackState();
  const isPlaying = playbackState.state === State.Playing;

  // Apply HTTPS conversion to the song object
  const securedSong = useMemo(() => ensureHttpsForSongUrls(song), [song]);

  const imageUrl = securedSong.image?.[2]?.link || securedSong.image?.[1]?.link;
  const artistName =
    securedSong.subtitle ||
    securedSong.artist_map?.artists?.[0]?.name ||
    "Unknown Artist";

  const handlePress = async () => {
    if (isCurrentSong) {
      if (isPlaying) {
        await TrackPlayer.pause();
      } else {
        await TrackPlayer.play();
      }
    } else {
      playSong(securedSong);
    }
  };

  const handleLongPress = () => {
    setPlayerDrawerOpen(true);
  };

  return (
    <>
      <CardContainer
        width={160}
        onPress={handlePress}
        onLongPress={handleLongPress}
      >
        <BlurView intensity={20} tint="dark" className="absolute inset-0" />
        <LinearGradient
          colors={["rgba(30, 30, 40, 0.7)", "rgba(20, 20, 28, 0.8)"]}
          className="w-full flex-row border border-gray-800/30 rounded-xl p-2"
        >
          <CardImage uri={imageUrl} alt={`Song: ${securedSong.name}`} />
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.2)",
              borderRadius: 6,
              alignItems: "center",
              justifyContent: "center",
              opacity: isCurrentSong ? 1 : 0,
            }}
          >
            <View
              style={{
                padding: 8,
                borderRadius: 50,
                backgroundColor: isCurrentSong
                  ? "rgb(34, 197, 94)"
                  : "rgba(0, 0, 0, 0.5)",
              }}
            >
              <Ionicons
                name={isCurrentSong && isPlaying ? "pause" : "play"}
                size={24}
                color="white"
              />
            </View>
          </View>

          {isCurrentSong && (
            <View
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                height: 24,
                width: 24,
                borderRadius: 12,
                backgroundColor: "rgb(34, 197, 94)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name={isPlaying ? "musical-note" : "pause"}
                size={12}
                color="white"
              />
            </View>
          )}

          <View style={{ paddingHorizontal: 4 }}>
            <Text
              style={{ color: "white", fontWeight: "500", fontSize: 14 }}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {securedSong.name}
            </Text>
            <Text
              style={{ color: "rgb(156, 163, 175)", fontSize: 12 }}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {artistName}
            </Text>
          </View>
        </LinearGradient>
      </CardContainer>

      {playerDrawerOpen && (
        <NewPlayerDrawer
          isVisible={playerDrawerOpen}
          onClose={() => setPlayerDrawerOpen(false)}
          song={securedSong}
        />
      )}
    </>
  );
});

export const ArtistCard = memo(({ artist }: ArtistCardProps) => {
  if (!artist?.name || !artist?.image) return null;

  // Apply HTTPS conversion to the artist object
  const securedArtist = useMemo(
    () => ensureHttpsForArtistUrls(artist),
    [artist],
  );

  const imageUrl = useMemo(
    () =>
      Array.isArray(securedArtist.image)
        ? securedArtist.image[2]?.link
        : securedArtist.image,
    [securedArtist.image],
  );

  const handlePress = useCallback(() => {
    router.push({
      pathname: "/artist",
      params: { id: securedArtist.id },
    });
  }, [securedArtist?.id]);

  return (
    <CardContainer onPress={handlePress}>
      <View style={{ padding: 12, gap: 8 }}>
        <CardImage uri={imageUrl} alt={`Artist: ${securedArtist.name}`} />
        <Text
          style={{
            color: "white",
            fontWeight: "500",
            fontSize: 14,
            paddingHorizontal: 4,
          }}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {securedArtist.name}
        </Text>
      </View>
    </CardContainer>
  );
});

export const SongControls = memo(() => {
  const { handleNextSong, handlePrevSong } = usePlayer();
  const playbackState = usePlaybackState();
  const isPlaying = playbackState.state === State.Playing;
  const isDragging = useRef(false);
  const { position, duration } = useProgress();

  const progress = useSharedValue(position);
  const min = useSharedValue(0);
  const max = useSharedValue(duration);

  useEffect(() => {
    progress.value = withTiming(position);
    max.value = withTiming(duration);
  }, [position, duration]);

  const handlePlayPause = async () => {
    if (isPlaying && !isDragging.current) {
      await TrackPlayer.pause();
    } else {
      await TrackPlayer.play();
    }
  };

  const handleSeek = async (value: number) => {
    await TrackPlayer.seekTo(value);
  };

  return (
    <View className="w-full p-4">
      {/* Slider and time indicators */}
      <View className="flex-row items-center">
        <Slider
          style={styles.slider}
          progress={progress}
          minimumValue={min}
          maximumValue={max}
          onSlidingStart={() => {
            isDragging.current = true;
          }}
          onValueChange={(value) => {
            progress.value = value;
          }}
          onSlidingComplete={(value) => {
            handleSeek(value);
            isDragging.current = false;
          }}
          thumbWidth={12}
          containerStyle={styles.sliderContainer}
          theme={{
            minimumTrackTintColor: "#fff",
            maximumTrackTintColor: "rgba(99, 102, 241, 0.2)",
            bubbleBackgroundColor: "#6366f1",
          }}
        />
      </View>
      <View className="flex-row justify-between">
        <Text style={styles.timeText}>{formatTime(position)}</Text>
        <Text style={styles.timeText}>{formatTime(duration)}</Text>
      </View>

      {/* Control buttons */}
      <View style={styles.controls}>
        <TouchableOpacity onPress={handlePrevSong} activeOpacity={0.7}>
          <SkipBackIcon size={24} color="#ffffff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.playButton}
          onPress={handlePlayPause}
          activeOpacity={0.7}
          className="mx-5"
        >
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={28}
            color="#374151"
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={handleNextSong} activeOpacity={0.7}>
          <SkipForwardIcon color={"#ffffff"} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

export const ProgressBar = memo(() => {
  const { position, duration } = useProgress();

  const progress = useSharedValue(position);
  const min = useSharedValue(0);
  const max = useSharedValue(duration);

  useEffect(() => {
    progress.value = withTiming(position);
    max.value = withTiming(duration);
  }, [position, duration]);

  return (
    <View className="w-full">
      <Slider
        progress={progress}
        minimumValue={min}
        maximumValue={max}
        thumbWidth={0}
        sliderHeight={2}
        theme={{
          minimumTrackTintColor: "#ffffff",
          maximumTrackTintColor: "#6b7280",
        }}
      />
    </View>
  );
});

export const GroupSongControls = memo(() => {
  const isDragging = useRef(false);
  const { position, duration } = useProgress();
  const { handleSeek } = useGroupMusic();

  const progress = useSharedValue(position);
  const min = useSharedValue(0);
  const max = useSharedValue(duration);

  useEffect(() => {
    progress.value = withTiming(position);
    max.value = withTiming(duration);
  }, [position, duration]);

  return (
    <View className="w-full py-4">
      <View className="flex-row items-center">
        <Slider
          style={styles.slider}
          progress={progress}
          minimumValue={min}
          maximumValue={max}
          onSlidingStart={() => {
            isDragging.current = true;
          }}
          onValueChange={(value) => {
            progress.value = value;
          }}
          onSlidingComplete={(value) => {
            handleSeek(value);
            isDragging.current = false;
          }}
          thumbWidth={12}
          containerStyle={styles.sliderContainer}
          theme={{
            minimumTrackTintColor: "#fff",
            maximumTrackTintColor: "rgba(99, 102, 241, 0.2)",
            bubbleBackgroundColor: "#6366f1",
          }}
        />
      </View>
      <View className="flex-row justify-between">
        <Text style={styles.timeText}>{formatTime(position)}</Text>
        <Text style={styles.timeText}>{formatTime(duration)}</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  timeText: {
    fontSize: 12,
    color: "#6b7280",
    width: 40,
    textAlign: "center",
  },
  slider: {
    flex: 1,
    height: 40,
  },
  sliderContainer: {
    borderRadius: 8,
  },
  controls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  sideButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
    marginHorizontal: 24,
    color: "#000000",
  },
});

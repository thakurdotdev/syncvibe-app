import { useGroupMusic } from "@/context/GroupMusicContext";
import { usePlayer, usePlayerState } from "@/context/MusicContext";
import { Song } from "@/types/song";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  memo,
  default as React,
  useCallback,
  useEffect,
  useMemo,
  useRef,
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
  width?: number;
}

const CardContainer = ({
  children,
  onPress,
  width = 160,
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
    android_ripple={{ color: "rgba(255, 255, 255, 0.1)", borderless: false }}
    hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
  >
    {children}
  </Pressable>
);

export const SongCard = memo(({ song }: SongCardProps) => {
  const { handlePlayPauseSong, playSong } = usePlayer();
  const { currentSong, isPlaying } = usePlayerState();

  const isCurrentSong = currentSong?.id === song.id;
  return (
    <Pressable
      onPress={() => {
        if (isCurrentSong) {
          handlePlayPauseSong();
        } else {
          playSong(song);
        }
      }}
      android_ripple={{
        color: "rgba(255, 255, 255, 0.1)",
        borderless: false,
      }}
      hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
      className="flex-row items-center bg-white/10 rounded-md p-2 mb-2"
      key={song.id}
    >
      <View className="flex-1 flex-row items-center">
        <Image
          source={{ uri: song.image[0]?.link }}
          className="w-12 h-12"
          alt="Song cover"
        />
        <View className="flex-1 px-4">
          <Text className="text-white font-semibold" numberOfLines={1}>
            {song.name}
          </Text>
          <Text className="text-gray-400 text-sm" numberOfLines={1}>
            {song.subtitle || song.artist_map?.artists?.[0]?.name}
          </Text>
        </View>
      </View>
    </Pressable>
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

  const name = album.name || album.title || "";
  const imageUrl = album.image?.[2]?.link || album.image?.[2]?.url;

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

    const subtitle = playlist.subtitle || playlist.description || "Playlist";
    const imageUrl = Array.isArray(playlist.image)
      ? playlist.image[2]?.link
      : playlist.image;

    return (
      <CardContainer onPress={handlePress} key={playlist.id}>
        <View style={{ padding: 12, gap: 8 }}>
          <CardImage uri={imageUrl} alt={`Playlist: ${playlist.name}`} />
          <View style={{ gap: 4, paddingHorizontal: 4 }}>
            <Text
              style={{ color: "white", fontWeight: "600", fontSize: 14 }}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {playlist.name}
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
  const { handlePlayPauseSong, playSong } = usePlayer();
  const { currentSong, isPlaying } = usePlayerState();
  const isCurrentSong = currentSong?.id === song.id;

  const imageUrl = song.image?.[2]?.link || song.image?.[1]?.link;
  const artistName =
    song.subtitle || song.artist_map?.artists?.[0]?.name || "Unknown Artist";

  const handlePress = useCallback(() => {
    if (isCurrentSong) {
      handlePlayPauseSong();
    } else {
      playSong(song);
    }
  }, [isCurrentSong, handlePlayPauseSong, playSong, song]);

  return (
    <CardContainer width={160} onPress={handlePress}>
      <View style={{ padding: 12, gap: 8 }}>
        <CardImage uri={imageUrl} alt={`Song: ${song.name}`} />
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
            {song.name}
          </Text>
          <Text
            style={{ color: "rgb(156, 163, 175)", fontSize: 12 }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {artistName}
          </Text>
        </View>
      </View>
    </CardContainer>
  );
});

export const ArtistCard = memo(({ artist }: ArtistCardProps) => {
  if (!artist?.name || !artist?.image) return null;

  const imageUrl = useMemo(
    () => (Array.isArray(artist.image) ? artist.image[2]?.link : artist.image),
    [artist.image],
  );

  const handlePress = useCallback(() => {
    router.push({
      pathname: "/artist",
      params: { id: artist.id },
    });
  }, [artist?.id]);

  return (
    <CardContainer onPress={handlePress}>
      <View style={{ padding: 12, gap: 8 }}>
        <CardImage uri={imageUrl} alt={`Artist: ${artist.name}`} />
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
          {artist.name}
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
        <TouchableOpacity
          style={styles.sideButton}
          onPress={handlePrevSong}
          activeOpacity={0.7}
        >
          <Ionicons name="play-skip-back" size={24} color="#374151" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.playButton}
          onPress={handlePlayPause}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={28}
            color="white"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.sideButton}
          onPress={handleNextSong}
          activeOpacity={0.7}
        >
          <Ionicons name="play-skip-forward" size={24} color="#374151" />
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
          minimumTrackTintColor: "#1DB954",
          maximumTrackTintColor: "#6b7280",
        }}
      />
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
    backgroundColor: "#1DB954",
    marginHorizontal: 24,
  },
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

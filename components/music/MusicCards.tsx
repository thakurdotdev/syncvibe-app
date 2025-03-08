import {
  usePlayer,
  usePlayerState,
  usePlayerTime,
} from "@/context/MusicContext";
import { Song } from "@/types/song";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { memo, default as React, useCallback, useMemo } from "react";
import { Image, View, Text } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { useSharedValue } from "react-native-reanimated";
import { Slider } from "react-native-awesome-slider";

interface SongCardProps {
  song: Song;
}

interface AlbumCardProps {
  album: any;
}

interface PlaylistCardProps {
  playlist: any;
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

export const SongCard = memo(({ song }: SongCardProps) => {
  const { handlePlayPauseSong, playSong } = usePlayer();
  const { currentSong, isPlaying } = usePlayerState();

  const isCurrentSong = currentSong?.id === song.id;
  return (
    <View
      className="flex-row items-center bg-white/10 rounded-2xl p-2 mb-1"
      key={song.id}
    >
      <TouchableOpacity
        onPress={() => {
          if (isCurrentSong) {
            handlePlayPauseSong();
          } else {
            playSong(song);
          }
        }}
        className="flex-1 flex-row items-center"
      >
        <Image
          source={{ uri: song.image[0]?.link }}
          className="w-12 h-12 rounded-xl"
          alt="Song cover"
        />
      </TouchableOpacity>
      <View className="flex-1 px-4">
        <Text className="text-white font-semibold" numberOfLines={1}>
          {song.name}
        </Text>
        <Text className="text-gray-400 text-sm" numberOfLines={1}>
          {song.subtitle || song.artist_map?.artists?.[0]?.name}
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => {
          if (isCurrentSong) {
            handlePlayPauseSong();
          } else {
            playSong(song);
          }
        }}
        className="bg-white/10 p-2 rounded-full"
      >
        <Ionicons
          name={isCurrentSong && isPlaying ? "pause" : "play"}
          size={24}
          color="white"
        />
      </TouchableOpacity>
    </View>
  );
});

// AlbumCard Component
export const AlbumCard = memo(({ album }: AlbumCardProps) => {
  const handlePress = useCallback(() => {
    router.push({
      pathname: "/albums",
      params: { id: album.id },
    });
  }, [album, router]);

  if (!album) return null;

  const name = album.name || album.title || "";
  const imageUrl = album.image?.[2]?.link || album.image?.[2]?.url;

  return (
    <TouchableOpacity
      className="w-44 rounded-xl bg-zinc-800/60 overflow-hidden mb-4"
      activeOpacity={0.7}
      onPress={handlePress}
    >
      <View className="p-3 space-y-3">
        <Image
          source={{ uri: imageUrl }}
          className="w-44 h-40 rounded-lg"
          resizeMode="cover"
          alt="Album cover"
        />

        <Text
          className="font-semibold text-white truncate"
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {name}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

// PlaylistCard Component
export const PlaylistCard = memo(({ playlist }: PlaylistCardProps) => {
  const handlePress = useCallback(() => {
    router.push({
      pathname: "/playlists",
      params: { id: playlist.id },
    });
  }, [playlist, router]);

  if (!playlist?.name || !playlist?.image) return null;

  const subtitle = playlist.subtitle || playlist.description || "Playlist";
  const imageUrl = Array.isArray(playlist.image)
    ? playlist.image[2].link
    : playlist.image;

  return (
    <TouchableOpacity
      className="w-40 rounded-xl bg-zinc-800/60 overflow-hidden"
      activeOpacity={0.7}
      onPress={handlePress}
    >
      <View className="flex gap-3">
        <Image
          source={{ uri: imageUrl }}
          className="w-40 h-40 rounded-lg"
          resizeMode="cover"
          alt="Playlist cover"
        />

        <View className="space-y-1">
          <Text
            className="font-semibold text-white"
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {playlist.name}
          </Text>
          <Text
            className="text-xs text-gray-400"
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {subtitle}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

export const SongContols = memo(() => {
  const {
    handleTimeSeek,
    handlePrevSong,
    handleNextSong,
    handlePlayPauseSong,
  } = usePlayer();
  const { currentTime, duration } = usePlayerTime();
  const { isPlaying } = usePlayerState();

  const progress = useSharedValue(currentTime);
  const min = useSharedValue(0);
  const max = useSharedValue(duration);

  return (
    <View className="w-full px-8 mb-4 mt-4">
      <Slider
        minimumValue={min || 0}
        maximumValue={max || 0}
        progress={progress}
        steps={100}
        onValueChange={handleTimeSeek}
        theme={{
          minimumTrackTintColor: "#007AFF",
          maximumTrackTintColor: "#DEDEDE",
          cacheTrackTintColor: "#F2F2F2",
        }}
      />

      <View className="flex-row justify-between mt-2">
        <Text className="text-gray-400">{formatTime(currentTime)}</Text>
        <Text className="text-gray-400">{formatTime(duration)}</Text>
      </View>

      <View className="flex-row items-center justify-between mt-8">
        <TouchableOpacity
          onPress={handlePrevSong}
          className="bg-white/10 p-3 rounded-full"
        >
          <Ionicons name="play-skip-back" size={30} color="white" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handlePlayPauseSong}
          className="bg-white/10 p-6 rounded-full"
        >
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={40}
            color="white"
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleNextSong}
          className="bg-white/10 p-3 rounded-full"
        >
          <Ionicons name="play-skip-forward" size={30} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
});

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
    <View className="w-40 bg-zinc-900/60 rounded-xl overflow-hidden mb-4">
      <View className="p-2 space-y-2">
        {/* Image with Play Overlay */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handlePress}
          className="relative w-full aspect-square"
        >
          <Image
            source={{ uri: imageUrl }}
            className="w-40 h-40 rounded-lg"
            resizeMode="cover"
            alt={song.name}
          />

          {/* Semi-transparent overlay that appears on hover/active state */}
          <View
            className={`absolute inset-0 bg-black/30 rounded-lg ${
              isCurrentSong ? "opacity-100" : "opacity-0"
            } transition-opacity`}
          >
            {/* Centered play button with pulsing effect for currently playing song */}
            <View className="absolute inset-0 flex items-center justify-center">
              <View
                className={`p-3 rounded-full ${
                  isCurrentSong ? "bg-[#1DB954]" : "bg-black/50"
                }`}
              >
                <Ionicons
                  name={isCurrentSong && isPlaying ? "pause" : "play"}
                  size={28}
                  color="white"
                />
              </View>
            </View>
          </View>

          {/* Subtle playing indicator at corner */}
          {isCurrentSong && (
            <View className="absolute top-2 left-2 h-6 w-6 rounded-full bg-[#1DB954] items-center justify-center">
              <Ionicons
                name={isPlaying ? "musical-notes" : "pause"}
                size={14}
                color="white"
              />
            </View>
          )}
        </TouchableOpacity>

        {/* Song Info */}
        <View className="px-1">
          <Text
            className="text-white font-semibold text-base"
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {song.name}
          </Text>
          <Text
            className="text-gray-400 text-xs"
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {artistName}
          </Text>
        </View>
      </View>
    </View>
  );
});

export const ArtistCard = memo(({ artist }: ArtistCardProps) => {
  if (!artist?.name || !artist?.image) return null;

  const imageUrl = useMemo(
    () => (Array.isArray(artist.image) ? artist.image[2].link : artist.image),
    [artist.image],
  );

  const handlePress = () => {
    router.push({
      pathname: "/artist",
      params: { id: artist.id },
    });
  };

  return (
    <View className="w-44 bg-zinc-900/60 rounded-xl overflow-hidden mb-4">
      <View className="p-2 space-y-2">
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handlePress}
          className="relative w-full aspect-square"
        >
          <Image
            source={{ uri: imageUrl }}
            className="w-44 h-40 rounded-lg"
            resizeMode="cover"
            alt={artist.name}
          />
        </TouchableOpacity>

        <View className="px-1 space-y-1">
          <Text
            className="text-white font-semibold text-base"
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {artist.name}
          </Text>
        </View>
      </View>
    </View>
  );
});

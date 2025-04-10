import { usePlayer, usePlayerState } from "@/context/MusicContext";
import { Song } from "@/types/song";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { RefreshCcwIcon } from "lucide-react-native";
import React, { memo, useCallback, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import DraggableFlatList, {
  OpacityDecorator,
  RenderItemParams,
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import {
  AlbumCard,
  ArtistCard,
  NewSongCard,
  PlaylistCard,
  SongCard,
} from "./MusicCards";

interface AlbumsGridProps {
  albums: any[];
  title: string;
}

interface PlaylistsGridProps {
  playlists: any[];
  title: string;
}

interface RecommendationGridProps {
  recommendations: any[];
  title: string;
  showMore?: boolean;
}

interface ArtistGridProps {
  artists: any[];
  title: string;
}

const SongCardQueue = memo(
  ({
    song,
    drag,
    isActive,
  }: {
    song: Song;
    drag: () => void;
    isActive: boolean;
  }) => {
    const { playSong } = usePlayer();
    const { currentSong } = usePlayerState();
    const isCurrentSong = currentSong?.id === song.id;

    const handlePress = useCallback(() => {
      playSong(song);
    }, [song, playSong]);

    const songImage = useMemo(() => song.image[0]?.link, [song.image]);
    const songName = useMemo(() => song.name, [song.name]);
    const songArtist = useMemo(
      () => song.subtitle || song.artist_map?.artists?.[0]?.name,
      [song.subtitle, song.artist_map],
    );

    return (
      <ScaleDecorator>
        <OpacityDecorator activeOpacity={1}>
          <View className="mb-2">
            <Pressable
              onLongPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                drag();
              }}
              onPress={handlePress}
              disabled={isActive}
              delayLongPress={150}
            >
              <LinearGradient
                colors={
                  isCurrentSong
                    ? ["rgba(59, 130, 246, 0.6)", "rgba(30, 30, 60, 0.8)"]
                    : ["rgba(30, 30, 40, 0.7)", "rgba(20, 20, 28, 0.8)"]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="w-full flex-row border border-gray-800/30 rounded-xl p-3"
              >
                <View className="relative">
                  <Image
                    source={{ uri: songImage }}
                    className="w-14 h-14 rounded-lg"
                    style={{ width: 56, height: 56, borderRadius: 8 }}
                  />
                </View>

                <View className="flex-1 px-4 justify-center">
                  <Text
                    className="text-white font-semibold text-base"
                    numberOfLines={1}
                  >
                    {songName}
                  </Text>
                  <Text className="text-gray-300 text-sm" numberOfLines={1}>
                    {songArtist}
                  </Text>
                </View>

                {isActive ? (
                  <View className="justify-center">
                    <Ionicons name="menu" size={24} color="white" />
                  </View>
                ) : (
                  <View className="justify-center">
                    <View className="h-8 w-8 bg-gray-800/40 rounded-full items-center justify-center">
                      <Ionicons
                        name="reorder-three"
                        size={20}
                        color="rgba(255,255,255,0.6)"
                      />
                    </View>
                  </View>
                )}
              </LinearGradient>
            </Pressable>
          </View>
        </OpacityDecorator>
      </ScaleDecorator>
    );
  },
);

export const MusicQueue = memo(({ playlist }: { playlist: Song[] }) => {
  const { reorderPlaylist } = usePlayer();
  const scrollRef = useRef(null);

  // Memoize the drag end handler
  const handleDragEnd = useCallback(
    ({ data }: { data: Song[] }) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      reorderPlaylist(data);
    },
    [reorderPlaylist],
  );

  // Empty state
  if (!playlist.length) {
    return (
      <View className="items-center justify-center py-10">
        <Text className="text-white text-lg">No songs in queue</Text>
      </View>
    );
  }

  return (
    <DraggableFlatList
      ref={scrollRef}
      data={playlist}
      renderItem={({ item, drag, isActive }: RenderItemParams<Song>) => (
        <SongCardQueue song={item} drag={drag} isActive={isActive} />
      )}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 8 }}
      showsVerticalScrollIndicator={false}
      bounces={true}
      onDragEnd={handleDragEnd}
    />
  );
});

export const SimilarSongs = memo(
  ({
    recommendations,
    loading,
    fetchRecommendations,
  }: {
    recommendations: Song[];
    loading: boolean;
    fetchRecommendations: () => void;
  }) => {
    if (loading) {
      return (
        <View className="items-center justify-center py-12">
          <ActivityIndicator size="large" color="white" />
          <Text className="text-white text-lg font-medium mt-4">
            Finding similar vibes...
          </Text>
        </View>
      );
    }

    if (recommendations.length === 0) {
      return (
        <View className="items-center justify-center py-12 px-4">
          <Text className="text-white text-lg font-medium mb-3">
            No similar songs found
          </Text>
          <Text className="text-gray-400 text-sm mb-4 text-center">
            We couldn't find any similar songs at the moment. Try again later.
          </Text>
          <TouchableOpacity
            onPress={fetchRecommendations}
            className="bg-slate-300 px-6 py-3 rounded-full flex-row items-center"
          >
            <View className="flex-row items-center justify-center gap-2">
              <RefreshCcwIcon size={16} color="#1e293b" />
              <Text className="text-slate-800 font-medium">Try Again</Text>
            </View>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <FlatList
        data={recommendations}
        renderItem={({ item }) => <SongCard song={item} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 50 }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={true}
        bounces={true}
      />
    );
  },
);

export const AlbumsGrid = ({ albums, title }: AlbumsGridProps) => {
  if (!albums?.length) return null;

  return (
    <View className="mb-6">
      {title && (
        <Text className="text-xl font-bold text-white mb-4">{title}</Text>
      )}
      <FlatList
        data={albums}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <AlbumCard album={item} />}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 16 }}
        ItemSeparatorComponent={() => <View className="w-3" />}
      />
    </View>
  );
};

export const PlaylistsGrid = ({ playlists, title }: PlaylistsGridProps) => {
  if (!playlists?.length) return null;

  return (
    <View className="mb-6">
      {title && (
        <Text className="text-xl font-bold text-white mb-4">{title}</Text>
      )}
      <FlatList
        data={playlists}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PlaylistCard playlist={item} isUser={false} />
        )}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 16 }}
        ItemSeparatorComponent={() => <View className="w-3" />}
      />
    </View>
  );
};

export const RecommendationGrid = ({
  recommendations,
  title,
  showMore = false,
}: RecommendationGridProps) => {
  if (!recommendations?.length) return null;

  return (
    <View className="mb-8">
      <View className="flex-row justify-between items-center mb-4">
        {title && (
          <Text
            className="text-xl font-bold text-white"
            style={{ fontFamily: "System" }}
          >
            {title}
          </Text>
        )}
        {showMore && (
          <TouchableOpacity
            className="px-3 py-1 bg-slate-800/40 rounded-full"
            onPress={() => router.push("/song-history")}
          >
            <Text className="text-slate-300 text-sm font-medium">View all</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={recommendations}
        keyExtractor={(item, index) => item?.id || index.toString()}
        renderItem={({ item }) => <NewSongCard song={item} />}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 16, paddingLeft: 2 }}
        ItemSeparatorComponent={() => <View className="w-4" />}
        className="pb-2"
      />
    </View>
  );
};

export const TrendingSongs = memo(
  ({ songs, title }: { songs: Song[]; title: string }) => {
    if (!songs?.length) return null;

    return (
      <View className="mb-6">
        {title && (
          <Text className="text-xl font-bold text-white mb-4">{title}</Text>
        )}
        <FlatList
          data={songs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <NewSongCard song={item} />}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 16 }}
          ItemSeparatorComponent={() => <View className="w-5" />}
        />
      </View>
    );
  },
);

export const ArtistGrid = memo(({ artists, title }: ArtistGridProps) => {
  if (!artists?.length) return null;

  return (
    <View className="mb-6">
      {title && (
        <Text className="text-xl font-bold text-white mb-4">{title}</Text>
      )}
      <FlatList
        data={artists}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ArtistCard artist={item} />}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 16 }}
        ItemSeparatorComponent={() => <View className="w-3" />}
      />
    </View>
  );
});

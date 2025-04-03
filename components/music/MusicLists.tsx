import { Song } from "@/types/song";
import { router } from "expo-router";
import { RefreshCcwIcon } from "lucide-react-native";
import React, { memo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
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

export const MusicQueue = memo(({ playlist }: { playlist: Song[] }) => {
  if (!playlist.length) {
    return (
      <View className="items-center justify-center py-10">
        <Text className="text-white text-lg">No songs in queue</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={playlist}
      renderItem={({ item }) => <SongCard song={item} />}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ paddingBottom: 120 }}
      showsVerticalScrollIndicator={true}
      scrollEnabled={true}
      bounces={true}
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

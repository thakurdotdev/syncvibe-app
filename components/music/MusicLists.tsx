import { Song } from "@/types/song";
import React, { memo } from "react";
import { ActivityIndicator, FlatList, View, Text } from "react-native";
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
  recommendations: Song[];
  title: string;
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
      overScrollMode="always"
      maxToRenderPerBatch={10}
      initialNumToRender={10}
      removeClippedSubviews={true}
      ItemSeparatorComponent={() => <View className="h-2" />}
    />
  );
});

export const SimilarSongs = memo(
  ({
    recommendations,
    loading,
  }: {
    recommendations: Song[];
    loading: boolean;
  }) => {
    if (loading) {
      return (
        <View className="items-center justify-center py-10">
          <ActivityIndicator size="large" color="#fff" />
        </View>
      );
    }

    if (recommendations.length === 0) {
      return (
        <View className="items-center justify-center py-10">
          <Text className="text-white text-lg">No similar songs found</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={recommendations}
        renderItem={({ item }) => <SongCard song={item} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 50 }}
        showsVerticalScrollIndicator={true}
        scrollEnabled={true}
        bounces={true}
        overScrollMode="always"
        maxToRenderPerBatch={10}
        initialNumToRender={10}
        removeClippedSubviews={true}
        ItemSeparatorComponent={() => <View className="h-2" />}
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
        keyExtractor={(item) => item.id || item.album_id || item.token}
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
        keyExtractor={(item) => item.id || item.token}
        renderItem={({ item }) => <PlaylistCard playlist={item} />}
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
}: RecommendationGridProps) => {
  if (!recommendations?.length) return null;

  return (
    <View className="mb-6">
      {title && (
        <Text className="text-xl font-bold text-white mb-4">{title}</Text>
      )}
      <FlatList
        data={recommendations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <NewSongCard song={item?.songData} />}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 16 }}
        ItemSeparatorComponent={() => <View className="w-3" />}
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

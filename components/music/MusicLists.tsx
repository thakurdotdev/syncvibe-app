import Card from "@/components/ui/card";
import { usePlayer, usePlayerState } from "@/context/MusicContext";
import { useTheme } from "@/context/ThemeContext";
import { Song } from "@/types/song";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import {
  ChevronRightIcon,
  RefreshCcwIcon,
  Trash2Icon,
} from "lucide-react-native";
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
import { RectButton } from "react-native-gesture-handler";
import Swipeable from "react-native-gesture-handler/Swipeable";
import Animated, {
  FadeIn,
  FadeOut,
  Layout,
  LinearTransition,
  SlideInRight,
} from "react-native-reanimated";
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
    const { colors, theme } = useTheme();
    const { playSong, addToQueue, removeFromQueue } = usePlayer();
    const { currentSong } = usePlayerState();
    const isCurrentSong = currentSong?.id === song.id;
    const swipeableRef = useRef<Swipeable>(null);

    const handlePress = useCallback(() => {
      playSong(song);
    }, [song, playSong]);

    const songImage = useMemo(() => song.image[0]?.link, [song.image]);
    const songName = useMemo(() => song.name, [song.name]);
    const songArtist = useMemo(
      () => song.subtitle || song.artist_map?.artists?.[0]?.name,
      [song.subtitle, song.artist_map],
    );

    const renderRightActions = useCallback(
      (progressAnimatedValue: any, dragAnimatedValue: any) => {
        return (
          <RectButton
            onPress={() => {
              removeFromQueue(song.id);
              swipeableRef.current?.close();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }}
            style={{
              backgroundColor: "#dc2626",
              justifyContent: "center",
              alignItems: "center",
              width: 80,
              marginBottom: 8,
            }}
          >
            <View style={{ alignItems: "center", justifyContent: "center" }}>
              <Trash2Icon size={24} color="white" />
              <Text className="text-white text-xs mt-1">Remove</Text>
            </View>
          </RectButton>
        );
      },
      [removeFromQueue, song],
    );

    return (
      <ScaleDecorator>
        <OpacityDecorator activeOpacity={1}>
          <Swipeable
            ref={swipeableRef}
            renderRightActions={renderRightActions}
            friction={2}
            rightThreshold={40}
          >
            <Animated.View
              entering={SlideInRight.duration(400)}
              layout={Layout.springify()}
            >
              <Pressable
                onLongPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  drag();
                }}
                onPress={handlePress}
                disabled={isActive}
                delayLongPress={150}
              >
                <Card
                  variant={isCurrentSong ? "secondary" : "default"}
                  className="w-full flex-row rounded-2xl p-3 my-1"
                >
                  <View className="relative">
                    <Image
                      source={{ uri: songImage }}
                      className="w-14 h-14 rounded-xl"
                      style={{ width: 56, height: 56, borderRadius: 12 }}
                    />
                    {isCurrentSong && (
                      <View
                        className="absolute bottom-0 right-0 w-4 h-4 rounded-full items-center justify-center"
                        style={{ backgroundColor: colors.primary }}
                      >
                        <View
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: colors.primaryForeground }}
                        />
                      </View>
                    )}
                  </View>

                  <View className="flex-1 px-4 justify-center">
                    <Text
                      style={{ color: colors.cardForeground }}
                      className="font-semibold text-base"
                      numberOfLines={1}
                    >
                      {songName}
                    </Text>
                    <Text
                      style={{ color: colors.mutedForeground }}
                      className="text-sm"
                      numberOfLines={1}
                    >
                      {songArtist}
                    </Text>
                  </View>

                  {isActive ? (
                    <View className="justify-center">
                      <Ionicons
                        name="menu"
                        size={24}
                        color={colors.cardForeground}
                      />
                    </View>
                  ) : (
                    <View className="justify-center">
                      <View
                        className="h-8 w-8 rounded-full items-center justify-center"
                        style={{ backgroundColor: colors.muted }}
                      >
                        <Ionicons
                          name="reorder-three"
                          size={20}
                          color={colors.mutedForeground}
                        />
                      </View>
                    </View>
                  )}
                </Card>
              </Pressable>
            </Animated.View>
          </Swipeable>
        </OpacityDecorator>
      </ScaleDecorator>
    );
  },
);

export const MusicQueue = memo(({ playlist }: { playlist: Song[] }) => {
  const { colors } = useTheme();
  const { reorderPlaylist } = usePlayer();
  const scrollRef = useRef(null);

  const handleDragEnd = useCallback(
    ({ data }: { data: Song[] }) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      reorderPlaylist(data);
    },
    [reorderPlaylist],
  );

  if (!playlist.length) {
    return (
      <View className="items-center justify-center py-10">
        <Text className="text-lg" style={{ color: colors.text }}>
          No songs in queue
        </Text>
      </View>
    );
  }

  return (
    <DraggableFlatList
      ref={scrollRef}
      data={playlist}
      renderItem={({
        item,
        getIndex,
        drag,
        isActive,
      }: RenderItemParams<Song>) => {
        const index = getIndex();
        return (
          <Animated.View
            entering={FadeIn.duration(400).delay(index * 100)}
            layout={LinearTransition.springify()}
          >
            <SongCardQueue song={item} drag={drag} isActive={isActive} />
          </Animated.View>
        );
      }}
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
    const { colors } = useTheme();
    if (loading) {
      return (
        <View className="items-center justify-center py-12">
          <ActivityIndicator size="large" color="white" />
          <Text
            className="text-lg font-medium mt-4"
            style={{ color: colors.text }}
          >
            Finding similar vibes...
          </Text>
        </View>
      );
    }

    if (recommendations.length === 0) {
      return (
        <View className="items-center justify-center py-12 px-4">
          <Text
            className="text-lg font-medium mb-3"
            style={{ color: colors.text }}
          >
            No similar songs found
          </Text>
          <Text
            className="text-sm mb-4 text-center"
            style={{ color: colors.mutedForeground }}
          >
            We couldn't find any similar songs at the moment. Try again later.
          </Text>
          <TouchableOpacity
            onPress={fetchRecommendations}
            style={{ backgroundColor: colors.primary }}
            className="px-6 py-3 rounded-full flex-row items-center"
          >
            <View className="flex-row items-center justify-center gap-2">
              <RefreshCcwIcon size={16} color={colors.primaryForeground} />
              <Text
                className="font-medium"
                style={{ color: colors.primaryForeground }}
              >
                Try Again
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <FlatList
        data={recommendations}
        renderItem={({ item, index }) => (
          <Animated.View
            entering={FadeIn.duration(400).delay(index * 100)}
            layout={LinearTransition.springify()}
          >
            <SongCard song={item} />
          </Animated.View>
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 50 }}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View className="h-2" />}
        scrollEnabled={true}
        bounces={true}
      />
    );
  },
);

export const AlbumsGrid = ({ albums, title }: AlbumsGridProps) => {
  const { colors } = useTheme();
  if (!albums?.length) return null;

  return (
    <View className="mb-6">
      {title && (
        <Text className="text-xl font-bold mb-4" style={{ color: colors.text }}>
          {title}
        </Text>
      )}
      <FlatList
        data={albums}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <Animated.View
            entering={FadeIn.duration(400).delay(index * 100)}
            layout={Layout.springify()}
          >
            <AlbumCard album={item} />
          </Animated.View>
        )}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 16 }}
        ItemSeparatorComponent={() => <View className="w-4" />}
      />
    </View>
  );
};

export const PlaylistsGrid = ({ playlists, title }: PlaylistsGridProps) => {
  const { colors } = useTheme();
  if (!playlists?.length) return null;

  return (
    <View className="mb-6">
      {title && (
        <Text className="text-xl font-bold mb-4" style={{ color: colors.text }}>
          {title}
        </Text>
      )}
      <FlatList
        data={playlists}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <Animated.View
            entering={FadeIn.duration(400).delay(index * 100)}
            layout={Layout.springify()}
          >
            <PlaylistCard playlist={item} isUser={false} />
          </Animated.View>
        )}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 16 }}
        ItemSeparatorComponent={() => <View className="w-4" />}
      />
    </View>
  );
};

export const RecommendationGrid = ({
  recommendations,
  title,
  showMore = false,
}: RecommendationGridProps) => {
  const { colors } = useTheme();
  if (!recommendations?.length) return null;

  return (
    <View className="mb-6">
      <View className="flex-row justify-between items-center mb-4">
        {title && (
          <Text
            className="text-xl font-bold"
            style={{ fontFamily: "System", color: colors.text }}
          >
            {title}
          </Text>
        )}
        {showMore && (
          <TouchableOpacity
            className="px-3 py-1"
            onPress={() => router.push("/song-history")}
          >
            <ChevronRightIcon size={20} color={colors.text} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={recommendations}
        keyExtractor={(item, index) => item?.id || index.toString()}
        renderItem={({ item, index }) => (
          <Animated.View
            entering={FadeIn.duration(400).delay(index * 100)}
            layout={Layout.springify()}
          >
            <NewSongCard song={item} />
          </Animated.View>
        )}
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
    const { colors } = useTheme();
    if (!songs?.length) return null;

    return (
      <View className="mb-6">
        {title && (
          <Text
            className="text-xl font-bold mb-4"
            style={{ color: colors.text }}
          >
            {title}
          </Text>
        )}
        <FlatList
          data={songs}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <Animated.View
              entering={FadeIn.duration(400).delay(index * 100)}
              layout={Layout.springify()}
            >
              <NewSongCard song={item} />
            </Animated.View>
          )}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 16 }}
          ItemSeparatorComponent={() => <View className="w-4" />}
        />
      </View>
    );
  },
);

export const ArtistGrid = memo(({ artists, title }: ArtistGridProps) => {
  const { colors } = useTheme();
  if (!artists?.length) return null;

  return (
    <View className="mb-6">
      {title && (
        <Text className="text-xl font-bold mb-4" style={{ color: colors.text }}>
          {title}
        </Text>
      )}
      <FlatList
        data={artists}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <Animated.View
            entering={FadeIn.duration(400).delay(index * 100)}
            layout={Layout.springify()}
          >
            <ArtistCard artist={item} />
          </Animated.View>
        )}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 16 }}
        ItemSeparatorComponent={() => <View className="w-4" />}
      />
    </View>
  );
});

import Card from "@/components/ui/card";
import { usePlayer, usePlayerState, usePlaylist } from "@/context/MusicContext";
import { useTheme } from "@/context/ThemeContext";
import { Song } from "@/types/song";
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
import Animated, { FadeIn, LinearTransition } from "react-native-reanimated";
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
    const { colors } = useTheme();
    const { playSong, removeFromQueue } = usePlayer();
    const { currentSong } = usePlayerState();
    const isCurrentSong = currentSong?.id === song.id;
    const swipeableRef = useRef<Swipeable>(null);

    const handlePress = useCallback(() => {
      playSong(song);
    }, [song, playSong]);

    const handleDelete = useCallback(() => {
      removeFromQueue(song.id);
      swipeableRef.current?.close();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, [removeFromQueue, song.id]);

    const songImage = useMemo(() => song.image[1]?.link, [song.image]);
    const songName = useMemo(() => song.name, [song.name]);
    const songArtist = useMemo(
      () => song.subtitle || song.artist_map?.artists?.[0]?.name,
      [song.subtitle, song.artist_map],
    );

    const renderRightActions = useCallback(
      (progress: any, dragX: any) => {
        return (
          <RectButton
            onPress={handleDelete}
            style={{
              backgroundColor: "#dc2626",
              justifyContent: "center",
              alignItems: "center",
              width: 60,
              height: "100%",
            }}
          >
            <View style={{ alignItems: "center", justifyContent: "center" }}>
              <Trash2Icon size={24} color="white" />
              <Text className="text-white text-xs mt-1">Remove</Text>
            </View>
          </RectButton>
        );
      },
      [handleDelete],
    );

    return (
      <ScaleDecorator>
        <OpacityDecorator activeOpacity={1}>
          <Swipeable
            ref={swipeableRef}
            renderRightActions={renderRightActions}
            friction={2}
            rightThreshold={40}
            overshootRight={false}
            containerStyle={{
              marginVertical: 4,
              overflow: "hidden",
            }}
          >
            <Pressable
              onLongPress={() => {
                if (!isCurrentSong) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  drag();
                }
              }}
              onPress={handlePress}
              disabled={isActive}
              delayLongPress={150}
            >
              <Card
                variant={isCurrentSong ? "secondary" : "ghost"}
                className="w-full flex-row rounded-none h-[60px]"
              >
                <View className="relative">
                  <Image
                    source={{ uri: songImage }}
                    style={{ width: 56, height: 60 }}
                    className="rounded-md"
                    fadeDuration={0}
                    resizeMode="cover"
                  />
                </View>

                <View className="flex-1 p-3 px-4 justify-center">
                  <Text
                    style={{
                      color: colors.text,
                      fontWeight: "600",
                      fontSize: 16,
                    }}
                    numberOfLines={1}
                  >
                    {songName}
                  </Text>
                  <Text
                    style={{ color: colors.mutedForeground, fontSize: 14 }}
                    numberOfLines={1}
                  >
                    {songArtist}
                  </Text>
                </View>

                {/* Drag Handle Area */}
              </Card>
            </Pressable>
          </Swipeable>
        </OpacityDecorator>
      </ScaleDecorator>
    );
  },
);

export const MusicQueue = memo(() => {
  const { colors } = useTheme();
  const { reorderPlaylist } = usePlayer();
  const { playlist, setPlaylist } = usePlaylist();
  const scrollRef = useRef(null);

  const handleDragEnd = useCallback(
    ({ data }: { data: Song[] }) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setPlaylist(data);
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
      }: RenderItemParams<Song>) => (
        <SongCardQueue song={item} drag={drag} isActive={isActive} />
      )}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ paddingBottom: 10, paddingHorizontal: 8 }}
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
        renderItem={({ item }) => <SongCard song={item} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 10, paddingHorizontal: 8 }}
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
        <Text
          className="text-xl font-bold mb-2 ml-3"
          style={{ color: colors.text }}
        >
          {title}
        </Text>
      )}
      <FlatList
        data={albums}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <Animated.View
            entering={FadeIn.duration(400).delay(index * 100)}
            layout={LinearTransition.springify()}
          >
            <AlbumCard album={item} />
          </Animated.View>
        )}
        horizontal
        showsHorizontalScrollIndicator={false}
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
        <Text
          className="text-xl font-bold mb-2 ml-3"
          style={{ color: colors.text }}
        >
          {title}
        </Text>
      )}
      <FlatList
        data={playlists}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <Animated.View
            entering={FadeIn.duration(400).delay(index * 100)}
            layout={LinearTransition.springify()}
          >
            <PlaylistCard playlist={item} isUser={false} />
          </Animated.View>
        )}
        horizontal
        showsHorizontalScrollIndicator={false}
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
      <View className="flex-row justify-between items-center mb-2 ml-3">
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
            layout={LinearTransition.springify()}
          >
            <NewSongCard song={item} />
          </Animated.View>
        )}
        horizontal
        showsHorizontalScrollIndicator={false}
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
            className="text-xl font-bold mb-2 ml-3"
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
              layout={LinearTransition.springify()}
            >
              <NewSongCard song={item} />
            </Animated.View>
          )}
          horizontal
          showsHorizontalScrollIndicator={false}
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
        <Text
          className="text-xl font-bold mb-2 ml-3"
          style={{ color: colors.text }}
        >
          {title}
        </Text>
      )}
      <FlatList
        data={artists}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <Animated.View
            entering={FadeIn.duration(400).delay(index * 100)}
            layout={LinearTransition.springify()}
          >
            <ArtistCard artist={item} />
          </Animated.View>
        )}
        horizontal
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );
});

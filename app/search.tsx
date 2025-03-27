import { SongCard } from "@/components/music/MusicCards";
import { usePlayer } from "@/context/MusicContext";
import { Song } from "@/types/song";
import { searchSongs } from "@/utils/api/getSongs";
import { useDebounce } from "@/utils/hooks/useDebounce";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

const formatPlayCount = (count: number) => {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M plays`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K plays`;
  }
  return `${count} plays`;
};

export default function SearchMusic() {
  const { playSong } = usePlayer();
  const [searchQuery, setSearchQuery] = useState("");
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const debouncedSearch = useDebounce(async (query: string) => {
    if (!query.trim()) {
      setSongs([]);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const results = await searchSongs(query);
      setSongs(results);
    } catch (err) {
      setError("Failed to search songs");
      setSongs([]);
    } finally {
      setIsLoading(false);
    }
  }, 500);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    debouncedSearch(text);
  };

  const renderSongItem = ({ item }: { item: Song }) => {
    const song = item as Song;

    return (
      <TouchableOpacity
        className="mb-2.5 mx-4"
        activeOpacity={0.6}
        onPress={() => playSong(song)}
      >
        <View className="flex-row items-center py-2.5">
          <View className="w-14 h-14 rounded-md overflow-hidden mr-3.5 shadow-sm">
            <Image
              source={{ uri: song.image[2]?.link || song.image[0]?.link }}
              className="w-full h-full"
              resizeMode="cover"
            />
          </View>

          <View className="flex-1 pr-2">
            <Text
              className="text-white font-medium text-base mb-0.5"
              numberOfLines={1}
            >
              {song.name}
            </Text>
            <Text className="text-gray-400 text-sm mb-1" numberOfLines={1}>
              {song.subtitle}
            </Text>
            <View className="flex-row items-center">
              <Ionicons name="play-circle-outline" size={13} color="#9CA3AF" />
              <Text className="text-xs text-gray-500 ml-1">
                {formatPlayCount(song.play_count)}
              </Text>
              <Text className="text-gray-600 mx-2">•</Text>
              <Ionicons name="time-outline" size={13} color="#9CA3AF" />
              <Text className="text-xs text-gray-500 ml-1">
                {formatDuration(song.duration)}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            className="p-2.5 rounded-full bg-white/10 hover:bg-white/15"
            onPress={() => playSong(song)}
          >
            <Ionicons name="play" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar barStyle="light-content" />

      {/* Search Header */}
      <View className="px-4 py-3">
        <View className="flex-row items-center bg-zinc-800/80 rounded-full px-4 h-11">
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            className="flex-1 h-11 px-2.5 text-white"
            placeholder="Search for songs..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={handleSearch}
            returnKeyType="search"
            autoCapitalize="none"
            autoFocus
          />
          {searchQuery ? (
            <TouchableOpacity
              onPress={() => handleSearch("")}
              className="p-1.5"
            >
              <View className="bg-zinc-700 rounded-full p-1">
                <Ionicons name="close" size={12} color="#fff" />
              </View>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="small" color="#ffffff" />
          <Text className="text-gray-400 mt-3 text-sm">Searching...</Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center p-4">
          <View className="p-3.5 rounded-full bg-zinc-800">
            <Ionicons name="alert-circle" size={32} color="#f1f1f1" />
          </View>
          <Text className="text-white mt-4 text-base font-medium">{error}</Text>
          <TouchableOpacity
            className="mt-4 px-5 py-2.5 bg-zinc-800 rounded-full"
            onPress={() => handleSearch(searchQuery)}
          >
            <Text className="text-white font-medium">Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={songs}
          renderItem={({ item }) => <SongCard song={item} />}
          keyExtractor={(item) => item.id}
          className="flex-1"
          contentContainerStyle={{ padding: 15 }}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => (
            <View className="h-px bg-zinc-900 mx-4" />
          )}
          ListEmptyComponent={
            searchQuery ? (
              <View className="flex-1 items-center justify-center p-8 mt-10">
                <View className="p-4 rounded-full bg-zinc-900">
                  <Ionicons name="search" size={32} color="#d1d1d1" />
                </View>
                <Text className="text-white mt-4 text-center font-medium">
                  No results for "{searchQuery}"
                </Text>
                <Text className="text-gray-500 mt-1 text-center text-sm">
                  Try different keywords or check your spelling
                </Text>
              </View>
            ) : (
              <View className="flex-1 items-center justify-center p-8 mt-10">
                <View className="p-4 rounded-full bg-zinc-900">
                  <Ionicons name="musical-notes" size={32} color="#f1f1f1" />
                </View>
                <Text className="text-white mt-4 text-center font-medium">
                  Search for music
                </Text>
                <Text className="text-gray-500 mt-1 text-center text-sm">
                  Find artists, songs, and albums
                </Text>
              </View>
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

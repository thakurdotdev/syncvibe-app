import { usePlayer } from "@/context/MusicContext";
import { Song } from "@/types/song";
import { searchSongs } from "@/utils/api/getSongs";
import { useDebounce } from "@/utils/hooks/useDebounce";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

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

  const renderSongItem = ({ item }: { item: Song }) => (
    <TouchableOpacity
      className="mb-4 mx-4 overflow-hidden"
      onPress={() => {
        playSong(item);
      }}
    >
      <BlurView intensity={20} className="rounded-2xl overflow-hidden">
        <View className="flex-row items-center p-4 bg-black/5">
          <View className="w-16 h-16 rounded-xl overflow-hidden mr-4">
            <Image
              source={{ uri: item.image[2]?.link || item.image[0]?.link }}
              className="w-full h-full"
              resizeMode="cover"
            />
          </View>
          <View className="flex-1 pr-4">
            <Text
              className="text-lg font-bold text-white mb-1"
              numberOfLines={1}
            >
              {item.name}
            </Text>
            <Text className="text-sm text-gray-300 mb-2" numberOfLines={1}>
              {item.subtitle}
            </Text>
            <View className="flex-row items-center">
              <Ionicons name="play-circle-outline" size={16} color="#9CA3AF" />
              <Text className="text-xs text-gray-400 ml-1">
                {formatPlayCount(item.play_count)}
              </Text>
              <Text className="text-gray-400 mx-2">•</Text>
              <Ionicons name="time-outline" size={16} color="#9CA3AF" />
              <Text className="text-xs text-gray-400 ml-1">
                {formatDuration(item.duration)}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            className="p-2 rounded-full bg-white/10"
            onPress={() => {
              playSong(item);
            }}
          >
            <Ionicons name="play" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </BlurView>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-black">
      <View className="p-4">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.replace("/home")}
            className="mr-3"
          >
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View className="flex-row items-center bg-white/10 rounded-full px-4 h-12 flex-1">
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput
              className="flex-1 h-12 px-3 text-white"
              placeholder="Search for songs..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={handleSearch}
              autoFocus
            />
            {searchQuery ? (
              <TouchableOpacity
                onPress={() => handleSearch("")}
                className="p-2"
              >
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#fff" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center p-4">
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text className="text-red-500 mt-4 text-center">{error}</Text>
        </View>
      ) : (
        <FlatList
          data={songs}
          renderItem={renderSongItem}
          keyExtractor={(item) => item.id}
          className="flex-1"
          contentContainerClassName="pt-2 pb-24"
          ListEmptyComponent={
            searchQuery ? (
              <View className="flex-1 items-center justify-center p-4">
                <Ionicons name="search" size={48} color="#9CA3AF" />
                <Text className="text-gray-400 mt-4 text-center">
                  No songs found for "{searchQuery}"
                </Text>
              </View>
            ) : (
              <View className="flex-1 items-center justify-center p-4">
                <Ionicons name="musical-notes" size={48} color="#9CA3AF" />
                <Text className="text-gray-400 mt-4 text-center">
                  Search for your favorite songs
                </Text>
              </View>
            )
          }
        />
      )}
    </View>
  );
}

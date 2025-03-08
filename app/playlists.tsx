import { SongCard } from "@/components/music/MusicCards";
import { SONG_URL } from "@/constants";
import { usePlayer } from "@/context/MusicContext";
import { Song } from "@/types/song";
import axios from "axios";
import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Button,
  FlatList,
  Image,
  ImageBackground,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface PlaylistData {
  id: string;
  name: string;
  header_desc: string;
  image: string;
  list_count: number;
  follower_count: number;
  songs: Song[];
}

export default function PlaylistScreen() {
  const { id } = useLocalSearchParams();
  const [playlistData, setPlaylistData] = useState<PlaylistData | null>(null);
  const { addToPlaylist, playSong } = usePlayer();
  const [loading, setLoading] = useState(true);

  const fetchPlaylistData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${SONG_URL}/playlist?id=${id}`);
      const data = response.data;
      setPlaylistData(data.data);
    } catch (error) {
      console.error("Error fetching playlist data:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchPlaylistData();
    }
  }, [id, fetchPlaylistData]);

  const handlePlayAll = () => {
    if (playlistData?.songs?.length) {
      addToPlaylist(
        playlistData.songs.map((song) => ({
          ...song,
          isPlaylist: true,
          playlistId: playlistData.id,
        })),
      );
      playSong(playlistData.songs[0]);
    }
  };

  const handleShuffle = () => {
    if (playlistData?.songs?.length) {
      const shuffledSongs = [...playlistData.songs].sort(
        () => Math.random() - 0.5,
      );
      addToPlaylist(
        shuffledSongs.map((song) => ({
          ...song,
          isPlaylist: true,
          playlistId: playlistData.id,
        })),
      );
      playSong(shuffledSongs[0]);
    }
  };

  const formatCount = (count: any) => {
    if (count === undefined || count === null) return "N/A";
    if (count >= 1000000000) return (count / 1000000000).toFixed(1) + "B";
    if (count >= 1000000) return (count / 1000000).toFixed(1) + "M";
    if (count >= 1000) return (count / 1000).toFixed(1) + "K";
    return count.toString();
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator size="large" color="white" />
        <Text className="text-white mt-4">Loading playlist...</Text>
      </SafeAreaView>
    );
  }

  const bgUrl = playlistData?.image;

  return (
    <View className="flex-1 bg-black p-5">
      <FlatList
        data={playlistData?.songs}
        renderItem={({ item }) => <SongCard song={item} />}
        keyExtractor={(item) => item.id}
        className="flex-1"
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View className="h-3" />}
        contentContainerStyle={{ paddingBottom: 120 }}
        ListHeaderComponent={
          <View className="p-3">
            <ImageBackground
              source={{ uri: bgUrl }}
              className="w-full h-[200px] rounded-2xl overflow-hidden"
              resizeMode="cover"
            >
              <View className="w-full h-full flex justify-center bg-black/60 backdrop-filter backdrop-blur-sm p-4">
                <View className="flex-row gap-2">
                  <Image
                    source={{ uri: bgUrl }}
                    className="w-[150px] h-[150px] rounded-lg"
                    resizeMode="cover"
                  />
                  <View className="flex-1 justify-center">
                    <Text
                      className="text-white text-xl font-bold mb-1"
                      numberOfLines={2}
                    >
                      {playlistData?.name}
                    </Text>
                    <Text className="text-white/70 text-base" numberOfLines={3}>
                      {playlistData?.header_desc}
                    </Text>
                    <View className="mt-4">
                      <Text className="text-white/80 text-sm">
                        {playlistData?.list_count} songs
                      </Text>
                      <Text className="text-white/80 text-sm">
                        {formatCount(playlistData?.follower_count)} followers
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </ImageBackground>

            {/* Actions */}
            <View className="flex flex-row w-full justify-center gap-5 mt-6 mb-5">
              <Button
                onPress={handlePlayAll}
                disabled={!playlistData?.songs?.length}
                title="Play All"
              />

              <Button
                onPress={handleShuffle}
                disabled={!playlistData?.songs?.length}
                title="Shuffle"
              />
            </View>
          </View>
        }
      />
    </View>
  );
}

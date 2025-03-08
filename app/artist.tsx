import { SongCard } from "@/components/music/MusicCards";
import { SONG_URL } from "@/constants";
import { Song } from "@/types/song";
import axios from "axios";
import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  ImageBackground,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const formatCount = (count: any) => {
  if (count === undefined || count === null) return "N/A";
  if (count >= 1000000000) return (count / 1000000000).toFixed(1) + "B";
  if (count >= 1000000) return (count / 1000000).toFixed(1) + "M";
  if (count >= 1000) return (count / 1000).toFixed(1) + "K";
  return count.toString();
};

interface ImageData {
  link: string;
}

interface artist {
  id: string;
  name: string;
  image: Image[];
}

interface ArtistData {
  id: string;
  name: string;
  header_desc: string;
  image: string | ImageData[];
  list_count: number;
  follower_count: number;
  top_songs: Song[];
  top_albums: any[];
  dedicated_artist_playlist: any[];
  similar_artists: artist[];
}

export default function ArtistScreen() {
  const { id } = useLocalSearchParams();
  const [artistData, setArtistData] = useState<ArtistData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchArtistData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${SONG_URL}/artist?id=${id}`);
      const data = response.data;
      setArtistData(data.data);
    } catch (error) {
      console.error("Error fetching playlist data:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchArtistData();
    }
  }, [id, fetchArtistData]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator size="large" color="white" />
        <Text className="text-white mt-4">Loading Artist...</Text>
      </SafeAreaView>
    );
  }

  const bgUrl = Array.isArray(artistData?.image)
    ? artistData?.image[2]?.link
    : artistData?.image;

  return (
    <View className="flex-1 bg-black p-5">
      <FlatList
        data={artistData?.top_songs}
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
                      {artistData?.name}
                    </Text>
                    <Text className="text-white/70 text-base" numberOfLines={3}>
                      {artistData?.header_desc}
                    </Text>
                    <View className="mt-4">
                      <Text className="text-white/80 text-sm">
                        {artistData?.list_count} songs
                      </Text>
                      <Text className="text-white/80 text-sm">
                        {formatCount(artistData?.follower_count)} followers
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </ImageBackground>
          </View>
        }
      />
    </View>
  );
}

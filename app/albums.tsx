import { SongCard } from "@/components/music/MusicCards";
import { Button, ButtonText } from "@/components/ui/button";
import { SONG_URL } from "@/constants";
import { usePlayer } from "@/context/MusicContext";
import { Song } from "@/types/song";
import axios from "axios";
import { useLocalSearchParams } from "expo-router";
import { Music2Icon } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  ImageBackground,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface AlbumData {
  id: string;
  name: string;
  year: string;
  songcount: number;
  image: Array<{ link: string }>;
  songs: Song[];
  artist_map?: {
    artists?: Array<{ name: string }>;
  };
}

export default function AlbumScreen() {
  const { id } = useLocalSearchParams();
  const [albumData, setAlbumData] = useState<AlbumData | null>(null);
  const { addToPlaylist, playSong } = usePlayer();
  const [loading, setLoading] = useState(true);

  console.log("AlbumScreen -> id", id);

  const fetchAlbumData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${SONG_URL}/album?id=${id}`);
      const data = response.data;
      setAlbumData(data.data);
    } catch (error) {
      console.error("Error fetching album data:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchAlbumData();
    }
  }, [id, fetchAlbumData]);

  const handlePlayAll = () => {
    if (albumData?.songs?.length) {
      addToPlaylist(albumData.songs);
      playSong(albumData.songs[0]);
    }
  };

  const handleShuffle = () => {
    if (albumData?.songs?.length) {
      const shuffledSongs = [...albumData.songs].sort(
        () => Math.random() - 0.5,
      );
      addToPlaylist(shuffledSongs);
      playSong(shuffledSongs[0]);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator size="large" color="white" />
        <Text className="text-white mt-4">Loading album...</Text>
      </SafeAreaView>
    );
  }

  if (!albumData) {
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center">
        <Music2Icon size={100} color="white" className="mt-4" />
        <Text className="text-white mt-4">No album found</Text>
        <Button onPress={fetchAlbumData} action="primary" className="mt-4">
          <ButtonText>Retry</ButtonText>
        </Button>
      </SafeAreaView>
    );
  }

  const bgUrl = albumData?.image?.[2]?.link;
  const artistName = albumData?.artist_map?.artists
    ?.slice(0, 2)
    ?.map((artist) => artist.name)
    .join(", ");

  const renderHeader = () => (
    <SafeAreaView>
      {/* Album Info */}
      <ImageBackground
        source={{ uri: bgUrl }}
        className="w-full h-[280px] rounded-2xl overflow-hidden"
        resizeMode="cover"
      >
        <View className="w-full h-full bg-black/60 backdrop-filter backdrop-blur-sm p-4">
          <View className="flex-row space-x-4">
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
                {albumData?.name}
              </Text>
              <Text className="text-white/70 text-base" numberOfLines={1}>
                :- {artistName}
              </Text>
              <View className="mt-4">
                <Text className="text-white/80 text-sm">{albumData?.year}</Text>
                <Text className="text-white/80 text-sm">
                  {albumData?.songcount} songs
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ImageBackground>

      {/* Actions */}
      <View style={styles.container}>
        <Button
          onPress={handlePlayAll}
          disabled={!albumData?.songs?.length}
          action="primary"
        >
          <ButtonText>Play All</ButtonText>
        </Button>

        <Button
          disabled={!albumData?.songs?.length}
          variant="outline"
          action="primary"
          onPress={handleShuffle}
        >
          <ButtonText>Shuffle</ButtonText>
        </Button>
      </View>

      {/* Album Songs */}
      <Text className="text-white text-xl font-bold mt-8 mb-4">Songs</Text>
    </SafeAreaView>
  );

  return (
    <SafeAreaView edges={["right", "left"]} className="flex-1 bg-black">
      <FlatList
        data={albumData?.songs || []}
        renderItem={({ item }) => <SongCard song={item} />}
        keyExtractor={(item) => item.id}
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    width: "100%",
    marginTop: 24,
  },
});

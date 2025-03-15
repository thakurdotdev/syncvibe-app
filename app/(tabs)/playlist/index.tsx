import { PlaylistCard } from "@/components/music/MusicCards";
import { usePlaylist } from "@/context/MusicContext";
import { useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const LoadingState = () => (
  <SafeAreaView className="flex-1 bg-black justify-center items-center">
    <ActivityIndicator size="large" color="#1DB954" />
    <Text className="text-white mt-4 text-base">Loading playlist...</Text>
  </SafeAreaView>
);

const PlaylistScreen = () => {
  const { userPlaylist, getPlaylists } = usePlaylist();
  const [loading, setLoading] = useState(false);
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const playlistPairs = [];
  for (let i = 0; i < userPlaylist.length; i += 2) {
    playlistPairs.push([userPlaylist[i], userPlaylist[i + 1] || null]);
  }

  if (loading) return <LoadingState />;

  const renderRow = ({ item }: { item: any[] }) => (
    <View className="flex-row justify-center px-3 mb-4 w-full">
      <View className="flex-1">
        <PlaylistCard playlist={item[0]} isUser={true} />
      </View>
      {item[1] && (
        <View className="flex-1">
          <PlaylistCard playlist={item[1]} isUser={true} />
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-black relative">
      <Animated.FlatList
        data={playlistPairs}
        renderItem={renderRow}
        keyExtractor={(item, index) => `row-${index}`}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        ListHeaderComponent={() => {
          return (
            <View className="px-5 mb-4 mt-5">
              <Text className="text-white text-2xl font-bold">
                My Playlists
              </Text>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
};

export default PlaylistScreen;

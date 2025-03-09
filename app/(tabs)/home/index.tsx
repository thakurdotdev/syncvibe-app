import React, { useCallback, useEffect, useState, useMemo } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  View,
  StatusBar,
  Animated,
} from "react-native";
import {
  AlbumsGrid,
  ArtistGrid,
  PlaylistsGrid,
  RecommendationGrid,
  TrendingSongs,
} from "@/components/music/MusicLists";
import { API_URL, SONG_URL } from "@/constants";
import { useUser } from "@/context/UserContext";
import axios from "axios";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";

// Define types for better TypeScript support
interface MediaItem {
  id: string;
  name: string;
  image: string;
  list_count: number;
  type?: string;
}

interface HomePageData {
  trending: MediaItem[];
  playlists: MediaItem[];
  albums: MediaItem[];
  charts: MediaItem[];
  artists: MediaItem[];
}

export default function HomeScreen() {
  const { selectedLanguages } = useUser();
  const [homePageData, setHomePageData] = useState<HomePageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string>("");
  const [recommendations, setRecommendations] = useState([]);
  const [reccLoading, setReccLoading] = useState(false);

  const scrollY = new Animated.Value(0);

  // Memoize API requests to prevent unnecessary renders
  const fetchData = useCallback(async () => {
    try {
      setError("");
      const response = await axios.get(
        `${SONG_URL}/modules?lang=${selectedLanguages}`,
        {
          headers: {
            "Cache-Control": "max-age=3600",
          },
        },
      );

      if (response.status === 200) {
        const topAllData = response.data?.data;
        setHomePageData({
          trending: topAllData.trending?.data || [],
          playlists: topAllData.playlists?.data || [],
          albums: topAllData?.albums.data || [],
          charts: topAllData?.charts.data || [],
          artists: topAllData?.artist_recos?.data || [],
        });
      }
    } catch (error) {
      setError("Failed to load content. Please try again later.");
      console.error("Error fetching homepage data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedLanguages]);

  const getRecommendations = useCallback(async () => {
    try {
      setReccLoading(true);
      const response = await axios.get(`${API_URL}/api/music/recommendations`, {
        withCredentials: true,
        headers: {
          "Cache-Control": "max-age=3600",
        },
      });

      if (response.status === 200) {
        setRecommendations(response.data.songs);
      }
    } catch (error) {
      console.error("Error fetching recommendations:", error);
    } finally {
      setReccLoading(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
    getRecommendations();
  }, [fetchData, getRecommendations]);

  const trendingSongs = useMemo(() => {
    return (
      homePageData?.trending?.filter((item) => item?.type === "song") || []
    );
  }, [homePageData?.trending]);

  useEffect(() => {
    fetchData();
    getRecommendations();
  }, [fetchData, getRecommendations]);

  // Header opacity animation based on scroll position
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-black">
        <StatusBar barStyle="light-content" backgroundColor="black" />
        <ActivityIndicator size="large" color="#1DB954" />
        <Text className="text-white font-medium mt-4">
          Loading your music...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      <Animated.ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#1DB954"
            colors={["#1DB954"]}
            progressBackgroundColor="#000000"
          />
        }
      >
        <View className="p-4 mb-20">
          {error ? (
            <View className="py-4 my-2 rounded-xl bg-gray-900 items-center">
              <Text className="text-white text-center">{error}</Text>
            </View>
          ) : null}

          {recommendations.length > 0 && (
            <RecommendationGrid
              recommendations={recommendations}
              title="Made For You"
              loading={reccLoading}
            />
          )}

          {trendingSongs.length > 0 && (
            <TrendingSongs songs={trendingSongs} title="Trending Now" />
          )}

          {homePageData?.playlists?.length > 0 && (
            <PlaylistsGrid
              playlists={homePageData.playlists}
              title="Popular Playlists"
            />
          )}

          {homePageData?.charts?.length > 0 && (
            <PlaylistsGrid playlists={homePageData.charts} title="Top Charts" />
          )}

          {homePageData?.albums?.length > 0 && (
            <AlbumsGrid albums={homePageData.albums} title="New Albums" />
          )}

          {homePageData?.artists?.length > 0 && (
            <ArtistGrid
              artists={homePageData.artists}
              title="Artists You'll Love"
            />
          )}
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

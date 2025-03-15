import {
  AlbumsGrid,
  ArtistGrid,
  PlaylistsGrid,
  RecommendationGrid,
  TrendingSongs,
} from "@/components/music/MusicLists";
import { SONG_URL } from "@/constants";
import { useUser } from "@/context/UserContext";
import { Song } from "@/types/song";
import useApi from "@/utils/hooks/useApi";
import axios from "axios";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  RefreshControl,
  StatusBar,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface HomePageData {
  trending: Song[];
  playlists: any[] | undefined;
  albums: any[] | undefined;
  charts: any[] | undefined;
  artists: any[] | undefined;
}

export default function HomeScreen() {
  const api = useApi();
  const { selectedLanguages, user } = useUser();
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
      if (!user?.userid) return;
      setReccLoading(true);
      const response = await api.get("/api/music/recommendations");

      if (response.status === 200) {
        setRecommendations(response.data.songs);
      }
    } catch (error) {
      console.error("Error fetching recommendations:", error);
    } finally {
      setReccLoading(false);
    }
  }, [user?.userid]);

  useEffect(() => {
    getRecommendations();
  }, [getRecommendations]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const trendingSongs = useMemo(() => {
    return (
      homePageData?.trending?.filter((item) => item?.type === "song") || []
    );
  }, [homePageData?.trending]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
            />
          )}

          {trendingSongs.length > 0 && (
            <TrendingSongs songs={trendingSongs} title="Trending Now" />
          )}

          {homePageData?.playlists && homePageData.playlists.length > 0 && (
            <PlaylistsGrid
              playlists={homePageData.playlists}
              title="Popular Playlists"
            />
          )}

          {homePageData?.charts && homePageData.charts.length > 0 && (
            <PlaylistsGrid playlists={homePageData.charts} title="Top Charts" />
          )}

          {homePageData?.albums && homePageData.albums.length > 0 && (
            <AlbumsGrid albums={homePageData.albums} title="New Albums" />
          )}

          {homePageData?.artists && homePageData.artists.length > 0 && (
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

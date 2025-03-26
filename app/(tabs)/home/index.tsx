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
import { getGreeting } from "@/utils/getGreeting";
import useApi from "@/utils/hooks/useApi";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  RefreshControl,
  StatusBar,
  Text,
  TouchableOpacity,
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

  const scrollY = new Animated.Value(0);

  // Calculated animations for header background gradient
  const headerHeight = 350; // Gradient header height
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, headerHeight * 0.6, headerHeight],
    outputRange: [1, 0.5, 0],
    extrapolate: "clamp",
  });

  // Memoize API requests to prevent unnecessary renders
  const fetchData = useCallback(async () => {
    try {
      setError("");
      const response = await axios.get(
        `${SONG_URL}/modules?lang=${selectedLanguages}`,
        {
          headers: {
            "Cache-Control": "no-cache",
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

      const response = await api.get("/api/music/recommendations");

      if (response.status === 200) {
        setRecommendations(response.data.songs);
      }
    } catch (error) {
      console.error("Error fetching recommendations:", error);
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
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent
        />
        <ActivityIndicator size="large" color="#1DB954" />
        <Text className="text-white font-medium mt-4">
          Loading your music...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      <SafeAreaView className="flex-1">
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: headerHeight,
            opacity: headerOpacity,
            zIndex: 0,
          }}
        >
          <LinearGradient
            colors={["#42353A", "#092B31", "#121212"]}
            start={{ x: 0.1, y: 0.1 }}
            end={{ x: 0.8, y: 0.85 }} // End slightly higher to allow for organic fade
            style={{
              height: "100%",
              width: "100%",
            }}
          />
        </Animated.View>

        {/* Content that appears on top of the gradient */}
        <View style={{ zIndex: 1 }}>
          {/* Search Bar */}
          <View className="px-4 pt-4">
            <TouchableOpacity
              className="flex-row items-center bg-white/15 rounded-full px-4 h-12"
              onPress={() => router.push("/search")}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Search for songs"
            >
              <Ionicons name="search" size={20} color="#ffffff" />
              <Text
                className="flex-1 h-12 px-3 text-gray-300 flex justify-center py-3"
                numberOfLines={1}
              >
                Search for songs...
              </Text>
            </TouchableOpacity>
          </View>

          {/* Greeting */}
          <View className="px-4 pt-2 pb-4">
            <Text className="text-white text-lg font-bold">
              {getGreeting()}
            </Text>
          </View>
        </View>

        <Animated.ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true },
          )}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View className="px-4 mb-20">
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
              <PlaylistsGrid
                playlists={homePageData.charts}
                title="Top Charts"
              />
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
    </View>
  );
}

// Helper function to get greeting based on time of day

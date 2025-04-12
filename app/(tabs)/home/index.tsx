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
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  RefreshControl,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Extrapolation,
  FadeIn,
  FadeOut,
  interpolate,
  LinearTransition,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

interface HomePageData {
  trending: Song[];
  playlists: any[] | undefined;
  albums: any[] | undefined;
  charts: any[] | undefined;
  artists: any[] | undefined;
}

interface Recommendations {
  songs: Song[];
  recentlyPlayed: Song[];
}

const { width } = Dimensions.get("window");

const SkeletonLoader = () => {
  return (
    <View className="px-4">
      {/* Greeting skeleton */}
      <View className="w-2/3 h-7 bg-gray-800 rounded-md mb-8 mt-4" />

      {/* Recently played section */}
      <View className="mb-8">
        <View className="w-1/2 h-6 bg-gray-800 rounded-md mb-4" />
        <View className="flex-row">
          {[1, 2, 3].map((i) => (
            <View
              key={i}
              className="w-36 h-56 mr-4 bg-gray-800/70 rounded-xl"
              style={{ marginBottom: 12 }}
            />
          ))}
        </View>
      </View>

      {/* Trending section */}
      <View className="mb-8">
        <View className="w-2/5 h-6 bg-gray-800/70 rounded-md mb-4" />
        <View className="flex-row">
          {[1, 2, 3].map((i) => (
            <View
              key={i}
              className="w-36 h-56 mr-4 bg-gray-800/70 rounded-xl"
              style={{ marginBottom: 12 }}
            />
          ))}
        </View>
      </View>

      {/* Playlists section */}
      <View className="mb-8">
        <View className="w-1/2 h-6 bg-gray-800/70 rounded-md mb-4" />
        <View className="flex-row">
          {[1, 2, 3].map((i) => (
            <View
              key={i}
              className="w-36 h-48 mr-4 bg-gray-800/70 rounded-xl"
              style={{ marginBottom: 12 }}
            />
          ))}
        </View>
      </View>
    </View>
  );
};

export default function HomeScreen() {
  const api = useApi();
  const { selectedLanguages, user } = useUser();
  const [homePageData, setHomePageData] = useState<HomePageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string>("");
  const [recommendations, setRecommendations] = useState<Recommendations>({
    songs: [],
    recentlyPlayed: [],
  });

  // Animation values
  const scrollY = useSharedValue(0);
  const headerHeight = 350;
  const searchBarTranslateY = useSharedValue(0);
  const greetingTranslateY = useSharedValue(8);

  // Animated scroll handler
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Header animations
  const headerOpacity = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        scrollY.value,
        [0, headerHeight * 0.6, headerHeight],
        [1, 0.5, 0],
        Extrapolation.CLAMP,
      ),
      transform: [
        {
          scale: interpolate(
            scrollY.value,
            [0, headerHeight],
            [1, 0.92],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  // Search bar animations
  const searchBarStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: interpolate(
            scrollY.value,
            [-50, 0],
            [8, 0],
            Extrapolation.CLAMP,
          ),
        },
        {
          scale: interpolate(
            scrollY.value,
            [-30, 0, 100],
            [1.05, 1, 0.97],
            Extrapolation.CLAMP,
          ),
        },
      ],
      opacity: interpolate(
        scrollY.value,
        [-50, 0, 200],
        [1, 1, 0.8],
        Extrapolation.CLAMP,
      ),
    };
  });

  // Greeting animations
  const greetingStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: interpolate(
            scrollY.value,
            [-30, 0],
            [4, 0],
            Extrapolation.CLAMP,
          ),
        },
      ],
      opacity: interpolate(
        scrollY.value,
        [0, 100],
        [1, 0.7],
        Extrapolation.CLAMP,
      ),
    };
  });

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

  const getRecommendations = async () => {
    try {
      if (!user?.userid) return;

      const response = await api.get("/api/music/recommendations");

      if (response.status === 200) {
        const { songs, recentlyPlayed } = response.data.data;

        setRecommendations({
          songs: songs || [],
          recentlyPlayed: recentlyPlayed || [],
        });
      }
    } catch (error) {
      console.error("Error fetching recommendations:", error);
    }
  };

  useEffect(() => {
    if (!user?.userid) return;
    getRecommendations();
  }, [user?.userid]);

  const onRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    fetchData();
    if (user?.userid) {
      getRecommendations();
    }
  }, [fetchData, user?.userid]);

  const trendingSongs = useMemo(() => {
    return (
      homePageData?.trending?.filter((item) => item?.type === "song") || []
    );
  }, [homePageData?.trending]);

  useEffect(() => {
    fetchData();
    // Animate in the UI elements
    searchBarTranslateY.value = withSpring(0, {
      damping: 15,
      stiffness: 100,
    });
    greetingTranslateY.value = withSpring(0, {
      damping: 15,
      stiffness: 100,
    });
  }, [fetchData]);

  return (
    <View className="flex-1 bg-black">
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      <SafeAreaView className="flex-1">
        <Animated.View
          style={[
            {
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: headerHeight,
              zIndex: 0,
            },
            headerOpacity,
          ]}
        >
          <LinearGradient
            colors={["#43354A", "#1B2935", "#121212"]}
            start={{ x: 0.1, y: 0.1 }}
            end={{ x: 0.8, y: 0.85 }}
            style={{
              height: "100%",
              width: "100%",
            }}
          />
          <BlurView
            intensity={25}
            tint="dark"
            style={{ position: "absolute", width: "100%", height: "100%" }}
          />
        </Animated.View>

        {/* Content that appears on top of the gradient */}
        <View style={{ zIndex: 1 }}>
          {/* Search Bar */}
          <Animated.View className="px-4 pt-4" style={searchBarStyle}>
            <TouchableOpacity
              className="flex-row items-center bg-white/15 rounded-full px-4 h-12"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/search");
              }}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Search for songs"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
                elevation: 6,
              }}
            >
              <Ionicons name="search" size={20} color="#ffffff" />
              <Text
                className="flex-1 h-12 px-3 text-gray-300 flex justify-center py-3"
                numberOfLines={1}
              >
                Search for songs...
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Greeting */}
          <Animated.View className="px-4 pt-3 pb-2" style={greetingStyle}>
            <Text className="text-white text-xl font-bold">
              {getGreeting()}
            </Text>
          </Animated.View>
        </View>

        {loading ? (
          <Animated.View
            className="flex-1"
            entering={FadeIn.duration(500)}
            exiting={FadeOut.duration(300)}
          >
            <SkeletonLoader />
          </Animated.View>
        ) : (
          <Animated.ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#ffffff"
                progressBackgroundColor="#1e1e1e"
                colors={["#ffffff", "#9333ea"]}
              />
            }
          >
            <Animated.View
              className="px-4 mb-20"
              entering={FadeIn.duration(500).delay(200)}
              layout={LinearTransition.springify()}
            >
              {error ? (
                <View className="py-4 my-2 rounded-xl bg-gray-900/80 items-center">
                  <Text className="text-white text-center">{error}</Text>
                  <TouchableOpacity
                    className="mt-3 bg-white/10 px-4 py-2 rounded-full"
                    onPress={onRefresh}
                  >
                    <Text className="text-white">Try Again</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {recommendations.recentlyPlayed.length > 0 && (
                <RecommendationGrid
                  recommendations={recommendations.recentlyPlayed}
                  title="Recently Played"
                  showMore={true}
                />
              )}

              {recommendations.songs.length > 0 && (
                <RecommendationGrid
                  recommendations={recommendations.songs}
                  title="Mostly Listened Songs"
                  showMore={true}
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
            </Animated.View>
          </Animated.ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

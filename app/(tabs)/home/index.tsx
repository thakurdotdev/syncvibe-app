import {
  AlbumsGrid,
  ArtistGrid,
  PlaylistsGrid,
  RecommendationGrid,
  TrendingSongs,
} from "@/components/music/MusicLists";
import { SONG_URL } from "@/constants";
import { useTheme } from "@/context/ThemeContext";
import { useUser } from "@/context/UserContext";
import { Song } from "@/types/song";
import useApi from "@/utils/hooks/useApi";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  RefreshControl,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Extrapolation,
  FadeIn,
  FadeInLeft,
  FadeInRight,
  FadeInUp,
  FadeOut,
  interpolate,
  LinearTransition,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  runOnUI,
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

const SkeletonLoader = () => {
  const { theme } = useTheme();
  const colors =
    theme === "light"
      ? {
          bg: "bg-gray-100/80",
          headerBg: "bg-gray-200/80",
          shimmer: "bg-gray-200/50",
        }
      : {
          bg: "bg-gray-800/70",
          headerBg: "bg-gray-800",
          shimmer: "bg-gray-700/50",
        };

  const shimmerAnimation = useSharedValue(0);

  useEffect(() => {
    // Create a repeating animation using runOnUI to ensure it's a worklet
    runOnUI(() => {
      "worklet";
      const startAnimation = () => {
        "worklet";
        shimmerAnimation.value = 0;
        shimmerAnimation.value = withTiming(1, { duration: 1200 }, () => {
          startAnimation();
        });
      };

      startAnimation();
    })();

    return () => {
      // Clean up animation when component unmounts
      shimmerAnimation.value = 0;
    };
  }, []);

  const shimmerStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: interpolate(shimmerAnimation.value, [0, 1], [-300, 300]),
        },
      ],
      opacity: 0.7,
    };
  });

  // Animated values for staggered entrance
  const opacityAnim = useSharedValue(0);
  const scaleAnim = useSharedValue(0.98);

  useEffect(() => {
    opacityAnim.value = withTiming(1, { duration: 600 });
    scaleAnim.value = withTiming(1, { duration: 700 });
  }, []);

  const containerStyle = useAnimatedStyle(() => {
    return {
      opacity: opacityAnim.value,
      transform: [{ scale: scaleAnim.value }],
    };
  });

  // Generate skeleton card items with varying widths for more natural look
  interface SkeletonOptions {
    minWidth?: number;
    maxWidth?: number;
    height?: number;
  }

  const generateSkeletonCards = (
    count: number,
    options: SkeletonOptions = {},
  ) => {
    const { minWidth = 130, maxWidth = 150, height = 170 } = options;
    return Array(count)
      .fill(0)
      .map((_, i) => {
        // Random width for more natural appearance
        const width = minWidth + Math.random() * (maxWidth - minWidth);

        return (
          <Animated.View
            key={i}
            entering={FadeInUp.duration(500).delay(100 + i * 50)}
            className={`mr-4 ${colors.bg} rounded-xl overflow-hidden`}
            style={{ width, height }}
          >
            <Animated.View
              className="absolute top-0 left-0 right-0 bottom-0 w-full bg-white/10"
              style={shimmerStyle}
            />
          </Animated.View>
        );
      });
  };

  return (
    <Animated.View className="px-4" style={containerStyle}>
      {/* Greeting skeleton - with more subtle rounded corners */}
      <Animated.View
        entering={FadeInLeft.duration(700)}
        className={`w-3/5 h-9 ${colors.headerBg} rounded-lg mb-8 mt-4 overflow-hidden`}
      >
        <Animated.View
          className="absolute top-0 left-0 right-0 bottom-0 w-full bg-white/10"
          style={shimmerStyle}
        />
      </Animated.View>

      {/* Feature cards skeleton - improved layout and spacing */}
      <Animated.View
        entering={FadeInUp.duration(600).delay(200)}
        className="mb-12"
      >
        <Animated.View
          className={`w-2/5 h-7 ${colors.headerBg} rounded-lg mb-5 overflow-hidden`}
          entering={FadeInLeft.duration(600).delay(250)}
        >
          <Animated.View
            className="absolute top-0 left-0 right-0 bottom-0 w-full bg-white/10"
            style={shimmerStyle}
          />
        </Animated.View>

        <View className="flex-row overflow-hidden">
          {generateSkeletonCards(4)}
        </View>
      </Animated.View>

      {/* Recently played section - improved spacing */}
      <Animated.View
        entering={FadeInRight.duration(600).delay(300)}
        className="mb-12"
      >
        <Animated.View
          className={`w-2/5 h-7 ${colors.headerBg} rounded-lg mb-5 overflow-hidden`}
          entering={FadeInLeft.duration(600).delay(350)}
        >
          <Animated.View
            className="absolute top-0 left-0 right-0 bottom-0 w-full bg-white/10"
            style={shimmerStyle}
          />
        </Animated.View>

        <View className="flex-row overflow-hidden">
          {generateSkeletonCards(3)}
        </View>
      </Animated.View>

      {/* Trending section - improved consistency */}
      <Animated.View
        entering={FadeInLeft.duration(600).delay(400)}
        className="mb-8"
      >
        <Animated.View
          className={`w-2/5 h-7 ${colors.headerBg} rounded-lg mb-5 overflow-hidden`}
          entering={FadeInLeft.duration(600).delay(450)}
        >
          <Animated.View
            className="absolute top-0 left-0 right-0 bottom-0 w-full bg-white/10"
            style={shimmerStyle}
          />
        </Animated.View>

        <View className="flex-row overflow-hidden">
          {generateSkeletonCards(3)}
        </View>
      </Animated.View>
    </Animated.View>
  );
};

export default function HomeScreen() {
  const api = useApi();
  const { selectedLanguages, user } = useUser();
  const { colors, theme } = useTheme();
  const [homePageData, setHomePageData] = useState<HomePageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string>("");
  const [recommendations, setRecommendations] = useState<Recommendations>({
    songs: [],
    recentlyPlayed: [],
  });
  const scrollViewRef = useRef(null);

  // Animation values
  const scrollY = useSharedValue(0);
  const headerHeight = 360;
  const searchBarTranslateY = useSharedValue(0);
  const contentOpacity = useSharedValue(1);
  const headerScale = useSharedValue(1);

  // Setup initial animations
  useEffect(() => {
    searchBarTranslateY.value = withTiming(0, { duration: 600 });
  }, []);

  // Animated scroll handler
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
      contentOpacity.value = interpolate(
        event.contentOffset.y,
        [0, headerHeight * 0.5],
        [1, 0.9],
        Extrapolation.CLAMP,
      );
      headerScale.value = interpolate(
        event.contentOffset.y,
        [0, headerHeight],
        [1, 0.95],
        Extrapolation.CLAMP,
      );
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
          scale: headerScale.value,
        },
        {
          translateY: interpolate(
            scrollY.value,
            [0, headerHeight],
            [0, -30],
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
          translateY: searchBarTranslateY.value,
        },
        {
          scale: interpolate(
            scrollY.value,
            [-30, 0, 100],
            [1.05, 1, 0.98],
            Extrapolation.CLAMP,
          ),
        },
      ],
      opacity: interpolate(
        scrollY.value,
        [-50, 0, 200],
        [1, 1, 0.9],
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
  }, [fetchData]);

  // Define header gradient colors based on theme
  const headerGradientColors = useMemo(() => {
    return theme === "light"
      ? (["#F0F9FF", "#E0F2FE", "#BAE6FD"] as const) // Light blue gradient for light mode
      : (["#43354A", "#1B2935", "#121212"] as const); // Original dark gradient
  }, [theme]);

  const blurIntensity = useMemo(() => {
    return theme === "light" ? 20 : 25;
  }, [theme]);

  const blurTint = useMemo(() => {
    return theme === "light" ? "light" : "dark";
  }, [theme]);

  return (
    <View
      className="flex-1"
      style={{
        backgroundColor: colors.background,
      }}
    >
      <StatusBar
        barStyle={theme === "light" ? "dark-content" : "light-content"}
        backgroundColor="transparent"
        translucent
      />

      <SafeAreaView className="flex-1">
        {/* Animated gradient header */}
        <Animated.View
          style={[
            {
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: headerHeight,
              zIndex: 0,
              borderBottomLeftRadius: 30,
              borderBottomRightRadius: 30,
              overflow: "hidden",
            },
            headerOpacity,
          ]}
        >
          <LinearGradient
            colors={headerGradientColors}
            start={{ x: 0.1, y: 0.1 }}
            end={{ x: 0.8, y: 0.85 }}
            style={{
              height: "100%",
              width: "100%",
            }}
          />
          <BlurView
            intensity={blurIntensity}
            tint={blurTint}
            style={{ position: "absolute", width: "100%", height: "100%" }}
          />
        </Animated.View>

        {/* Content that appears on top of the gradient */}
        <View className="z-10 pb-3">
          {/* Search Bar */}
          <Animated.View className="px-4 pt-2" style={searchBarStyle}>
            <TouchableOpacity
              className={`flex-row items-center ${
                theme === "light" ? "bg-white/90" : "bg-white/10"
              } rounded-2xl px-4 h-11`}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/search");
              }}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Search for songs"
            >
              <Ionicons
                name="search"
                size={20}
                color={theme === "light" ? "#555555" : "#ffffff"}
              />
              <Text
                className={`flex-1 h-11 px-3 ${
                  theme === "light" ? "text-gray-600" : "text-gray-300"
                } flex justify-center py-3`}
                numberOfLines={1}
              >
                Search for songs...
              </Text>
            </TouchableOpacity>
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
            ref={scrollViewRef}
            className="flex-1"
            showsVerticalScrollIndicator={false}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingBottom: 20, paddingTop: 20 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme === "light" ? "#555555" : "#ffffff"}
                progressBackgroundColor={
                  theme === "light" ? "#f5f5f5" : "#1e1e1e"
                }
                colors={
                  theme === "light"
                    ? ["#6366F1", "#8B5CF6"]
                    : ["#ffffff", "#9333ea"]
                }
              />
            }
          >
            <Animated.View
              className="px-4 pb-10"
              entering={FadeIn.duration(500).delay(200)}
              layout={LinearTransition.springify()}
              style={{ opacity: contentOpacity }}
            >
              {error ? (
                <View
                  className={`py-4 my-2 rounded-2xl ${
                    theme === "light" ? "bg-gray-100/80" : "bg-gray-900/80"
                  } items-center`}
                >
                  <Text
                    className={
                      theme === "light"
                        ? "text-gray-800 text-center"
                        : "text-white text-center"
                    }
                  >
                    {error}
                  </Text>
                  <TouchableOpacity
                    className={`mt-3 ${
                      theme === "light" ? "bg-indigo-100" : "bg-white/10"
                    } px-4 py-2 rounded-full`}
                    onPress={onRefresh}
                  >
                    <Text
                      className={
                        theme === "light" ? "text-indigo-700" : "text-white"
                      }
                    >
                      Try Again
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {recommendations.recentlyPlayed.length > 0 && (
                <Animated.View entering={FadeInLeft.duration(600).delay(300)}>
                  <RecommendationGrid
                    recommendations={recommendations.recentlyPlayed}
                    title="Recently Played"
                    showMore={true}
                  />
                </Animated.View>
              )}

              {recommendations.songs.length > 0 && (
                <Animated.View entering={FadeInRight.duration(600).delay(400)}>
                  <RecommendationGrid
                    recommendations={recommendations.songs}
                    title="Mostly you listen to"
                    showMore={true}
                  />
                </Animated.View>
              )}

              {trendingSongs.length > 0 && (
                <Animated.View entering={FadeInLeft.duration(600).delay(500)}>
                  <TrendingSongs songs={trendingSongs} title="Trending Now" />
                </Animated.View>
              )}

              {homePageData?.playlists && homePageData.playlists.length > 0 && (
                <Animated.View entering={FadeInRight.duration(600).delay(600)}>
                  <PlaylistsGrid
                    playlists={homePageData.playlists}
                    title="Popular Playlists"
                  />
                </Animated.View>
              )}

              {homePageData?.charts && homePageData.charts.length > 0 && (
                <Animated.View entering={FadeInLeft.duration(600).delay(700)}>
                  <PlaylistsGrid
                    playlists={homePageData.charts}
                    title="Top Charts"
                  />
                </Animated.View>
              )}

              {homePageData?.albums && homePageData.albums.length > 0 && (
                <Animated.View entering={FadeInRight.duration(600).delay(800)}>
                  <AlbumsGrid albums={homePageData.albums} title="New Albums" />
                </Animated.View>
              )}

              {homePageData?.artists && homePageData.artists.length > 0 && (
                <Animated.View entering={FadeInLeft.duration(600).delay(900)}>
                  <ArtistGrid
                    artists={homePageData.artists}
                    title="Artists You'll Love"
                  />
                </Animated.View>
              )}
            </Animated.View>
          </Animated.ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

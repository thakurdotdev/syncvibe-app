import {
  AlbumsGrid,
  ArtistGrid,
  PlaylistsGrid,
  RecommendationGrid,
  TrendingSongs,
} from '@/components/music/MusicLists';
import { SONG_URL } from '@/constants';
import { useTheme } from '@/context/ThemeContext';
import { useUser } from '@/context/UserContext';
import { useHomePageMusic, useRecentMusic } from '@/queries/useMusic';
import { Song } from '@/types/song';
import useApi from '@/utils/hooks/useApi';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { LoaderIcon } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshControl, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

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

export default function HomeScreen() {
  const { selectedLanguages, user } = useUser();
  const { colors, theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const scrollViewRef = useRef(null);

  // Animation values
  const scrollY = useSharedValue(0);
  const headerHeight = 360;
  const searchBarTranslateY = useSharedValue(0);
  const contentOpacity = useSharedValue(1);
  const headerScale = useSharedValue(1);

  const { data: homePageData, isLoading: loading, error } = useHomePageMusic();
  const { data: recommendations, refetch } = useRecentMusic();

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
        Extrapolation.CLAMP
      );
      headerScale.value = interpolate(
        event.contentOffset.y,
        [0, headerHeight],
        [1, 0.95],
        Extrapolation.CLAMP
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
        Extrapolation.CLAMP
      ),
      transform: [
        {
          scale: headerScale.value,
        },
        {
          translateY: interpolate(scrollY.value, [0, headerHeight], [0, -30], Extrapolation.CLAMP),
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
          scale: interpolate(scrollY.value, [-30, 0, 100], [1.05, 1, 0.98], Extrapolation.CLAMP),
        },
      ],
      opacity: interpolate(scrollY.value, [-50, 0, 200], [1, 1, 0.9], Extrapolation.CLAMP),
    };
  });

  const onRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    if (user?.userid) {
      refetch();
    }
  }, [user?.userid]);

  const trendingSongs = useMemo(() => {
    return homePageData?.trending?.data?.filter((item) => item?.type === 'song') || [];
  }, [homePageData?.trending]);

  // Define header gradient colors based on theme
  const headerGradientColors = useMemo(() => {
    return theme === 'light'
      ? (['#F0F9FF', '#E0F2FE', '#BAE6FD'] as const) // Light blue gradient for light mode
      : (['#43354A', '#1B2935', '#121212'] as const); // Original dark gradient
  }, [theme]);

  const blurIntensity = useMemo(() => {
    return theme === 'light' ? 20 : 25;
  }, [theme]);

  const blurTint = useMemo(() => {
    return theme === 'light' ? 'light' : 'dark';
  }, [theme]);

  return (
    <View
      className='flex-1'
      style={{
        backgroundColor: colors.background,
      }}
    >
      <StatusBar
        barStyle={theme === 'light' ? 'dark-content' : 'light-content'}
        backgroundColor='transparent'
        translucent
      />

      <SafeAreaView className='flex-1'>
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: headerHeight,
              zIndex: 0,
              borderBottomLeftRadius: 30,
              borderBottomRightRadius: 30,
              overflow: 'hidden',
            },
            headerOpacity,
          ]}
        >
          <LinearGradient
            colors={headerGradientColors}
            start={{ x: 0.1, y: 0.1 }}
            end={{ x: 0.8, y: 0.85 }}
            style={{
              height: '100%',
              width: '100%',
            }}
          />
          <BlurView
            intensity={blurIntensity}
            tint={blurTint}
            style={{ position: 'absolute', width: '100%', height: '100%' }}
          />
        </Animated.View>

        <View className='z-10 pb-3'>
          <Animated.View className='px-4 pt-2' style={searchBarStyle}>
            <TouchableOpacity
              className={`flex-row items-center ${
                theme === 'light' ? 'bg-white/90' : 'bg-white/10'
              } rounded-full px-4 h-11`}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/search');
              }}
              accessible={true}
              accessibilityRole='button'
              accessibilityLabel='Search for songs'
            >
              <Ionicons name='search' size={20} color={theme === 'light' ? '#555555' : '#ffffff'} />
              <Text
                className={`flex-1 h-11 px-3 ${
                  theme === 'light' ? 'text-gray-600' : 'text-gray-300'
                } flex justify-center py-3`}
                numberOfLines={1}
              >
                Search for songs...
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {loading ? (
          <View className='flex-1 items-center justify-center'>
            <LoaderIcon className='animate-spin' />
          </View>
        ) : (
          <Animated.ScrollView
            ref={scrollViewRef}
            className='flex-1'
            showsVerticalScrollIndicator={false}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingBottom: 20, paddingTop: 20 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            <View className='px-2 pb-10'>
              {typeof error === 'string' ? (
                <View
                  className={`py-4 my-2 rounded-2xl ${
                    theme === 'light' ? 'bg-gray-100/80' : 'bg-gray-900/80'
                  } items-center`}
                >
                  <Text
                    className={
                      theme === 'light' ? 'text-gray-800 text-center' : 'text-white text-center'
                    }
                  >
                    {error}
                  </Text>
                  <TouchableOpacity
                    className={`mt-3 ${
                      theme === 'light' ? 'bg-indigo-100' : 'bg-white/10'
                    } px-4 py-2 rounded-full`}
                    onPress={onRefresh}
                  >
                    <Text className={theme === 'light' ? 'text-indigo-700' : 'text-white'}>
                      Try Again
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {(recommendations?.recentlyPlayed ?? []).length > 0 && (
                <View>
                  <RecommendationGrid
                    recommendations={recommendations?.recentlyPlayed ?? []}
                    title='Recently Played'
                    showMore={true}
                  />
                </View>
              )}

              {(recommendations?.songs || []).length > 0 && (
                <View>
                  <RecommendationGrid
                    recommendations={recommendations?.songs ?? []}
                    title='Your Favorite'
                    showMore={true}
                  />
                </View>
              )}

              {trendingSongs.length > 0 && (
                <View>
                  <TrendingSongs songs={trendingSongs} title='Trending Now' />
                </View>
              )}

              {homePageData?.playlists && homePageData.playlists.data.length > 0 && (
                <View>
                  <PlaylistsGrid
                    playlists={homePageData.playlists.data}
                    title='Popular Playlists'
                  />
                </View>
              )}

              {homePageData?.charts && homePageData.charts.data.length > 0 && (
                <View>
                  <PlaylistsGrid playlists={homePageData.charts.data} title='Top Charts' />
                </View>
              )}

              {homePageData?.albums && homePageData.albums.data.length > 0 && (
                <View>
                  <AlbumsGrid albums={homePageData.albums.data} title='New Albums' />
                </View>
              )}

              {homePageData?.artist_recos && homePageData.artist_recos.data.length > 0 && (
                <View>
                  <ArtistGrid
                    artists={homePageData.artist_recos.data}
                    title="Artists You'll Love"
                  />
                </View>
              )}
            </View>
          </Animated.ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

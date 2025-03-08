import {
  AlbumsGrid,
  ArtistGrid,
  PlaylistsGrid,
  RecommendationGrid,
  TrendingSongs,
} from "@/components/music/MusicLists";
import { API_URL, SONG_URL } from "@/constants";
import axios from "axios";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";

interface trending {
  id: string;
  name: string;
  image: string;
  list_count: number;
}

interface HomePageData {
  trending: trending[];
  playlists: trending[];
  albums: trending[];
  charts: trending[];
  artists: trending[];
}

export default function HomeScreen() {
  const [homePageData, setHomePageData] = useState<HomePageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<String>("");
  const [recommendations, setRecommendations] = useState([]);
  const [reccLoading, setReccLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setError("");
      const response = await axios.get(
        `${SONG_URL}/modules?lang=hindi&mini=true`,
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
  }, []);

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
  }, [fetchData]);

  useEffect(() => {
    getRecommendations();
  }, [getRecommendations]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <ActivityIndicator size="large" color="white" />
        <Text className="text-white mt-4">Loading Music...</Text>
      </View>
    );
  }

  return (
    <View className=" bg-black">
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ffffff"
            colors={["#1DB954"]}
            progressBackgroundColor="#000000"
          />
        }
      >
        <View className="p-4">
          {error ? (
            <View className="py-8 items-center">
              <Text className="text-white text-center">{error}</Text>
            </View>
          ) : null}

          <RecommendationGrid
            recommendations={recommendations}
            title="Mostly You Like"
          />
          <TrendingSongs
            songs={homePageData?.trending?.filter(
              (item) => item?.type === "song",
            )}
            title="Trending Songs"
          />

          <PlaylistsGrid
            playlists={homePageData?.playlists}
            title="Top Playlists"
          />

          <PlaylistsGrid playlists={homePageData?.charts} title="Top Charts" />

          <AlbumsGrid albums={homePageData?.albums} title="Top Albums" />

          <ArtistGrid artists={homePageData?.artists} title="Top Artists" />

          <View className="h-20" />
        </View>
      </ScrollView>
    </View>
  );
}

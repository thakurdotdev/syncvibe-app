import { SONG_URL } from "@/constants";
import { usePlayer, usePlayerState, usePlaylist } from "@/context/MusicContext";
import { Song } from "@/types/song";
import { Ionicons } from "@expo/vector-icons";
import AntDesign from "@expo/vector-icons/AntDesign";
import axios from "axios";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  Image,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SongContols } from "./MusicCards";
import { MusicQueue, SimilarSongs } from "./MusicLists";

const { height } = Dimensions.get("window");

export default function Player() {
  const { handlePlayPauseSong, addToPlaylist } = usePlayer();
  const { currentSong, isPlaying } = usePlayerState();
  const { playlist } = usePlaylist();
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState("player");
  const insets = useSafeAreaInsets();
  const [isMinimized, setIsMinimized] = useState(false);

  const [recommendations, setRecommendations] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);

  const getRecommendations = useCallback(async () => {
    if (!currentSong?.id) return;

    try {
      setLoading(true);
      const response = await axios.get(
        `${SONG_URL}/song/recommend?id=${currentSong.id}`,
      );
      if (response.data?.data) {
        setRecommendations(response.data.data);
        if (playlist.length < 2 && response.data.data.length > 0) {
          addToPlaylist(response.data.data[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching recommendations:", error);
    } finally {
      setLoading(false);
    }
  }, [currentSong?.id]);

  useEffect(() => {
    getRecommendations();
  }, [getRecommendations]);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const artistName = useMemo(
    () =>
      currentSong?.artist_map?.artists
        ?.slice(0, 3)
        ?.map((artist) => artist.name)
        .join(", ") || "",
    [currentSong],
  );

  const renderMiniPlayer = () => (
    <Animated.View className="absolute w-full px-4 bottom-16 left-0">
      <TouchableOpacity
        className="flex-row items-center px-3 py-3 bg-black/90 rounded-2xl border border-white/10 shadow-lg"
        style={{ shadowColor: "#ffffff" }}
        onPress={toggleExpanded}
        activeOpacity={0.95}
      >
        <Image
          source={{ uri: currentSong?.image[1]?.link }}
          className="w-12 h-12 rounded-xl"
        />
        <View className="flex-1 px-3">
          <Text className="text-white font-semibold" numberOfLines={1}>
            {currentSong?.name}
          </Text>
          <Text className="text-gray-400 text-sm" numberOfLines={1}>
            {artistName}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setIsMinimized(true)}
          className="p-2 rounded-full mr-2"
        >
          <AntDesign name="shrink" size={18} color="white" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handlePlayPauseSong}
          className="bg-white/15 p-2.5 rounded-full"
        >
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={22}
            color="white"
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderCircleIcon = () => (
    <TouchableOpacity
      onPress={() => setIsMinimized(false)}
      className="bg-black/90 p-1 rounded-full absolute shadow-lg bottom-20 right-4"
    >
      <View className="relative">
        <Image
          source={{ uri: currentSong?.image[1]?.link }}
          className="w-12 h-12 rounded-full"
        />
        {isPlaying && (
          <View className="absolute bottom-0 right-0 bg-green-500 w-4 h-4 rounded-full border-2 border-black" />
        )}
      </View>
    </TouchableOpacity>
  );

  // Player tab content
  const renderPlayerTab = () => (
    <View className="items-center">
      <Image
        source={{ uri: currentSong?.image[2]?.link }}
        className="w-full aspect-square rounded-2xl"
        style={{ maxHeight: height * 0.45 }}
        resizeMode="cover"
      />
      <View className="w-full mt-8 mb-4">
        <Text className="text-white text-2xl font-bold text-center">
          {currentSong?.name}
        </Text>
        <Text className="text-gray-400 text-lg text-center mt-2">
          {artistName}
        </Text>
      </View>
      <SongContols />
    </View>
  );

  const renderExpandedPlayer = () => (
    <View className="absolute inset-0 bg-black">
      <StatusBar barStyle="light-content" />
      <View style={{ paddingTop: insets.top }} className="flex-1">
        {/* Header */}
        <View className="flex-row justify-between items-center py-4 px-4">
          <TouchableOpacity
            onPress={toggleExpanded}
            className="bg-white/10 p-2 rounded-full"
          >
            <Ionicons name="chevron-down" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-base font-medium">Now Playing</Text>
          <TouchableOpacity
            onPress={() => {}}
            className="bg-white/10 p-2 rounded-full"
          >
            <Ionicons name="ellipsis-horizontal" size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View className="flex-row justify-between bg-white/5 rounded-xl p-1 mx-4 mb-4">
          {["player", "queue", "recommendations"].map((tab) => (
            <TouchableOpacity
              key={tab}
              className={`flex-1 ${
                activeTab === tab ? "bg-white/15" : ""
              } rounded-lg py-2.5`}
              onPress={() => setActiveTab(tab)}
            >
              <Text className="text-white text-center font-medium">
                {tab === "player"
                  ? "Now Playing"
                  : tab === "queue"
                  ? "Queue"
                  : "For You"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content area */}
        <View className="flex-1 px-4">
          {activeTab === "player" && renderPlayerTab()}
          {activeTab === "queue" && <MusicQueue playlist={playlist} />}
          {activeTab === "recommendations" && (
            <SimilarSongs recommendations={recommendations} loading={loading} />
          )}
        </View>
      </View>
    </View>
  );

  if (!currentSong) return null;

  return (
    <>
      {isExpanded
        ? renderExpandedPlayer()
        : isMinimized
        ? renderCircleIcon()
        : renderMiniPlayer()}
    </>
  );
}

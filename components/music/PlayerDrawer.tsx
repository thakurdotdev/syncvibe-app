import { usePlayerState } from "@/context/MusicContext";
import {
  Feather,
  FontAwesome,
  Ionicons,
  MaterialIcons,
} from "@expo/vector-icons";
import React, { memo, useCallback, useMemo, useState } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { Drawer } from "../ui/drawer";
import { router } from "expo-router";
import { Song } from "@/types/song";
import AddToPlaylist from "./AddToPlaylist";

enum paths {
  artist = "/artist",
  albums = "/albums",
}

interface PlayerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  closePlayer?: () => void;
  currentSong?: Song;
}

const PlayerDrawer = ({
  isOpen,
  onClose,
  closePlayer,
  currentSong,
}: PlayerDrawerProps) => {
  const [playlistModal, setPlaylistModal] = useState(false);
  const artistName = useMemo(
    () =>
      currentSong?.artist_map?.primary_artists?.slice(0, 2)?.map((artist) => {
        return {
          name: artist.name,
          id: artist.id,
        };
      }),
    [currentSong],
  );

  const handlePress = useCallback((id: string, path: paths) => {
    closePlayer && closePlayer();
    onClose();
    router.push({
      pathname: path,
      params: { id: id },
    });
  }, []);

  const albumArt = useMemo(() => {
    return currentSong?.image?.[1]?.link;
  }, [currentSong]);

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      drawerHeight={500}
      drawerStyle={{ backgroundColor: "#121212" }}
    >
      <View className="flex-1 p-4">
        {/* Header - Current Song Info */}
        <View className="flex-row items-center mb-8 pt-2">
          <Image source={{ uri: albumArt }} className="w-14 h-14 rounded-md" />
          <View className="ml-4 flex-1">
            <Text className="text-white text-lg font-bold">
              {currentSong?.name}
            </Text>
            {artistName?.[0].id && (
              <Text className="text-gray-400 truncate">
                {artistName?.[0].name}
              </Text>
            )}
          </View>
          <TouchableOpacity onPress={onClose} className="p-2">
            <Feather name="x" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View className="h-[1px] bg-gray-800 mb-6" />

        {/* Options */}
        <View className="flex gap-4">
          {/* Add to Playlist */}
          <TouchableOpacity
            className="flex-row items-center"
            onPress={() => setPlaylistModal(true)}
          >
            <View className="w-10 items-center">
              <MaterialIcons name="playlist-add" size={26} color="#FFFFFF" />
            </View>
            <Text className="text-white text-base ml-4">Add to Playlist</Text>
          </TouchableOpacity>

          {/* Add to Queue */}
          <TouchableOpacity className="flex-row items-center">
            <View className="w-10 items-center">
              <MaterialIcons name="queue-music" size={26} color="#FFFFFF" />
            </View>
            <Text className="text-white text-base ml-4">Add to Queue</Text>
          </TouchableOpacity>

          {/* Add to Favorites */}
          <TouchableOpacity className="flex-row items-center">
            <View className="w-10 items-center">
              <MaterialIcons name="favorite-border" size={26} color="#FFFFFF" />
            </View>
            <Text className="text-white text-base ml-4">Add to Favorites</Text>
          </TouchableOpacity>

          {/* View Artist */}
          {artistName?.[0].id && (
            <TouchableOpacity
              onPress={() => handlePress(artistName?.[0].id, paths.artist)}
              className="flex-row items-center"
            >
              <View className="w-10 items-center">
                <Ionicons name="person-outline" size={24} color="#FFFFFF" />
              </View>
              <Text className="text-white text-base ml-4">View Artist</Text>
            </TouchableOpacity>
          )}

          {/* View Album */}
          {currentSong?.album_id && (
            <TouchableOpacity
              className="flex-row items-center"
              onPress={() => handlePress(currentSong?.album_id, paths.albums)}
            >
              <View className="w-10 items-center">
                <Ionicons name="disc-outline" size={24} color="#FFFFFF" />
              </View>
              <Text className="text-white text-base ml-4">View Album</Text>
            </TouchableOpacity>
          )}

          {/* Share */}
          <TouchableOpacity className="flex-row items-center">
            <View className="w-10 items-center">
              <Feather name="share-2" size={24} color="#FFFFFF" />
            </View>
            <Text className="text-white text-base ml-4">Share</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View className="h-[1px] bg-gray-800 my-2" />

          {/* Sleep Timer */}
          <TouchableOpacity className="flex-row items-center">
            <View className="w-10 items-center">
              <FontAwesome name="clock-o" size={24} color="#FFFFFF" />
            </View>
            <Text className="text-white text-base ml-4">Sleep Timer</Text>
          </TouchableOpacity>
        </View>
      </View>
      {playlistModal && (
        <AddToPlaylist
          dialogOpen={playlistModal}
          setDialogOpen={() => setPlaylistModal(false)}
          song={currentSong}
        />
      )}
    </Drawer>
  );
};

export default memo(PlayerDrawer);

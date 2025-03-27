import { usePlayer } from "@/context/MusicContext";
import { Song } from "@/types/song";
import {
  Feather,
  FontAwesome,
  Ionicons,
  MaterialIcons,
} from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import SwipeableModal from "../common/SwipeableModal";
import AddToPlaylist from "./AddToPlaylist";
import { toast } from "@/context/ToastContext";

interface PlayerDrawerProps {
  isVisible: boolean;
  onClose: () => void;
  song: Song;
}

const NewPlayerDrawer: React.FC<PlayerDrawerProps> = ({
  isVisible,
  onClose,
  song,
}) => {
  const [playlistModal, setPlaylistModal] = useState(false);
  const { addToQueue } = usePlayer();

  const artistName = song.artist_map?.artists || [
    { name: "Unknown Artist", id: null },
  ];
  const albumArt = song.image?.[2]?.link || song.image?.[1]?.link;

  const handlePress = (id: string, path: string) => {
    onClose();
    router.push({
      pathname: path as any,
      params: { id },
    });
  };

  const handleAddToQueue = () => {
    addToQueue(song);
    toast("Added to Queue");
    onClose();
  };

  const paths = {
    artist: "/artist",
    albums: "/albums",
  };

  return (
    <>
      <SwipeableModal isVisible={isVisible} onClose={onClose}>
        {/* Header - Current Song Info */}
        <View style={styles.headerContainer}>
          <Image
            source={{ uri: albumArt }}
            style={styles.albumArt}
            resizeMode="cover"
          />
          <View style={styles.songInfoContainer}>
            <Text style={styles.songTitle} numberOfLines={1}>
              {song.name}
            </Text>
            <Text style={styles.artistName} numberOfLines={1}>
              {artistName?.[0].name}
            </Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Feather name="x" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Options */}
        <View style={styles.optionsContainer}>
          {/* Add to Queue */}
          <TouchableOpacity style={styles.optionRow} onPress={handleAddToQueue}>
            <View style={styles.iconContainer}>
              <MaterialIcons name="queue-music" size={26} color="#FFFFFF" />
            </View>
            <Text style={styles.optionText}>Add to Queue</Text>
          </TouchableOpacity>

          {/* Add to Playlist */}
          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => setPlaylistModal(true)}
          >
            <View style={styles.iconContainer}>
              <MaterialIcons name="playlist-add" size={26} color="#FFFFFF" />
            </View>
            <Text style={styles.optionText}>Add to Playlist</Text>
          </TouchableOpacity>

          {/* Add to Favorites */}
          <TouchableOpacity style={styles.optionRow}>
            <View style={styles.iconContainer}>
              <MaterialIcons name="favorite-border" size={26} color="#FFFFFF" />
            </View>
            <Text style={styles.optionText}>Add to Favorites</Text>
          </TouchableOpacity>

          {/* View Artist */}
          {artistName?.[0].id && (
            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => handlePress(artistName?.[0].id, paths.artist)}
            >
              <View style={styles.iconContainer}>
                <Ionicons name="person-outline" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.optionText}>View Artist</Text>
            </TouchableOpacity>
          )}

          {/* View Album */}
          {song?.album_id && (
            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => handlePress(song.album_id, paths.albums)}
            >
              <View style={styles.iconContainer}>
                <Ionicons name="disc-outline" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.optionText}>View Album</Text>
            </TouchableOpacity>
          )}

          {/* Share */}
          <TouchableOpacity style={styles.optionRow}>
            <View style={styles.iconContainer}>
              <Feather name="share-2" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.optionText}>Share</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Sleep Timer */}
          <TouchableOpacity style={styles.optionRow}>
            <View style={styles.iconContainer}>
              <FontAwesome name="clock-o" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.optionText}>Sleep Timer</Text>
          </TouchableOpacity>
        </View>
      </SwipeableModal>
      {playlistModal && (
        <AddToPlaylist
          dialogOpen={playlistModal}
          setDialogOpen={() => setPlaylistModal(false)}
          song={song}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  albumArt: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  songInfoContainer: {
    flex: 1,
    marginLeft: 16,
  },
  songTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  artistName: {
    color: "#A1A1AA",
    fontSize: 14,
  },
  closeButton: {
    padding: 8,
  },
  divider: {
    height: 1,
    backgroundColor: "#27272A",
    marginVertical: 8,
    marginHorizontal: 16,
  },
  optionsContainer: {
    paddingHorizontal: 8,
    paddingBottom: 24,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  iconContainer: {
    width: 40,
    alignItems: "center",
  },
  optionText: {
    color: "#FFFFFF",
    fontSize: 16,
    marginLeft: 12,
  },
});

export default NewPlayerDrawer;

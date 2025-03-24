import { usePlaylist } from "@/context/MusicContext";
import { Song } from "@/types/song";
import useApi from "@/utils/hooks/useApi";
import { MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface Playlist {
  id: string;
  name: string;
  image?: any[];
  songCount: number;
}

interface AddToPlaylistProps {
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  song: Song | undefined;
}

const AddToPlaylist: React.FC<AddToPlaylistProps> = ({
  dialogOpen,
  setDialogOpen,
  song,
}) => {
  const insets = useSafeAreaInsets();
  const { userPlaylist, getPlaylists } = usePlaylist();
  const api = useApi();

  const [newPlaylistDialog, setNewPlaylistDialog] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [loading, setLoading] = useState(false);
  const [addingSong, setAddingSong] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(
    null,
  );
  const [addingSuccess, setAddingSuccess] = useState(false);

  // Filtered playlists based on search
  const filteredPlaylists = userPlaylist.filter((playlist) =>
    playlist.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Create new playlist
  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;

    setLoading(true);
    try {
      const response = await api.post(
        `/api/playlist/create`,
        { name: newPlaylistName },
        { withCredentials: true },
      );

      if (response.status === 200) {
        // Assuming you have a method to fetch playlists
        await getPlaylists();
        setNewPlaylistDialog(false);
        setNewPlaylistName("");
      }
    } catch (error) {
      // Handle error (you might want to use a toast library for React Native)
      console.error("Failed to create playlist", error);
    } finally {
      setLoading(false);
    }
  };

  // Add song to playlist
  const handleAddToPlaylist = async (playlistId: string) => {
    if (!playlistId || !song) return;

    setSelectedPlaylistId(playlistId);
    setAddingSong(true);

    try {
      const response = await api.post(
        `/api/playlist/add-song`,
        {
          playlistId,
          songId: song.id,
          songData: JSON.stringify(song),
        },
        { withCredentials: true },
      );

      if (response.status === 201) {
        setAddingSuccess(true);
        setTimeout(() => {
          setDialogOpen(false);
          setAddingSuccess(false);
          setSelectedPlaylistId(null);
        }, 1500);
        await getPlaylists();
      }
    } catch (error) {
      console.error("Failed to add song to playlist", error);
      setSelectedPlaylistId(null);
    } finally {
      setAddingSong(false);
    }
  };

  const getImageUrl = (images: any[]) => {
    if (images.length > 0) {
      return images[1].link;
    }
    return "";
  };

  // Render playlist item
  const renderPlaylistItem = ({ item }: { item: Playlist }) => (
    <TouchableOpacity
      onPress={() => !addingSong && handleAddToPlaylist(item.id)}
      style={[
        styles.playlistItem,
        selectedPlaylistId === item.id && styles.selectedPlaylistItem,
        addingSong &&
          selectedPlaylistId !== item.id &&
          styles.disabledPlaylistItem,
      ]}
    >
      <Image
        source={
          item.image
            ? { uri: getImageUrl(item.image) }
            : require("../../assets/icon.jpg")
        }
        style={styles.playlistImage}
      />
      <View style={styles.playlistTextContainer}>
        <Text style={styles.playlistName}>{item.name}</Text>
        <Text style={styles.playlistSongCount}>
          {item.songCount || 0} songs
        </Text>
      </View>
      {selectedPlaylistId === item.id && (
        <View style={styles.addingIndicator}>
          {addingSuccess ? (
            <MaterialIcons name="check" size={24} color="white" />
          ) : (
            <ActivityIndicator size="small" color="white" />
          )}
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <Modal
      transparent={true}
      visible={dialogOpen}
      animationType="slide"
      onRequestClose={() => setDialogOpen(false)}
    >
      <BlurView
        intensity={50}
        style={[styles.modalOverlay, { paddingTop: insets.top }]}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <MaterialIcons name="playlist-add" size={24} color="white" />
            <Text style={styles.headerTitle}>Add to Playlist</Text>
          </View>

          {/* Search Input */}
          <View style={styles.searchContainer}>
            <MaterialIcons
              name="search"
              size={20}
              color="#888"
              style={styles.searchIcon}
            />
            <TextInput
              placeholder="Search playlists..."
              placeholderTextColor="#888"
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <MaterialIcons name="close" size={20} color="#888" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Create New Playlist Button */}
          <TouchableOpacity
            style={styles.createPlaylistButton}
            onPress={() => setNewPlaylistDialog(true)}
            disabled={loading}
          >
            <MaterialIcons name="add" size={24} color="white" />
            <Text style={styles.createPlaylistButtonText}>
              Create New Playlist
            </Text>
          </TouchableOpacity>

          {/* Playlists List */}
          {loading ? (
            <ActivityIndicator
              size="large"
              color="#fff"
              style={styles.loadingIndicator}
            />
          ) : (
            <FlatList
              data={filteredPlaylists}
              renderItem={renderPlaylistItem}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <MaterialIcons name="music-note" size={48} color="#888" />
                  <Text style={styles.emptyStateText}>
                    {searchQuery
                      ? "No matching playlists found"
                      : "No playlists found. Create one to get started!"}
                  </Text>
                </View>
              }
              contentContainerStyle={styles.playlistList}
            />
          )}
        </View>

        {/* New Playlist Modal */}
        <Modal
          transparent={true}
          visible={newPlaylistDialog}
          animationType="slide"
          onRequestClose={() => setNewPlaylistDialog(false)}
        >
          <BlurView intensity={50} style={styles.modalOverlay}>
            <View style={styles.newPlaylistContainer}>
              <Text style={styles.newPlaylistTitle}>Create New Playlist</Text>
              <TextInput
                placeholder="Enter playlist name"
                placeholderTextColor="#888"
                value={newPlaylistName}
                onChangeText={setNewPlaylistName}
                style={styles.newPlaylistInput}
              />
              <View style={styles.newPlaylistButtonContainer}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setNewPlaylistDialog(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.createButton,
                    (!newPlaylistName.trim() || loading) &&
                      styles.disabledButton,
                  ]}
                  onPress={handleCreatePlaylist}
                  disabled={!newPlaylistName.trim() || loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.createButtonText}>Create</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>
        </Modal>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#1E1E1E",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
    marginLeft: 8,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2C2C2C",
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: "white",
    height: 48,
  },
  createPlaylistButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3A3A3A",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  createPlaylistButtonText: {
    color: "white",
    fontWeight: "bold",
    marginLeft: 8,
  },
  playlistList: {
    paddingBottom: 16,
  },
  playlistItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2C2C2C",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  selectedPlaylistItem: {
    backgroundColor: "#3A3A3A",
  },
  disabledPlaylistItem: {
    opacity: 0.5,
  },
  playlistImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
  },
  playlistTextContainer: {
    flex: 1,
  },
  playlistName: {
    color: "white",
    fontWeight: "bold",
  },
  playlistSongCount: {
    color: "#888",
    fontSize: 12,
  },
  addingIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "green",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingIndicator: {
    marginVertical: 20,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 50,
  },
  emptyStateText: {
    color: "#888",
    marginTop: 12,
    textAlign: "center",
  },
  newPlaylistContainer: {
    backgroundColor: "#1E1E1E",
    borderRadius: 20,
    padding: 20,
    margin: 20,
  },
  newPlaylistTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  newPlaylistInput: {
    backgroundColor: "#2C2C2C",
    color: "white",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  newPlaylistButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#3A3A3A",
    borderRadius: 10,
    padding: 12,
    marginRight: 8,
  },
  cancelButtonText: {
    color: "white",
    textAlign: "center",
  },
  createButton: {
    flex: 1,
    backgroundColor: "#4A4A4A",
    borderRadius: 10,
    padding: 12,
    marginLeft: 8,
  },
  createButtonText: {
    color: "white",
    textAlign: "center",
    fontWeight: "bold",
  },
  disabledButton: {
    opacity: 0.5,
  },
});

export default AddToPlaylist;

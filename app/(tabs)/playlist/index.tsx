import LoginScreen from "@/app/login";
import SwipeableModal from "@/components/common/SwipeableModal";
import LoginModal from "@/components/LoginModal";
import { CardContainer, CardImage } from "@/components/music/MusicCards";
import { usePlaylist } from "@/context/MusicContext";
import { toast } from "@/context/ToastContext";
import { useUser } from "@/context/UserContext";
import { ensureHttpsForPlaylistUrls } from "@/utils/getHttpsUrls";
import useApi from "@/utils/hooks/useApi";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import {
  AlertCircle,
  Edit3,
  Music4,
  Plus,
  Trash2,
  X,
} from "lucide-react-native";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const PRIMARY_COLOR = "#1DB954";

const LoadingState = () => (
  <SafeAreaView className="flex-1 bg-black justify-center items-center">
    <ActivityIndicator size="large" color={PRIMARY_COLOR} />
    <Text className="text-white mt-4 text-base font-medium">
      Loading playlists...
    </Text>
  </SafeAreaView>
);

const PlaylistScreen = () => {
  const api = useApi();
  const { user } = useUser();
  const { userPlaylist, getPlaylists } = usePlaylist();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [selectedPlaylist, setSelectedPlaylist] = useState<any>(null);
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Hide keyboard when modals close
  useEffect(() => {
    if (!showUpdateModal && !showDeleteModal) {
      Keyboard.dismiss();
    }
  }, [showUpdateModal, showDeleteModal]);

  const handleSavePlaylist = async () => {
    setLoading(true);
    try {
      if (!formData.name) {
        toast("Please provide a playlist name");
        setLoading(false);
        return;
      }

      if (selectedPlaylist) {
        await api.put(`/api/playlist/update`, {
          id: selectedPlaylist.id,
          name: formData.name,
          description: formData.description,
        });
        toast("Playlist updated successfully!");
      } else {
        await api.post(`/api/playlist/create`, {
          name: formData.name,
          description: formData.description,
        });
        toast("Playlist created successfully!");
      }

      setShowUpdateModal(false);
      getPlaylists();
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || "An error occurred.";
      toast(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlaylist = async () => {
    if (!selectedPlaylist) return;

    setLoading(true);
    try {
      await api.delete(`/api/playlist/delete`, {
        data: { playlistId: selectedPlaylist.id },
      });
      toast("Playlist deleted successfully!");
      setShowDeleteModal(false);
      setShowActionsModal(false);
      getPlaylists();
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || "An error occurred.";
      toast(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleLongPress = (playlist: {
    name: string;
    id: number;
    description: string;
  }) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPlaylist(playlist);
    setFormData({
      name: playlist.name || "",
      description: playlist.description || "",
    });
    setShowActionsModal(true);
  };

  const handleUpdateAction = () => {
    setShowActionsModal(false);
    setTimeout(() => setShowUpdateModal(true), 300);
  };

  const handleDeleteAction = () => {
    setShowActionsModal(false);
    setTimeout(() => setShowDeleteModal(true), 300);
  };

  const playlistPairs = [];
  for (let i = 0; i < userPlaylist.length; i += 2) {
    playlistPairs.push([userPlaylist[i], userPlaylist[i + 1] || null]);
  }

  if (loading && !selectedPlaylist) return <LoadingState />;

  if (!user) {
    return <LoginScreen />;
  }

  const renderRow = ({ item }: { item: any[] }) => (
    <View className="flex-row px-3 mb-4 w-full gap-5">
      <View className="flex-1">
        <PlaylistCard
          playlist={item[0]}
          isUser={true}
          onLongPress={() => handleLongPress(item[0])}
        />
      </View>
      {item[1] && (
        <View className="flex-1">
          <PlaylistCard
            playlist={item[1]}
            isUser={true}
            onLongPress={() => handleLongPress(item[1])}
          />
        </View>
      )}
    </View>
  );

  const EmptyState = () => (
    <View className="flex-1 justify-center items-center p-6">
      <Music4 size={60} color="rgba(255,255,255,0.3)" />
      <Text className="text-white text-xl font-bold mt-4">
        No playlists yet
      </Text>
      <Text className="text-gray-400 text-center mt-2">
        Create your first playlist to start organizing your music
      </Text>
      <TouchableOpacity
        className="mt-6 bg-white px-6 py-3 rounded-full flex-row items-center"
        onPress={() => {
          setSelectedPlaylist(null);
          setFormData({ name: "", description: "" });
          setShowUpdateModal(true);
        }}
      >
        <Plus size={20} color="black" />
        <Text className="text-black font-bold ml-2">Create Playlist</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-black relative p-5">
      <Animated.View
        className="flex-row justify-between items-center"
        style={[{ backgroundColor: "rgba(0,0,0,0.9)" }]}
      >
        <Text className="text-white text-xl font-bold">My Playlists</Text>
        <TouchableOpacity
          className="bg-slate-100 rounded-full py-2 px-3 flex-row items-center gap-2"
          onPress={() => {
            setSelectedPlaylist(null);
            setFormData({ name: "", description: "" });
            setShowUpdateModal(true);
          }}
        >
          <Plus size={20} color="black" />
          <Text>Create</Text>
        </TouchableOpacity>
      </Animated.View>
      <Animated.FlatList
        data={playlistPairs}
        renderItem={renderRow}
        keyExtractor={(item, index) => `row-${index}`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: 20,
          paddingBottom: 20,
          flexGrow: userPlaylist.length === 0 ? 1 : undefined,
        }}
        ListEmptyComponent={EmptyState}
      />

      {/* Actions Modal */}
      <SwipeableModal
        isVisible={showActionsModal}
        onClose={() => setShowActionsModal(false)}
        maxHeight="30%"
        backgroundColor="#1E1E1E"
      >
        <View className="p-6">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-white text-xl font-bold">
              Playlist Options
            </Text>
            <TouchableOpacity
              className="rounded-full p-1"
              onPress={() => setShowActionsModal(false)}
            >
              <X size={22} color="#999" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            className="bg-gray-800 p-4 rounded-xl mb-4 flex-row items-center"
            onPress={handleUpdateAction}
          >
            <Edit3 size={20} color={PRIMARY_COLOR} />
            <Text className="text-white text-lg ml-3 font-medium">
              Edit Playlist
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-red-900/50 p-4 rounded-xl flex-row items-center"
            onPress={handleDeleteAction}
          >
            <Trash2 size={20} color="#ff5252" />
            <Text className="text-red-400 text-lg ml-3 font-medium">
              Delete Playlist
            </Text>
          </TouchableOpacity>
        </View>
      </SwipeableModal>

      {/* Update Modal */}
      <SwipeableModal
        isVisible={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        scrollable={true}
        useScrollView={true}
        backgroundColor="#1E1E1E"
      >
        <View className="p-6">
          <View className="flex-row justify-between items-center mb-6">
            <View className="flex-row items-center">
              <Text className="text-white text-xl font-bold ml-2">
                {selectedPlaylist ? "Edit Playlist" : "Create Playlist"}
              </Text>
            </View>
            <TouchableOpacity
              className="rounded-full p-1"
              onPress={() => setShowUpdateModal(false)}
            >
              <X size={22} color="#999" />
            </TouchableOpacity>
          </View>

          <View className="mb-4">
            <Text className="text-white text-base mb-2 font-medium">Name</Text>
            <TextInput
              className="bg-gray-800 text-white p-4 rounded-xl"
              value={formData.name}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, name: text }))
              }
              placeholder="Enter playlist name"
              placeholderTextColor="#666"
              selectionColor={PRIMARY_COLOR}
            />
          </View>

          <View className="mb-8">
            <Text className="text-white text-base mb-2 font-medium">
              Description
            </Text>
            <TextInput
              className="bg-gray-800 text-white p-4 rounded-xl"
              value={formData.description}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, description: text }))
              }
              placeholder="Enter description"
              placeholderTextColor="#666"
              multiline={true}
              numberOfLines={3}
              style={{ height: 100, textAlignVertical: "top" }}
              selectionColor={PRIMARY_COLOR}
            />
          </View>

          <TouchableOpacity
            className={`p-4 rounded-xl items-center flex-row justify-center ${
              loading ? "bg-gray-700" : "bg-white"
            }`}
            onPress={handleSavePlaylist}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Text className="text-black text-base font-bold ml-2">
                  {selectedPlaylist ? "Save Changes" : "Create Playlist"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </SwipeableModal>

      {/* Delete Confirmation Modal */}
      <SwipeableModal
        isVisible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        maxHeight="35%"
        backgroundColor="#1E1E1E"
      >
        <View className="p-6">
          <View className="items-center mb-4">
            <View className="bg-red-900/30 p-3 rounded-full mb-3">
              <AlertCircle size={28} color="#ff5252" />
            </View>
            <Text className="text-white text-xl font-bold">
              Delete Playlist
            </Text>
          </View>

          <Text className="text-gray-300 text-base mb-8 text-center">
            Are you sure you want to delete "{selectedPlaylist?.name}"? This
            action cannot be undone.
          </Text>

          <View className="flex-row gap-4">
            <TouchableOpacity
              className="bg-gray-800 p-4 rounded-xl flex-1 items-center"
              onPress={() => setShowDeleteModal(false)}
            >
              <Text className="text-white text-base font-medium">Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`p-4 rounded-xl flex-1 items-center flex-row justify-center ${
                loading ? "bg-gray-700" : "bg-red-700"
              }`}
              onPress={handleDeletePlaylist}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Trash2 size={18} color="white" />
                  <Text className="text-white text-base font-bold ml-2">
                    Delete
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SwipeableModal>

      {!user && <LoginModal />}
    </SafeAreaView>
  );
};

export const PlaylistCard = memo(({ playlist, isUser, onLongPress }: any) => {
  const handlePress = useCallback(() => {
    router.push({
      pathname: "/user-playlist",
      params: { id: playlist.id },
    });
  }, [playlist?.id]);

  if (!playlist?.name) return null;

  const securedPlaylist = useMemo(
    () => ensureHttpsForPlaylistUrls(playlist),
    [playlist],
  );

  const subtitle = securedPlaylist.description || "Playlist";
  const imageUrl = securedPlaylist?.image
    ? securedPlaylist.image[2]?.link
    : "https://res.cloudinary.com/dr7lkelwl/image/upload/c_thumb,h_500,w_500/f_auto/v1736541047/posts/sjzxfa31iet8ftznv2mo.webp";

  return (
    <CardContainer
      onPress={handlePress}
      onLongPress={isUser ? () => onLongPress(playlist) : undefined}
      key={securedPlaylist.id}
      width={"100%"}
    >
      <View style={{ padding: 12, gap: 10 }} className="relative">
        <CardImage uri={imageUrl} alt={`Playlist: ${securedPlaylist.name}`} />

        <View style={{ gap: 4, paddingHorizontal: 4 }}>
          <Text
            style={{ color: "white", fontWeight: "600", fontSize: 14 }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {securedPlaylist.name}
          </Text>
          <Text
            style={{ color: "rgb(156, 163, 175)", fontSize: 12 }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {subtitle}
          </Text>
        </View>
      </View>
    </CardContainer>
  );
});

export default PlaylistScreen;

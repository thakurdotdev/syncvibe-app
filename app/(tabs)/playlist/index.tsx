import LoginScreen from "@/app/login";
import SwipeableModal from "@/components/common/SwipeableModal";
import LoginModal from "@/components/LoginModal";
import { CardContainer, CardImage } from "@/components/music/MusicCards";
import Button from "@/components/ui/button";
import { usePlaylist } from "@/context/MusicContext";
import { toast } from "@/context/ToastContext";
import { useTheme } from "@/context/ThemeContext";
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

const LoadingState = () => {
  const { colors } = useTheme();

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <ActivityIndicator size="large" color={colors.primary} />
      <Text
        style={{
          color: colors.text,
          marginTop: 16,
          fontSize: 16,
          fontWeight: "500",
        }}
      >
        Loading playlists...
      </Text>
    </SafeAreaView>
  );
};

const PlaylistScreen = () => {
  const api = useApi();
  const { colors, theme } = useTheme();
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
    <View
      style={{
        flexDirection: "row",
        paddingHorizontal: 12,
        marginBottom: 16,
        width: "100%",
        gap: 20,
      }}
    >
      <View style={{ flex: 1 }}>
        <PlaylistCard
          playlist={item[0]}
          isUser={true}
          onLongPress={() => handleLongPress(item[0])}
        />
      </View>
      {item[1] && (
        <View style={{ flex: 1 }}>
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
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
      }}
    >
      <Music4 size={60} color={colors.mutedForeground} />
      <Text
        style={{
          color: colors.text,
          fontSize: 20,
          fontWeight: "bold",
          marginTop: 16,
        }}
      >
        No playlists yet
      </Text>
      <Text
        style={{
          color: colors.mutedForeground,
          textAlign: "center",
          marginTop: 8,
        }}
      >
        Create your first playlist to start organizing your music
      </Text>
      <Button
        variant="default"
        size="lg"
        icon={<Plus size={20} color={colors.primaryForeground} />}
        iconPosition="left"
        title="Create Playlist"
        style={{ marginTop: 24 }}
        onPress={() => {
          setSelectedPlaylist(null);
          setFormData({ name: "", description: "" });
          setShowUpdateModal(true);
        }}
      />
    </View>
  );

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: colors.background,
        position: "relative",
        padding: 20,
      }}
    >
      <Animated.View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: colors.background,
        }}
      >
        <Text
          style={{
            color: colors.text,
            fontSize: 20,
            fontWeight: "bold",
          }}
        >
          My Playlists
        </Text>
        <Button
          variant="outline"
          size="sm"
          icon={<Plus size={18} color={colors.primary} />}
          iconPosition="left"
          title="Create"
          onPress={() => {
            setSelectedPlaylist(null);
            setFormData({ name: "", description: "" });
            setShowUpdateModal(true);
          }}
        />
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
        backgroundColor={colors.card}
      >
        <View style={{ padding: 24 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 24,
            }}
          >
            <Text
              style={{
                color: colors.text,
                fontSize: 20,
                fontWeight: "bold",
              }}
            >
              Playlist Options
            </Text>
            <TouchableOpacity
              style={{
                borderRadius: 999,
                padding: 4,
              }}
              onPress={() => setShowActionsModal(false)}
            >
              <X size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <Button
            variant="secondary"
            title="Edit Playlist"
            icon={<Edit3 size={20} color={colors.primary} />}
            iconPosition="left"
            style={{ marginBottom: 16 }}
            onPress={handleUpdateAction}
          />

          <Button
            variant="destructive"
            title="Delete Playlist"
            icon={<Trash2 size={20} color={colors.destructiveForeground} />}
            iconPosition="left"
            onPress={handleDeleteAction}
          />
        </View>
      </SwipeableModal>

      {/* Update Modal */}
      <SwipeableModal
        isVisible={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        scrollable={true}
        useScrollView={true}
        backgroundColor={colors.card}
      >
        <View style={{ padding: 24 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 24,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text
                style={{
                  color: colors.text,
                  fontSize: 20,
                  fontWeight: "bold",
                  marginLeft: 8,
                }}
              >
                {selectedPlaylist ? "Edit Playlist" : "Create Playlist"}
              </Text>
            </View>
            <TouchableOpacity
              style={{
                borderRadius: 999,
                padding: 4,
              }}
              onPress={() => setShowUpdateModal(false)}
            >
              <X size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                color: colors.text,
                fontSize: 16,
                marginBottom: 8,
                fontWeight: "500",
              }}
            >
              Name
            </Text>
            <TextInput
              style={{
                backgroundColor: colors.muted,
                color: colors.text,
                padding: 16,
                borderRadius: 12,
              }}
              value={formData.name}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, name: text }))
              }
              placeholder="Enter playlist name"
              placeholderTextColor={colors.mutedForeground}
              selectionColor={colors.primary}
            />
          </View>

          <View style={{ marginBottom: 32 }}>
            <Text
              style={{
                color: colors.text,
                fontSize: 16,
                marginBottom: 8,
                fontWeight: "500",
              }}
            >
              Description
            </Text>
            <TextInput
              style={{
                backgroundColor: colors.muted,
                color: colors.text,
                padding: 16,
                borderRadius: 12,
                height: 100,
                textAlignVertical: "top",
              }}
              value={formData.description}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, description: text }))
              }
              placeholder="Enter description"
              placeholderTextColor={colors.mutedForeground}
              multiline={true}
              numberOfLines={3}
              selectionColor={colors.primary}
            />
          </View>

          <Button
            variant="default"
            size="lg"
            title={selectedPlaylist ? "Save Changes" : "Create Playlist"}
            disabled={loading}
            isLoading={loading}
            onPress={handleSavePlaylist}
          />
        </View>
      </SwipeableModal>

      {/* Delete Confirmation Modal */}
      <SwipeableModal
        isVisible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        maxHeight="35%"
        backgroundColor={colors.card}
      >
        <View style={{ padding: 24 }}>
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <View
              style={{
                backgroundColor:
                  theme === "dark"
                    ? "rgba(127, 29, 29, 0.3)"
                    : "rgba(254, 202, 202, 0.3)",
                padding: 12,
                borderRadius: 999,
                marginBottom: 12,
              }}
            >
              <AlertCircle size={28} color={colors.destructive} />
            </View>
            <Text
              style={{ color: colors.text, fontSize: 20, fontWeight: "bold" }}
            >
              Delete Playlist
            </Text>
          </View>

          <Text
            style={{
              color: colors.mutedForeground,
              fontSize: 16,
              marginBottom: 32,
              textAlign: "center",
            }}
          >
            Are you sure you want to delete "{selectedPlaylist?.name}"? This
            action cannot be undone.
          </Text>

          <View style={{ flexDirection: "row", gap: 16 }}>
            <Button
              variant="secondary"
              title="Cancel"
              size="default"
              style={{ flex: 1 }}
              onPress={() => setShowDeleteModal(false)}
            />

            <Button
              variant="destructive"
              title="Delete"
              size="default"
              isLoading={loading}
              disabled={loading}
              icon={<Trash2 size={18} color={colors.destructiveForeground} />}
              iconPosition="left"
              style={{ flex: 1 }}
              onPress={handleDeletePlaylist}
            />
          </View>
        </View>
      </SwipeableModal>

      {!user && <LoginModal />}
    </SafeAreaView>
  );
};

export const PlaylistCard = memo(({ playlist, isUser, onLongPress }: any) => {
  const { colors } = useTheme();

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
            style={{
              color: colors.text,
              fontWeight: "600",
              fontSize: 14,
            }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {securedPlaylist.name}
          </Text>
          <Text
            style={{
              color: colors.mutedForeground,
              fontSize: 12,
            }}
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

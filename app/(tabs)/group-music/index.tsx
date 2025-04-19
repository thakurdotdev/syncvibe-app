import LoginScreen from "@/app/login";
import QRScannerScreen from "@/app/qr-scanner";
import SwipeableModal from "@/components/common/SwipeableModal";
import { GroupSongControls } from "@/components/music/MusicCards";
import { useGroupMusic } from "@/context/GroupMusicContext";
import { useUser } from "@/context/UserContext";
import { useTheme } from "@/context/ThemeContext";
import { getProfileCloudinaryUrl } from "@/utils/Cloudinary";
import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function GroupMusicMobile() {
  const {
    currentGroup,
    groupMembers,
    searchResults,
    searchQuery,
    setSearchQuery,
    currentSong,
    isSearchLoading,
    isPlaying,
    isGroupModalOpen,
    setIsGroupModalOpen,
    debouncedSearch,
    createGroup,
    joinGroup,
    leaveGroup,
    selectSong,
    handlePlayPause,
  } = useGroupMusic();
  const { user } = useUser();
  const { colors, theme } = useTheme();
  const [newGroupName, setNewGroupName] = useState("");
  const [groupId, setGroupId] = useState("");
  const [tabIndex, setTabIndex] = useState(0);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showQRCodeModal, setShowQRCodeModal] = useState(false);
  const [scanQrCode, setScanQrCode] = useState(false);

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    debouncedSearch(query);
  };

  const handleCopyGroupId = () => {
    if (currentGroup?.id) {
      Alert.alert("Group ID", `${currentGroup.id}\n\nLong press to copy`, [
        { text: "OK" },
      ]);
    }
  };

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <>
      {scanQrCode ? (
        <QRScannerScreen
          onScanComplete={(qrCode) => {
            setGroupId(qrCode);
            joinGroup(qrCode);
            setScanQrCode(false);
          }}
          onClose={() => {
            setScanQrCode(false);
            setIsGroupModalOpen(false);
          }}
        />
      ) : (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <Animated.View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              height: "100%",
              zIndex: 0,
            }}
          >
            <LinearGradient
              colors={[
                colors.gradients.background[0],
                colors.gradients.background[1],
              ]}
              start={{ x: 0.1, y: 0.1 }}
              end={{ x: 0.8, y: 0.85 }}
              style={{
                height: "100%",
                width: "100%",
              }}
            />
          </Animated.View>
          <SafeAreaView
            style={{
              paddingHorizontal: 20,
              paddingVertical: 16,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", zIndex: 1 }}
            >
              <Ionicons
                name="musical-notes-outline"
                size={24}
                color={colors.foreground}
              />
              <Text
                style={{
                  color: colors.foreground,
                  fontSize: 20,
                  fontWeight: "600",
                  marginLeft: 10,
                }}
              >
                Group Music
              </Text>
            </View>
            {currentGroup && (
              <View style={{ flexDirection: "row", zIndex: 1 }}>
                <TouchableOpacity
                  onPress={() => setShowSearchModal(true)}
                  style={{
                    backgroundColor: colors.secondary,
                    padding: 10,
                    borderRadius: 12,
                    marginRight: 30,
                  }}
                  className="flex-row items-center"
                >
                  <Feather name="search" size={18} color={colors.foreground} />
                  <Text style={{ color: colors.foreground, marginLeft: 6 }}>
                    Search
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={leaveGroup}
                  style={{
                    backgroundColor: colors.secondary,
                    padding: 10,
                    borderRadius: 12,
                  }}
                >
                  <Feather name="log-out" size={18} color={colors.foreground} />
                </TouchableOpacity>
              </View>
            )}
          </SafeAreaView>

          {/* Main Content */}
          {!currentGroup ? (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                paddingHorizontal: 32,
              }}
            >
              <Ionicons
                name="people-outline"
                size={72}
                color={colors.foreground}
              />
              <Text
                style={{
                  color: colors.foreground,
                  fontSize: 26,
                  fontWeight: "700",
                  marginTop: 32,
                  textAlign: "center",
                }}
              >
                Sync Your Vibe with Friends
              </Text>
              <Text
                style={{
                  color: colors.mutedForeground,
                  textAlign: "center",
                  marginTop: 12,
                  marginBottom: 40,
                  fontSize: 16,
                  lineHeight: 22,
                }}
              >
                Create a group to listen to music together. Invite your friends
                to join and start playing music for everyone in the group.
              </Text>
              <TouchableOpacity
                onPress={() => setIsGroupModalOpen(true)}
                style={{
                  backgroundColor: colors.primary,
                  paddingVertical: 16,
                  paddingHorizontal: 24,
                  borderRadius: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                }}
              >
                <Feather
                  name="plus-circle"
                  size={18}
                  color={colors.primaryForeground}
                />
                <Text
                  style={{
                    color: colors.primaryForeground,
                    fontWeight: "700",
                    marginLeft: 8,
                    fontSize: 16,
                  }}
                >
                  Create or Join Group
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              {/* Group Info */}
              <Card variant="outline" className="m-4">
                <CardHeader>
                  <CardTitle>{currentGroup.name}</CardTitle>
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                    <TouchableOpacity
                      onPress={handleCopyGroupId}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: colors.secondary,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 12,
                      }}
                    >
                      <Text
                        style={{
                          color: colors.mutedForeground,
                          fontSize: 12,
                          marginRight: 8,
                        }}
                        numberOfLines={1}
                      >
                        ID: {currentGroup.id?.substring(0, 8)}...
                      </Text>
                      <Feather
                        name="copy"
                        size={14}
                        color={colors.mutedForeground}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setShowQRCodeModal(true)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: colors.secondary,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 12,
                      }}
                    >
                      <Feather
                        name="grid"
                        size={14}
                        color={colors.mutedForeground}
                      />
                      <Text
                        style={{
                          color: colors.mutedForeground,
                          fontSize: 12,
                          marginLeft: 8,
                        }}
                        numberOfLines={1}
                      >
                        QR
                      </Text>
                    </TouchableOpacity>
                  </View>
                </CardHeader>
              </Card>

              {/* Current Song Display */}
              <Card variant="outline" className="m-4">
                <CardContent>
                  {currentSong ? (
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <Image
                        source={{
                          uri:
                            currentSong.image?.[1]?.link ||
                            "https://via.placeholder.com/60",
                        }}
                        style={{ width: 64, height: 64, borderRadius: 8 }}
                      />
                      <View style={{ marginLeft: 16, flex: 1 }}>
                        <Text
                          style={{
                            color: colors.foreground,
                            fontWeight: "500",
                            fontSize: 16,
                          }}
                          numberOfLines={1}
                        >
                          {currentSong.name}
                        </Text>
                        <Text
                          style={{
                            color: colors.mutedForeground,
                            fontSize: 14,
                            marginTop: 4,
                          }}
                          numberOfLines={1}
                        >
                          {currentSong.artist_map?.primary_artists?.[0]?.name ||
                            "Unknown Artist"}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handlePlayPause()}
                        style={{
                          backgroundColor: colors.secondary,
                          height: 48,
                          width: 48,
                          borderRadius: 24,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Ionicons
                          name={isPlaying ? "pause" : "play"}
                          size={24}
                          color={colors.foreground}
                        />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={() => setShowSearchModal(true)}
                      style={{
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 20,
                      }}
                    >
                      <Feather
                        name="music"
                        size={28}
                        color={colors.foreground}
                      />
                      <Text
                        style={{
                          color: colors.foreground,
                          marginTop: 12,
                          fontWeight: "500",
                          fontSize: 16,
                        }}
                      >
                        Choose a song to play
                      </Text>
                      <Text
                        style={{
                          color: colors.mutedForeground,
                          fontSize: 14,
                          marginTop: 4,
                          textAlign: "center",
                        }}
                      >
                        Start the music for everyone in your group
                      </Text>
                    </TouchableOpacity>
                  )}
                </CardContent>
              </Card>

              {/* Members List */}
              <Card variant="outline" className="m-4">
                <CardHeader>
                  <CardTitle>Group Members ({groupMembers.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <FlatList
                    data={groupMembers}
                    keyExtractor={(item) => item.userId.toString()}
                    renderItem={({ item }) => (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          paddingVertical: 14,
                          borderBottomWidth: 1,
                          borderBottomColor: colors.border,
                        }}
                      >
                        <Image
                          source={{
                            uri:
                              getProfileCloudinaryUrl(item.profilePic) ||
                              "https://via.placeholder.com/40",
                          }}
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: colors.secondary,
                          }}
                        />
                        <View style={{ marginLeft: 16 }}>
                          <Text
                            style={{ color: colors.foreground, fontSize: 15 }}
                          >
                            {item.userName}
                          </Text>
                          {item.userId === currentGroup.createdBy && (
                            <Text
                              style={{
                                color: colors.mutedForeground,
                                fontSize: 12,
                                marginTop: 2,
                              }}
                            >
                              Host
                            </Text>
                          )}
                        </View>
                      </View>
                    )}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    showsVerticalScrollIndicator={false}
                  />
                </CardContent>
              </Card>
            </View>
          )}

          {/* Group Modal */}
          {isGroupModalOpen && (
            <SwipeableModal
              isVisible={isGroupModalOpen}
              onClose={() => setIsGroupModalOpen(false)}
              maxHeight={Dimensions.get("window").height * 0.8}
            >
              <View style={{ flex: 1, padding: 20, marginBottom: 100 }}>
                <Text
                  style={{
                    color: colors.foreground,
                    fontSize: 20,
                    fontWeight: "700",
                    textAlign: "center",
                    marginTop: 8,
                    marginBottom: 24,
                  }}
                >
                  Create or Join Group
                </Text>

                {/* Tabs */}
                <View
                  style={{
                    flexDirection: "row",
                    backgroundColor: colors.secondary,
                    borderRadius: 12,
                    marginBottom: 24,
                    padding: 4,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => setTabIndex(0)}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      backgroundColor:
                        tabIndex === 0 ? colors.primary : "transparent",
                      borderRadius: 8,
                    }}
                  >
                    <Text
                      style={{
                        textAlign: "center",
                        color:
                          tabIndex === 0
                            ? colors.primaryForeground
                            : colors.foreground,
                        fontWeight: tabIndex === 0 ? "600" : "400",
                      }}
                    >
                      Create
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setTabIndex(1)}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      backgroundColor:
                        tabIndex === 1 ? colors.primary : "transparent",
                      borderRadius: 8,
                    }}
                  >
                    <Text
                      style={{
                        textAlign: "center",
                        color:
                          tabIndex === 1
                            ? colors.primaryForeground
                            : colors.foreground,
                        fontWeight: tabIndex === 1 ? "600" : "400",
                      }}
                    >
                      Join
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Tab Content */}
                {tabIndex === 0 ? (
                  <View style={{ marginTop: 8 }}>
                    <Input
                      labelText="GROUP NAME"
                      placeholder="Enter a name for your group"
                      value={newGroupName}
                      onChangeText={setNewGroupName}
                      variant="outline"
                    />
                    <TouchableOpacity
                      onPress={() => {
                        if (newGroupName.trim()) {
                          createGroup(newGroupName);
                          setIsGroupModalOpen(false);
                        }
                      }}
                      style={{
                        backgroundColor: colors.primary,
                        paddingVertical: 16,
                        borderRadius: 12,
                        marginTop: 24,
                      }}
                    >
                      <Text
                        style={{
                          color: colors.primaryForeground,
                          fontWeight: "600",
                          textAlign: "center",
                        }}
                      >
                        Create Group
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ marginTop: 8 }}>
                    <Input
                      labelText="GROUP ID"
                      placeholder="Enter the group ID to join"
                      value={groupId}
                      onChangeText={setGroupId}
                      variant="outline"
                    />
                    <TouchableOpacity
                      onPress={() => {
                        if (groupId.trim()) {
                          joinGroup(groupId);
                          setIsGroupModalOpen(false);
                        }
                      }}
                      style={{
                        backgroundColor: colors.primary,
                        paddingVertical: 16,
                        borderRadius: 12,
                        marginTop: 24,
                      }}
                    >
                      <Text
                        style={{
                          color: colors.primaryForeground,
                          fontWeight: "600",
                          textAlign: "center",
                        }}
                      >
                        Join Group
                      </Text>
                    </TouchableOpacity>
                    <Text
                      style={{
                        color: colors.mutedForeground,
                        fontSize: 12,
                        textAlign: "center",
                        marginTop: 4,
                      }}
                    >
                      (You can also scan a QR code to join)
                    </Text>

                    <TouchableOpacity
                      onPress={() => {
                        setScanQrCode(true);
                        setIsGroupModalOpen(false);
                      }}
                      style={{
                        backgroundColor: colors.primary,
                        paddingVertical: 16,
                        borderRadius: 12,
                        marginTop: 24,
                      }}
                    >
                      <Text
                        style={{
                          color: colors.primaryForeground,
                          fontWeight: "600",
                          textAlign: "center",
                        }}
                      >
                        Scan QR Code
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity
                  onPress={() => setIsGroupModalOpen(false)}
                  style={{ marginTop: 20, paddingVertical: 12 }}
                >
                  <Text
                    style={{
                      color: colors.mutedForeground,
                      textAlign: "center",
                    }}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </SwipeableModal>
          )}

          {/* Search Modal */}
          {showSearchModal && (
            <SwipeableModal
              isVisible={showSearchModal}
              onClose={() => setShowSearchModal(false)}
              maxHeight={Dimensions.get("window").height * 0.8}
              scrollable={true}
            >
              <View style={{ flex: 1 }}>
                <View style={{ flex: 1, padding: 20 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 20,
                    }}
                  >
                    <TouchableOpacity
                      onPress={() => setShowSearchModal(false)}
                      style={{ paddingRight: 16 }}
                    >
                      <Ionicons
                        name="arrow-back"
                        size={24}
                        color={colors.foreground}
                      />
                    </TouchableOpacity>
                    <Input
                      placeholder="Search for songs..."
                      value={searchQuery}
                      onChangeText={handleSearchChange}
                      variant="outline"
                      leftIcon={
                        <Feather
                          name="search"
                          size={18}
                          color={colors.mutedForeground}
                        />
                      }
                      rightIcon={
                        searchQuery ? (
                          <TouchableOpacity
                            onPress={() => handleSearchChange("")}
                          >
                            <Feather
                              name="x"
                              size={18}
                              color={colors.mutedForeground}
                            />
                          </TouchableOpacity>
                        ) : null
                      }
                    />
                  </View>

                  {isSearchLoading ? (
                    <View
                      style={{
                        flex: 1,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                  ) : (
                    <FlatList
                      data={searchResults}
                      keyExtractor={(item) => item.id}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          onPress={() => {
                            selectSong(item);
                            setShowSearchModal(false);
                          }}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            paddingVertical: 14,
                            borderBottomWidth: 1,
                            borderBottomColor: colors.border,
                          }}
                        >
                          <Image
                            source={{
                              uri:
                                item.image?.[1]?.link ||
                                "https://via.placeholder.com/50",
                            }}
                            style={{
                              width: 56,
                              height: 56,
                              borderRadius: 8,
                              backgroundColor: colors.secondary,
                            }}
                          />
                          <View style={{ marginLeft: 16, flex: 1 }}>
                            <Text
                              style={{
                                color: colors.foreground,
                                fontWeight: "500",
                                fontSize: 15,
                              }}
                              numberOfLines={1}
                            >
                              {item.name}
                            </Text>
                            <Text
                              style={{
                                color: colors.mutedForeground,
                                fontSize: 13,
                                marginTop: 4,
                              }}
                              numberOfLines={1}
                            >
                              {item.artist_map?.primary_artists?.[0]?.name ||
                                "Unknown Artist"}
                            </Text>
                          </View>
                          <View
                            style={{
                              backgroundColor: colors.secondary,
                              height: 36,
                              width: 36,
                              borderRadius: 18,
                              alignItems: "center",
                              justifyContent: "center",
                              marginLeft: 8,
                            }}
                          >
                            <Feather
                              name="plus"
                              size={20}
                              color={colors.foreground}
                            />
                          </View>
                        </TouchableOpacity>
                      )}
                      ListEmptyComponent={
                        searchQuery ? (
                          <View
                            style={{
                              paddingVertical: 40,
                              alignItems: "center",
                            }}
                          >
                            <Feather
                              name="search"
                              size={40}
                              color={colors.mutedForeground}
                            />
                            <Text
                              style={{
                                color: colors.foreground,
                                fontWeight: "500",
                                marginTop: 16,
                                fontSize: 16,
                              }}
                            >
                              No results found
                            </Text>
                            <Text
                              style={{
                                color: colors.mutedForeground,
                                fontSize: 14,
                                marginTop: 4,
                                textAlign: "center",
                              }}
                            >
                              Try a different search term
                            </Text>
                          </View>
                        ) : (
                          <View
                            style={{
                              paddingVertical: 40,
                              alignItems: "center",
                            }}
                          >
                            <Feather
                              name="music"
                              size={40}
                              color={colors.mutedForeground}
                            />
                            <Text
                              style={{
                                color: colors.foreground,
                                fontWeight: "500",
                                marginTop: 16,
                                fontSize: 16,
                              }}
                            >
                              Search for music
                            </Text>
                            <Text
                              style={{
                                color: colors.mutedForeground,
                                fontSize: 14,
                                marginTop: 4,
                                textAlign: "center",
                              }}
                            >
                              Find songs to play in your group
                            </Text>
                          </View>
                        )
                      }
                      contentContainerStyle={{ paddingBottom: 20 }}
                      showsVerticalScrollIndicator={false}
                    />
                  )}
                </View>
              </View>
            </SwipeableModal>
          )}

          {showQRCodeModal && currentGroup?.qrCode && (
            <SwipeableModal
              isVisible={showQRCodeModal}
              onClose={() => setShowQRCodeModal(false)}
            >
              <View style={{ padding: 20, alignItems: "center" }}>
                <Text
                  style={{
                    color: colors.foreground,
                    fontSize: 20,
                    fontWeight: "700",
                    textAlign: "center",
                    marginTop: 8,
                    marginBottom: 24,
                  }}
                >
                  Group QR Code
                </Text>
                <View
                  style={{
                    backgroundColor: colors.card,
                    padding: 16,
                    borderRadius: 12,
                  }}
                >
                  <Image
                    source={{
                      uri: `data:image/png;base64,${currentGroup.qrCode}`,
                    }}
                    style={{ width: 250, height: 250 }}
                    resizeMode="contain"
                  />
                </View>
                <Text
                  style={{
                    color: colors.mutedForeground,
                    fontSize: 14,
                    marginTop: 16,
                    textAlign: "center",
                  }}
                >
                  Share this QR code with others to join your group
                </Text>
                <TouchableOpacity
                  onPress={() => setShowQRCodeModal(false)}
                  style={{ marginTop: 20, paddingVertical: 12 }}
                >
                  <Text
                    style={{
                      color: colors.mutedForeground,
                      textAlign: "center",
                    }}
                  >
                    Close
                  </Text>
                </TouchableOpacity>
              </View>
            </SwipeableModal>
          )}
        </View>
      )}
    </>
  );
}

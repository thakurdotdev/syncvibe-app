import QRScannerScreen from "@/app/qr-scanner";
import SwipeableModal from "@/components/common/SwipeableModal";
import LoginModal from "@/components/LoginModal";
import { GroupSongControls } from "@/components/music/MusicCards";
import { useGroupMusic } from "@/context/GroupMusicContext";
import { useUser } from "@/context/UserContext";
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
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

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
        <View style={{ flex: 1, backgroundColor: "#000" }}>
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
              colors={["#42353A", "#092B31", "#121212"]}
              start={{ x: 0.1, y: 0.1 }}
              end={{ x: 0.8, y: 0.85 }} // End slightly higher to allow for organic fade
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
            {/* Rest of your existing header content */}
            <View
              style={{ flexDirection: "row", alignItems: "center", zIndex: 1 }}
            >
              <Ionicons name="musical-notes-outline" size={24} color="#fff" />
              <Text
                style={{
                  color: "#fff",
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
                    backgroundColor: "rgba(17,17,17,0.7)",
                    padding: 10,
                    borderRadius: 12,
                    marginRight: 30,
                  }}
                  className="flex-row items-center"
                >
                  <Feather name="search" size={18} color="#fff" />
                  <Text style={{ color: "#fff", marginLeft: 6 }}>Search</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={leaveGroup}
                  style={{
                    backgroundColor: "rgba(17,17,17,0.7)",
                    padding: 10,
                    borderRadius: 12,
                  }}
                >
                  <Feather name="log-out" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          </SafeAreaView>

          {/* Login Modal - Display if user is null */}
          {!user && (
            <LoginModal
              title="You need to be signed in to use Group Music features. Please sign in
              to continue."
            />
          )}

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
              <Ionicons name="people-outline" size={72} color="#fff" />
              <Text
                style={{
                  color: "#fff",
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
                  color: "#888",
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
                onPress={() => {
                  console.log("Create or join group");

                  setIsGroupModalOpen(true);
                }}
                style={{
                  backgroundColor: "#fff",
                  paddingVertical: 16,
                  paddingHorizontal: 24,
                  borderRadius: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                }}
              >
                <Feather name="plus-circle" size={18} color="#000" />
                <Text
                  style={{
                    color: "#000",
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
              <View
                style={{
                  paddingHorizontal: 20,
                  paddingTop: 20,
                  paddingBottom: 12,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <View>
                    <Text style={{ color: "#888", fontSize: 13 }}>
                      CURRENT GROUP
                    </Text>
                    <Text
                      style={{
                        color: "#fff",
                        fontWeight: "700",
                        fontSize: 22,
                        marginTop: 4,
                      }}
                    >
                      {currentGroup.name}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={handleCopyGroupId}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: "#111",
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 12,
                    }}
                  >
                    <Text
                      style={{ color: "#888", fontSize: 12, marginRight: 8 }}
                      numberOfLines={1}
                    >
                      ID: {currentGroup.id?.substring(0, 8)}...
                    </Text>
                    <Feather name="copy" size={14} color="#888" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setShowQRCodeModal(true)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: "#111",
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 12,
                    }}
                  >
                    <Feather name="grid" size={14} color="#888" />
                    <Text
                      style={{ color: "#888", fontSize: 12, marginLeft: 8 }}
                      numberOfLines={1}
                    >
                      QR
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Current Song Display */}
              <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
                {currentSong ? (
                  <View
                    style={{
                      backgroundColor: "#111",
                      padding: 16,
                      borderRadius: 16,
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.1,
                      shadowRadius: 8,
                      elevation: 2,
                    }}
                  >
                    <Text
                      style={{ color: "#888", fontSize: 12, marginBottom: 8 }}
                    >
                      NOW PLAYING
                    </Text>
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
                      <View
                        style={{
                          marginLeft: 16,
                          flex: 1,
                          justifyContent: "center",
                        }}
                      >
                        <Text
                          style={{
                            color: "#fff",
                            fontWeight: "500",
                            fontSize: 16,
                          }}
                          numberOfLines={1}
                        >
                          {currentSong.name}
                        </Text>
                        <Text
                          style={{ color: "#888", fontSize: 14, marginTop: 4 }}
                          numberOfLines={1}
                        >
                          {currentSong.artist_map?.primary_artists?.[0]?.name ||
                            "Unknown Artist"}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handlePlayPause()}
                        style={{
                          backgroundColor: "#222",
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
                          color={"#ffff"}
                        />
                      </TouchableOpacity>
                    </View>
                    <GroupSongControls />
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => setShowSearchModal(true)}
                    style={{
                      backgroundColor: "#111",
                      padding: 20,
                      borderRadius: 16,
                      alignItems: "center",
                      justifyContent: "center",
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.1,
                      shadowRadius: 8,
                      elevation: 2,
                    }}
                  >
                    <Feather name="music" size={28} color={"#ffffff"} />
                    <Text
                      style={{
                        color: "#fff",
                        marginTop: 12,
                        fontWeight: "500",
                        fontSize: 16,
                      }}
                    >
                      Choose a song to play
                    </Text>
                    <Text
                      style={{
                        color: "#888",
                        fontSize: 14,
                        marginTop: 4,
                        textAlign: "center",
                      }}
                    >
                      Start the music for everyone in your group
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Members List */}
              <View style={{ flex: 1, paddingHorizontal: 20 }}>
                <Text style={{ color: "#888", fontSize: 13, marginBottom: 12 }}>
                  GROUP MEMBERS ({groupMembers.length})
                </Text>
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
                        borderBottomColor: "#222",
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
                          backgroundColor: "#222",
                        }}
                      />
                      <View style={{ marginLeft: 16 }}>
                        <Text style={{ color: "#fff", fontSize: 15 }}>
                          {item.userName}
                        </Text>
                        {item.userId === currentGroup.createdBy && (
                          <Text
                            style={{
                              color: "#fff",
                              fontSize: 12,
                              marginTop: 2,
                              opacity: 0.7,
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
              </View>
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
                    color: "#fff",
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
                    backgroundColor: "#111",
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
                      backgroundColor: tabIndex === 0 ? "#fff" : "transparent",
                      borderRadius: 8,
                    }}
                  >
                    <Text
                      style={{
                        textAlign: "center",
                        color: tabIndex === 0 ? "#000" : "#888",
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
                      backgroundColor: tabIndex === 1 ? "#fff" : "transparent",
                      borderRadius: 8,
                    }}
                  >
                    <Text
                      style={{
                        textAlign: "center",
                        color: tabIndex === 1 ? "#000" : "#888",
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
                    <Text
                      style={{ color: "#888", fontSize: 13, marginBottom: 8 }}
                    >
                      GROUP NAME
                    </Text>
                    <TextInput
                      style={{
                        backgroundColor: "#111",
                        color: "#fff",
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                        borderRadius: 12,
                        fontSize: 15,
                      }}
                      placeholder="Enter a name for your group"
                      placeholderTextColor="#555"
                      value={newGroupName}
                      onChangeText={setNewGroupName}
                    />
                    <TouchableOpacity
                      onPress={() => {
                        if (newGroupName.trim()) {
                          createGroup(newGroupName);
                          setIsGroupModalOpen(false);
                        }
                      }}
                      style={{
                        backgroundColor: "#fff",
                        paddingVertical: 16,
                        borderRadius: 12,
                        marginTop: 24,
                      }}
                    >
                      <Text
                        style={{
                          color: "#000",
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
                    <Text
                      style={{ color: "#888", fontSize: 13, marginBottom: 8 }}
                    >
                      GROUP ID
                    </Text>
                    <TextInput
                      style={{
                        backgroundColor: "#111",
                        color: "#fff",
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                        borderRadius: 12,
                        fontSize: 15,
                      }}
                      placeholder="Enter the group ID to join"
                      placeholderTextColor="#555"
                      value={groupId}
                      onChangeText={setGroupId}
                    />
                    <TouchableOpacity
                      onPress={() => {
                        if (groupId.trim()) {
                          joinGroup(groupId);
                          setIsGroupModalOpen(false);
                        }
                      }}
                      style={{
                        backgroundColor: "#fff",
                        paddingVertical: 16,
                        borderRadius: 12,
                        marginTop: 24,
                      }}
                    >
                      <Text
                        style={{
                          color: "#000",
                          fontWeight: "600",
                          textAlign: "center",
                        }}
                      >
                        Join Group
                      </Text>
                    </TouchableOpacity>
                    <Text
                      style={{
                        color: "#888",
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
                        backgroundColor: "#fff",
                        paddingVertical: 16,
                        borderRadius: 12,
                        marginTop: 24,
                      }}
                    >
                      <Text
                        style={{
                          color: "#000",
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
                  <Text style={{ color: "#888", textAlign: "center" }}>
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
                      <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <View
                      style={{
                        flex: 1,
                        backgroundColor: "#111",
                        borderRadius: 12,
                        flexDirection: "row",
                        alignItems: "center",
                        paddingHorizontal: 12,
                      }}
                    >
                      <Feather name="search" size={18} color="#888" />
                      <TextInput
                        style={{
                          flex: 1,
                          color: "#fff",
                          paddingVertical: 12,
                          paddingHorizontal: 12,
                          fontSize: 15,
                        }}
                        placeholder="Search for songs..."
                        placeholderTextColor="#555"
                        value={searchQuery}
                        onChangeText={handleSearchChange}
                      />
                      {searchQuery ? (
                        <TouchableOpacity
                          onPress={() => handleSearchChange("")}
                        >
                          <Feather name="x" size={18} color="#888" />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>

                  {isSearchLoading ? (
                    <View
                      style={{
                        flex: 1,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <ActivityIndicator size="large" color="#fff" />
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
                            borderBottomColor: "#222",
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
                              backgroundColor: "#222",
                            }}
                          />
                          <View style={{ marginLeft: 16, flex: 1 }}>
                            <Text
                              style={{
                                color: "#fff",
                                fontWeight: "500",
                                fontSize: 15,
                              }}
                              numberOfLines={1}
                            >
                              {item.name}
                            </Text>
                            <Text
                              style={{
                                color: "#888",
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
                              backgroundColor: "#333",
                              height: 36,
                              width: 36,
                              borderRadius: 18,
                              alignItems: "center",
                              justifyContent: "center",
                              marginLeft: 8,
                            }}
                          >
                            <Feather name="plus" size={20} color="#fff" />
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
                            <Feather name="search" size={40} color="#555" />
                            <Text
                              style={{
                                color: "#fff",
                                fontWeight: "500",
                                marginTop: 16,
                                fontSize: 16,
                              }}
                            >
                              No results found
                            </Text>
                            <Text
                              style={{
                                color: "#888",
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
                            <Feather name="music" size={40} color="#555" />
                            <Text
                              style={{
                                color: "#fff",
                                fontWeight: "500",
                                marginTop: 16,
                                fontSize: 16,
                              }}
                            >
                              Search for music
                            </Text>
                            <Text
                              style={{
                                color: "#888",
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
                    color: "#fff",
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
                    backgroundColor: "#fff",
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
                    color: "#888",
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
                  <Text style={{ color: "#888", textAlign: "center" }}>
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

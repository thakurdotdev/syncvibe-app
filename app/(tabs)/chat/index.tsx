import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useChat } from "@/context/SocketContext";
import useApi from "@/utils/hooks/useApi";
import { useDebounce } from "@/utils/hooks/useDebounce";

const AVATAR_SIZE = 40;
const ONLINE_INDICATOR_SIZE = 10;

interface User {
  userid: string;
  name: string;
  profilepic?: string;
  isTyping?: boolean;
}

const SearchUser: React.FC = () => {
  const api = useApi();
  const {
    users,
    loading,
    setLoading,
    setCurrentChat,
    getAllExistingChats,
    socket,
    onlineStatuses,
  } = useChat();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const inputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList>(null);

  // Search functionality
  const searchUsers = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      setLoading(true);
      try {
        const response = await api.get(`/api/user/search?name=${query}`);
        setSearchResults(response.data.users || []);
      } catch (error: any) {
        setSearchResults([]);
        console.error("Search error:", error);
      } finally {
        setLoading(false);
      }
    },
    [api, setLoading],
  );

  // Make sure debouncedSearch is properly memoized
  const debouncedSearch = useCallback(
    useDebounce((query: string) => searchUsers(query), 400),
    [searchUsers],
  );

  useEffect(() => {
    // Only run this effect when searchQuery changes
    if (searchQuery) {
      debouncedSearch(searchQuery);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  // Chat actions
  const createChat = useCallback(
    async (userid: string) => {
      try {
        setLoading(true);
        const response = await api.post(`/api/create/chat`, {
          recieverid: userid,
        });

        if (response.status === 200) {
          setCurrentChat(response.data.chat);
          socket?.emit("join-room", response.data.chat.chatid);
          await getAllExistingChats();
          setSearchResults([]);
          setSearchQuery("");
          Keyboard.dismiss();
          router.push("/message");
        }
      } catch (error) {
        console.error("Create chat error:", error);
      } finally {
        setLoading(false);
      }
    },
    [api, setLoading, setCurrentChat, socket, getAllExistingChats],
  );

  const handleUserSelect = useCallback(
    (item: any, isSearchResult = false) => {
      if (isSearchResult) {
        createChat(item.userid);
      } else {
        setCurrentChat(item);
        router.push("/message");
      }
    },
    [createChat, setCurrentChat],
  );

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    Keyboard.dismiss();
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });

    setTimeout(() => {
      // This is a hack to force a re-render
      setRefreshing(true);
      setTimeout(() => setRefreshing(false), 50);
    }, 50);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await getAllExistingChats();
    setRefreshing(false);
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchQuery.trim()) {
        searchUsers(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 400);

    return () => clearTimeout(handler);
  }, [searchQuery, searchUsers]);

  // Render functions
  const renderUserItem = useCallback(
    ({ item, index }: { item: any; index: number }) => {
      const isSearchResult = searchResults.length > 0;
      const user = isSearchResult ? item : item.otherUser;
      const isOnline = isSearchResult ? false : onlineStatuses[user?.userid];
      const isTyping = !isSearchResult && item.isTyping;

      return (
        <TouchableOpacity
          onPress={() => handleUserSelect(item, isSearchResult)}
          style={[styles.userCard, isOnline && styles.userCardOnline]}
          activeOpacity={0.7}
        >
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: user?.profilepic }}
              style={styles.avatar}
              defaultSource={require("./assets/icon.jpg")}
            />
            {isOnline && <View style={styles.onlineIndicator} />}
          </View>

          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>
              {user?.name}
            </Text>

            {!isSearchResult &&
              (isTyping ? (
                <View style={styles.typingContainer}>
                  <Text style={styles.typingText}>typing...</Text>
                </View>
              ) : (
                <Text style={styles.lastMessage} numberOfLines={1}>
                  {item?.lastmessage || ""}
                </Text>
              ))}
          </View>

          <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
        </TouchableOpacity>
      );
    },
    [handleUserSelect, onlineStatuses, searchResults],
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubble-ellipses-outline" size={48} color="#8E8E93" />
      <Text style={styles.emptyText}>
        {searchQuery.length > 0 ? "No users found" : "No conversations yet"}
      </Text>
      <Text style={styles.emptySubText}>
        {searchQuery.length > 0
          ? "Try a different search term"
          : "Search for users to start messaging"}
      </Text>
    </View>
  );

  const renderListHeader = () => (
    <View style={styles.listHeaderContainer}>
      <Text style={styles.listHeaderText}>
        {searchResults.length > 0
          ? `Search Results (${searchResults.length})`
          : "Recent Conversations"}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      <View style={styles.searchBarWrapper}>
        <BlurView intensity={20} tint="dark" style={styles.searchBarBlur}>
          <View style={styles.searchContainer}>
            <Ionicons
              name="search"
              size={18}
              color="#8E8E93"
              style={styles.searchIcon}
            />
            <TextInput
              ref={inputRef}
              placeholder="Search for users..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
              placeholderTextColor="#8E8E93"
              returnKeyType="search"
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={clearSearch}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={18} color="#8E8E93" />
              </TouchableOpacity>
            )}
          </View>
        </BlurView>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#0A84FF" />
        </View>
      )}

      <View style={styles.listContainer}>
        <FlatList
          key={searchResults.length > 0 ? "search" : "users"}
          ref={flatListRef}
          data={searchResults.length > 0 ? searchResults : users}
          keyExtractor={(item, index) =>
            searchResults.length > 0
              ? `search-${item.userid}-${index}`
              : `chat-${item?.otherUser?.userid}-${index}`
          }
          renderItem={renderUserItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={renderEmptyList}
          ListHeaderComponent={renderListHeader}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={10}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  searchBarWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchBarBlur: {
    borderRadius: 12,
    overflow: "hidden",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(30, 30, 30, 0.7)",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#FFFFFF",
    height: 42,
  },
  clearButton: {
    padding: 4,
  },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
  },
  listContainer: {
    flex: 1,
    marginBottom: 45,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  listHeaderContainer: {
    paddingVertical: 8,
    marginBottom: 4,
  },
  listHeaderText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#8E8E93",
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(30, 30, 30, 0.4)",
    borderRadius: 12,
    padding: 12,
    marginVertical: 4,
  },
  userCardOnline: {
    borderLeftWidth: 2,
    borderLeftColor: "#30D158",
  },
  avatarContainer: {
    position: "relative",
    marginRight: 12,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: "#2C2C2E",
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: ONLINE_INDICATOR_SIZE,
    height: ONLINE_INDICATOR_SIZE,
    borderRadius: ONLINE_INDICATOR_SIZE / 2,
    backgroundColor: "#30D158",
    borderWidth: 1.5,
    borderColor: "#121212",
  },
  userInfo: {
    flex: 1,
    justifyContent: "center",
  },
  userName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  typingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  typingText: {
    fontSize: 13,
    color: "#30D158",
    fontWeight: "500",
  },
  lastMessage: {
    fontSize: 13,
    color: "#8E8E93",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#8E8E93",
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 13,
    color: "#636366",
    marginTop: 8,
    textAlign: "center",
    maxWidth: "80%",
  },
});

export default SearchUser;

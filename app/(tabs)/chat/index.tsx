import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Extrapolation,
  FadeIn,
  FadeOut,
  interpolate,
  SlideInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { useChat } from "@/context/SocketContext";
import useApi from "@/utils/hooks/useApi";
import { useDebounce } from "@/utils/hooks/useDebounce";

const AVATAR_SIZE = 52;
const ONLINE_INDICATOR_SIZE = 14;

interface User {
  userid: string;
  name: string;
  profilepic?: string;
  isTyping?: boolean;
}

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

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

  const initialLoad = useRef(true);
  const inputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList>(null);

  const searchBarOpacity = useSharedValue(1);
  const searchBarScale = useSharedValue(1);
  const headerHeight = useSharedValue(60);
  const listPaddingTop = useSharedValue(0);

  const insets = useSafeAreaInsets();

  // Animated styles
  const searchBarAnimatedStyle = useAnimatedStyle(() => ({
    opacity: searchBarOpacity.value,
    transform: [
      { scale: searchBarScale.value },
      {
        translateY: interpolate(
          searchBarScale.value,
          [0.9, 1],
          [5, 0],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    height: headerHeight.value,
    paddingTop: insets.top > 0 ? insets.top : 8,
    opacity: headerHeight.value > 40 ? 1 : 0,
  }));

  const listContainerStyle = useAnimatedStyle(() => ({
    paddingTop: listPaddingTop.value,
  }));

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

  const debouncedSearch = useDebounce(
    (query: string) => searchUsers(query),
    400,
  );

  useEffect(() => {
    if (initialLoad.current) {
      initialLoad.current = false;
      return;
    }

    debouncedSearch(searchQuery);

    // Animate search bar based on query
    if (searchQuery.length > 0) {
      searchBarScale.value = withSpring(1.03);
      headerHeight.value = withTiming(0, { duration: 300 });
      listPaddingTop.value = withTiming(10, { duration: 300 });
    } else {
      searchBarScale.value = withSpring(1);
      headerHeight.value = withTiming(60, { duration: 300 });
      listPaddingTop.value = withTiming(0, { duration: 300 });
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
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await getAllExistingChats();
    setRefreshing(false);
  };

  // Render functions
  const renderUserItem = useCallback(
    ({ item, index }: { item: any; index: number }) => {
      const isSearchResult = searchResults.length > 0;
      const user = isSearchResult ? item : item.otherUser;
      const isOnline = isSearchResult ? false : onlineStatuses[user?.userid];
      const isTyping = !isSearchResult && item.isTyping;

      return (
        <Animated.View
          entering={SlideInUp.delay(50 * index).springify()}
          style={styles.userCardContainer}
        >
          <TouchableOpacity
            onPress={() => handleUserSelect(item, isSearchResult)}
            style={[styles.userCard, isOnline && styles.userCardOnline]}
            activeOpacity={0.7}
          >
            <View style={styles.avatarContainer}>
              <Image
                source={{ uri: user?.profilepic }}
                style={styles.avatar}
                defaultSource={require("@/assets/images/icon.png")}
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
                    <View style={styles.typingDot} />
                    <View style={[styles.typingDot, styles.typingDotDelay1]} />
                    <View style={[styles.typingDot, styles.typingDotDelay2]} />
                    <Text style={styles.typingText}>typing</Text>
                  </View>
                ) : (
                  <Text style={styles.lastMessage} numberOfLines={1}>
                    {item?.lastmessage || ""}
                  </Text>
                ))}
            </View>

            <TouchableOpacity style={styles.messageButton}>
              <Ionicons name="chatbubble" size={18} color="#0A84FF" />
            </TouchableOpacity>
          </TouchableOpacity>
        </Animated.View>
      );
    },
    [handleUserSelect, onlineStatuses],
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubble-ellipses-outline" size={64} color="#8E8E93" />
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
      <Animated.View style={[styles.header, headerAnimatedStyle]}>
        <Text style={styles.headerTitle}>Messages</Text>
      </Animated.View>

      <Animated.View style={[styles.searchBarWrapper, searchBarAnimatedStyle]}>
        <AnimatedBlurView
          intensity={20}
          tint="dark"
          style={styles.searchBarBlur}
        >
          <View style={styles.searchContainer}>
            <Ionicons
              name="search"
              size={20}
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
                <Ionicons name="close-circle" size={20} color="#8E8E93" />
              </TouchableOpacity>
            )}
          </View>
        </AnimatedBlurView>
      </Animated.View>

      {loading && (
        <Animated.View
          entering={FadeIn}
          exiting={FadeOut}
          style={styles.loadingContainer}
        >
          <ActivityIndicator size="large" color="#0A84FF" />
        </Animated.View>
      )}

      <Animated.View style={[styles.listContainer, listContainerStyle]}>
        <FlatList
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
          onScroll={({ nativeEvent }) => {
            const scrollY = nativeEvent.contentOffset.y;
            if (scrollY > 10) {
              searchBarOpacity.value = withTiming(0.8, { duration: 200 });
            } else {
              searchBarOpacity.value = withTiming(1, { duration: 200 });
            }
          }}
          scrollEventThrottle={16}
        />
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  header: {
    paddingHorizontal: 20,
    justifyContent: "flex-end",
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  searchBarWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    zIndex: 100,
  },
  searchBarBlur: {
    borderRadius: 20,
    overflow: "hidden",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(30, 30, 30, 0.7)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 12 : 6,
    height: 50,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  clearButton: {
    padding: 6,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    zIndex: 100,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  listHeaderContainer: {
    paddingVertical: 12,
    marginBottom: 4,
  },
  listHeaderText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#999",
    marginLeft: 4,
  },
  userCardContainer: {
    marginVertical: 6,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(30, 30, 30, 0.6)",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  userCardOnline: {
    borderLeftWidth: 3,
    borderLeftColor: "#30D158",
  },
  avatarContainer: {
    position: "relative",
    marginRight: 16,
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
    borderWidth: 2,
    borderColor: "#121212",
    shadowColor: "#30D158",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  userInfo: {
    flex: 1,
    justifyContent: "center",
  },
  userName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 6,
  },
  typingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  typingDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#30D158",
    marginRight: 3,
    opacity: 1,
    transform: [{ scale: 1 }],
    animation: "bounce 1.4s infinite ease-in-out",
  },
  typingDotDelay1: {
    animationDelay: "-1.1s",
  },
  typingDotDelay2: {
    animationDelay: "-0.8s",
  },
  typingText: {
    fontSize: 13,
    color: "#30D158",
    fontWeight: "500",
    marginLeft: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: "#8E8E93",
    fontWeight: "400",
  },
  messageButton: {
    padding: 10,
    backgroundColor: "rgba(10, 132, 255, 0.1)",
    borderRadius: 12,
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#8E8E93",
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: "#636366",
    marginTop: 8,
    textAlign: "center",
    maxWidth: "80%",
  },
});

export default SearchUser;

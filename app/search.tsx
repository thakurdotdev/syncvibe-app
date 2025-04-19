import { SongCard } from "@/components/music/MusicCards";
import { usePlayer } from "@/context/MusicContext";
import { useTheme } from "@/context/ThemeContext";
import { Song } from "@/types/song";
import { searchSongs } from "@/utils/api/getSongs";
import { useDebounce } from "@/utils/hooks/useDebounce";
import { Ionicons, Feather } from "@expo/vector-icons";
import React, { useState, useRef } from "react";
import {
  ActivityIndicator,
  FlatList,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
  Animated as RNAnimated,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
  LinearTransition,
} from "react-native-reanimated";
import { router } from "expo-router";

const { width } = Dimensions.get("window");

export default function SearchMusic() {
  const { colors, theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const scrollY = new RNAnimated.Value(0);
  const inputRef = useRef<TextInput>(null);

  const debouncedSearch = useDebounce(async (query: string) => {
    if (!query.trim()) {
      setSongs([]);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const results = await searchSongs(query);
      setSongs(results);
    } catch (err) {
      setError("Failed to search songs");
      setSongs([]);
    } finally {
      setIsLoading(false);
    }
  }, 500);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    debouncedSearch(text);
  };

  const clearSearch = () => {
    handleSearch("");
    inputRef.current?.focus();
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.setValue(event.nativeEvent.contentOffset.y);
  };

  const renderHeader = () => {
    const headerOpacity = scrollY.interpolate({
      inputRange: [0, 80, 120],
      outputRange: [1, 0.8, 0.8],
      extrapolate: "clamp",
    });

    const searchScale = scrollY.interpolate({
      inputRange: [0, 100],
      outputRange: [1, 0.98],
      extrapolate: "clamp",
    });

    return (
      <RNAnimated.View
        style={[
          styles.header,
          {
            backgroundColor: colors.background,
            opacity: headerOpacity,
          },
        ]}
      >
        <View className="flex-row items-center mb-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-4"
            style={[styles.backButton]}
          >
            <Ionicons name="chevron-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text
            style={[styles.headerSubtitle, { color: colors.mutedForeground }]}
          >
            Find your favorite songs
          </Text>
        </View>

        <RNAnimated.View
          style={[
            styles.searchContainer,
            {
              transform: [{ scale: searchScale }],
              backgroundColor:
                theme === "light"
                  ? "rgba(0, 0, 0, 0.05)"
                  : "rgba(255, 255, 255, 0.05)",
            },
          ]}
        >
          <Feather
            name="search"
            size={20}
            color={colors.mutedForeground}
            style={styles.searchIcon}
          />
          <TextInput
            ref={inputRef}
            className="flex-1"
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search for songs..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={handleSearch}
            returnKeyType="search"
            autoCapitalize="none"
            autoFocus
          />
          {searchQuery ? (
            <TouchableOpacity
              onPress={clearSearch}
              style={[styles.clearButton]}
            >
              <View style={styles.clearButtonInner}>
                <Feather name="x" size={16} color={colors.foreground} />
              </View>
            </TouchableOpacity>
          ) : null}
        </RNAnimated.View>
      </RNAnimated.View>
    );
  };

  const renderEmptyState = () => {
    if (searchQuery) {
      return (
        <Animated.View
          style={styles.emptyContainer}
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(200)}
        >
          <View
            style={[
              styles.emptyIconContainer,
              { backgroundColor: colors.secondary },
            ]}
          >
            <Feather name="search" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            No results for "{searchQuery}"
          </Text>
          <Text
            style={[styles.emptySubtitle, { color: colors.mutedForeground }]}
          >
            Try different keywords or check your spelling
          </Text>
        </Animated.View>
      );
    }

    return (
      <Animated.View
        style={styles.emptyContainer}
        entering={FadeIn.duration(300)}
        exiting={FadeOut.duration(200)}
      >
        <View
          style={[
            styles.emptyIconContainer,
            { backgroundColor: colors.secondary },
          ]}
        >
          <Ionicons name="musical-notes" size={32} color={colors.primary} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
          Search for music
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
          Find artists, songs, and albums
        </Text>
      </Animated.View>
    );
  };

  const renderItem = ({ item, index }: { item: Song; index: number }) => (
    <Animated.View
      entering={SlideInRight.delay(index * 50)}
      exiting={SlideOutLeft}
      layout={LinearTransition.springify()}
    >
      <SongCard song={item} />
    </Animated.View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar
        barStyle={theme === "light" ? "dark-content" : "light-content"}
        backgroundColor="transparent"
        translucent
      />

      {renderHeader()}

      {isLoading ? (
        <Animated.View
          style={styles.loadingContainer}
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(200)}
        >
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Searching...
          </Text>
        </Animated.View>
      ) : error ? (
        <Animated.View
          style={styles.errorContainer}
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(200)}
        >
          <View
            style={[
              styles.errorIconContainer,
              { backgroundColor: colors.secondary },
            ]}
          >
            <Ionicons name="alert-circle" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.errorTitle, { color: colors.foreground }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[
              styles.retryButton,
              {
                backgroundColor:
                  theme === "light"
                    ? "rgba(0, 0, 0, 0.05)"
                    : "rgba(255, 255, 255, 0.05)",
              },
            ]}
            onPress={() => handleSearch(searchQuery)}
          >
            <Text
              style={[styles.retryButtonText, { color: colors.foreground }]}
            >
              Try Again
            </Text>
          </TouchableOpacity>
        </Animated.View>
      ) : (
        <FlatList
          data={songs}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          removeClippedSubviews={true}
          initialNumToRender={10}
          maxToRenderPerBatch={5}
          windowSize={10}
          ItemSeparatorComponent={() => <View className="h-3" />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 10,
  },
  headerSubtitle: {
    opacity: 0.7,
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
  },
  searchContainer: {
    flexDirection: "row",
    borderRadius: 12,
    alignItems: "center",
    paddingHorizontal: 12,
    height: 50,
    marginTop: 5,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 8,
  },
  clearButton: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  clearButtonInner: {
    borderRadius: 12,
    padding: 4,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 50,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    paddingBottom: 50,
  },
  errorIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 15,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
    marginTop: 10,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingHorizontal: 30,
  },
  emptyIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: "center",
    maxWidth: width * 0.7,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});

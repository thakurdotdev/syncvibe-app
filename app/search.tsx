import { SongCard } from "@/components/music/MusicCards";
import { usePlayer } from "@/context/MusicContext";
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
  Animated,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

export default function SearchMusic() {
  const [searchQuery, setSearchQuery] = useState("");
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const scrollY = new Animated.Value(0);
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
      <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
        <Text style={styles.headerSubtitle}>Find your favorite songs</Text>

        <Animated.View
          style={[
            styles.searchContainer,
            { transform: [{ scale: searchScale }] },
          ]}
        >
          <Feather
            name="search"
            size={20}
            color="#888"
            style={styles.searchIcon}
          />
          <TextInput
            ref={inputRef}
            className="flex-1"
            style={styles.searchInput}
            placeholder="Search for songs..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={handleSearch}
            returnKeyType="search"
            autoCapitalize="none"
            autoFocus
          />
          {searchQuery ? (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <View style={styles.clearButtonInner}>
                <Feather name="x" size={16} color="#fff" />
              </View>
            </TouchableOpacity>
          ) : null}
        </Animated.View>
      </Animated.View>
    );
  };

  const renderEmptyState = () => {
    if (searchQuery) {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Feather name="search" size={32} color="#d1d1d1" />
          </View>
          <Text style={styles.emptyTitle}>No results for "{searchQuery}"</Text>
          <Text style={styles.emptySubtitle}>
            Try different keywords or check your spelling
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="musical-notes" size={32} color="#f1f1f1" />
        </View>
        <Text style={styles.emptyTitle}>Search for music</Text>
        <Text style={styles.emptySubtitle}>
          Find artists, songs, and albums
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {renderHeader()}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#ffffff" />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <View style={styles.errorIconContainer}>
            <Ionicons name="alert-circle" size={32} color="#f1f1f1" />
          </View>
          <Text style={styles.errorTitle}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => handleSearch(searchQuery)}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={songs}
          renderItem={({ item }) => <SongCard song={item} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false },
          )}
          removeClippedSubviews={true}
          initialNumToRender={10}
          maxToRenderPerBatch={5}
          windowSize={10}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 10,
    backgroundColor: "#121212",
  },
  headerSubtitle: {
    color: "white",
    opacity: 0.7,
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: "row",
    backgroundColor: "#2A2A2A",
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
    color: "white",
    fontSize: 16,
    padding: 8,
  },
  clearButton: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  clearButtonInner: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
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
    color: "#BBBBBB",
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
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  errorTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 15,
  },
  retryButton: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
    marginTop: 10,
  },
  retryButtonText: {
    color: "white",
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
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 10,
  },
  emptySubtitle: {
    color: "#BBBBBB",
    fontSize: 15,
    textAlign: "center",
    maxWidth: width * 0.7,
  },
  separator: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.07)",
    marginVertical: 10,
  },
});

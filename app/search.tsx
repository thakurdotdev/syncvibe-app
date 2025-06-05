import { styles } from "@/assets/styles/search.style";
import { SongCard } from "@/components/music/MusicCards";
import { useTheme } from "@/context/ThemeContext";
import { Song } from "@/types/song";
import { searchSongs } from "@/utils/api/getSongs";
import { useDebounce } from "@/utils/hooks/useDebounce";
import { Feather, Ionicons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Animated as RNAnimated,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  SlideInRight,
  SlideOutLeft,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

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
      entering={FadeIn.delay(index * 50)}
      exiting={FadeOut.delay(index * 50)}
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

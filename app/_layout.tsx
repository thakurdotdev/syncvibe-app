import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { StatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import Player from "@/components/music/Player";
import { MusicProvider } from "@/context/MusicContext";
import { UserProvider, useUser } from "@/context/UserContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import TrackPlayer from "react-native-track-player";
import "../global.css";
import { PlaybackService } from "../service";
import { setupPlayer } from "../utils/playerSetup";

// Register playback service
TrackPlayer.registerPlaybackService(() => PlaybackService);

function useAuthenticatedRoute() {
  const { user, loading } = useUser();
  const router = useRouter();
  const segments = useSegments();
  const currentPath = segments.join("/");

  useEffect(() => {
    if (loading) return;

    const shouldRedirect = async () => {
      if (!user) {
        router.replace("/home");
      } else if (user && currentPath === "login") {
        router.replace("/home");
      }
    };

    shouldRedirect();
  }, [user, loading, currentPath]);

  return { user, loading };
}

export default function RootLayout() {
  useEffect(() => {
    const initialize = async () => {
      try {
        // We'll just call setupPlayer() here, but we won't do anything with the result
        // This ensures the player is initialized early, but we don't need to act on it here
        // The MusicProvider will handle the actual player state
        await setupPlayer();
      } catch (error) {
        console.error("Failed to initialize player in RootLayout:", error);
      }
    };

    initialize();
  }, []);

  return (
    <UserProvider>
      <MusicProvider>
        <SafeAreaProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <RootLayoutNav />
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </MusicProvider>
    </UserProvider>
  );
}

function RootLayoutNav() {
  // const { user, loading } = useAuthenticatedRoute();

  // if (loading) {
  //   return (
  //     <View className="flex-1 items-center justify-center bg-black">
  //       <ActivityIndicator size="large" color="#fff" />
  //     </View>
  //   );
  // }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <Stack
        initialRouteName="(tabs)"
        screenOptions={{
          animation: "ios_from_left",
          animationDuration: 300,
          animationTypeForReplace: "pop",
          animationMatchesGesture: true,
          presentation: "modal",
          headerStyle: {
            backgroundColor: "#000",
          },
          headerTintColor: "#fff",
          headerBlurEffect: "dark",
        }}
      >
        <Stack.Screen
          name="login"
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />

        <Stack.Screen
          name="playlists"
          options={{
            navigationBarColor: "#000000",
            title: "Playlist",
            presentation: "modal",
          }}
        />
        <Stack.Screen
          name="albums"
          options={{
            navigationBarColor: "#000000",
            title: "Album",
            presentation: "modal",
          }}
        />
        <Stack.Screen
          name="music-language"
          options={{
            title: "Update Language Preferences",
            presentation: "modal",
          }}
        />
        <Stack.Screen
          name="[...unmatched]"
          options={{
            headerShown: false,
          }}
        />
      </Stack>

      <Player />
    </>
  );
}

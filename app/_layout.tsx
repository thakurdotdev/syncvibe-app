import { Stack } from "expo-router";
import { StatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import ErrorBoundary from "@/components/ErrorBoundary";
import Player from "@/components/music/Player";
import { MusicProvider } from "@/context/MusicContext";
import { UserProvider } from "@/context/UserContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import TrackPlayer from "react-native-track-player";
import "../global.css";
import { PlaybackService } from "../service";

// Register playback service
TrackPlayer.registerPlaybackService(() => PlaybackService);

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <UserProvider>
        <MusicProvider>
          <SafeAreaProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <RootLayoutNav />
            </GestureHandlerRootView>
          </SafeAreaProvider>
        </MusicProvider>
      </UserProvider>
    </ErrorBoundary>
  );
}

function RootLayoutNav() {
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <Stack
        initialRouteName="(tabs)"
        screenOptions={{
          animation: "fade",
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
          name="artist"
          options={{
            navigationBarColor: "#000000",
            title: "Artist",
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

import { Stack } from "expo-router";
import { StatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import ErrorBoundary from "@/components/ErrorBoundary";
import Player from "@/components/music/Player";
import { MusicProvider } from "@/context/MusicContext";
import { ChatProvider } from "@/context/SocketContext";
import { UserProvider } from "@/context/UserContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import TrackPlayer from "react-native-track-player";
import "../global.css";
import { PlaybackService } from "../service";

// import * as Sentry from "@sentry/react-native";
// import { isRunningInExpoGo } from "expo";
// import { useNavigationContainerRef } from "expo-router";
// import { useEffect } from "react";

// const navigationIntegration = Sentry.reactNavigationIntegration({
//   enableTimeToInitialDisplay: !isRunningInExpoGo(),
// });

// Sentry.init({
//   dsn: process.env.EXPO_PUBLIC_SENTRY_DSN_KEY,
//   tracesSampleRate: 1.0,
//   integrations: [navigationIntegration],
//   enableNativeFramesTracking: !isRunningInExpoGo(),
// });

// Register playback service
TrackPlayer.registerPlaybackService(() => PlaybackService);

function RootLayout() {
  // const ref = useNavigationContainerRef();

  // useEffect(() => {
  //   if (ref?.current) {
  //     navigationIntegration.registerNavigationContainer(ref);
  //   }
  // }, [ref]);

  return (
    <ErrorBoundary>
      <UserProvider>
        <ChatProvider>
          <MusicProvider>
            <SafeAreaProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <RootLayoutNav />
              </GestureHandlerRootView>
            </SafeAreaProvider>
          </MusicProvider>
        </ChatProvider>
      </UserProvider>
    </ErrorBoundary>
  );
}

function RootLayoutNav() {
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <Stack
        screenOptions={{
          animation: "none",
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
            navigationBarColor: "#000000",
            title: "Login",
            presentation: "modal",
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
          name="user-playlist"
          options={{
            navigationBarColor: "#000000",
            title: "User Playlist",
            presentation: "modal",
          }}
        />
        <Stack.Screen
          name="message"
          options={{
            headerShown: false,
            title: "Message",
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

export default RootLayout;

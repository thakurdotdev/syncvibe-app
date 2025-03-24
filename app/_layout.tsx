import { Stack } from "expo-router";
import { StatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import ErrorBoundary from "@/components/ErrorBoundary";
import Player from "@/components/music/Player";
import CallScreen from "@/components/video/CallScreen";
import IncomingCallModal from "@/components/video/IncomingCall";
import { GroupMusicProvider } from "@/context/GroupMusicContext";
import { MusicProvider } from "@/context/MusicContext";
import { ChatProvider } from "@/context/SocketContext";
import { UserProvider } from "@/context/UserContext";
import { useVideoCall, VideoCallProvider } from "@/context/VideoCallContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import TrackPlayer from "react-native-track-player";
import "../global.css";
import { PlaybackService } from "../service";

TrackPlayer.registerPlaybackService(() => PlaybackService);

function RootLayout() {
  return (
    <ErrorBoundary>
      <UserProvider>
        <ChatProvider>
          <VideoCallProvider>
            <MusicProvider>
              <GroupMusicProvider>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <RootLayoutNav />
                </GestureHandlerRootView>
              </GroupMusicProvider>
            </MusicProvider>
          </VideoCallProvider>
        </ChatProvider>
      </UserProvider>
    </ErrorBoundary>
  );
}

function RootLayoutNav() {
  const { incomingCall, isInCall } = useVideoCall();
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <Stack
        screenOptions={{
          animation: "none",
          presentation: "containedTransparentModal",
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
          }}
        />
        <Stack.Screen
          name="search"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="albums"
          options={{
            navigationBarColor: "#000000",
            title: "Album",
          }}
        />
        <Stack.Screen
          name="artist"
          options={{
            navigationBarColor: "#000000",
            title: "Artist",
          }}
        />
        <Stack.Screen
          name="user-playlist"
          options={{
            navigationBarColor: "#000000",
            title: "User Playlist",
          }}
        />
        <Stack.Screen
          name="message"
          options={{
            headerShown: false,
            title: "Message",
          }}
        />
        <Stack.Screen
          name="followers"
          options={{
            navigationBarColor: "#000000",
            title: "Followers",
          }}
        />
        <Stack.Screen
          name="followings"
          options={{
            navigationBarColor: "#000000",
            title: "Followings",
          }}
        />
        <Stack.Screen
          name="music-language"
          options={{
            title: "Update Language Preferences",
          }}
        />
        <Stack.Screen
          name="oauthredirect"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="[...unmatched]"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
      {incomingCall && <IncomingCallModal />}
      {!incomingCall && isInCall && <CallScreen />}

      <Player />
    </>
  );
}

export default RootLayout;

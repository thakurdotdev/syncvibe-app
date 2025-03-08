import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StatusBar, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import Player from "@/components/music/Player";
import { MusicProvider } from "@/context/MusicContext";
import { UserProvider, useUser } from "@/context/UserContext";
import "../global.css";

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
  return (
    <UserProvider>
      <MusicProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <RootLayoutNav />
        </GestureHandlerRootView>
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
          name="edit-profile"
          options={{
            title: "Edit Profile",
            presentation: "modal",
          }}
        />
        <Stack.Screen
          name="change-password"
          options={{
            title: "Change Password",
            presentation: "modal",
          }}
        />
        <Stack.Screen
          name="delete-account"
          options={{
            title: "Delete Account",
            presentation: "modal",
          }}
        />
        <Stack.Screen
          name="update-profile-picture"
          options={{
            title: "Update Profile Picture",
            presentation: "modal",
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

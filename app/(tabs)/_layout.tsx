import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { router, Tabs, usePathname } from "expo-router";
import {
  Home,
  ListMusic,
  LucideProps,
  MessageCircle,
  Music,
  User,
} from "lucide-react-native";
import React from "react";
import { Pressable, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TabButton = ({
  isFocused,
  onPress,
  label,
  icon: Icon,
}: {
  isFocused: boolean;
  onPress: () => void;
  label: string;
  icon: React.ComponentType<LucideProps>;
}) => {
  const color = isFocused ? "#ffffff" : "#8a8a8a";

  const textStyle = {
    color,
    fontWeight: isFocused ? ("600" as const) : ("400" as const),
    marginTop: 6,
    fontSize: 12,
  };

  return (
    <Pressable
      onPress={onPress}
      className="flex-1 items-center justify-center"
      style={{ paddingVertical: 10 }}
    >
      <View className="items-center justify-center">
        <Icon size={22} color={color} />

        <Text
          style={textStyle}
          className="text-xs"
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
};

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  // Determine active tab based on pathname
  const isHomeActive = pathname.includes("/home");
  const isGroupMusicActive = pathname.includes("/group-music");
  const isProfileActive = pathname.includes("/profile");
  const isPlaylistActive = pathname.includes("/playlist");
  const isChatActive = pathname.includes("/chat");

  return (
    <View className="flex-1 bg-black">
      <Tabs
        screenOptions={{
          headerShown: false,
          animation: "none",
        }}
      >
        <Tabs.Screen
          name="home/index"
          options={{
            title: "Home",
          }}
        />
        <Tabs.Screen
          name="group-music/index"
          options={{
            title: "Group Music",
          }}
        />
        <Tabs.Screen
          name="playlist/index"
          options={{
            title: "Playlist",
          }}
        />
        <Tabs.Screen
          name="chat/index"
          options={{
            title: "Message",
          }}
        />
        <Tabs.Screen
          name="profile/index"
          options={{
            title: "Profile",
          }}
        />
      </Tabs>

      {/* Custom tab bar with keyboard handling */}
      <Animated.View
        style={[
          {
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 75 + insets.bottom,
            paddingBottom: insets.bottom,
            backgroundColor: "black",
            borderTopWidth: 0,
            zIndex: 1000,
          },
        ]}
      >
        <BlurView
          intensity={20}
          tint="dark"
          className="absolute top-0 left-0 right-0 bottom-0"
        >
          <LinearGradient
            colors={["rgba(30, 30, 40, 0.7)", "rgba(20, 20, 28, 0.8)"]}
            className="flex-1 border-t border-gray-800/30"
          />
        </BlurView>

        <View className="flex-row h-full">
          <TabButton
            onPress={() => router.push("/home")}
            label="Home"
            icon={Home}
            isFocused={isHomeActive}
          />
          <TabButton
            onPress={() => router.push("/group-music")}
            label="Group"
            icon={Music}
            isFocused={isGroupMusicActive}
          />
          <TabButton
            onPress={() => router.push("/playlist")}
            label="Playlist"
            icon={ListMusic}
            isFocused={isPlaylistActive}
          />
          <TabButton
            onPress={() => router.push("/chat")}
            label="Chat"
            icon={MessageCircle}
            isFocused={isChatActive}
          />
          <TabButton
            onPress={() => router.push("/profile")}
            label="Profile"
            icon={User}
            isFocused={isProfileActive}
          />
        </View>
      </Animated.View>
    </View>
  );
}

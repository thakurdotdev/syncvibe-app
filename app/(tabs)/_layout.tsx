import { Ionicons } from "@expo/vector-icons";
import { router, Tabs, usePathname } from "expo-router";
import React, { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

enum iconEnum {
  home = "home",
  search = "search",
  person = "person",
}

const AnimatedTabButton = ({
  isFocused,
  onPress,
  label,
  iconName,
}: {
  isFocused: boolean;
  onPress: () => void;
  label: string;
  iconName: keyof typeof iconEnum;
}) => {
  const scale = useSharedValue(1);

  const opacity = useSharedValue(isFocused ? 1 : 0.7);

  useEffect(() => {
    scale.value = withSpring(isFocused ? 1.1 : 1, { damping: 10 });

    opacity.value = withTiming(isFocused ? 1 : 0.7, { duration: 200 });
  }, [isFocused]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const labelStyle = useAnimatedStyle(() => {
    // Reduce or remove the Y-offset to keep the text more visible
    const yOffset = interpolate(opacity.value, [0.7, 1], [2, 0]);

    return {
      opacity: opacity.value,
      transform: [{ translateY: yOffset }],
    };
  });

  const iconColor = isFocused ? "#1DB954" : "#666";

  return (
    <Pressable
      onPress={onPress}
      className="flex-1 items-center justify-center"
      style={{ paddingVertical: 8 }}
    >
      <Animated.View
        style={animatedStyle}
        className="items-center justify-center"
      >
        <Ionicons name={iconName} size={24} color={iconColor} />
        <Animated.Text
          style={labelStyle}
          className="text-xs font-medium mt-1"
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          <Text style={{ color: isFocused ? "#1DB954" : iconColor }}>
            {label}
          </Text>
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
};

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  // Determine active tab based on pathname
  const isHomeActive = pathname.includes("/home");
  const isSearchActive = pathname.includes("/search");
  const isProfileActive = pathname.includes("/profile");

  return (
    <View className="flex-1 bg-black">
      <Tabs
        screenOptions={{
          headerShown: false,
          animation: "fade",
          tabBarStyle: {
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 70 + insets.bottom,
            paddingBottom: insets.bottom,
            elevation: 0,
            shadowOpacity: 0,
            borderTopWidth: 0,
            backgroundColor: "black",
          },
          tabBarShowLabel: false,
        }}
      >
        <Tabs.Screen
          name="home/index"
          options={{
            title: "Home",
            tabBarButton: (props) => (
              <AnimatedTabButton
                onPress={() => router.push("/home")}
                label="Home"
                iconName="home"
                isFocused={isHomeActive}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="search/index"
          options={{
            title: "Search",
            tabBarButton: (props) => (
              <AnimatedTabButton
                onPress={() => router.push("/search")}
                label="Search"
                iconName="search"
                isFocused={isSearchActive}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="profile/index"
          options={{
            title: "Profile",
            tabBarButton: (props) => (
              <AnimatedTabButton
                onPress={() => router.push("/profile")}
                label="Profile"
                iconName="person"
                isFocused={isProfileActive}
              />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}

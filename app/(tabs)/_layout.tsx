import { Tabs } from "expo-router";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-black">
      <Tabs
        screenOptions={{
          headerStyle: {
            backgroundColor: "#000",
          },
          headerTintColor: "#fff",
          tabBarStyle: {
            backgroundColor: "#000",
            borderTopColor: "#222",
            height: 60 + insets.bottom,
            paddingBottom: insets.bottom,
            elevation: 0,
            shadowOpacity: 0,
            borderTopWidth: 0.5,
          },
          tabBarActiveTintColor: "#fff",
          tabBarInactiveTintColor: "#666",
        }}
      >
        <Tabs.Screen
          name="home/index"
          options={{
            title: "Home",
            tabBarIcon: ({ focused, color }) => (
              <Ionicons
                name={focused ? "home" : "home-outline"}
                size={24}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="search/index"
          options={{
            title: "Search",
            tabBarIcon: ({ focused, color }) => (
              <Ionicons
                name={focused ? "search" : "search-outline"}
                size={24}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="profile/index"
          options={{
            title: "Profile",
            tabBarIcon: ({ focused, color }) => (
              <Ionicons
                name={focused ? "person" : "person-outline"}
                size={24}
                color={color}
              />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}

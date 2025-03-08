import { View, Text, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function NotFoundScreen() {
  return (
    <View className="flex-1 bg-black justify-center items-center p-4">
      <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
      <Text className="text-white text-2xl font-bold mt-4">Page Not Found</Text>
      <Text className="text-gray-400 text-center mt-2 mb-8">
        The page you're looking for doesn't exist or has been moved.
      </Text>
      <TouchableOpacity
        onPress={() => router.replace("/(tabs)/home")}
        className="bg-blue-500 px-6 py-3 rounded-lg flex-row items-center"
      >
        <Ionicons name="home" size={20} color="white" />
        <Text className="text-white font-semibold ml-2">Go to Home</Text>
      </TouchableOpacity>
    </View>
  );
}

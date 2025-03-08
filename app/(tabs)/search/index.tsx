import SearchMusic from "@/components/music/SearchMusic";
import React from "react";
import { View } from "react-native";

export default function SearchScreen() {
  return (
    <View className="flex-1 bg-black">
      <SearchMusic />
    </View>
  );
}

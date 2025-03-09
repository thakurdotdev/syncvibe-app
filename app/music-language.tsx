import { useUser } from "@/context/UserContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Check, ChevronRight, Music, X } from "lucide-react-native";
import React, { useState } from "react";
import {
  Alert,
  Animated,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
const validLangs = [
  "hindi",
  "maithili",
  "bhojpuri",
  "english",
  "gujarati",
  "punjabi",
  "tamil",
  "telugu",
  "marathi",
  "bengali",
  "kannada",
  "malayalam",
  "urdu",
  "haryanvi",
  "rajasthani",
  "odia",
  "assamese",
];

const LanguagePreference = () => {
  const { selectedLanguages, setSelectedLanguages } = useUser();

  const [selectedLangs, setSelectedLangs] = useState(
    new Set(selectedLanguages.split(",") || ["hindi"]),
  );

  const handleLanguageToggle = (lang: string) => {
    setSelectedLangs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(lang)) {
        if (newSet.size > 1) {
          newSet.delete(lang);
        }
      } else {
        newSet.add(lang);
      }
      return newSet;
    });
  };

  const handleContinue = async () => {
    await AsyncStorage.setItem(
      "language-preferance",
      Array.from(selectedLangs).join(","),
    );
    setSelectedLanguages(Array.from(selectedLangs).join(","));
    Alert.alert("SyncVibe", "Music preferences updated successfully");
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <Animated.View className="flex-1 px-6 py-6">
        <View className="flex-row flex-wrap justify-center mb-8">
          {Array.from(selectedLangs).map((lang) => (
            <View
              key={lang}
              className="bg-gray-800 rounded-full px-4 py-2 m-1 flex-row items-center"
            >
              <Text className="text-purple-300 text-sm capitalize font-medium">
                {lang}
              </Text>
              {selectedLangs.size > 1 && (
                <TouchableOpacity
                  onPress={() => handleLanguageToggle(lang)}
                  className="ml-2"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={16} color="#d8b4fe" />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        <View className="bg-gray-900 rounded-2xl p-5 shadow-lg mb-8">
          <View className="flex-row items-center mb-5 border-b border-gray-800 pb-3">
            <Music size={20} color="#d8b4fe" />
            <Text className="text-white text-xl font-semibold ml-2">
              Choose Your Music Languages
            </Text>
          </View>

          <ScrollView className="h-96" showsVerticalScrollIndicator={false}>
            <View className="flex-row flex-wrap gap-3">
              {validLangs.map((lang) => (
                <TouchableOpacity
                  key={lang}
                  onPress={() => handleLanguageToggle(lang)}
                  className={`mb-3 p-4 rounded-xl ${
                    selectedLangs.has(lang) ? "bg-purple-700" : "bg-gray-800"
                  }`}
                  style={{ width: "31%" }}
                >
                  <View className="flex-row items-center justify-center gap-2">
                    <Text
                      className={`capitalize font-medium text-center ${
                        selectedLangs.has(lang) ? "text-white" : "text-gray-300"
                      }`}
                    >
                      {lang}
                    </Text>
                    {selectedLangs.has(lang) && (
                      <View className=" bg-purple-400 rounded-full p-1">
                        <Check size={12} color="#000" />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Action Buttons */}
        <View className="mt-4">
          <TouchableOpacity
            onPress={handleContinue}
            className="bg-purple-600 rounded-full py-4 px-6"
            activeOpacity={0.8}
          >
            <View className="flex-row justify-center items-center">
              <Text className="text-white text-center font-bold text-lg">
                Save Preferences
              </Text>
              <ChevronRight size={20} color="#fff" className="ml-1" />
            </View>
          </TouchableOpacity>

          {/* <TouchableOpacity
            onPress={handleSkip}
            className="py-3 mt-3"
            activeOpacity={0.6}
          >
            <Text className="text-gray-400 text-center font-medium">
              Skip for now
            </Text>
          </TouchableOpacity> */}
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};

export default LanguagePreference;

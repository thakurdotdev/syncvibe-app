import { useTheme } from "@/context/ThemeContext";
import { useUser } from "@/context/UserContext";
import { router } from "expo-router";
import { EditIcon } from "lucide-react-native";
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function EditProfileScreen() {
  const { user } = useUser();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState(user?.name || "");
  const [username, setUsername] = useState(user?.username || "");
  const [bio, setBio] = useState(user?.bio || "");

  const handleSave = async () => {
    try {
      router.back();
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        contentContainerStyle={{
          padding: 20,

          paddingBottom: Math.max(insets.bottom, 20),
        }}
      >
        <View style={{ gap: 20 }}>
          <Input
            labelText="Name"
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            variant="filled"
          />

          <Input
            labelText="Username"
            value={username}
            onChangeText={setUsername}
            placeholder="Enter your username"
            variant="filled"
          />

          <Input
            labelText="Bio"
            value={bio}
            onChangeText={setBio}
            placeholder="Tell us about yourself"
            variant="filled"
            multiline
            inputStyle={{ minHeight: 100, textAlignVertical: "top" }}
          />

          <Button
            onPress={handleSave}
            variant="default"
            size="lg"
            style={{ marginTop: 20 }}
          >
            Save Changes
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

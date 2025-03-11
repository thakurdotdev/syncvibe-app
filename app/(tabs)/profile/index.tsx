import { API_URL } from "@/constants";
import { useUser } from "@/context/UserContext";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import axios from "axios";
import { router } from "expo-router";
import { LanguagesIcon, Music2Icon } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface StatButtonProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  onPress: () => void;
}

interface ProfileSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

const ProfileSection = ({ title, icon, children }: ProfileSectionProps) => (
  <View className="bg-gray-800/60 backdrop-blur-lg rounded-xl p-4 mb-4 shadow-lg">
    <View className="flex-row items-center mb-2">
      {icon}
      <Text className="text-xl font-semibold ml-2 text-white">{title}</Text>
    </View>
    {children}
  </View>
);

const StatButton = ({ icon, label, value, onPress }: StatButtonProps) => (
  <TouchableOpacity
    onPress={onPress}
    className="flex flex-row w-1/2 justify-center gap-3 items-center bg-gray-800/40 backdrop-blur-lg rounded-xl p-4 mx-1 shadow-lg border border-gray-700/30"
  >
    {icon}
    <Text className="text-white text-lg font-semibold">{value}</Text>
    <Text className="text-gray-400 text-sm">{label}</Text>
  </TouchableOpacity>
);

export default function ProfileScreen() {
  const { user, logout, getProfile } = useUser();
  const [loading, setLoading] = useState(false);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);

  const fetchFollowData = useCallback(async () => {
    try {
      const response = await axios.get(
        `${API_URL}/api/user/followlist/${user?.userid}`,
        {
          withCredentials: true,
        },
      );
      if (response.status === 200) {
        setFollowers(response.data.followers);
        setFollowing(response.data.following);
      }
    } catch (error) {
      throw new Error("Error fetching user");
    }
  }, [user?.userid]);

  useEffect(() => {
    if (user?.userid) {
      fetchFollowData();
    }
  }, [user?.userid, fetchFollowData]);

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace("/");
          },
        },
      ],
      { cancelable: true },
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-black justify-center items-center">
        <ActivityIndicator size="small" color="#3b82f6" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-black">
      <View className="p-4">
        {/* Profile Header */}
        <View className="items-center mt-4 mb-6">
          <View className="relative">
            <View className="w-32 h-32 rounded-full bg-gray-800/60 backdrop-blur-lg overflow-hidden border-2 border-blue-500/30 shadow-lg">
              <Image
                source={{ uri: user?.profilepic }}
                className="w-full h-full"
              />
            </View>
            <TouchableOpacity
              className="absolute bottom-0 right-0 bg-blue-500 p-2 rounded-full shadow-lg border-2 border-black"
              onPress={() => router.push("/update-profile-picture")}
            >
              <Feather name="camera" size={20} color="white" />
            </TouchableOpacity>
          </View>
          <View className="mt-4 items-center">
            <View className="flex-row items-center">
              <Text className="text-white text-2xl font-bold">
                {user?.name}
              </Text>
              {user?.verified && (
                <MaterialCommunityIcons
                  name="check-decagram"
                  size={24}
                  color="#3b82f6"
                  className="ml-2"
                />
              )}
            </View>
            <Text className="text-gray-400 text-lg">@{user?.username}</Text>
            {user?.bio && (
              <Text className="text-gray-300 text-center mt-2 px-4 max-w-md">
                {user.bio}
              </Text>
            )}
          </View>
        </View>

        {/* Stats Section */}
        {/* <View className="flex-row justify-between mb-6">
          <StatButton
            icon={<Ionicons name="people" size={24} color="#10b981" />}
            label="Following"
            value={following.length}
            onPress={() => router.push("/following")}
          />
          <StatButton
            icon={<Ionicons name="people" size={24} color="#10b981" />}
            label="Followers"
            value={followers.length}
            onPress={() => router.push("/followers")}
          />
        </View> */}

        {/* Profile Management */}
        <ProfileSection
          title="Profile Settings"
          icon={<Ionicons name="person" size={24} color="#3b82f6" />}
        >
          <TouchableOpacity
            className="flex-row items-center justify-between py-3"
            onPress={() => router.push("/edit-profile")}
          >
            <View className="flex-row items-center">
              <Feather name="edit-2" size={20} color="#9ca3af" />
              <Text className="text-white ml-3">Edit Profile</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </ProfileSection>

        <ProfileSection
          title="Music Preferences"
          icon={<Music2Icon color="#fff" size="20px" />}
        >
          <TouchableOpacity
            className="flex-row items-center justify-between py-3"
            onPress={() => router.push("/music-language")}
          >
            <View className="flex-row items-center">
              <LanguagesIcon size={20} color="#9ca3af" />
              <Text className="text-white ml-3">
                Update Language Preferences
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </ProfileSection>

        {/* Theme Settings */}
        {/* <ProfileSection
          title="Theme Settings"
          icon={<Ionicons name="color-palette" size={24} color="#8b5cf6" />}
        >
          <View className="py-3">
            <ThemeToggle />
          </View>
        </ProfileSection> */}

        {/* Account Security */}
        <ProfileSection
          title="Account Security"
          icon={
            <MaterialCommunityIcons
              name="shield-check"
              size={24}
              color="#10b981"
            />
          }
        >
          {/* {user?.logintype === "EMAILPASSWORD" && (
            <TouchableOpacity
              className="flex-row items-center justify-between py-3 border-b border-gray-700/30"
              onPress={() => router.push("/change-password")}
            >
              <View className="flex-row items-center">
                <Feather name="lock" size={20} color="#9ca3af" />
                <Text className="text-white ml-3">Change Password</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )} */}

          {/* {user?.passkeyEnabled && (
            <TouchableOpacity
              className="flex-row items-center justify-between py-3 border-b border-gray-700/30"
              onPress={() => router.push("/passkey-manager")}
            >
              <View className="flex-row items-center">
                <MaterialCommunityIcons
                  name="fingerprint"
                  size={20}
                  color="#9ca3af"
                />
                <Text className="text-white ml-3">Manage Passkeys</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )} */}

          <TouchableOpacity
            className="flex-row items-center justify-between py-3"
            onPress={handleLogout}
          >
            <View className="flex-row items-center">
              <Feather name="log-out" size={20} color="#ef4444" />
              <Text className="text-red-500 ml-3">Logout</Text>
            </View>
          </TouchableOpacity>
        </ProfileSection>

        {/* Danger Zone */}
        {/* <View className="bg-red-900/20 backdrop-blur-lg rounded-xl p-4 mt-4 border border-red-500/30">
          <View className="justify-between">
            <View>
              <Text className="text-xl font-semibold text-red-400">
                Delete Account
              </Text>
              <Text className="text-red-400/80 text-sm mt-1">
                Permanently remove your account and all associated data
              </Text>
            </View>
            <TouchableOpacity
              className="bg-red-500 px-4 py-2 rounded-lg mt-3 shadow-lg"
              onPress={() => router.push("/delete-account")}
            >
              <Text className="text-white font-semibold">Delete Account</Text>
            </TouchableOpacity>
          </View>
        </View> */}
      </View>
    </ScrollView>
  );
}

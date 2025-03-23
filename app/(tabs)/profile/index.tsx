import LoginScreen from "@/app/login";
import LoginModal from "@/components/LoginModal";
import { useUser } from "@/context/UserContext";
import { getProfileCloudinaryUrl } from "@/utils/Cloudinary";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  ChevronRightIcon,
  EditIcon,
  LanguagesIcon,
  LogOutIcon,
  Music2Icon,
  ShieldCheckIcon,
} from "lucide-react-native";
import { MotiView } from "moti";
import React, { useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

// Improved ProfileSection with subtle animation and cleaner design
const ProfileSection = ({ title, icon, children }: ProfileSectionProps) => (
  <MotiView
    from={{ opacity: 0, translateY: 10 }}
    animate={{ opacity: 1, translateY: 0 }}
    transition={{ type: "timing", duration: 500 }}
    className="mb-5 overflow-hidden rounded-2xl"
  >
    <BlurView
      intensity={20}
      tint="dark"
      className="overflow-hidden rounded-2xl"
    >
      <LinearGradient
        colors={["rgba(30, 30, 40, 0.7)", "rgba(20, 20, 28, 0.8)"]}
        className="p-5 border border-gray-800/30 rounded-2xl"
      >
        <View className="flex-row items-center mb-3">
          <View className="bg-gray-800/80 p-2 rounded-lg mr-3">{icon}</View>
          <Text className="text-xl font-semibold text-white">{title}</Text>
        </View>
        {children}
      </LinearGradient>
    </BlurView>
  </MotiView>
);

// Enhanced StatButton with improved visual feedback
const StatButton = ({ icon, label, value, onPress }: StatButtonProps) => (
  <TouchableOpacity onPress={onPress} className="flex-1" activeOpacity={0.8}>
    <LinearGradient
      colors={["rgba(30, 30, 40, 0.7)", "rgba(20, 20, 28, 0.8)"]}
      className="rounded-2xl border border-gray-800/30 overflow-hidden flex-1"
    >
      <BlurView
        intensity={20}
        tint="dark"
        className="p-2 flex-1 flex-row items-center justify-center gap-2"
      >
        <View className="bg-blue-500/20 p-2.5 rounded-full">{icon}</View>
        <Text className="text-white text-xl font-bold">{value}</Text>
        <Text className="text-gray-400 text-sm">{label}</Text>
      </BlurView>
    </LinearGradient>
  </TouchableOpacity>
);

// Styled menu item for better consistency
const MenuItem = ({
  icon,
  label,
  onPress,
  color = "#fff",
  showChevron = true,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  color?: string;
  showChevron?: boolean;
}) => (
  <TouchableOpacity
    className="flex-row items-center justify-between py-3.5 border-b border-gray-800/30 last:border-b-0"
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View className="flex-row items-center">
      {icon}
      <Text style={{ color }} className="ml-3 text-base">
        {label}
      </Text>
    </View>
    {showChevron && <ChevronRightIcon size={20} color="#9ca3af" />}
  </TouchableOpacity>
);

export default function ProfileScreen() {
  const { user, logout, getProfile, loading, followers, following } = useUser();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const getUser = async () => {
      const token = await AsyncStorage.getItem("token");
      if (!user && token) {
        getProfile();
      }
    };

    getUser();
  }, [user, getProfile]);

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
            router.replace("/(tabs)/home");
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
    <View className="flex-1 bg-black">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: insets.top,
          paddingBottom: Math.max(insets.bottom, 20),
        }}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={["#0000", "#111827"]}
          className="pt-6 pb-12 px-5"
        >
          <View className="items-center">
            <MotiView
              from={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "timing", duration: 700 }}
              className="relative"
            >
              {/* Profile Image with Glow Effect */}
              <View className="w-28 h-28 rounded-full bg-blue-500/10 justify-center items-center">
                <View className="w-24 h-24 rounded-full bg-gray-800/60 overflow-hidden border-2 border-blue-500/50 shadow-lg shadow-blue-500/20">
                  <Image
                    source={{ uri: getProfileCloudinaryUrl(user?.profilepic) }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                </View>
              </View>
              <TouchableOpacity
                className="absolute bottom-0 right-0 bg-blue-500 p-2 rounded-full shadow-lg border-2 border-black"
                onPress={() => router.push("/update-profile-picture")}
                activeOpacity={0.8}
              >
                <Feather name="camera" size={18} color="white" />
              </TouchableOpacity>
            </MotiView>

            <View className="mt-4 items-center">
              <View className="flex-row items-center">
                <Text className="text-white text-2xl font-bold">
                  {user?.name}
                </Text>
                {user?.verified && (
                  <MaterialCommunityIcons
                    name="check-decagram"
                    size={20}
                    color="#3b82f6"
                    style={{ marginLeft: 6 }}
                  />
                )}
              </View>
              {user?.username && (
                <Text className="text-gray-400 text-base mt-0.5">
                  @{user?.username}
                </Text>
              )}

              {user?.bio && (
                <Text className="text-gray-300 text-center mt-3 px-8 max-w-md">
                  {user.bio}
                </Text>
              )}
            </View>
          </View>
        </LinearGradient>

        {/* Stats Section */}
        <View className="px-5 mt-2">
          <View className="flex-row justify-between gap-2">
            <StatButton
              icon={<Ionicons name="people" size={24} color="#10b981" />}
              label="Following"
              value={following.length}
              onPress={() => router.push("/followings")}
            />
            <StatButton
              icon={<Ionicons name="people" size={24} color="#10b981" />}
              label="Followers"
              value={followers.length}
              onPress={() => router.push("/followers")}
            />
          </View>
        </View>

        {/* Main Content */}
        <View className="px-5 mt-6">
          {/* Profile Management */}
          <ProfileSection
            title="Profile Settings"
            icon={<Ionicons name="person" size={22} color="#3b82f6" />}
          >
            <MenuItem
              icon={<EditIcon size={18} color="#9ca3af" />}
              label="Edit Profile"
              onPress={() => router.push("/edit-profile")}
            />
          </ProfileSection>

          <ProfileSection
            title="Music Preferences"
            icon={<Music2Icon color="#f59e0b" size={22} />}
          >
            <MenuItem
              icon={<LanguagesIcon size={18} color="#9ca3af" />}
              label="Update Language Preferences"
              onPress={() => router.push("/music-language")}
            />
          </ProfileSection>

          <ProfileSection
            title="Account Security"
            icon={<ShieldCheckIcon size={22} color="#10b981" />}
          >
            <MenuItem
              icon={<LogOutIcon size={18} color="#ef4444" />}
              label="Logout"
              color="#ef4444"
              showChevron={false}
              onPress={handleLogout}
            />
          </ProfileSection>
        </View>
      </ScrollView>
      {!user && <LoginModal />}
    </View>
  );
}

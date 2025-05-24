import LoginScreen from "@/app/login";
import DeveloperProfileModal from "@/components/DeveloperProfileModal";
import Card from "@/components/ui/card";
import { useTheme } from "@/context/ThemeContext";
import { useUser } from "@/context/UserContext";
import { getOptimizedImageUrl } from "@/utils/Cloudinary";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  BellIcon,
  ChevronRightIcon,
  Code2Icon,
  EditIcon,
  HeartIcon,
  LanguagesIcon,
  LaptopIcon,
  LogOutIcon,
  MoonIcon,
  Music2Icon,
  ShieldCheckIcon,
  SunIcon,
  UserIcon,
} from "lucide-react-native";
import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ThemeToggle = memo(() => {
  const { colors, setTheme, themePreference } = useTheme();

  const selectedTheme = themePreference;

  const handleThemeChange = useCallback(
    (newTheme: "light" | "system" | "dark") => {
      setTheme(newTheme);
    },
    [setTheme],
  );

  const themeButtons = useMemo(
    () => (
      <View
        style={{
          flexDirection: "row",
          backgroundColor: colors.secondary,
          borderRadius: 20,
          padding: 4,
        }}
      >
        <TouchableOpacity
          onPress={() => handleThemeChange("light")}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 16,
            backgroundColor:
              selectedTheme === "light" ? colors.primary : "transparent",
            marginRight: 4,
          }}
          activeOpacity={0.7}
        >
          <SunIcon
            size={20}
            color={
              selectedTheme === "light"
                ? colors.primaryForeground
                : colors.mutedForeground
            }
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleThemeChange("system")}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 16,
            backgroundColor:
              selectedTheme === "system" ? colors.primary : "transparent",
            marginRight: 4,
          }}
          activeOpacity={0.7}
        >
          <LaptopIcon
            size={20}
            color={
              selectedTheme === "system"
                ? colors.primaryForeground
                : colors.mutedForeground
            }
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleThemeChange("dark")}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 16,
            backgroundColor:
              selectedTheme === "dark" ? colors.primary : "transparent",
          }}
          activeOpacity={0.7}
        >
          <MoonIcon
            size={20}
            color={
              selectedTheme === "dark"
                ? colors.primaryForeground
                : colors.mutedForeground
            }
          />
        </TouchableOpacity>
      </View>
    ),
    [colors, selectedTheme, handleThemeChange],
  );

  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <Text
          style={{
            color: colors.foreground,
            fontSize: 16,
            fontWeight: "600",
          }}
        >
          Theme
        </Text>
        {themeButtons}
      </View>
    </View>
  );
});

const SettingItem = ({
  icon,
  title,
  subtitle,
  onPress,
  isDestructive = false,
  colors,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress: () => void;
  isDestructive?: boolean;
  colors: any;
}) => {
  const [pressScale] = useState(new Animated.Value(1));

  const handlePressIn = () => {
    Animated.spring(pressScale, {
      toValue: 0.97,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressScale, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
    >
      <Animated.View
        style={{
          transform: [{ scale: pressScale }],
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 16,
          paddingHorizontal: 16,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <View
            style={{
              backgroundColor: colors.secondary,
              borderRadius: 12,
              padding: 10,
              marginRight: 12,
            }}
          >
            {icon}
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: isDestructive ? colors.destructive : colors.foreground,
                fontSize: 16,
                fontWeight: "500",
              }}
            >
              {title}
            </Text>
            {subtitle && (
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontSize: 14,
                  marginTop: 4,
                }}
              >
                {subtitle}
              </Text>
            )}
          </View>
        </View>
        {!isDestructive && (
          <ChevronRightIcon size={20} color={colors.mutedForeground} />
        )}
      </Animated.View>
    </Pressable>
  );
};

export default function ProfileScreen() {
  const { user, logout, getProfile, loading } = useUser();
  const { colors, theme } = useTheme();
  const [avatarScale] = useState(new Animated.Value(1));
  const [open, setOpen] = useState(false);
  const [showDeveloperModal, setShowDeveloperModal] = useState(false);

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
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Animated.ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={{ marginBottom: 24 }}>
          <LinearGradient
            colors={[colors.primary, `${colors.primary}95`, colors.background]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{
              height: 280,
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
            }}
          />

          {/* Profile Info */}
          <View style={{ paddingTop: 32, paddingHorizontal: 24 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 20,
              }}
            >
              {/* Avatar */}
              <Pressable
                onPress={() => router.push("/update-profile-picture")}
                style={{
                  shadowColor: colors.primary,
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.25,
                  shadowRadius: 12,
                  elevation: 10,
                }}
              >
                <Animated.View
                  style={{
                    transform: [{ scale: avatarScale }],
                  }}
                >
                  <Image
                    source={{ uri: getOptimizedImageUrl(user?.profilepic) }}
                    style={{
                      width: 100,
                      height: 100,
                      borderRadius: 10,
                      borderWidth: 3,
                      borderColor: colors.background,
                    }}
                    resizeMode="cover"
                  />
                  <Pressable
                    style={{
                      position: "absolute",
                      bottom: -6,
                      right: -6,
                      backgroundColor: colors.primary,
                      borderRadius: 12,
                      width: 32,
                      height: 32,
                      justifyContent: "center",
                      alignItems: "center",
                      borderWidth: 2,
                      borderColor: colors.background,
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.2,
                      shadowRadius: 4,
                      elevation: 4,
                    }}
                    onPress={() => setOpen(true)}
                  >
                    <Feather
                      name="camera"
                      size={14}
                      color={colors.background}
                    />
                  </Pressable>
                </Animated.View>
              </Pressable>

              {/* Name and Username */}
              <View style={{ flex: 1, paddingTop: 6 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 6,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 24,
                      fontWeight: "700",
                      color: colors.background,
                      letterSpacing: -0.5,
                    }}
                  >
                    {user?.name}
                  </Text>
                  {user?.verified && (
                    <MaterialCommunityIcons
                      name="check-decagram"
                      size={22}
                      color={colors.background}
                      style={{ opacity: 0.9 }}
                    />
                  )}
                </View>
                {user?.username && (
                  <Text
                    style={{
                      fontSize: 15,
                      color: `${colors.background}CC`,
                      marginTop: 2,
                    }}
                  >
                    @{user?.username}
                  </Text>
                )}
                {user?.email && (
                  <Text
                    style={{
                      fontSize: 15,
                      color: `${colors.background}CC`,
                      marginTop: 2,
                    }}
                  >
                    {user?.email}
                  </Text>
                )}
              </View>
            </View>
          </View>
        </View>
        <View style={{ padding: 20, gap: 16 }}>
          {/* Appearance Section */}
          <Card variant="default">
            <Card.Header>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View
                  style={{
                    backgroundColor: colors.secondary,
                    borderRadius: 12,
                    padding: 10,
                    marginRight: 12,
                  }}
                >
                  <Ionicons
                    name={theme === "dark" ? "moon" : "sunny"}
                    size={22}
                    color={colors.primary}
                  />
                </View>
                <Card.Title>Appearance</Card.Title>
              </View>
            </Card.Header>
            <Card.Content>
              <ThemeToggle />
            </Card.Content>
          </Card>

          {/* Account Section */}
          <Card variant="default">
            <Card.Header>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View
                  style={{
                    backgroundColor: colors.secondary,
                    borderRadius: 12,
                    padding: 10,
                    marginRight: 12,
                  }}
                >
                  <UserIcon size={22} color={colors.primary} />
                </View>
                <Card.Title>Account</Card.Title>
              </View>
            </Card.Header>
            <Card.Content>
              <SettingItem
                icon={<EditIcon size={20} color={colors.mutedForeground} />}
                title="Edit Profile"
                subtitle="Update your personal information"
                onPress={() => router.push("/edit-profile")}
                colors={colors}
              />
              <SettingItem
                icon={<BellIcon size={20} color={colors.mutedForeground} />}
                title="Notifications"
                subtitle="Manage your notification preferences"
                onPress={() => router.push("/notification-settings")}
                colors={colors}
              />
            </Card.Content>
          </Card>

          {/* Music Section */}
          <Card variant="default">
            <Card.Header>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View
                  style={{
                    backgroundColor: colors.secondary,
                    borderRadius: 12,
                    padding: 10,
                    marginRight: 12,
                  }}
                >
                  <Music2Icon color={colors.primary} size={22} />
                </View>
                <Card.Title>Music</Card.Title>
              </View>
            </Card.Header>
            <Card.Content>
              <SettingItem
                icon={
                  <LanguagesIcon size={20} color={colors.mutedForeground} />
                }
                title="Language Preferences"
                subtitle="Set your preferred music languages"
                onPress={() => router.push("/music-language")}
                colors={colors}
              />
              <SettingItem
                icon={<HeartIcon size={20} color={colors.mutedForeground} />}
                title="Favorite Genres"
                subtitle="Manage your music preferences"
                onPress={() => router.push("/favorite-genres")}
                colors={colors}
              />
            </Card.Content>
          </Card>

          {/* Security Section */}
          <Card variant="default">
            <Card.Header>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View
                  style={{
                    backgroundColor: colors.secondary,
                    borderRadius: 12,
                    padding: 10,
                    marginRight: 12,
                  }}
                >
                  <ShieldCheckIcon size={22} color={colors.primary} />
                </View>
                <Card.Title>Security</Card.Title>
              </View>
            </Card.Header>
            <Card.Content>
              <SettingItem
                icon={<LogOutIcon size={20} color={colors.destructive} />}
                title="Logout"
                subtitle="Sign out of your account"
                onPress={handleLogout}
                colors={colors}
                isDestructive={true}
              />
            </Card.Content>
          </Card>

          {/* About Section */}
          <Card variant="default">
            <Card.Header>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View
                  style={{
                    backgroundColor: colors.secondary,
                    borderRadius: 12,
                    padding: 10,
                    marginRight: 12,
                  }}
                >
                  <Feather name="info" size={22} color={colors.primary} />
                </View>
                <Card.Title>About</Card.Title>
              </View>
            </Card.Header>
            <Card.Content>
              <SettingItem
                icon={<Code2Icon size={20} color={colors.mutedForeground} />}
                title="Developer Info"
                subtitle="Meet the developer behind SyncVibe"
                onPress={() => setShowDeveloperModal(true)}
                colors={colors}
              />
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 12,
                }}
              >
                <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
                  SyncVibe v1.0.0
                </Text>
              </View>
            </Card.Content>
          </Card>
        </View>
      </Animated.ScrollView>

      {/* Developer Profile Modal */}
      <DeveloperProfileModal
        isVisible={showDeveloperModal}
        onClose={() => setShowDeveloperModal(false)}
      />
    </SafeAreaView>
  );
}

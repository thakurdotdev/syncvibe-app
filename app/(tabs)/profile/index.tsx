import LoginScreen from "@/app/login";
import DeveloperProfileModal from "@/components/DeveloperProfileModal";
import Card from "@/components/ui/card";
import { useTheme } from "@/context/ThemeContext";
import { useUser } from "@/context/UserContext";
import { getProfileCloudinaryUrl } from "@/utils/Cloudinary";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
import React, { memo, useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

// Theme Toggle Component
const ThemeToggle = memo(() => {
  const {
    theme,
    colors,
    setTheme,
    themePreference,
    colorPalette,
    setColorPalette,
    availablePalettes,
  } = useTheme();
  const [animatedBackground] = useState(new Animated.Value(0));

  const selectedTheme = themePreference;

  const handleThemeChange = useCallback(
    (newTheme: "light" | "system" | "dark") => {
      Animated.timing(animatedBackground, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start(() => {
        setTheme(newTheme);
        animatedBackground.setValue(0);
      });
    },
    [setTheme, animatedBackground],
  );

  const handlePaletteChange = useCallback(
    (newPalette: keyof typeof availablePalettes) => {
      Animated.timing(animatedBackground, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start(() => {
        setColorPalette(newPalette);
        animatedBackground.setValue(0);
      });
    },
    [setColorPalette, animatedBackground],
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
      </View>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 16,
        }}
      >
        <Text
          style={{
            color: colors.foreground,
            fontSize: 16,
            fontWeight: "600",
          }}
        >
          Color Palette
        </Text>
        <View
          style={{
            flexDirection: "row",
            backgroundColor: colors.secondary,
            borderRadius: 20,
            padding: 4,
          }}
        >
          {Object.entries(availablePalettes).map(([key, palette]) => (
            <TouchableOpacity
              key={key}
              onPress={() =>
                handlePaletteChange(key as keyof typeof availablePalettes)
              }
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
                backgroundColor:
                  colorPalette === key ? colors.primary : "transparent",
                marginRight: key === "default" ? 4 : 0,
              }}
              activeOpacity={0.7}
            >
              <Text
                style={{
                  color:
                    colorPalette === key
                      ? colors.primaryForeground
                      : colors.mutedForeground,
                  fontSize: 14,
                  fontWeight: colorPalette === key ? "600" : "400",
                }}
              >
                {palette.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
});

// Setting Item Component
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

// Stats Card Component
const StatsCard = ({
  count,
  label,
  onPress,
  colors,
  icon,
}: {
  count: number;
  label: string;
  onPress: () => void;
  colors: any;
  icon: React.ReactNode;
}) => {
  const [scale] = useState(new Animated.Value(1));

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={{ flex: 1 }}
    >
      <Animated.View style={{ transform: [{ scale }], flex: 1 }}>
        <Card variant="secondary" className="flex-1">
          <Card.Content className="flex-1 p-4">
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  backgroundColor: colors.primary + "20", // semi-transparent version of primary color
                  borderRadius: 12,
                  padding: 10,
                  marginRight: 12,
                }}
              >
                {icon}
              </View>
              <View>
                <Text
                  style={{
                    fontSize: 28,
                    fontWeight: "bold",
                    color: colors.foreground,
                  }}
                >
                  {count}
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: colors.mutedForeground,
                  }}
                >
                  {label}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      </Animated.View>
    </Pressable>
  );
};

export default function ProfileScreen() {
  const { user, logout, getProfile, loading, followers, following } = useUser();
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();
  const [avatarScale] = useState(new Animated.Value(1));
  const [open, setOpen] = useState(false);
  const [showDeveloperModal, setShowDeveloperModal] = useState(false);
  const scrollY = new Animated.Value(0);

  const headerHeight = insets.top + 60;
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, headerHeight],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, headerHeight],
    outputRange: [-headerHeight, 0],
    extrapolate: "clamp",
  });

  const pulseAvatar = () => {
    Animated.sequence([
      Animated.timing(avatarScale, {
        toValue: 1.05,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(avatarScale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

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
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Fixed Header */}
      <View
        style={{
          height: headerHeight,
          backgroundColor: colors.background,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingTop: insets.top,
        }}
      >
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              overflow: "hidden",
              marginRight: 12,
            }}
          >
            <Image
              source={{
                uri: "https://res.cloudinary.com/dr7lkelwl/image/upload/c_thumb,h_200,w_200/r_max/f_auto/v1736541047/posts/sjzxfa31iet8ftznv2mo.webp",
              }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
          </View>
        </View>
        <TouchableOpacity
          onPress={() => setShowDeveloperModal(true)}
          style={{
            padding: 8,
            borderRadius: 20,
            backgroundColor: colors.secondary,
          }}
        >
          <Code2Icon size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingTop: 20,
          paddingBottom: Math.max(insets.bottom, 30),
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingBottom: 20,
          }}
        >
          <View style={{ alignItems: "center" }}>
            <Pressable
              onPress={() => {
                pulseAvatar();
                router.push("/update-profile-picture");
              }}
              style={{ marginBottom: 20 }}
            >
              <Animated.View
                style={{
                  transform: [{ scale: avatarScale }],
                  position: "relative",
                }}
              >
                <View
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: 60,
                    borderWidth: 3,
                    borderColor: colors.primary,
                    padding: 2,
                    justifyContent: "center",
                    alignItems: "center",
                    shadowColor: colors.primary,
                    shadowOffset: {
                      width: 0,
                      height: 4,
                    },
                    shadowOpacity: 0.2,
                    shadowRadius: 8,
                    elevation: 5,
                    backgroundColor: colors.background,
                  }}
                >
                  <View
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: 55,
                      overflow: "hidden",
                    }}
                  >
                    <Image
                      source={{
                        uri: getProfileCloudinaryUrl(user?.profilepic),
                      }}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="cover"
                    />
                  </View>
                </View>

                <Pressable
                  style={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    backgroundColor: colors.primary,
                    borderRadius: 20,
                    padding: 8,
                    borderWidth: 2,
                    borderColor: colors.background,
                  }}
                  onPress={() => setOpen(true)}
                >
                  <Feather
                    name="camera"
                    size={16}
                    color={colors.primaryForeground}
                  />
                </Pressable>
              </Animated.View>
            </Pressable>

            <View style={{ alignItems: "center", marginBottom: 16 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 4,
                }}
              >
                <Text
                  style={{
                    fontSize: 24,
                    fontWeight: "bold",
                    color: colors.foreground,
                  }}
                >
                  {user?.name}
                </Text>
                {user?.verified && (
                  <MaterialCommunityIcons
                    name="check-decagram"
                    size={20}
                    color={colors.primary}
                    style={{ marginLeft: 6 }}
                  />
                )}
              </View>

              {user?.username && (
                <Text
                  style={{
                    fontSize: 16,
                    color: colors.mutedForeground,
                    marginBottom: 8,
                  }}
                >
                  @{user?.username}
                </Text>
              )}

              {user?.bio && (
                <Text
                  style={{
                    textAlign: "center",
                    color: colors.foreground,
                    lineHeight: 20,
                    maxWidth: width - 80,
                    marginBottom: 16,
                  }}
                >
                  {user.bio}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Stats Section */}
        <View
          style={{
            flexDirection: "row",
            gap: 16,
            paddingHorizontal: 20,
            marginBottom: 20,
          }}
        >
          <StatsCard
            count={following.length}
            label="Following"
            onPress={() => router.push("/followings")}
            colors={colors}
            icon={<UserIcon size={22} color={colors.primary} />}
          />
          <StatsCard
            count={followers.length}
            label="Followers"
            onPress={() => router.push("/followers")}
            colors={colors}
            icon={<HeartIcon size={22} color={colors.primary} />}
          />
        </View>

        {/* Settings Sections */}
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
        </View>

        {/* App Version */}
        <View
          style={{
            alignItems: "center",
            paddingVertical: 20,
            paddingBottom: Math.max(insets.bottom, 20),
          }}
        >
          <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>
            SyncVibe v1.0.0
          </Text>
        </View>
      </Animated.ScrollView>

      {/* Developer Profile Modal */}
      <DeveloperProfileModal
        isVisible={showDeveloperModal}
        onClose={() => setShowDeveloperModal(false)}
      />
    </View>
  );
}

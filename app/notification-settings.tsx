import { useTheme } from "@/context/ThemeContext";
import { useUser } from "@/context/UserContext";
import { router } from "expo-router";
import { BellIcon, MessageSquareIcon, VideoIcon } from "lucide-react-native";
import React, { useState } from "react";
import { View, Text, ScrollView, Switch } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";

export default function NotificationSettingsScreen() {
  const { user } = useUser();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [notifications, setNotifications] = useState({
    messages: true,
    videoCalls: true,
    sound: true,
    vibration: true,
  });

  const handleSave = async () => {
    try {
      // TODO: Save notification preferences to backend
      router.back();
    } catch (error) {
      console.error("Error updating notification settings:", error);
    }
  };

  const NotificationToggle = ({
    title,
    description,
    icon: Icon,
    value,
    onValueChange,
  }: {
    title: string;
    description: string;
    icon: React.ComponentType<any>;
    value: boolean;
    onValueChange: (value: boolean) => void;
  }) => (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View
          style={{
            backgroundColor: colors.secondary,
            padding: 8,
            borderRadius: 8,
          }}
        >
          <Icon size={20} color={colors.primary} />
        </View>
        <View>
          <Text
            style={{
              color: colors.foreground,
              fontSize: 16,
              fontWeight: "500",
            }}
          >
            {title}
          </Text>
          <Text
            style={{
              color: colors.mutedForeground,
              fontSize: 14,
            }}
          >
            {description}
          </Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={colors.background}
      />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          padding: 20,
          paddingBottom: Math.max(insets.bottom, 20),
        }}
      >
        <View style={{ gap: 20 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              marginBottom: 8,
            }}
          >
            <BellIcon size={24} color={colors.primary} />
            <Text
              style={{
                color: colors.foreground,
                fontSize: 24,
                fontWeight: "600",
              }}
            >
              Notifications
            </Text>
          </View>

          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <NotificationToggle
              title="Message Notifications"
              description="Get notified when you receive new messages"
              icon={MessageSquareIcon}
              value={notifications.messages}
              onValueChange={(value) =>
                setNotifications({ ...notifications, messages: value })
              }
            />
            <NotificationToggle
              title="Video Call Notifications"
              description="Get notified when someone wants to video call"
              icon={VideoIcon}
              value={notifications.videoCalls}
              onValueChange={(value) =>
                setNotifications({ ...notifications, videoCalls: value })
              }
            />
          </View>

          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <NotificationToggle
              title="Sound"
              description="Play sound for notifications"
              icon={BellIcon}
              value={notifications.sound}
              onValueChange={(value) =>
                setNotifications({ ...notifications, sound: value })
              }
            />
            <NotificationToggle
              title="Vibration"
              description="Vibrate for notifications"
              icon={BellIcon}
              value={notifications.vibration}
              onValueChange={(value) =>
                setNotifications({ ...notifications, vibration: value })
              }
            />
          </View>

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
    </View>
  );
}

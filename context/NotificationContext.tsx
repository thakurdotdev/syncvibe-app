import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import * as Notifications from "expo-notifications";
import { registerForPushNotificationsAsync } from "@/utils/registerForPushNotificationsAsync";
import { useChat } from "./SocketContext";
import { useUser } from "./UserContext";
import useApi from "@/utils/hooks/useApi";

type NotificationContextType = {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
};

const NotificationContext = createContext<NotificationContextType>({
  expoPushToken: null,
  notification: null,
});

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const api = useApi();
  const { user } = useUser();
  const { users, setCurrentChat } = useChat();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] =
    useState<Notifications.Notification | null>(null);

  // Store pending chat ID to process when users and user are available
  const [pendingChatId, setPendingChatId] = useState<string | null>(null);

  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();

  useEffect(() => {
    registerForPushNotificationsAsync().then((token) =>
      setExpoPushToken(token || null),
    );

    // This listener is fired whenever a notification is received while the app is foregrounded
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        setNotification(notification);
      });

    // This listener is fired whenever a user taps on or interacts with a notification
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const chatid = response.notification.request.content.data?.chatid;

        // Instead of trying to process immediately, store the chatid
        if (chatid) {
          setPendingChatId(chatid);
        }
      });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(
          notificationListener.current,
        );
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []); // Remove dependencies to avoid recreating listeners

  // Process pending notifications when users and user are available
  useEffect(() => {
    if (pendingChatId && users.length > 0 && user?.userid) {
      const chat = users.find((u) => u.chatid === pendingChatId);
      if (chat) {
        setCurrentChat(chat);
        setPendingChatId(null);
      }
    }
  }, [pendingChatId, users, user, setCurrentChat]);

  useEffect(() => {
    if (expoPushToken) {
      if (
        user &&
        (!user?.expoPushToken || user.expoPushToken !== expoPushToken)
      )
        setPushToken();
    }
  }, [expoPushToken, user]);

  const setPushToken = async () => {
    if (expoPushToken) {
      try {
        const response = await api.post("/api/mobile/pushToken", {
          expoPushToken,
        });
      } catch (error) {
        console.error("Error saving push token:", error);
      }
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        expoPushToken,
        notification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotification must be used within a NotificationProvider",
    );
  }
  return context;
};

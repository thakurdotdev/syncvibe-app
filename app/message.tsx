import { Message, useChat } from "@/context/SocketContext";
import { useUser } from "@/context/UserContext";
import useApi from "@/utils/hooks/useApi";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Pressable,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { BlurView } from "expo-blur";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInUp,
  SlideInRight,
  SlideInLeft,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";

// Constants for styling
const AVATAR_SIZE = 52;
const ONLINE_INDICATOR_SIZE = 14;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

const formatTime = (date: string) => {
  return new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDate = (date: string) => {
  const messageDate = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (messageDate.toDateString() === today.toDateString()) {
    return "Today";
  } else if (messageDate.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  } else {
    return messageDate.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  }
};

const ChatWithUser = () => {
  const api = useApi();
  const { user } = useUser();
  const loggedInUserId = user?.userid;
  const { currentChat, setCurrentChat, socket, getAllExistingChats } =
    useChat();

  // States
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<ImagePicker.ImagePickerSuccessResult | null>(
    null,
  );
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Animation values
  const inputHeight = useSharedValue(50);
  const attachmentOpacity = useSharedValue(0);
  const headerOpacity = useSharedValue(1);
  const sendButtonScale = useSharedValue(1);

  // Refs
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  // Animated styles
  const inputContainerStyle = useAnimatedStyle(() => ({
    height: inputHeight.value,
  }));

  const attachmentStyle = useAnimatedStyle(() => ({
    opacity: attachmentOpacity.value,
    transform: [
      {
        translateY: interpolate(
          attachmentOpacity.value,
          [0, 1],
          [10, 0],
          Extrapolate.CLAMP,
        ),
      },
    ],
  }));

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [
      {
        translateY: interpolate(
          headerOpacity.value,
          [0, 1],
          [-10, 0],
          Extrapolate.CLAMP,
        ),
      },
    ],
  }));

  const sendButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendButtonScale.value }],
  }));

  const fetchMessages = useCallback(async () => {
    if (!loggedInUserId || !currentChat?.otherUser?.userid) return;
    try {
      setLoading(true);
      const response = await api.get(`/api/get/messages/${currentChat.chatid}`);
      if (response.status === 200) {
        setMessages(response.data.chats);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  }, [
    loggedInUserId,
    currentChat?.otherUser?.userid,
    currentChat?.chatid,
    api,
  ]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (!socket || !loggedInUserId || !currentChat?.otherUser?.userid) return;

    const handleNewMessage = (newMessageReceived: Message) => {
      if (newMessageReceived.chatid === currentChat?.chatid) {
        setMessages((prevMessages) => [...prevMessages, newMessageReceived]);
      }
    };

    socket.on("message-received", handleNewMessage);

    return () => {
      socket.off("message-received", handleNewMessage);
    };
  }, [
    socket,
    loggedInUserId,
    currentChat?.otherUser?.userid,
    currentChat?.chatid,
  ]);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
    }
  }, [messages]);

  const handleSendMessage = useCallback(async () => {
    if (!message.trim() && !file) return;

    try {
      // Animate send button press
      sendButtonScale.value = withSpring(0.8, { damping: 10 });
      setTimeout(() => {
        sendButtonScale.value = withSpring(1);
      }, 200);

      const newMessage = {
        senderid: loggedInUserId,
        content: message,
        createdat: new Date().toISOString(),
        messageid: Date.now(),
        participants: currentChat?.participants,
        chatid: currentChat?.chatid,
        fileurl: file ? filePreview : undefined,
        senderName: user?.name,
      };

      setMessages((prevMessages) => [...prevMessages, newMessage]);
      setMessage("");
      setFile(null);
      setFilePreview(null);

      // Reset attachment animation
      attachmentOpacity.value = withTiming(0);
      inputHeight.value = withTiming(50);

      Keyboard.dismiss();

      socket?.emit("new-message", newMessage);

      // Send typing status as false when message is sent
      socket?.emit("typing", {
        userId: loggedInUserId,
        recipientId: currentChat?.otherUser.userid,
        isTyping: false,
      });

      // Here you would actually call your API to save the message
      const formData = new FormData();
      formData.append("chatid", currentChat?.chatid);
      formData.append("senderid", loggedInUserId);
      formData.append("content", message);
      if (file) {
        formData.append("file", file);
      }

      // Actual API call would go here
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }, [
    message,
    file,
    loggedInUserId,
    currentChat,
    socket,
    filePreview,
    sendButtonScale,
    attachmentOpacity,
    inputHeight,
    user?.name,
  ]);

  const handleTyping = useCallback(
    (text: string) => {
      setMessage(text);

      // Adjust input height for longer messages
      if (text.length > 30) {
        inputHeight.value = withTiming(80);
      } else {
        inputHeight.value = withTiming(50);
      }

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      if (socket && currentChat?.otherUser?.userid) {
        socket.emit("typing", {
          userId: loggedInUserId,
          recipientId: currentChat.otherUser.userid,
          isTyping: true,
        });

        typingTimeoutRef.current = setTimeout(() => {
          if (socket && currentChat?.otherUser?.userid) {
            socket.emit("typing", {
              userId: loggedInUserId,
              recipientId: currentChat.otherUser.userid,
              isTyping: false,
            });
          }
        }, 3000);
      }
    },
    [loggedInUserId, currentChat?.otherUser?.userid, socket, inputHeight],
  );

  // Group messages by date
  const processedMessages = useCallback(() => {
    const result: any[] = [];
    let currentDate = "";

    messages.forEach((msg, index) => {
      const messageDate = formatDate(msg.createdat);

      if (messageDate !== currentDate) {
        result.push({
          id: `date-${messageDate}`,
          type: "date",
          date: messageDate,
        });
        currentDate = messageDate;
      }

      result.push({ ...msg, type: "message" });
    });

    return result;
  }, [messages]);

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    if (item.type === "date") {
      return (
        <Animated.View
          entering={FadeIn.delay(100 * (index % 5))}
          style={styles.dateHeaderContainer}
        >
          <Text style={styles.dateHeaderText}>{item.date}</Text>
        </Animated.View>
      );
    }

    const isOwnMessage = item.senderid === loggedInUserId;

    // Check if this is the first message in a sequence from the same sender
    const isFirstInSequence =
      index === 0 ||
      processedMessages()[index - 1].type === "date" ||
      processedMessages()[index - 1].senderid !== item.senderid;

    return (
      <Animated.View
        entering={
          isOwnMessage ? SlideInRight.delay(100) : SlideInLeft.delay(100)
        }
        style={[
          styles.messageContainer,
          isOwnMessage
            ? styles.ownMessageContainer
            : styles.otherMessageContainer,
        ]}
      >
        {!isOwnMessage && isFirstInSequence && (
          <Image
            source={{ uri: currentChat?.otherUser?.profilepic }}
            style={styles.messageBubbleAvatar}
            defaultSource={require("@/assets/images/icon.png")}
          />
        )}

        <View
          style={[
            styles.messageBubbleWrapper,
            isOwnMessage
              ? styles.ownMessageWrapper
              : styles.otherMessageWrapper,
            isFirstInSequence
              ? {}
              : isOwnMessage
              ? { marginRight: 10 }
              : { marginLeft: 10 },
          ]}
        >
          <View
            style={[
              styles.messageBubble,
              isOwnMessage
                ? styles.ownMessageBubble
                : styles.otherMessageBubble,
              isFirstInSequence
                ? isOwnMessage
                  ? styles.ownFirstBubble
                  : styles.otherFirstBubble
                : {},
            ]}
          >
            {item.fileurl && (
              <TouchableOpacity
                style={styles.imageContainer}
                activeOpacity={0.9}
              >
                <Image
                  source={{ uri: item.fileurl }}
                  style={styles.messageImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            )}
            {item.content && (
              <Text
                style={[
                  styles.messageText,
                  isOwnMessage
                    ? styles.ownMessageText
                    : styles.otherMessageText,
                ]}
              >
                {item.content}
              </Text>
            )}
          </View>
          <Text
            style={[
              styles.timeText,
              isOwnMessage ? styles.ownTimeText : styles.otherTimeText,
            ]}
          >
            {formatTime(item.createdat)}
          </Text>
        </View>
      </Animated.View>
    );
  };

  const renderAttachmentPreview = () => {
    if (!filePreview) return null;

    return (
      <Animated.View
        style={[styles.attachmentPreviewContainer, attachmentStyle]}
      >
        <Image
          source={{ uri: filePreview }}
          style={styles.attachmentPreview}
          resizeMode="cover"
        />
        <TouchableOpacity
          style={styles.removeAttachmentButton}
          onPress={() => {
            setFile(null);
            setFilePreview(null);
            attachmentOpacity.value = withTiming(0);
            inputHeight.value = withTiming(50);
          }}
        >
          <Ionicons name="close-circle" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const pickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status === "granted") {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: "images",
          allowsEditing: true,
          quality: 0.8,
        });

        if (!result.canceled) {
          setFile(result);
          setFilePreview(result.assets[0].uri);
          attachmentOpacity.value = withTiming(1);
          inputHeight.value = withTiming(120);
        }
      }
    } catch (error) {
      console.error("Error picking image:", error);
    }
  };

  const scrollToBottom = () => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <Animated.View style={[styles.header, headerStyle]}>
        <TouchableOpacity
          onPress={() => {
            setCurrentChat(null);
            router.back();
          }}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: currentChat?.otherUser?.profilepic }}
              style={styles.avatar}
              defaultSource={require("@/assets/images/icon.png")}
            />
            {currentChat?.isOnline && <View style={styles.onlineIndicator} />}
          </View>

          <View style={styles.userInfo}>
            <Text style={styles.userName}>{currentChat?.otherUser?.name}</Text>
            {currentChat?.isTyping ? (
              <View style={styles.typingContainer}>
                <View style={styles.typingDot} />
                <View style={[styles.typingDot, styles.typingDotDelay]} />
                <View style={[styles.typingDot, styles.typingDotDelay2]} />
                <Text style={styles.typingText}>Typing</Text>
              </View>
            ) : (
              <Text style={styles.lastSeen}>Online now</Text>
            )}
          </View>
        </View>
      </Animated.View>

      {/* Messages List */}
      <View style={styles.messagesContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0A84FF" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={processedMessages()}
            keyExtractor={(item, index) =>
              item.type === "date" ? item.id : `msg-${item.messageid || index}`
            }
            renderItem={renderItem}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            initialNumToRender={20}
            maxToRenderPerBatch={10}
            windowSize={10}
            onScroll={({ nativeEvent }) => {
              const { contentOffset, contentSize, layoutMeasurement } =
                nativeEvent;
              const distanceFromBottom =
                contentSize.height -
                (contentOffset.y + layoutMeasurement.height);
              setShowScrollButton(distanceFromBottom > 200);

              // Hide header when scrolling down
              if (contentOffset.y > 10) {
                headerOpacity.value = withTiming(0.3, { duration: 200 });
              } else {
                headerOpacity.value = withTiming(1, { duration: 200 });
              }
            }}
            scrollEventThrottle={16}
          />
        )}

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <TouchableOpacity
            style={styles.scrollToBottomButton}
            onPress={scrollToBottom}
          >
            <Ionicons name="chevron-down" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Input Area */}
      <Animated.View style={[styles.inputContainer, inputContainerStyle]}>
        {renderAttachmentPreview()}

        <View style={styles.inputRow}>
          <TouchableOpacity style={styles.attachButton} onPress={pickImage}>
            <Ionicons name="image-outline" size={24} color="#0A84FF" />
          </TouchableOpacity>

          <View style={styles.textInputContainer}>
            <TextInput
              ref={inputRef}
              value={message}
              onChangeText={handleTyping}
              style={styles.input}
              placeholder="Message..."
              placeholderTextColor="#8E8E93"
              multiline
            />
          </View>

          <AnimatedPressable
            style={[styles.sendButton, sendButtonStyle]}
            onPress={handleSendMessage}
            disabled={!message.trim() && !file}
          >
            <Ionicons
              name="send"
              size={20}
              color={message.trim() || file ? "#FFFFFF" : "#8E8E93"}
            />
          </AnimatedPressable>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    zIndex: 10,
  },
  backButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 4,
  },
  avatarContainer: {
    position: "relative",
    marginRight: 10,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: "#2C2C2E",
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: ONLINE_INDICATOR_SIZE,
    height: ONLINE_INDICATOR_SIZE,
    borderRadius: ONLINE_INDICATOR_SIZE / 2,
    backgroundColor: "#30D158",
    borderWidth: 2,
    borderColor: "#121212",
    shadowColor: "#30D158",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  userInfo: {
    flex: 1,
    justifyContent: "center",
  },
  userName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  lastSeen: {
    fontSize: 12,
    color: "#8E8E93",
  },
  typingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  typingDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#30D158",
    marginRight: 3,
    opacity: 0.7,
  },
  typingDotDelay: {
    animationDelay: "0.2s",
  },
  typingDotDelay2: {
    animationDelay: "0.4s",
  },
  typingText: {
    fontSize: 12,
    color: "#30D158",
    fontWeight: "500",
    marginLeft: 4,
  },
  profileButton: {
    padding: 12,
  },
  messagesContainer: {
    flex: 1,
    position: "relative",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  messagesList: {
    paddingHorizontal: 12,
    paddingBottom: 20,
    paddingTop: 10,
  },
  messageContainer: {
    flexDirection: "row",
    marginVertical: 4,
    maxWidth: "85%",
  },
  ownMessageContainer: {
    alignSelf: "flex-end",
    justifyContent: "flex-end",
  },
  otherMessageContainer: {
    alignSelf: "flex-start",
    justifyContent: "flex-start",
  },
  messageBubbleWrapper: {
    flexDirection: "column",
  },
  ownMessageWrapper: {
    alignItems: "flex-end",
  },
  otherMessageWrapper: {
    alignItems: "flex-start",
  },
  messageBubbleAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
    alignSelf: "flex-end",
    backgroundColor: "#2C2C2E",
  },
  messageBubble: {
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    maxWidth: "100%",
  },
  ownMessageBubble: {
    backgroundColor: "#0A84FF",
    borderTopRightRadius: 2,
  },
  otherMessageBubble: {
    backgroundColor: "#262629",
    borderTopLeftRadius: 2,
  },
  ownFirstBubble: {
    borderTopRightRadius: 20,
  },
  otherFirstBubble: {
    borderTopLeftRadius: 20,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  ownMessageText: {
    color: "#FFFFFF",
  },
  otherMessageText: {
    color: "#FFFFFF",
  },
  timeText: {
    fontSize: 10,
    marginTop: 4,
  },
  ownTimeText: {
    color: "rgba(255,255,255,0.6)",
    marginRight: 4,
  },
  otherTimeText: {
    color: "rgba(255,255,255,0.6)",
    marginLeft: 4,
  },
  dateHeaderContainer: {
    alignItems: "center",
    marginVertical: 12,
  },
  dateHeaderText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#8E8E93",
    backgroundColor: "rgba(30, 30, 30, 0.8)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    overflow: "hidden",
  },
  imageContainer: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: "hidden",
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  scrollToBottomButton: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 38,
    height: 38,
    backgroundColor: "rgba(30, 30, 30, 0.8)",
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  inputContainer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(10, 10, 10, 0.95)",
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  textInputContainer: {
    flex: 1,
    backgroundColor: "rgba(50, 50, 50, 0.8)",
    borderRadius: 24,
    marginHorizontal: 8,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 12 : 6,
    minHeight: 50,
    justifyContent: "center",
  },
  input: {
    fontSize: 16,
    color: "#FFFFFF",
    maxHeight: 100,
  },
  attachButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(20, 20, 20, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(10, 132, 255, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  attachmentPreviewContainer: {
    height: 100,
    marginBottom: 8,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#1C1C1E",
  },
  attachmentPreview: {
    width: 100,
    height: "100%",
    borderRadius: 8,
  },
  removeAttachmentButton: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 12,
    padding: 4,
  },
});

export default ChatWithUser;

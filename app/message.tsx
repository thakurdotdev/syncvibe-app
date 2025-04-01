import ImageGallery from "@/components/ImageGallery";
import StartCall from "@/components/video/StartCall";
import { Message, useChat } from "@/context/SocketContext";
import { useUser } from "@/context/UserContext";
import useApi from "@/utils/hooks/useApi";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState, memo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Constants for styling
const AVATAR_SIZE = 40;
const ONLINE_INDICATOR_SIZE = 12;

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

// Memoized Message Item Component to improve FlatList performance
const MessageItem = memo(
  ({
    item,
    isOwnMessage,
    loggedInUserId,
    currentChat,
    chatImages,
    onImagePress,
  }: any) => {
    if (item.type === "date") {
      return (
        <View style={styles.dateHeaderContainer}>
          <Text style={styles.dateHeaderText}>{item.date}</Text>
        </View>
      );
    }

    const isFirstInSequence = item.isFirstInSequence;

    return (
      <View
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
                onPress={() => {
                  const imageIndex = chatImages.indexOf(item.fileurl);
                  onImagePress(imageIndex);
                }}
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
      </View>
    );
  },
);

const ChatWithUser = () => {
  const api = useApi();
  const { user } = useUser();
  const loggedInUserId = user?.userid;
  const { currentChat, setCurrentChat, socket, onlineStatuses } = useChat();

  // States
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<ImagePicker.ImagePickerSuccessResult | null>(
    null,
  );
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [inputHeight, setInputHeight] = useState(50);
  const [showGallery, setShowGallery] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [initialLoad, setInitialLoad] = useState(true);

  // Refs
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

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
      setInitialLoad(false);
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

  // Auto scroll to bottom when new messages arrive or on initial load
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      // Use a shorter timeout for initial load to avoid flickering
      setTimeout(
        () => {
          flatListRef.current?.scrollToEnd({ animated: !initialLoad });
        },
        initialLoad ? 100 : 300,
      );
    }
  }, [messages, initialLoad]);

  const handleSendMessage = async () => {
    if (!message.trim() && !file) return;

    try {
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
      setInputHeight(50);

      Keyboard.dismiss();

      if (!file) {
        socket?.emit("new-message", newMessage);
      }

      setFile(null);
      setFilePreview(null);
      setMessage("");

      // Send typing status as false when message is sent
      socket?.emit("typing", {
        userId: loggedInUserId,
        recipientId: currentChat?.otherUser.userid,
        isTyping: false,
      });

      const formData = new FormData();
      formData.append("chatid", currentChat?.chatid);
      formData.append("senderid", loggedInUserId);
      formData.append("content", message);
      if (file && file.assets?.[0]) {
        const fileAsset = file.assets[0];
        formData.append("file", {
          uri: fileAsset.uri,
          type: fileAsset.mimeType,
          name: fileAsset.fileName,
        } as any);
      }

      const response = await api.post(`/api/send/message`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (file) {
        let serverMessage = response.data.message;
        serverMessage.participants = currentChat?.participants;
        socket?.emit("new-message", serverMessage);
      }

      socket?.emit("typing", {
        userId: loggedInUserId,
        recipientId: currentChat?.otherUser.userid,
        isTyping: false,
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleTyping = useCallback(
    (text: string) => {
      setMessage(text);

      // Dynamic input height based on content length
      if (text.length > 80) {
        setInputHeight(110);
      } else if (text.length > 40) {
        setInputHeight(90);
      } else if (text.length > 0) {
        setInputHeight(70);
      } else {
        setInputHeight(50);
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
    [loggedInUserId, currentChat?.otherUser?.userid, socket],
  );

  // Pre-process messages for better performance
  const processedMessages = useCallback(() => {
    const result: any[] = [];
    let currentDate = "";
    let prevSenderId: string | null = null;

    messages.forEach((msg) => {
      const messageDate = formatDate(msg.createdat);

      if (messageDate !== currentDate) {
        result.push({
          id: `date-${messageDate}`,
          type: "date",
          date: messageDate,
        });
        currentDate = messageDate;
        // Reset the previous sender ID after a date divider
        prevSenderId = null;
      }

      // Check if this is the first message in a sequence from this sender
      const isFirstInSequence = prevSenderId !== msg.senderid;
      prevSenderId = msg.senderid;

      result.push({
        ...msg,
        type: "message",
        isFirstInSequence,
      });
    });

    return result;
  }, [messages]);

  const getChatImages = useCallback(() => {
    return messages.filter((msg) => msg.fileurl).map((msg) => msg.fileurl);
  }, [messages]);

  const chatImages = getChatImages();

  const renderItem = useCallback(
    ({ item }: { item: any }) => {
      const isOwnMessage = item.senderid === loggedInUserId;

      return (
        <MessageItem
          item={item}
          isOwnMessage={isOwnMessage}
          loggedInUserId={loggedInUserId}
          currentChat={currentChat}
          chatImages={chatImages}
          onImagePress={(index: number) => {
            setSelectedImageIndex(index);
            setShowGallery(true);
          }}
        />
      );
    },
    [loggedInUserId, currentChat, chatImages],
  );

  const renderAttachmentPreview = () => {
    if (!filePreview) return null;

    return (
      <View style={styles.attachmentPreviewContainer}>
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
            setInputHeight(50);
          }}
        >
          <Ionicons name="close-circle" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
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
          setInputHeight(120);
        }
      }
    } catch (error) {
      console.error("Error picking image:", error);
    }
  };

  const scrollToBottom = () => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
      setShowScrollButton(false);
    }
  };

  const isOnline = onlineStatuses[currentChat?.otherUser?.userid || ""];

  const getItemLayout = useCallback((data: any, index: number) => {
    // Estimate height based on type (date header is shorter than message)
    const item = data[index];
    let height = item.type === "date" ? 40 : 80;

    // Adjust height for messages with images
    if (item.type === "message" && item.fileurl) {
      height = 220; // Image + text + padding
    }

    return { length: height, offset: height * index, index };
  }, []);

  const keyExtractor = useCallback(
    (item: any, index: number) =>
      item.type === "date" ? item.id : `msg-${item.messageid || index}`,
    [],
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            setCurrentChat(null);
            router.back();
          }}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: currentChat?.otherUser?.profilepic }}
              style={styles.avatar}
            />
            {isOnline && <View style={styles.onlineIndicator} />}
          </View>

          <View style={styles.userInfo}>
            <Text style={styles.userName}>{currentChat?.otherUser?.name}</Text>
            {currentChat?.isTyping && (
              <View style={styles.typingContainer}>
                <Text style={styles.typingText}>Typing...</Text>
              </View>
            )}
          </View>

          <StartCall />
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.mainContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View style={styles.messagesContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0A84FF" />
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={processedMessages()}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              getItemLayout={getItemLayout}
              contentContainerStyle={styles.messagesList}
              showsVerticalScrollIndicator={false}
              initialNumToRender={10}
              maxToRenderPerBatch={5}
              windowSize={5}
              removeClippedSubviews={true}
              onEndReachedThreshold={0.5}
              onScroll={({ nativeEvent }) => {
                const { contentOffset, contentSize, layoutMeasurement } =
                  nativeEvent;
                const distanceFromBottom =
                  contentSize.height -
                  (contentOffset.y + layoutMeasurement.height);
                setShowScrollButton(distanceFromBottom > 300);
              }}
              scrollEventThrottle={100}
            />
          )}

          {showScrollButton && (
            <TouchableOpacity
              style={styles.scrollToBottomButton}
              onPress={scrollToBottom}
            >
              <Ionicons name="chevron-down" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>

        {renderAttachmentPreview()}
        <View style={[styles.inputContainer, { height: inputHeight }]}>
          <View style={styles.inputRow}>
            <TouchableOpacity style={styles.attachButton} onPress={pickImage}>
              <Ionicons name="image-outline" size={22} color="#0A84FF" />
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

            <TouchableOpacity
              style={[
                styles.sendButton,
                {
                  backgroundColor:
                    message.trim() || file
                      ? "#0A84FF"
                      : "rgba(10, 132, 255, 0.3)",
                },
              ]}
              onPress={handleSendMessage}
              disabled={!message.trim() && !file}
            >
              <Ionicons
                name="send"
                size={18}
                color={message.trim() || file ? "#FFFFFF" : "#CCCCCC"}
              />
            </TouchableOpacity>
          </View>
        </View>

        {showGallery && chatImages.length > 0 && (
          <ImageGallery
            images={chatImages}
            initialIndex={selectedImageIndex}
            onClose={() => setShowGallery(false)}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  mainContainer: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "#121212",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
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
    marginRight: 12,
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
  },
  userInfo: {
    flex: 1,
    justifyContent: "center",
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  typingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  typingText: {
    fontSize: 12,
    color: "#30D158",
    fontWeight: "500",
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
    marginVertical: 3,
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
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    alignSelf: "flex-end",
    backgroundColor: "#2C2C2E",
  },
  messageBubble: {
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 14,
    maxWidth: "100%",
  },
  ownMessageBubble: {
    backgroundColor: "#0A84FF",
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: "#262629",
    borderBottomLeftRadius: 4,
  },
  ownFirstBubble: {
    borderTopRightRadius: 18,
  },
  otherFirstBubble: {
    borderTopLeftRadius: 18,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownMessageText: {
    color: "#FFFFFF",
  },
  otherMessageText: {
    color: "#FFFFFF",
  },
  timeText: {
    fontSize: 10,
    marginTop: 2,
  },
  ownTimeText: {
    color: "rgba(255,255,255,0.5)",
    marginRight: 4,
  },
  otherTimeText: {
    color: "rgba(255,255,255,0.5)",
    marginLeft: 4,
  },
  dateHeaderContainer: {
    alignItems: "center",
    marginVertical: 10,
  },
  dateHeaderText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#8E8E93",
    backgroundColor: "rgba(30, 30, 30, 0.7)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  imageContainer: {
    marginBottom: 6,
    borderRadius: 12,
    overflow: "hidden",
  },
  messageImage: {
    width: 180,
    height: 180,
    borderRadius: 12,
  },
  scrollToBottomButton: {
    position: "absolute",
    right: 15,
    bottom: 15,
    width: 40,
    height: 40,
    backgroundColor: "rgba(40, 40, 40, 0.8)",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  inputContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "#121212",
    justifyContent: "center",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  textInputContainer: {
    flex: 1,
    backgroundColor: "#2C2C2E",
    borderRadius: 20,
    marginHorizontal: 8,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
    minHeight: 40,
    justifyContent: "center",
  },
  input: {
    fontSize: 16,
    color: "#FFFFFF",
    maxHeight: 100,
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#2C2C2E",
    justifyContent: "center",
    alignItems: "center",
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  attachmentPreviewContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#121212",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  attachmentPreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeAttachmentButton: {
    position: "absolute",
    top: 12,
    left: 70,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 12,
    padding: 2,
  },
});

export default ChatWithUser;

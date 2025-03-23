import { useChat } from "@/context/SocketContext";
import { useVideoCall } from "@/context/VideoCallContext";
import { VideoIcon, X } from "lucide-react-native";
import React, { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

const StartCall = () => {
  const { isInCall, startCall } = useVideoCall();
  const { currentChat } = useChat();
  const [isModalVisible, setIsModalVisible] = useState(false);

  if (isInCall || !currentChat) {
    return null;
  }

  const handleStartCall = () => {
    setIsModalVisible(false);
    startCall(
      currentChat?.otherUser?.userid,
      currentChat?.otherUser?.name,
      currentChat?.otherUser?.profilepic,
    );
  };

  return (
    <View style={{ flex: 1, alignItems: "flex-end" }}>
      <Pressable onPress={() => setIsModalVisible(true)}>
        <VideoIcon size={24} color="#FFFFFF" />
      </Pressable>

      <Modal
        animationType="fade"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Start Video Call</Text>
            </View>

            <Text style={styles.modalDescription}>
              Would you like to start a video call with{" "}
              {currentChat?.otherUser?.name}? Make sure your camera/microphone
              permissions are enabled.
            </Text>

            <View style={styles.modalFooter}>
              <Pressable
                style={[styles.button, styles.cancelButton]}
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.button, styles.confirmButton]}
                onPress={handleStartCall}
              >
                <Text style={styles.confirmButtonText}>Start Call</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#1F2937", // Dark gray background
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: "#374151", // Subtle border
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#F9FAFB", // Near white text
  },
  modalDescription: {
    fontSize: 16,
    color: "#D1D5DB", // Light gray text
    marginBottom: 28,
    lineHeight: 24,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#374151", // Dark gray button
    borderWidth: 1,
    borderColor: "#4B5563",
  },
  confirmButton: {
    backgroundColor: "#3B82F6", // Blue button
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#F9FAFB", // Near white text
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF", // White text
  },
});

export default StartCall;

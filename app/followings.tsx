import React from "react";
import {
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useUser } from "@/context/UserContext";
import { getProfileCloudinaryUrl } from "@/utils/Cloudinary";
import { useRouter } from "expo-router";

interface FollowingDetail {
  userid: number;
  name: string;
  username: string;
  profilepic: string;
}

export interface followingType {
  id: number;
  followingDetail: FollowingDetail;
}

const Followings = () => {
  const router = useRouter();
  const { following } = useUser();

  const handleMessage = (username: string) => {
    // Navigate to message screen or open message modal
    router.push(`/messages/${username}`);
  };

  const renderFollowing = ({ item: follow }: { item: any }) => (
    <TouchableOpacity
      key={follow.id}
      style={styles.followingItem}
      onPress={() => {
        router.push(`/profile/${follow.followingDetail.username}`);
      }}
    >
      <View style={styles.avatarContainer}>
        {follow.followingDetail.profilepic ? (
          <Image
            source={{
              uri: getProfileCloudinaryUrl(follow.followingDetail.profilepic),
            }}
            style={styles.avatar}
          />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarFallbackText}>
              {follow.followingDetail.name.substring(0, 2).toUpperCase()}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{follow.followingDetail.name}</Text>
        <Text style={styles.userHandle}>
          @{follow.followingDetail.username}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.messageButton}
        onPress={() => handleMessage(follow.followingDetail.username)}
      >
        <Ionicons name="paper-plane-outline" size={22} color="#3897f0" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const ListEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={48} color="#666" />
      <Text style={styles.emptyTextTitle}>No Following</Text>
      <Text style={styles.emptyText}>
        When you follow people, you'll see them here
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={following}
        renderItem={renderFollowing}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={ListEmptyComponent}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  followingItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#2a2a2a",
    marginBottom: 8,
  },
  avatarContainer: {
    height: 56,
    width: 56,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: "#2a2a2a",
    borderWidth: 0.5,
    borderColor: "#3a3a3a",
  },
  avatar: {
    height: 56,
    width: 56,
    borderRadius: 28,
  },
  avatarFallback: {
    height: 56,
    width: 56,
    borderRadius: 28,
    backgroundColor: "#333",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  userInfo: {
    marginLeft: 16,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 2,
  },
  userHandle: {
    fontSize: 14,
    color: "#a0a0a0",
  },
  messageButton: {
    height: 36,
    width: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyTextTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#ffffff",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: "#a0a0a0",
    textAlign: "center",
  },
});

export default Followings;

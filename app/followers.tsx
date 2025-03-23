import { useUser } from "@/context/UserContext";
import { getProfileCloudinaryUrl } from "@/utils/Cloudinary";
import { useRouter } from "expo-router";
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

interface FollowerDetail {
  id: number;
  name: string;
  username: string;
  profilepic: string;
}

export interface followersType {
  id: number;
  followerDetail: FollowerDetail;
}

const Followers = () => {
  const { followers } = useUser();
  const router = useRouter();

  const renderFollower = ({ item: follow }: { item: any }) => (
    <TouchableOpacity
      key={follow.id}
      style={styles.followerItem}
      onPress={() => {}}
    >
      <View style={styles.avatarContainer}>
        {follow.followerDetail.profilepic ? (
          <Image
            source={{
              uri: getProfileCloudinaryUrl(follow.followerDetail.profilepic),
            }}
            style={styles.avatar}
          />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarFallbackText}>
              {follow.followerDetail.name.substring(0, 2).toUpperCase()}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{follow.followerDetail.name}</Text>
        <Text style={styles.userHandle}>@{follow.followerDetail.username}</Text>
      </View>
    </TouchableOpacity>
  );

  const ListEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No followers yet</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={followers}
        renderItem={renderFollower}
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
    paddingTop: 8,
  },
  followerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a2a",
    marginBottom: 4,
  },
  avatarContainer: {
    height: 52,
    width: 52,
    borderRadius: 26,
    overflow: "hidden",
    backgroundColor: "#2a2a2a",
  },
  avatar: {
    height: 52,
    width: 52,
    borderRadius: 26,
  },
  avatarFallback: {
    height: 52,
    width: 52,
    borderRadius: 26,
    backgroundColor: "#444",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: {
    color: "#eee",
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
  },
  userHandle: {
    fontSize: 14,
    color: "#a0a0a0",
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: "#a0a0a0",
  },
});

export default Followers;

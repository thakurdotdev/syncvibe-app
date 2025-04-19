import { followersType } from "@/app/followers";
import { followingType } from "@/app/followings";
import { User } from "@/types/user";
import useApi from "@/utils/hooks/useApi";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

interface UserContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  selectedLanguages: string;
  setSelectedLanguages: React.Dispatch<React.SetStateAction<string>>;
  getProfile: () => Promise<void>;
  loading: boolean;
  musicConfig: Record<string, any>;
  setMusicConfig: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  logout: () => Promise<void>;
  followers: followersType[];
  following: followingType[];
  fetchFollowData: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
}

const UserContext = createContext<UserContextType | null>(null);

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const api = useApi();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [musicConfig, setMusicConfig] = useState<Record<string, any>>({});
  const [selectedLanguages, setSelectedLanguages] = useState<string>("hindi");
  const [followers, setFollowers] = useState<followersType[]>([]);
  const [following, setFollowing] = useState<followingType[]>([]);

  useEffect(() => {
    if (!user) {
      getProfile();
    }
  }, [user]);

  useEffect(() => {
    loadMusicConfig();
  }, []);

  const loadMusicConfig = async () => {
    try {
      const data = await AsyncStorage.getItem("language-preferance");
      if (data) {
        setSelectedLanguages(data);
      }
    } catch (error) {
      console.error("Error loading music config:", error);
    }
  };

  const getProfile = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await api.get("/api/profile");
      if (response.status === 200) {
        setUser(response.data.user);
      }
    } catch (error: any) {
      console.error("Error fetching profile:", error);
      if (error.response?.status === 401) {
        await AsyncStorage.removeItem("token");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowData = useCallback(async () => {
    try {
      const response = await api.get(`/api/user/followlist/${user?.userid}`);
      if (response.status === 200) {
        setFollowers(response.data.followers);
        setFollowing(response.data.following);
      }
    } catch (error) {
      console.error("Error fetching follow data:", error);
    }
  }, [user?.userid]);

  useEffect(() => {
    if (user?.userid) {
      fetchFollowData();
    }
  }, [user?.userid, fetchFollowData]);

  const logout = useCallback(async () => {
    try {
      await AsyncStorage.clear();
      setUser(null);
      router.reload();
    } catch (error) {
      setUser(null);
      router.reload();
    }
  }, []);

  const updateUser = useCallback(async (userData: Partial<User>) => {
    try {
      const response = await api.put("/api/profile", userData);
      if (response.status === 200) {
        setUser((prev) => (prev ? { ...prev, ...userData } : null));
      }
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  }, []);

  const memoizedValue = useMemo(
    () => ({
      user,
      setUser,
      getProfile,
      loading,
      musicConfig,
      setMusicConfig,
      logout,
      selectedLanguages,
      setSelectedLanguages,
      followers,
      following,
      fetchFollowData,
      updateUser,
    }),
    [
      user,
      loading,
      musicConfig,
      logout,
      selectedLanguages,
      followers,
      following,
      fetchFollowData,
      updateUser,
    ],
  );

  return (
    <UserContext.Provider value={memoizedValue}>
      {children}
    </UserContext.Provider>
  );
};

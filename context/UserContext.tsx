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
    }),
    [user, loading, musicConfig, logout, selectedLanguages],
  );

  return (
    <UserContext.Provider value={memoizedValue}>
      {children}
    </UserContext.Provider>
  );
};

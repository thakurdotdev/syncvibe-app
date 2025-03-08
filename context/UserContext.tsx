import { API_URL } from "@/constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { router } from "expo-router";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

// Create an axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add a request interceptor to add token to all requests
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Add a response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await handleLogout();
    }
    return Promise.reject(error);
  },
);

const handleLogout = async () => {
  await AsyncStorage.clear();
  // router.replace("/login");
};

interface User {
  userid: number;
  name: string;
  username: string;
  email: string;
  bio: string;
  profilepic: string;
  verified: boolean;
  logintype: "EMAILPASSWORD" | "GOOGLE" | "GUEST";
  isDeleted: boolean;
  passkeyEnabled: boolean;
  lastPasskeyLogin?: string;
  passKeyChallenge?: string;
  challengeExpiry?: string;
}

interface UserContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [musicConfig, setMusicConfig] = useState<Record<string, any>>({});

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
      const data = await AsyncStorage.getItem("musicConfig");
      if (data) {
        setMusicConfig(JSON.parse(data));
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
        await AsyncStorage.setItem("user", JSON.stringify(response.data.user));
      }
    } catch (error: any) {
      console.error("Error fetching profile:", error);
      if (error.response?.status === 401) {
        await handleLogout();
      }
      try {
        const savedUser = await AsyncStorage.getItem("user");
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }
      } catch (e) {
        console.error("Error loading saved user:", e);
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = useCallback(async () => {
    try {
      await AsyncStorage.clear();
      setUser(null);
      router.replace("/login");
    } catch (error) {
      setUser(null);
      router.replace("/login");
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
    }),
    [user, loading, musicConfig, logout],
  );

  return (
    <UserContext.Provider value={memoizedValue}>
      {children}
    </UserContext.Provider>
  );
};

import { API_URL } from "@/constants";
import { Song } from "@/types/song";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

interface PlaybackProgress {
  songId: string;
  position: number;
  duration: number;
  timestamp: number;
  synced: boolean;
  songData: Song;
}

const PLAYBACK_HISTORY_KEY = "@syncvibe/playback_history";
const SYNC_BATCH_SIZE = 10;
const SYNC_INTERVAL = 30000; // 30 seconds

class PlaybackHistoryManager {
  private static instance: PlaybackHistoryManager;
  private syncTimeout: NodeJS.Timeout | null = null;
  private pendingUpdates: Map<string, PlaybackProgress> = new Map();

  private constructor() {
    this.startSyncLoop();
  }

  public static getInstance(): PlaybackHistoryManager {
    if (!PlaybackHistoryManager.instance) {
      PlaybackHistoryManager.instance = new PlaybackHistoryManager();
    }
    return PlaybackHistoryManager.instance;
  }

  private async getToken(): Promise<string | null> {
    return await AsyncStorage.getItem("token");
  }

  private async saveToLocal(progress: PlaybackProgress): Promise<void> {
    try {
      const history = await this.getLocalHistory();
      history[progress.songId] = progress;
      await AsyncStorage.setItem(PLAYBACK_HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
      console.error("Error saving playback progress locally:", error);
    }
  }

  private async getLocalHistory(): Promise<Record<string, PlaybackProgress>> {
    try {
      const data = await AsyncStorage.getItem(PLAYBACK_HISTORY_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error("Error reading local history:", error);
      return {};
    }
  }

  private async syncWithServer(): Promise<void> {
    const token = await this.getToken();
    if (!token || this.pendingUpdates.size === 0) return;

    const updates = Array.from(this.pendingUpdates.values())
      .filter((update) => !update.synced)
      .slice(0, SYNC_BATCH_SIZE);

    if (updates.length === 0) return;

    try {
      const response = await axios.post(
        `${API_URL}/api/history/batch`,
        { updates },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.status === 200) {
        // Mark synced items and update local storage
        for (const update of updates) {
          update.synced = true;
          this.pendingUpdates.set(update.songId, update);
          await this.saveToLocal(update);
        }
      }
    } catch (error) {
      console.error("Error syncing playback history:", error);
    }
  }

  private startSyncLoop(): void {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }

    this.syncTimeout = setInterval(() => {
      this.syncWithServer();
    }, SYNC_INTERVAL);
  }

  public async updatePlaybackProgress(
    song: Song,
    position: number,
    duration: number,
  ): Promise<void> {
    if (!song?.id) return;

    const progress: PlaybackProgress = {
      songId: song.id,
      position,
      duration,
      timestamp: Date.now(),
      synced: false,
      songData: song, // Add full Song object to store the complete song data
    };

    // Update in-memory cache
    this.pendingUpdates.set(song.id, progress);

    // Save to local storage
    await this.saveToLocal(progress);

    // If we have enough updates, trigger an immediate sync
    if (this.pendingUpdates.size >= SYNC_BATCH_SIZE) {
      this.syncWithServer();
    }
  }

  public async getPlaybackProgress(
    songId: string,
  ): Promise<PlaybackProgress | null> {
    try {
      // Check in-memory cache first
      if (this.pendingUpdates.has(songId)) {
        return this.pendingUpdates.get(songId) || null;
      }

      // Check local storage
      const history = await this.getLocalHistory();
      return history[songId] || null;
    } catch (error) {
      console.error("Error getting playback progress:", error);
      return null;
    }
  }

  public destroy(): void {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
      this.syncTimeout = null;
    }
  }
}

export const playbackHistory = PlaybackHistoryManager.getInstance();

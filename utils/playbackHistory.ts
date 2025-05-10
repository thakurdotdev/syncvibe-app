import { API_URL } from "@/constants";
import { Song } from "@/types/song";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { AppState } from "react-native";

interface PlaybackProgress {
  songId: string;
  position: number;
  duration: number;
  timestamp: number;
  synced: boolean;
  songData: Song;
  percentComplete?: number; // Track percentage completion for smart resume
  playCount?: number; // Track how many times the song was played
}

const PLAYBACK_HISTORY_KEY = "@syncvibe/playback_history";
const SYNC_BATCH_SIZE = 15; // Increased from 10
const SYNC_INTERVAL = 10000; // Increased to 60 seconds for battery efficiency
const POSITION_DEBOUNCE_INTERVAL = 5000; // Only save a song's position every 5 seconds
const MIN_PLAY_DURATION = 5; // Minimum seconds to consider a "play"

class PlaybackHistoryManager {
  private static instance: PlaybackHistoryManager;
  private syncTimeout: NodeJS.Timeout | null = null;
  private pendingUpdates: Map<string, PlaybackProgress> = new Map();
  private positionUpdateTimers: Map<string, { timestamp: number }> = new Map();
  private syncInProgress: boolean = false;
  private appState: string = "active";

  private constructor() {
    this.startSyncLoop();
    this.setupAppStateListener();
  }

  public static getInstance(): PlaybackHistoryManager {
    if (!PlaybackHistoryManager.instance) {
      PlaybackHistoryManager.instance = new PlaybackHistoryManager();
    }
    return PlaybackHistoryManager.instance;
  }

  private setupAppStateListener(): void {
    AppState.addEventListener("change", (nextAppState) => {
      // Save aggressively when app goes to background
      if (
        this.appState === "active" &&
        nextAppState.match(/inactive|background/)
      ) {
        this.syncWithServer(true);
      } else if (
        this.appState.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        // When coming back to foreground, check for any pending updates
        setTimeout(() => this.syncWithServer(false), 1000);
      }

      this.appState = nextAppState;
    });
  }

  private async getToken(): Promise<string | null> {
    return await AsyncStorage.getItem("token");
  }

  private async saveToLocal(progress: PlaybackProgress): Promise<void> {
    try {
      // Calculate percentage complete
      if (progress.duration > 0) {
        progress.percentComplete = Math.round(
          (progress.position / progress.duration) * 100,
        );
      }

      // Update play count if needed (when position reaches end of song)
      if (
        progress.duration > 0 &&
        progress.position > progress.duration * 0.9
      ) {
        progress.playCount = (progress.playCount || 0) + 1;
      }

      const history = await this.getLocalHistory();

      // Merge with existing record if it exists
      if (history[progress.songId]) {
        const existing = history[progress.songId];
        // Only update position if new position is greater (avoid going backwards)
        if (
          progress.position < existing.position &&
          existing.duration === progress.duration &&
          Date.now() - existing.timestamp < 86400000
        ) {
          // Within 24 hours
          progress.position = existing.position;
        }
        // Keep the play count from existing record
        progress.playCount =
          (existing.playCount || 0) + (progress.playCount || 0);
      }

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

  // Clean up old history entries (older than 30 days)
  private async cleanupHistory(): Promise<void> {
    try {
      const history = await this.getLocalHistory();
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      let hasChanges = false;

      for (const songId in history) {
        if (history[songId].timestamp < thirtyDaysAgo) {
          delete history[songId];
          this.pendingUpdates.delete(songId);
          hasChanges = true;
        }
      }

      if (hasChanges) {
        await AsyncStorage.setItem(
          PLAYBACK_HISTORY_KEY,
          JSON.stringify(history),
        );
        console.log("Cleaned up old playback history entries");
      }
    } catch (error) {
      console.error("Error cleaning up history:", error);
    }
  }

  private async syncWithServer(forceSyncAll: boolean = false): Promise<void> {
    if (this.syncInProgress) return;

    const token = await this.getToken();
    if (!token || this.pendingUpdates.size === 0) return;

    this.syncInProgress = true;

    try {
      let updates: PlaybackProgress[];

      if (forceSyncAll) {
        // Sync all pending updates when force syncing
        updates = Array.from(this.pendingUpdates.values()).filter(
          (update) => !update.synced,
        );
      } else {
        // Otherwise just take a batch
        updates = Array.from(this.pendingUpdates.values())
          .filter((update) => !update.synced)
          .slice(0, SYNC_BATCH_SIZE);
      }

      if (updates.length === 0) {
        this.syncInProgress = false;
        return;
      }

      // Filter out unnecessary song data to reduce payload size
      const compactUpdates = updates.map((update) => ({
        ...update,
        songData: update.songData,
      }));

      const response = await axios.post(
        `${API_URL}/api/history/batch`,
        { updates: compactUpdates },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 10000, // 10 second timeout
        },
      );

      if (response.status === 200) {
        // Mark synced items and update local storage
        for (const update of updates) {
          update.synced = true;
          this.pendingUpdates.set(update.songId, update);
          await this.saveToLocal(update);
        }

        console.log(`Successfully synced ${updates.length} history records`);

        // Periodically clean up old history entries
        if (Math.random() < 0.1) {
          // 10% chance on each sync
          setTimeout(() => this.cleanupHistory(), 1000);
        }
      }
    } catch (error) {
      console.error("Error syncing playback history:", error);
    } finally {
      this.syncInProgress = false;
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

    // Debounce position updates to avoid excessive writes
    const now = Date.now();
    const lastUpdate = this.positionUpdateTimers.get(song.id);

    if (lastUpdate && now - lastUpdate.timestamp < POSITION_DEBOUNCE_INTERVAL) {
      // Skip update if we updated recently, unless position is close to end
      if (duration > 0 && position < duration * 0.9) {
        return;
      }
    }

    // Update timestamp
    this.positionUpdateTimers.set(song.id, { timestamp: now });

    const progress: PlaybackProgress = {
      songId: song.id,
      position,
      duration,
      timestamp: now,
      synced: false,
      songData: song,
    };

    // Update in-memory cache
    this.pendingUpdates.set(song.id, progress);

    // Save to local storage (async, don't wait)
    this.saveToLocal(progress).catch((err) =>
      console.error("Error saving playback progress:", err),
    );

    // If we have enough updates, trigger an immediate sync
    if (this.pendingUpdates.size >= SYNC_BATCH_SIZE * 2) {
      setTimeout(() => this.syncWithServer(), 0);
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
      const progress = history[songId] || null;

      // If we found a position, add it to the cache for faster access next time
      if (progress) {
        this.pendingUpdates.set(songId, progress);
      }

      return progress;
    } catch (error) {
      console.error("Error getting playback progress:", error);
      return null;
    }
  }

  /**
   * Smart resume logic that decides whether to resume a track or start from beginning
   * based on various factors like how much was played, how long ago, etc.
   */
  public async getSmartResumePosition(songId: string): Promise<number> {
    try {
      const progress = await this.getPlaybackProgress(songId);

      if (!progress) return 0;

      const now = Date.now();
      const hoursSinceLastPlay = (now - progress.timestamp) / (1000 * 60 * 60);

      // If song was played in the last 24 hours and user listened to at least 15 seconds
      // but didn't finish (less than 90% complete)
      if (
        hoursSinceLastPlay < 24 &&
        progress.position > MIN_PLAY_DURATION &&
        progress.position < progress.duration * 0.9
      ) {
        // Resume from saved position
        return progress.position;
      }

      // For any other cases, start from beginning
      return 0;
    } catch (error) {
      console.error("Error in smart resume:", error);
      return 0;
    }
  }

  /**
   * Gets the most recently played song from the history
   * @returns The most recently played song with its last position, or null if no history exists
   */
  public async getLastPlayedSong(): Promise<{
    song: Song;
    position: number;
  } | null> {
    try {
      // Check in-memory cache first for faster retrieval
      if (this.pendingUpdates.size > 0) {
        // Get all entries from the pending updates map
        const entries = Array.from(this.pendingUpdates.values());

        // Find the most recent entry
        let mostRecent = entries[0];
        for (const entry of entries) {
          if (entry.timestamp > mostRecent.timestamp) {
            mostRecent = entry;
          }
        }

        if (mostRecent && mostRecent.songData) {
          return {
            song: mostRecent.songData,
            position: mostRecent.position,
          };
        }
      }

      // Fall back to storage if not in memory
      const history = await this.getLocalHistory();

      if (Object.keys(history).length === 0) {
        return null;
      }

      // More efficient implementation: find most recent entry in one pass
      let mostRecent = null;
      let maxTimestamp = 0;

      for (const key in history) {
        const entry = history[key];
        if (entry.timestamp > maxTimestamp) {
          maxTimestamp = entry.timestamp;
          mostRecent = entry;
        }
      }

      if (mostRecent && mostRecent.songData) {
        // Cache the result for faster future access
        this.pendingUpdates.set(mostRecent.songId, mostRecent);

        return {
          song: mostRecent.songData,
          position: mostRecent.position,
        };
      }

      return null;
    } catch (error) {
      console.error("Error getting last played song:", error);
      return null;
    }
  }

  /**
   * Preloads essential history data into memory for faster access on subsequent app starts
   * This improves the loading time of the most recently played song
   */
  public async preloadHistoryData(): Promise<void> {
    try {
      // Only preload if memory cache is empty to avoid redundant work
      if (this.pendingUpdates.size === 0) {
        const history = await this.getLocalHistory();

        if (Object.keys(history).length === 0) {
          return;
        }

        // Load the most recent entries (up to 5) into the memory cache
        const entries = Object.values(history)
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 5);

        for (const entry of entries) {
          this.pendingUpdates.set(entry.songId, entry);
        }

        console.log(
          `Preloaded ${entries.length} recent song entries into memory cache`,
        );
      }
    } catch (error) {
      console.error("Error preloading history data:", error);
    }
  }

  public destroy(): void {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
      this.syncTimeout = null;
    }

    // Force a final sync when destroying
    this.syncWithServer(true);
  }
}

export const playbackHistory = PlaybackHistoryManager.getInstance();

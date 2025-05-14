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
  isPlaying?: boolean; // Add isPlaying flag
}

const CURRENT_SONG_KEY = "@syncvibe/current_song";
const LOCAL_UPDATE_INTERVAL = 5000; // 5 seconds
const SERVER_SYNC_INTERVAL = 15000; // 15 seconds

class PlaybackHistoryManager {
  private static instance: PlaybackHistoryManager;
  private syncTimeout: NodeJS.Timeout | null = null;
  private currentSong: PlaybackProgress | null = null;
  private syncInProgress: boolean = false;
  private appState: string = "active";
  private isPlaying: boolean = false; // Track playback state

  private constructor() {
    this.startSyncLoop();

    // Add local update timer (every 5 seconds)
    setInterval(async () => {
      if (this.currentSong && this.appState === "active" && this.isPlaying) {
        // Estimate current position based on elapsed time if playing
        const now = Date.now();
        const elapsed = (now - this.currentSong.timestamp) / 1000; // Convert to seconds

        if (this.isPlaying && elapsed > 0) {
          // Update position based on elapsed time since last update
          this.currentSong.position = Math.min(
            this.currentSong.position + elapsed,
            this.currentSong.duration,
          );
          this.currentSong.timestamp = now;
          this.currentSong.synced = false;
        }

        // Only update local storage when song is actually playing
        await this.saveToLocal(this.currentSong);
      }
    }, LOCAL_UPDATE_INTERVAL);
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
      await AsyncStorage.setItem(CURRENT_SONG_KEY, JSON.stringify(progress));
    } catch (error) {
      console.error("Error saving current song progress locally:", error);
    }
  }

  private async getLocalData(): Promise<PlaybackProgress | null> {
    try {
      const data = await AsyncStorage.getItem(CURRENT_SONG_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("Error reading current song data:", error);
      return null;
    }
  }

  private async syncWithServer(): Promise<void> {
    if (this.syncInProgress || !this.currentSong || !this.isPlaying) return;

    const token = await this.getToken();
    if (!token) return;

    this.syncInProgress = true;

    try {
      const response = await axios.post(
        `${API_URL}/api/history/batch`,
        {
          updates: [
            {
              ...this.currentSong,
              position: Math.floor(Number(this.currentSong.position)),
              duration: Math.floor(Number(this.currentSong.duration)),
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 10000, // 10 second timeout
        },
      );

      if (response.status === 200) {
        // Mark as synced
        this.currentSong.synced = true;
        await this.saveToLocal(this.currentSong);

        // Only log in development or when debugging
        if (__DEV__) {
          console.log("Successfully synced current song progress");
        }
      }
    } catch (error) {
      console.error("Error syncing current song progress:", error);
    } finally {
      this.syncInProgress = false;
    }
  }

  private startSyncLoop(): void {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }

    // Set up regular interval for server sync
    this.syncTimeout = setInterval(() => {
      if (this.currentSong && this.isPlaying) {
        this.syncWithServer();
      }
    }, SERVER_SYNC_INTERVAL);
  }

  public async updatePlaybackProgress(
    song: Song,
    position: number,
    duration: number,
    isPlaying: boolean = true,
  ): Promise<void> {
    if (!song?.id) return;

    // Update playing state
    this.isPlaying = isPlaying;

    // If it's the same song, just update position
    if (this.currentSong && this.currentSong.songId === song.id) {
      this.currentSong.position = position;
      this.currentSong.duration = duration;
      this.currentSong.timestamp = Date.now();
      this.currentSong.isPlaying = isPlaying;
      this.currentSong.synced = false;
    } else {
      // Create new progress record for a different song
      this.currentSong = {
        songId: song.id,
        position,
        duration,
        timestamp: Date.now(),
        synced: false,
        songData: song,
        isPlaying,
      };
    }

    // Save to local storage
    await this.saveToLocal(this.currentSong);
  }

  public async getCurrentSongProgress(): Promise<PlaybackProgress | null> {
    // If we have a current song in memory, return it
    if (this.currentSong) {
      return this.currentSong;
    }

    // Otherwise try to load from storage
    const storedProgress = await this.getLocalData();
    if (storedProgress) {
      this.currentSong = storedProgress;
    }

    return storedProgress;
  }

  public async getLastPlayedSong(): Promise<{
    song: Song;
    position: number;
  } | null> {
    try {
      const progress = await this.getCurrentSongProgress();
      if (progress && progress.songData) {
        return {
          song: progress.songData,
          position: progress.position,
        };
      }
      return null;
    } catch (error) {
      console.error("Error getting last played song:", error);
      return null;
    }
  }

  public async preloadHistoryData(): Promise<void> {
    try {
      // Simply pre-load the current song data
      const progress = await this.getLocalData();
      if (progress) {
        this.currentSong = progress;
      }
    } catch (error) {
      console.error("Error preloading history data:", error);
    }
  }

  public async pausePlayback(): Promise<void> {
    this.isPlaying = false;
    if (this.currentSong) {
      this.currentSong.isPlaying = false;
      await this.saveToLocal(this.currentSong);
    }
  }

  public async resumePlayback(): Promise<void> {
    this.isPlaying = true;
    if (this.currentSong) {
      this.currentSong.isPlaying = true;
      await this.saveToLocal(this.currentSong);
    }
  }

  public async stopPlayback(): Promise<void> {
    this.isPlaying = false;
    if (this.currentSong) {
      this.currentSong.isPlaying = false;
      await this.saveToLocal(this.currentSong);
    }
  }

  public getDebugInfo(): {
    isPlaying: boolean;
    currentSong: PlaybackProgress | null;
    appState: string;
  } {
    return {
      isPlaying: this.isPlaying,
      currentSong: this.currentSong,
      appState: this.appState,
    };
  }

  public destroy(): void {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
      this.syncTimeout = null;
    }

    // Force a final sync when destroying (only if a song was playing)
    if (this.currentSong && this.isPlaying) {
      // Use Promise.race with a timeout to avoid hanging
      Promise.race([
        this.syncWithServer(),
        new Promise((resolve) => setTimeout(resolve, 3000)), // 3 second timeout
      ]).catch((err) => {
        console.error("Error during final sync:", err);
      });
    }
  }
}

export const playbackHistory = PlaybackHistoryManager.getInstance();

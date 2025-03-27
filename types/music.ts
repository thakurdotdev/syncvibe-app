import { PlayMode } from "@/context/MusicContext";
import { Song } from "./song";

export interface TimeState {
  currentTime: number;
  duration: number;
}

export interface PlaybackState {
  currentSong: Song | null;
  isPlaying: boolean;
  volume: number;
  isLoading: boolean;
  playMode: PlayMode;
}

export interface PlaylistState {
  playlist: Song[];
  userPlaylist: any[];
}

export interface SleepTimerState {
  timeRemaining: number;
  songsRemaining: number;
  isActive: boolean;
}

export interface TimeContextValue extends TimeState {
  updateTime: (time: number) => void;
  setDuration: (duration: number) => void;
}

export interface PlaybackContextValue extends PlaybackState {
  setCurrentSong: (song: Song) => void;
  setPlaying: (isPlaying: boolean) => void;
  setVolume: (volume: number) => void;
  setLoading: (loading: boolean) => void;
  stopSong: () => void;
}

export interface PlayerControls {
  playSong: (song: Song) => void;
  stopSong: () => void;
  handlePlayPauseSong: () => void;
  handleVolumeChange: (value: number) => void;
  addToPlaylist: (songs: Song | Song[]) => void;
  addToQueue: (songs: Song | Song[]) => void;
  handleNextSong: () => void;
  handlePrevSong: () => void;
  setPlayMode: (mode: PlayMode) => void;
  clearQueue: () => void;
  removeFromQueue: (songId: string) => void;
}

export interface PlaylistContextValue extends PlaylistState {
  getPlaylists: () => Promise<void>;
  setPlaylist: (playlist: Song[]) => void;
  setUserPlaylist: (playlist: Song[]) => void;
}

export interface SleepTimerContextValue extends SleepTimerState {
  setSleepTimer: (minutes?: number, songs?: number) => void;
  clearSleepTimer: () => void;
}

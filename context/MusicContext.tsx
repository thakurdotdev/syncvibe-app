import axios from "axios";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useCallback,
  ReactNode,
} from "react";
import { Audio } from "expo-av";
import { useUser } from "./UserContext";
import { Song } from "@/types/song";
import {
  PlaybackState,
  PlayerControls,
  TimeContextValue,
  PlaybackContextValue,
  PlaylistContextValue,
  SleepTimerContextValue,
  PlaylistState,
  SleepTimerState,
  TimeState,
} from "@/types/music";

const PlayerControlsContext = createContext<PlayerControls | undefined>(
  undefined,
);
const PlayerTimeContext = createContext<TimeContextValue | undefined>(
  undefined,
);
const PlayerStateContext = createContext<PlaybackContextValue | undefined>(
  undefined,
);
const PlaylistContext = createContext<PlaylistContextValue | undefined>(
  undefined,
);
const SleepTimerContext = createContext<SleepTimerContextValue | undefined>(
  undefined,
);

// Reducers remain the same as they handle state logic
const timeReducer = (
  state: TimeState,
  action: { type: string; payload: number },
): TimeState => {
  switch (action.type) {
    case "UPDATE_TIME":
      return { ...state, currentTime: action.payload };
    case "SET_DURATION":
      return { ...state, duration: action.payload };
    default:
      return state;
  }
};

const playbackReducer = (
  state: PlaybackState,
  action: { type: string; payload?: any },
): PlaybackState => {
  switch (action.type) {
    case "SET_CURRENT_SONG":
      return { ...state, currentSong: action.payload };
    case "STOP_SONG":
      return { ...state, currentSong: null, isPlaying: false };
    case "SET_PLAYING":
      return { ...state, isPlaying: action.payload };
    case "SET_VOLUME":
      return { ...state, volume: Math.min(Math.max(action.payload, 0), 1) };
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
};

// Playlist state reducer
const playlistReducer = (
  state: PlaylistState,
  action: { type: string; payload: Song[] },
): PlaylistState => {
  switch (action.type) {
    case "SET_PLAYLIST":
      return {
        ...state,
        playlist: action.payload,
      };
    case "SET_USER_PLAYLIST":
      return { ...state, userPlaylist: action.payload };
    default:
      return state;
  }
};

const sleepTimerReducer = (
  state: SleepTimerState,
  action: { type: string; payload?: any },
): SleepTimerState => {
  switch (action.type) {
    case "SET_TIMER":
      return {
        ...state,
        timeRemaining: action.payload.time,
        songsRemaining: action.payload.songs,
        isActive: true,
      };
    case "UPDATE_TIME":
      return {
        ...state,
        timeRemaining: Math.max(0, state.timeRemaining - 1),
      };
    case "UPDATE_SONGS":
      return {
        ...state,
        songsRemaining: Math.max(0, state.songsRemaining - 1),
      };
    case "CLEAR_TIMER":
      return {
        timeRemaining: 0,
        songsRemaining: 0,
        isActive: false,
      };
    default:
      return state;
  }
};

export const usePlayer = (): PlayerControls => {
  const context = useContext(PlayerControlsContext);
  if (!context)
    throw new Error("usePlayer must be used within a PlayerProvider");
  return context;
};

export const usePlayerTime = (): TimeContextValue => {
  const context = useContext(PlayerTimeContext);
  if (!context)
    throw new Error("usePlayerTime must be used within a PlayerProvider");
  return context;
};

export const usePlayerState = (): PlaybackContextValue => {
  const context = useContext(PlayerStateContext);
  if (!context)
    throw new Error("usePlayerState must be used within a PlayerProvider");
  return context;
};

export const usePlaylist = (): PlaylistContextValue => {
  const context = useContext(PlaylistContext);
  if (!context)
    throw new Error("usePlaylist must be used within a PlayerProvider");
  return context;
};

export const useSleepTimer = (): SleepTimerContextValue => {
  const context = useContext(SleepTimerContext);
  if (!context)
    throw new Error("useSleepTimer must be used within a PlayerProvider");
  return context;
};

interface PlayerProviderProps {
  children: ReactNode;
}

export function MusicProvider({ children }: PlayerProviderProps) {
  const { user, loading } = useUser();
  const soundRef = useRef<Audio.Sound | null>(null);
  const nextSoundRef = useRef<Audio.Sound | null>(null);
  const playbackStatusUpdateSubscription = useRef<any>(null);

  const [timeState, timeDispatch] = useReducer(timeReducer, {
    currentTime: 0,
    duration: 0,
  });

  const [playbackState, playbackDispatch] = useReducer(playbackReducer, {
    currentSong: null,
    isPlaying: false,
    volume: 1,
    isLoading: false,
  });

  const [playlistState, playlistDispatch] = useReducer(playlistReducer, {
    playlist: [] as Song[],
    userPlaylist: [] as Song[],
  });

  const [sleepTimerState, sleepTimerDispatch] = useReducer(sleepTimerReducer, {
    timeRemaining: 0,
    songsRemaining: 0,
    isActive: false,
  });

  useEffect(() => {
    // Set up audio mode when component mounts
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (error) {
        console.error("Error setting audio mode:", error);
      }
    };

    setupAudio();

    // Cleanup when component unmounts
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
      if (nextSoundRef.current) {
        nextSoundRef.current.unloadAsync();
      }
      if (playbackStatusUpdateSubscription.current) {
        playbackStatusUpdateSubscription.current.remove();
      }
    };
  }, []);

  const getAudioUrl = useCallback((song: Song | null): string => {
    return song?.download_url?.[4]?.link || song?.download_url?.[3]?.link || "";
  }, []);

  const preloadNextTrack = useCallback(async () => {
    if (!playlistState.playlist.length || !playbackState.currentSong) return;

    const currentIndex = playlistState.playlist.findIndex(
      (song) => song.id === playbackState.currentSong?.id,
    );
    const nextIndex = (currentIndex + 1) % playlistState.playlist.length;
    const nextSong = playlistState.playlist[nextIndex];

    if (nextSong) {
      try {
        if (nextSoundRef.current) {
          await nextSoundRef.current.unloadAsync();
        }
        const { sound } = await Audio.Sound.createAsync(
          { uri: getAudioUrl(nextSong) },
          { shouldPlay: false },
        );
        nextSoundRef.current = sound;
      } catch (error) {
        console.error("Error preloading next track:", error);
      }
    }
  }, [playlistState.playlist, playbackState.currentSong, getAudioUrl]);

  const controls: PlayerControls = useMemo(
    () => ({
      playSong: async (song: Song) => {
        if (!song?.id) return;

        try {
          playbackDispatch({ type: "SET_LOADING", payload: true });

          // Unload current sound if it exists
          if (soundRef.current) {
            await soundRef.current.unloadAsync();
          }

          const { sound, status } = await Audio.Sound.createAsync(
            { uri: getAudioUrl(song) },
            { shouldPlay: true, volume: playbackState.volume },
            (status) => {
              if (status.isLoaded) {
                timeDispatch({
                  type: "UPDATE_TIME",
                  payload: status.positionMillis / 1000,
                });
                if (status.didJustFinish) {
                  controls.handleNextSong();
                }
              }
            },
          );

          soundRef.current = sound;

          if (status.isLoaded) {
            timeDispatch({
              type: "SET_DURATION",
              payload: status.durationMillis! / 1000,
            });
          }

          playbackDispatch({ type: "SET_CURRENT_SONG", payload: song });
          playbackDispatch({ type: "SET_PLAYING", payload: true });
          playbackDispatch({ type: "SET_LOADING", payload: false });

          preloadNextTrack();
        } catch (error) {
          console.error("Error playing song:", error);
          playbackDispatch({ type: "SET_LOADING", payload: false });
        }
      },

      stopSong: async () => {
        try {
          if (soundRef.current) {
            await soundRef.current.stopAsync();
            await soundRef.current.unloadAsync();
          }
          playbackDispatch({ type: "STOP_SONG" });
        } catch (error) {
          console.error("Error stopping song:", error);
        }
      },

      handlePlayPauseSong: async () => {
        try {
          if (!soundRef.current) return;

          if (playbackState.isPlaying) {
            await soundRef.current.pauseAsync();
          } else {
            await soundRef.current.playAsync();
          }

          playbackDispatch({
            type: "SET_PLAYING",
            payload: !playbackState.isPlaying,
          });
        } catch (error) {
          console.error("Error toggling play/pause:", error);
        }
      },

      handleTimeSeek: async (time: number) => {
        try {
          if (soundRef.current) {
            await soundRef.current.setPositionAsync(time * 1000);
            timeDispatch({ type: "UPDATE_TIME", payload: time });
          }
        } catch (error) {
          console.error("Error seeking:", error);
        }
      },

      handleVolumeChange: async (value: number) => {
        try {
          const newVolume = Math.min(Math.max(value, 0), 1);
          if (soundRef.current) {
            await soundRef.current.setVolumeAsync(newVolume);
            playbackDispatch({ type: "SET_VOLUME", payload: newVolume });
          }
        } catch (error) {
          console.error("Error changing volume:", error);
        }
      },

      // Queue management functions remain the same
      addToPlaylist: (songs: Song | Song[]) => {
        const newSongs = Array.isArray(songs) ? songs : [songs];
        playlistDispatch({
          type: "SET_PLAYLIST",
          payload: newSongs,
        });
      },

      addToQueue: (songs: Song | Song[]) => {
        const currentPlaylist = playlistState.playlist || [];
        const newSongs = Array.isArray(songs) ? songs : [songs];
        const existingIds = new Set(currentPlaylist.map((song) => song.id));
        const uniqueNewSongs = newSongs.filter(
          (song) => !existingIds.has(song.id),
        );

        if (uniqueNewSongs.length > 0) {
          const updatedPlaylist = [...currentPlaylist, ...uniqueNewSongs];
          playlistDispatch({
            type: "SET_PLAYLIST",
            payload: updatedPlaylist,
          });
        }
      },

      handleNextSong: () => {
        if (!playlistState.playlist.length || !playbackState.currentSong)
          return;

        const currentIndex = playlistState.playlist.findIndex(
          (song) => song.id === playbackState.currentSong?.id,
        );

        if (currentIndex !== -1) {
          const nextIndex = (currentIndex + 1) % playlistState.playlist.length;
          const nextSong = playlistState.playlist[nextIndex];
          controls.playSong(nextSong);
        } else {
          controls.playSong(playlistState.playlist[0]);
          const newPlaylist = playlistState.playlist.slice(1);
          playlistDispatch({ type: "SET_PLAYLIST", payload: newPlaylist });
        }
      },

      handlePrevSong: () => {
        if (!playlistState.playlist.length || !playbackState.currentSong)
          return;

        const currentIndex = playlistState.playlist.findIndex(
          (song) => song.id === playbackState.currentSong?.id,
        );

        if (currentIndex !== -1) {
          const prevIndex =
            (currentIndex - 1 + playlistState.playlist.length) %
            playlistState.playlist.length;
          const prevSong = playlistState.playlist[prevIndex];
          controls.playSong(prevSong);
        }
      },
    }),
    [
      playbackState.isPlaying,
      playbackState.volume,
      playlistState.playlist,
      playbackState.currentSong,
      getAudioUrl,
      preloadNextTrack,
    ],
  );

  useEffect(() => {
    if (playbackState.isPlaying) {
      playbackStatusUpdateSubscription.current =
        soundRef.current?.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            timeDispatch({
              type: "UPDATE_TIME",
              payload: status.positionMillis / 1000,
            });
            if (status.didJustFinish) {
              controls.handleNextSong();
            }
          }
        });
    } else {
      playbackStatusUpdateSubscription.current?.remove();
    }
  }, [playbackState.isPlaying, controls]);

  const timeValue: TimeContextValue = {
    currentTime: timeState.currentTime,
    duration: timeState.duration,
    updateTime: (time: number) =>
      timeDispatch({ type: "UPDATE_TIME", payload: time }),
    setDuration: (duration: number) =>
      timeDispatch({ type: "SET_DURATION", payload: duration }),
  };

  const playbackValue: PlaybackContextValue = {
    ...playbackState,
    setCurrentSong: (song: Song) =>
      playbackDispatch({ type: "SET_CURRENT_SONG", payload: song }),
    setPlaying: (isPlaying: boolean) =>
      playbackDispatch({ type: "SET_PLAYING", payload: isPlaying }),
    setVolume: (volume: number) =>
      playbackDispatch({ type: "SET_VOLUME", payload: volume }),
    setLoading: (loading: boolean) =>
      playbackDispatch({ type: "SET_LOADING", payload: loading }),
    stopSong: () => playbackDispatch({ type: "STOP_SONG" }),
  };

  const playlistValue: PlaylistContextValue = {
    ...playlistState,
    getPlaylists: async () => {
      try {
        // Implement playlist fetching logic here
      } catch (error) {
        console.error("Error fetching playlists:", error);
      }
    },
    setPlaylist: (playlist: Song[]) =>
      playlistDispatch({ type: "SET_PLAYLIST", payload: playlist }),
    setUserPlaylist: (playlist: Song[]) =>
      playlistDispatch({ type: "SET_USER_PLAYLIST", payload: playlist }),
  };

  const sleepTimerValue: SleepTimerContextValue = {
    ...sleepTimerState,
    setSleepTimer: (minutes?: number, songs?: number) => {
      sleepTimerDispatch({
        type: "SET_TIMER",
        payload: { time: minutes || 0, songs: songs || 0 },
      });
    },
    clearSleepTimer: () => sleepTimerDispatch({ type: "CLEAR_TIMER" }),
  };

  return (
    <PlayerControlsContext.Provider value={controls}>
      <PlayerStateContext.Provider value={playbackValue}>
        <PlayerTimeContext.Provider value={timeValue}>
          <PlaylistContext.Provider value={playlistValue}>
            <SleepTimerContext.Provider value={sleepTimerValue}>
              {children}
            </SleepTimerContext.Provider>
          </PlaylistContext.Provider>
        </PlayerTimeContext.Provider>
      </PlayerStateContext.Provider>
    </PlayerControlsContext.Provider>
  );
}

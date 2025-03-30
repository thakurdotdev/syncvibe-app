import {
  PlaybackContextValue,
  PlaybackState,
  PlayerControls,
  PlaylistContextValue,
  PlaylistState,
} from "@/types/music";
import { Song } from "@/types/song";
import { setupPlayer } from "@/utils/playerSetup";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import TrackPlayer, {
  Event,
  State,
  Track,
  useTrackPlayerEvents,
} from "react-native-track-player";
import { useUser } from "./UserContext";
import useApi from "@/utils/hooks/useApi";

const PLAY_MODES = {
  REPEAT_OFF: "REPEAT_OFF",
  REPEAT_PLAYLIST: "REPEAT_PLAYLIST",
  REPEAT_TRACK: "REPEAT_TRACK",
} as const;

export type PlayMode = (typeof PLAY_MODES)[keyof typeof PLAY_MODES];

const PlayerControlsContext = createContext<PlayerControls | undefined>(
  undefined,
);

const PlayerStateContext = createContext<PlaybackContextValue | undefined>(
  undefined,
);
const PlaylistContext = createContext<PlaylistContextValue | undefined>(
  undefined,
);

// Add the SleepTimer Context
const SleepTimerContext = createContext<{
  setSleepTimer: (minutes?: number, songs?: number) => void;
  clearSleepTimer: () => void;
  timeRemaining: number;
  songsRemaining: number;
  isActive: boolean;
}>({
  setSleepTimer: () => {},
  clearSleepTimer: () => {},
  timeRemaining: 0,
  songsRemaining: 0,
  isActive: false,
});

// Create a hook to use the SleepTimer context
export const useSleepTimer = () => {
  const context = useContext(SleepTimerContext);
  if (!context) {
    throw new Error("useSleepTimer must be used within the MusicProvider");
  }
  return context;
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

const playlistReducer = (
  state: PlaylistState,
  action: { type: string; payload?: any },
): PlaylistState => {
  switch (action.type) {
    case "SET_PLAYLIST":
      return { ...state, playlist: action.payload };
    case "SET_USER_PLAYLIST":
      return { ...state, userPlaylist: action.payload };
    case "REMOVE_FROM_PLAYLIST":
      return {
        ...state,
        playlist: state.playlist.filter((song) => song.id !== action.payload),
      };
    case "CLEAR_PLAYLIST":
      return { ...state, playlist: [] };
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

const convertSongToTrack = (song: Song): Track => {
  return {
    id: song.id,
    url: song.download_url?.[4]?.link || song.download_url?.[3]?.link || "",
    title: song.name || "Unknown Title",
    artist: song?.artist_map?.primary_artists?.[0].name || "Unknown Artist",
    album: song.album || "Unknown Album",
    artwork: song.image?.[2]?.link || song.image?.[1]?.link || "",
    duration: song.duration || 0,
  };
};

interface PlayerProviderProps {
  children: ReactNode;
}

const getAudioUrl = (song: Song | null): string => {
  return song?.download_url?.[4]?.link || song?.download_url?.[3]?.link || "";
};

export function MusicProvider({ children }: PlayerProviderProps) {
  const api = useApi();
  const { user } = useUser();
  const trackPlayerInitialized = useRef(false);
  const playbackStateRef = useRef<PlaybackState>({
    currentSong: null,
    isPlaying: false,
    volume: 1,
    isLoading: false,
    playMode: PLAY_MODES.REPEAT_OFF,
  });

  // Add sleep timer state
  const [sleepTimer, setSleepTimerState] = useState<{
    timeoutId: NodeJS.Timeout | null;
    endTime: number | null;
    minutesTotal: number;
    timeRemaining: number;
    songsRemaining: number;
    songsTotal: number;
    isActive: boolean;
  }>({
    timeoutId: null,
    endTime: null,
    minutesTotal: 0,
    timeRemaining: 0,
    songsRemaining: 0,
    songsTotal: 0,
    isActive: false,
  });

  const [playbackState, playbackDispatch] = useReducer(playbackReducer, {
    currentSong: null,
    isPlaying: false,
    volume: 1,
    isLoading: false,
    playMode: PLAY_MODES.REPEAT_OFF,
  });

  const [playlistState, playlistDispatch] = useReducer(playlistReducer, {
    playlist: [] as Song[],
    userPlaylist: [] as Song[],
  });

  useEffect(() => {
    playbackStateRef.current = playbackState;
  }, [playbackState]);

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        const isSetup = await setupPlayer();

        if (isMounted) {
          trackPlayerInitialized.current = isSetup;
          console.log(
            "TrackPlayer initialization status in MusicProvider:",
            isSetup,
          );
        }
      } catch (error) {
        console.error("Error initializing in MusicProvider:", error);
      }
    };

    initialize();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      const cleanup = async () => {
        try {
          if (trackPlayerInitialized.current) {
            await TrackPlayer.reset();
          }
        } catch (error) {
          console.error("Error cleaning up TrackPlayer:", error);
        }
      };

      cleanup();
    };
  }, []);

  // Add a reference to track songs played for the song-based sleep timer
  const songCountRef = useRef(0);

  useTrackPlayerEvents(
    [
      Event.PlaybackState,
      Event.PlaybackError,
      Event.PlaybackActiveTrackChanged,
      Event.PlaybackQueueEnded,
      Event.RemotePlay,
      Event.RemotePause,
      Event.RemoteStop,
      Event.RemoteNext,
      Event.RemotePrevious,
      Event.RemoteSeek,
    ],
    async (event) => {
      try {
        switch (event.type) {
          case Event.PlaybackActiveTrackChanged:
            // Increment song count for sleep timer
            if (event.index !== undefined && sleepTimer.songsRemaining > 0) {
              songCountRef.current += 1;
              setSleepTimerState((prev) => ({
                ...prev,
                songsRemaining: prev.songsTotal - songCountRef.current,
              }));

              // Check if we've reached the song limit
              if (songCountRef.current >= sleepTimer.songsTotal) {
                controls.stopSong();
                clearSleepTimerState();
              }
            }

            if (event.index !== undefined) {
              const track = await TrackPlayer.getTrack(event.index);
              if (track) {
                const songIndex = playlistState.playlist.findIndex(
                  (song) => song.id === track.id,
                );
                if (songIndex >= 0) {
                  const currentSong = playlistState.playlist[songIndex];
                  playbackDispatch({
                    type: "SET_CURRENT_SONG",
                    payload: currentSong,
                  });

                  // Remove the current song from playlist after playing
                  playlistDispatch({
                    type: "REMOVE_FROM_PLAYLIST",
                    payload: track.id,
                  });
                }
              }
            }
            break;

          case Event.PlaybackError:
            console.error("Playback error:", event.message);
            // Try to recover by playing next song
            if (playbackStateRef.current.isPlaying) {
              controls.handleNextSong();
            }
            break;

          case Event.PlaybackQueueEnded:
            switch (playbackState.playMode) {
              case PLAY_MODES.REPEAT_OFF:
                controls.stopSong();
                break;
              case PLAY_MODES.REPEAT_PLAYLIST:
                if (playlistState.playlist.length > 0) {
                  controls.playSong(playlistState.playlist[0]);
                }
                break;
              case PLAY_MODES.REPEAT_TRACK:
                if (playbackState.currentSong) {
                  controls.playSong(playbackState.currentSong);
                }
                break;
            }
            break;

          // Remote control events from notification/lock screen
          case Event.RemotePlay:
            await TrackPlayer.play();
            break;

          case Event.RemotePause:
            await TrackPlayer.pause();
            break;

          case Event.RemoteStop:
            await TrackPlayer.stop();
            playbackDispatch({ type: "STOP_SONG" });
            break;

          case Event.RemoteNext:
            controls.handleNextSong();
            break;

          case Event.RemotePrevious:
            controls.handlePrevSong();
            break;

          case Event.RemoteSeek:
            if (event.position) {
              await TrackPlayer.seekTo(event.position);
            }
            break;
        }
      } catch (error) {
        console.error("Error handling TrackPlayer event:", error);
      }
    },
  );

  const clearSleepTimerState = () => {
    if (sleepTimer.timeoutId) {
      clearTimeout(sleepTimer.timeoutId);
    }
    songCountRef.current = 0;
    setSleepTimerState({
      timeoutId: null,
      endTime: null,
      minutesTotal: 0,
      timeRemaining: 0,
      songsRemaining: 0,
      songsTotal: 0,
      isActive: false,
    });
  };

  useEffect(() => {
    if (!sleepTimer.isActive || !sleepTimer.endTime) return;

    const intervalId = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(
        0,
        Math.floor((sleepTimer.endTime! - now) / 1000),
      );

      setSleepTimerState((prev) => ({
        ...prev,
        timeRemaining: remaining,
      }));

      // Check if time has expired
      if (remaining <= 0 && sleepTimer.isActive) {
        controls.stopSong();
        clearSleepTimerState();
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [sleepTimer.isActive, sleepTimer.endTime]);

  // Player controls
  const controls: PlayerControls = useMemo(
    () => ({
      playSong: async (song: Song) => {
        if (!song?.id || !trackPlayerInitialized.current) return;

        try {
          playbackDispatch({ type: "SET_LOADING", payload: true });

          await TrackPlayer.reset();
          const track = convertSongToTrack(song);

          await TrackPlayer.add([track]);
          await TrackPlayer.play();

          playbackDispatch({ type: "SET_CURRENT_SONG", payload: song });
          playbackDispatch({ type: "SET_PLAYING", payload: true });
          playbackDispatch({ type: "SET_LOADING", payload: false });
        } catch (error) {
          console.error("Song play error:", error);
          playbackDispatch({ type: "SET_LOADING", payload: false });
        }
      },

      stopSong: async () => {
        try {
          if (trackPlayerInitialized.current) {
            await TrackPlayer.stop();
            await TrackPlayer.reset();
          }
          playbackDispatch({ type: "STOP_SONG" });
        } catch (error) {
          console.error("Stop song error:", error);
        }
      },

      handlePlayPauseSong: async () => {
        try {
          if (!trackPlayerInitialized.current) return;

          if (State.Playing) {
            await TrackPlayer.pause();
            playbackDispatch({ type: "SET_PLAYING", payload: false });
          } else if (State.Paused) {
            await TrackPlayer.play();
            playbackDispatch({ type: "SET_PLAYING", payload: true });
          }
        } catch (error) {
          console.error("Error toggling play/pause:", error);
        }
      },

      handleVolumeChange: async (value: number) => {
        try {
          const newVolume = Math.min(Math.max(value, 0), 1);
          if (trackPlayerInitialized.current) {
            await TrackPlayer.setVolume(newVolume);
            playbackDispatch({ type: "SET_VOLUME", payload: newVolume });
          }
        } catch (error) {
          console.error("Error changing volume:", error);
        }
      },

      addToPlaylist: (songs: Song | Song[]) => {
        const newSongs = Array.isArray(songs) ? songs : [songs];
        playlistDispatch({
          type: "SET_PLAYLIST",
          payload: newSongs,
        });
      },

      setPlayMode: (mode: PlayMode) => {
        playbackDispatch({ type: "SET_PLAY_MODE", payload: mode });
      },

      clearQueue: () => {
        playlistDispatch({ type: "CLEAR_PLAYLIST" });
        controls.stopSong();
      },

      addToQueue: async (songs: Song | Song[]) => {
        const newSongs = Array.isArray(songs) ? songs : [songs];

        // Filter out the currently playing song if it exists
        const currentSongId = playbackState.currentSong?.id;
        const filteredNewSongs = newSongs.filter(
          (song) => song.id !== currentSongId,
        );

        // Filter out songs already in the playlist
        const uniqueNewSongs = filteredNewSongs.filter(
          (song) => !playlistState.playlist.some((s) => s.id === song.id),
        );

        if (uniqueNewSongs.length > 0) {
          playlistDispatch({
            type: "SET_PLAYLIST",
            payload: [...playlistState.playlist, ...uniqueNewSongs],
          });

          if (trackPlayerInitialized.current) {
            try {
              const tracksToAdd = uniqueNewSongs.map(convertSongToTrack);
              await TrackPlayer.add(tracksToAdd);
            } catch (error) {
              console.error("Queue addition error:", error);
            }
          }
        }
      },

      removeFromQueue: async (songId: string) => {
        playlistDispatch({ type: "REMOVE_FROM_PLAYLIST", payload: songId });
        if (trackPlayerInitialized.current) {
          try {
            const currentSongId = playbackState.currentSong?.id;
            if (currentSongId === songId) {
              await TrackPlayer.stop();
              playbackDispatch({ type: "STOP_SONG" });
            }
            const currentQueue = await TrackPlayer.getQueue();
            const songIndex = currentQueue.findIndex(
              (song) => song.id === songId,
            );
            if (songIndex >= 0) {
              await TrackPlayer.remove(songIndex);
            }
          } catch (error) {
            console.error("Queue removal error:", error);
          }
        }
      },

      handleNextSong: async () => {
        if (!trackPlayerInitialized.current) return;

        try {
          // Get current song ID
          const currentSongId = playbackState.currentSong?.id;

          // Create a working copy of the current playlist
          let updatedPlaylist = [...playlistState.playlist];

          // If there's a current song, remove it from our working copy
          if (currentSongId) {
            updatedPlaylist = updatedPlaylist.filter(
              (song) => song.id !== currentSongId,
            );
          }

          // Now get the next song from our modified playlist
          const nextSong =
            updatedPlaylist.length > 0 ? updatedPlaylist[0] : null;

          // Update the playlist state with our modified playlist
          playlistDispatch({
            type: "SET_PLAYLIST",
            payload: updatedPlaylist,
          });

          // Play the next song or stop if there are no more songs
          if (nextSong) {
            controls.playSong(nextSong);
          } else {
            await TrackPlayer.stop();
            playbackDispatch({ type: "STOP_SONG" });
          }
        } catch (error) {
          console.error("Next song error:", error);
        }
      },

      handlePrevSong: async () => {
        if (!trackPlayerInitialized.current) return;

        try {
          const position = await TrackPlayer.getProgress().then(
            (progress) => progress.position,
          );

          if (position > 3) {
            await TrackPlayer.seekTo(0);
          } else {
            await TrackPlayer.skipToPrevious();
          }
        } catch (error) {
          console.error("Error handling previous song:", error);
        }
      },

      setSleepTimer: (minutes = 0, songs = 0) => {
        if (sleepTimer.timeoutId) {
          clearTimeout(sleepTimer.timeoutId);
        }

        // Reset song counter
        songCountRef.current = 0;

        // If both are 0, just clear the timer
        if (minutes === 0 && songs === 0) {
          clearSleepTimerState();
          return;
        }

        // Set up the time-based timer
        if (minutes > 0) {
          const timeoutMs = minutes * 60 * 1000;
          const endTime = Date.now() + timeoutMs;

          const timeoutId = setTimeout(() => {
            controls.stopSong();
            clearSleepTimerState();
          }, timeoutMs);

          setSleepTimerState({
            timeoutId,
            endTime,
            minutesTotal: minutes,
            timeRemaining: minutes * 60,
            songsRemaining: 0,
            songsTotal: 0,
            isActive: true,
          });
        }
        // Set up the song-based timer
        else if (songs > 0) {
          setSleepTimerState({
            timeoutId: null,
            endTime: null,
            minutesTotal: 0,
            timeRemaining: 0,
            songsRemaining: songs,
            songsTotal: songs,
            isActive: true,
          });
        }
      },

      clearSleepTimer: clearSleepTimerState,
    }),
    [
      playbackState.currentSong,
      playlistState.playlist,
      getAudioUrl,
      sleepTimer,
    ],
  );

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

  const getPlaylists = async () => {
    try {
      if (!user) return;
      const { data } = await api.get(`/api/playlist/get`);
      if (data?.data) {
        playlistDispatch({
          type: "SET_USER_PLAYLIST",
          payload: data.data,
        });
      }
    } catch (error) {
      console.error("Error fetching playlists:", error);
    }
  };

  useEffect(() => {
    if (user?.userid) {
      getPlaylists();
    }
  }, [user?.userid]);

  const playlistValue: PlaylistContextValue = {
    ...playlistState,
    getPlaylists,

    setPlaylist: (playlist: Song[]) => {
      playlistDispatch({ type: "SET_PLAYLIST", payload: playlist });
    },
    setUserPlaylist: (playlist: Song[]) => {
      playlistDispatch({ type: "SET_USER_PLAYLIST", payload: playlist });
    },
  };

  // Create sleep timer value object
  const sleepTimerValue = {
    setSleepTimer: (minutes?: number, songs?: number) =>
      controls.setSleepTimer(minutes, songs),
    clearSleepTimer: controls.clearSleepTimer,
    timeRemaining: sleepTimer.timeRemaining,
    songsRemaining: sleepTimer.songsRemaining,
    isActive: sleepTimer.isActive,
  };

  return (
    <PlayerControlsContext.Provider value={controls}>
      <PlayerStateContext.Provider value={playbackValue}>
        <PlaylistContext.Provider value={playlistValue}>
          <SleepTimerContext.Provider value={sleepTimerValue}>
            {children}
          </SleepTimerContext.Provider>
        </PlaylistContext.Provider>
      </PlayerStateContext.Provider>
    </PlayerControlsContext.Provider>
  );
}

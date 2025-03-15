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
} from "react";
import TrackPlayer, {
  Event,
  State,
  Track,
  useTrackPlayerEvents,
} from "react-native-track-player";
import { useUser } from "./UserContext";
import useApi from "@/utils/hooks/useApi";

const PlayerControlsContext = createContext<PlayerControls | undefined>(
  undefined,
);

const PlayerStateContext = createContext<PlaybackContextValue | undefined>(
  undefined,
);
const PlaylistContext = createContext<PlaylistContextValue | undefined>(
  undefined,
);

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
            // Queue ended, reset playlist or loop depending on your app's needs
            if (playlistState.playlist.length > 0) {
              // Optional: loop through playlist again
              controls.playSong(playlistState.playlist[0]);
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

  // Player controls
  const controls: PlayerControls = useMemo(
    () => ({
      playSong: async (song: Song) => {
        if (!song?.id || !trackPlayerInitialized.current) return;

        try {
          playbackDispatch({ type: "SET_LOADING", payload: true });

          // Reset the queue
          await TrackPlayer.reset();

          // Convert Song to TrackPlayer format with streaming options
          const track = convertSongToTrack(song);

          // Add and play the selected track
          await TrackPlayer.add([track]);
          await TrackPlayer.play();

          // Update player state
          playbackDispatch({ type: "SET_CURRENT_SONG", payload: song });
          playbackDispatch({ type: "SET_PLAYING", payload: true });

          // If we have a playlist, add the rest of the tracks
          if (playlistState.playlist.length > 1) {
            const currentIndex = playlistState.playlist.findIndex(
              (s) => s.id === song.id,
            );
            if (currentIndex >= 0) {
              // Add tracks after the current one
              const nextTracks = playlistState.playlist
                .slice(currentIndex + 1)
                .map(convertSongToTrack);

              // Add tracks before the current one (to complete the cycle)
              const previousTracks = playlistState.playlist
                .slice(0, currentIndex)
                .map(convertSongToTrack);

              if (nextTracks.length > 0) {
                await TrackPlayer.add(nextTracks);
              }
              if (previousTracks.length > 0) {
                await TrackPlayer.add(previousTracks);
              }
            }
          }

          playbackDispatch({ type: "SET_LOADING", payload: false });
        } catch (error) {
          console.error("Error playing song:", error);
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
          console.error("Error stopping song:", error);
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

      addToQueue: async (songs: Song | Song[]) => {
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

          if (trackPlayerInitialized.current && playbackState.currentSong) {
            try {
              const tracksToAdd = uniqueNewSongs.map(convertSongToTrack);
              await TrackPlayer.add(tracksToAdd);
            } catch (error) {
              console.error("Error adding to queue:", error);
            }
          }
        }
      },

      handleNextSong: async () => {
        if (!trackPlayerInitialized.current) return;

        try {
          const queue = await TrackPlayer.getQueue();
          const currentIndex = await TrackPlayer.getActiveTrackIndex();

          if (queue.length > 1 && currentIndex !== null) {
            await TrackPlayer.skipToNext();
          } else if (playlistState.playlist.length > 0) {
            controls.playSong(playlistState.playlist[0]);
          }
        } catch (error) {
          console.error("Error skipping to next song:", error);
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
    }),
    [playbackState.currentSong, playlistState.playlist, getAudioUrl],
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

  return (
    <PlayerControlsContext.Provider value={controls}>
      <PlayerStateContext.Provider value={playbackValue}>
        <PlaylistContext.Provider value={playlistValue}>
          {children}
        </PlaylistContext.Provider>
      </PlayerStateContext.Provider>
    </PlayerControlsContext.Provider>
  );
}

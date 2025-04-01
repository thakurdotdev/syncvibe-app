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
    case "SET_PLAY_MODE":
      return { ...state, playMode: action.payload };
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
    case "ADD_TO_PLAYLIST":
      // Ensure we don't have duplicates
      const newSongs = Array.isArray(action.payload)
        ? action.payload
        : [action.payload];
      const uniqueSongs = newSongs.filter(
        (newSong) => !state.playlist.some((song) => song.id === newSong.id),
      );
      return {
        ...state,
        playlist: [...state.playlist, ...uniqueSongs],
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
  // Prioritize highest quality audio URL
  const audioUrl =
    song.download_url?.[3].link ||
    song.download_url?.[2].link ||
    song.download_url?.[1].link;

  // Prioritize highest quality image
  const artwork = song.image?.[2].link || song.image?.[1].link;
  return {
    id: song.id,
    url: audioUrl,
    title: song.name || "Unknown Title",
    artist: song?.artist_map?.primary_artists?.[0]?.name || "Unknown Artist",
    album: song.album || "Unknown Album",
    artwork: artwork,
    duration: song.duration || 0,
  };
};

interface PlayerProviderProps {
  children: ReactNode;
}

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
  const playerSetupPromise = useRef<Promise<boolean> | null>(null);
  const queueUpdateInProgress = useRef(false);

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

  // Initialize TrackPlayer once
  useEffect(() => {
    if (!playerSetupPromise.current) {
      playerSetupPromise.current = setupPlayer()
        .then((isSetup) => {
          trackPlayerInitialized.current = isSetup;
          console.log("TrackPlayer initialization status:", isSetup);
          return isSetup;
        })
        .catch((error) => {
          console.error("Error initializing TrackPlayer:", error);
          return false;
        });
    }

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

  // Helper to ensure TrackPlayer is ready before performing operations
  const ensurePlayerReady = async (): Promise<boolean> => {
    if (trackPlayerInitialized.current) return true;

    if (playerSetupPromise.current) {
      const isReady = await playerSetupPromise.current;
      trackPlayerInitialized.current = isReady;
      return isReady;
    }

    return false;
  };

  // Handle TrackPlayer events
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
        if (!(await ensurePlayerReady())) return;

        switch (event.type) {
          case Event.PlaybackState:
            const playerState = await TrackPlayer.getState();
            playbackDispatch({
              type: "SET_PLAYING",
              payload: playerState === State.Playing,
            });
            break;

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

                  // Remove the current song from playlist after it starts playing
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

            // Wait a moment before trying to recover
            setTimeout(async () => {
              // Try to recover by playing next song
              if (playbackStateRef.current.isPlaying) {
                await controls.handleNextSong();
              }
            }, 500);
            break;

          case Event.PlaybackQueueEnded:
            // Handle queue ending based on play mode
            switch (playbackState.playMode) {
              case PLAY_MODES.REPEAT_OFF:
                controls.stopSong();
                break;

              case PLAY_MODES.REPEAT_PLAYLIST:
                if (playlistState.playlist.length > 0) {
                  controls.playSong(playlistState.playlist[0]);
                } else if (playbackState.currentSong) {
                  // If playlist is empty but we have a current song, replay it
                  controls.playSong(playbackState.currentSong);
                }
                break;

              case PLAY_MODES.REPEAT_TRACK:
                if (playbackState.currentSong) {
                  controls.playSong(playbackState.currentSong);
                }
                break;
            }
            break;

          // Remote control events
          case Event.RemotePlay:
            await TrackPlayer.play();
            break;

          case Event.RemotePause:
            await TrackPlayer.pause();
            break;

          case Event.RemoteStop:
            controls.stopSong();
            break;

          case Event.RemoteNext:
            controls.handleNextSong();
            break;

          case Event.RemotePrevious:
            controls.handlePrevSong();
            break;

          case Event.RemoteSeek:
            if (event.position !== undefined) {
              await TrackPlayer.seekTo(event.position);
            }
            break;
        }
      } catch (error) {
        console.error("Error handling TrackPlayer event:", error);
      }
    },
  );

  // Player controls with debouncing and error handling
  const controls: PlayerControls = useMemo(
    () => ({
      playSong: async (song: Song) => {
        if (!song?.id) return;

        try {
          playbackDispatch({ type: "SET_LOADING", payload: true });

          if (!(await ensurePlayerReady())) {
            console.error("TrackPlayer not initialized");
            playbackDispatch({ type: "SET_LOADING", payload: false });
            return;
          }

          // Reset the player and prepare the new track
          await TrackPlayer.reset();
          const track = convertSongToTrack(song);

          // Only proceed if we have a valid URL
          if (!track.url) {
            console.error("Song has no playable URL:", song.id);
            playbackDispatch({ type: "SET_LOADING", payload: false });
            return;
          }

          // Add the track and start playback
          await TrackPlayer.add([track]);

          // Set proper volume before playing
          await TrackPlayer.setVolume(playbackState.volume);

          // Begin playback
          await TrackPlayer.play();

          // Update state
          playbackDispatch({ type: "SET_CURRENT_SONG", payload: song });
          playbackDispatch({ type: "SET_PLAYING", payload: true });
          playbackDispatch({ type: "SET_LOADING", payload: false });
        } catch (error) {
          console.error("Song play error:", error);
          playbackDispatch({ type: "SET_LOADING", payload: false });

          // Try playing the next song if this one fails
          if (playlistState.playlist.length > 0) {
            setTimeout(() => controls.handleNextSong(), 500);
          }
        }
      },

      stopSong: async () => {
        try {
          if (await ensurePlayerReady()) {
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
          if (!(await ensurePlayerReady())) return;

          const playerState = await TrackPlayer.getState();

          if (playerState === State.Playing) {
            await TrackPlayer.pause();
            playbackDispatch({ type: "SET_PLAYING", payload: false });
          } else {
            // If we have a current song but the player is stopped, replay it
            if (playerState === State.None && playbackState.currentSong) {
              await controls.playSong(playbackState.currentSong);
            } else {
              await TrackPlayer.play();
              playbackDispatch({ type: "SET_PLAYING", payload: true });
            }
          }
        } catch (error) {
          console.error("Error toggling play/pause:", error);
        }
      },

      addToPlaylist: (songs: Song | Song[]) => {
        const newSongs = Array.isArray(songs) ? songs : [songs];
        playlistDispatch({
          type: "SET_PLAYLIST",
          payload: [...playlistState.playlist, ...newSongs],
        });
      },

      setPlayMode: (mode: PlayMode) => {
        playbackDispatch({ type: "SET_PLAY_MODE", payload: mode });
      },

      clearQueue: async () => {
        playlistDispatch({ type: "CLEAR_PLAYLIST" });
        await controls.stopSong();
      },

      addToQueue: async (songs: Song | Song[]) => {
        if (queueUpdateInProgress.current) return;
        queueUpdateInProgress.current = true;

        try {
          const newSongs = Array.isArray(songs) ? songs : [songs];

          // Filter out the currently playing song
          const currentSongId = playbackState.currentSong?.id;
          const filteredNewSongs = newSongs.filter(
            (song) => song.id !== currentSongId,
          );

          // Filter out songs already in the playlist
          const uniqueNewSongs = filteredNewSongs.filter(
            (song) => !playlistState.playlist.some((s) => s.id === song.id),
          );

          if (uniqueNewSongs.length > 0) {
            // Update the playlist state
            playlistDispatch({
              type: "ADD_TO_PLAYLIST",
              payload: uniqueNewSongs,
            });

            // If player is ready, add tracks to queue
            if (await ensurePlayerReady()) {
              const tracksToAdd = uniqueNewSongs.map(convertSongToTrack);

              // Filter out tracks with no URL
              const validTracks = tracksToAdd.filter((track) => track.url);

              if (validTracks.length > 0) {
                await TrackPlayer.add(validTracks);
              }
            }
          }
        } catch (error) {
          console.error("Queue addition error:", error);
        } finally {
          queueUpdateInProgress.current = false;
        }
      },

      removeFromQueue: async (songId: string) => {
        try {
          playlistDispatch({ type: "REMOVE_FROM_PLAYLIST", payload: songId });

          if (await ensurePlayerReady()) {
            const currentSongId = playbackState.currentSong?.id;

            // If we're removing the current song, stop it
            if (currentSongId === songId) {
              await TrackPlayer.stop();
              playbackDispatch({ type: "STOP_SONG" });

              // Play the next song if available
              if (playlistState.playlist.length > 0) {
                setTimeout(() => controls.handleNextSong(), 300);
              }
            } else {
              // Otherwise just remove it from the queue
              const currentQueue = await TrackPlayer.getQueue();
              const songIndex = currentQueue.findIndex(
                (track) => track.id === songId,
              );

              if (songIndex >= 0) {
                await TrackPlayer.remove(songIndex);
              }
            }
          }
        } catch (error) {
          console.error("Queue removal error:", error);
        }
      },

      handleNextSong: async () => {
        if (!(await ensurePlayerReady())) return;

        try {
          // Get current song ID
          const currentSongId = playbackState.currentSong?.id;

          // Create a working copy of the current playlist
          const updatedPlaylist = [...playlistState.playlist];

          // Get the next song from the playlist
          const nextSong =
            updatedPlaylist.length > 0 ? updatedPlaylist[0] : null;

          // Play the next song or stop if there are none
          if (nextSong) {
            controls.playSong(nextSong);
          } else if (
            playbackState.playMode === PLAY_MODES.REPEAT_TRACK &&
            playbackState.currentSong
          ) {
            // In REPEAT_TRACK mode, replay the current song if there's nothing in the queue
            await controls.playSong(playbackState.currentSong);
          } else {
            await TrackPlayer.stop();
            playbackDispatch({ type: "STOP_SONG" });
          }
        } catch (error) {
          console.error("Next song error:", error);
        }
      },

      handlePrevSong: async () => {
        if (!(await ensurePlayerReady())) return;

        try {
          // Get current playback position
          const { position } = await TrackPlayer.getProgress();

          // If we're more than 3 seconds into the song, just restart it
          if (position > 3) {
            await TrackPlayer.seekTo(0);
          } else if (playbackState.currentSong) {
            // Otherwise replay the current song (since we don't have a "previous" queue)
            controls.playSong(playbackState.currentSong);
          }
        } catch (error) {
          console.error("Error handling previous song:", error);
        }
      },
    }),
    [playbackState, playlistState.playlist],
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

  // Fetch playlists when user is available
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

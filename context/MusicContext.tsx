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

// Pre-cache audio track conversion
const songTrackCache = new Map<string, Track>();

const convertSongToTrack = (song: Song): Track => {
  // Check cache first
  if (songTrackCache.has(song.id)) {
    return songTrackCache.get(song.id)!;
  }

  // Prioritize highest quality audio URL
  const audioUrl =
    song.download_url?.[3].link ||
    song.download_url?.[2].link ||
    song.download_url?.[1].link;

  // Prioritize highest quality image
  const artwork = song.image?.[2].link || song.image?.[1].link;

  const track = {
    id: song.id,
    url: audioUrl,
    title: song.name || "Unknown Title",
    artist: song?.artist_map?.primary_artists?.[0]?.name || "Unknown Artist",
    album: song.album || "Unknown Album",
    artwork: artwork,
    duration: song.duration || 0,
  };

  // Cache the track for future use
  songTrackCache.set(song.id, track);
  return track;
};

interface PlayerProviderProps {
  children: ReactNode;
}

export function MusicProvider({ children }: PlayerProviderProps) {
  const api = useApi();
  const { user } = useUser();
  const trackPlayerInitialized = useRef(false);
  const playerSetupComplete = useRef(false);
  const playbackStateRef = useRef<PlaybackState>({
    currentSong: null,
    isPlaying: false,
    volume: 1,
    isLoading: false,
    playMode: PLAY_MODES.REPEAT_OFF,
  });
  const playerSetupPromise = useRef<Promise<boolean> | null>(null);
  const queueUpdateInProgress = useRef(false);
  const pendingPlayAction = useRef<(() => Promise<void>) | null>(null);

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

  // Initialize TrackPlayer once with optimized settings
  useEffect(() => {
    if (!playerSetupPromise.current) {
      playerSetupPromise.current = setupPlayer()
        .then(async (isSetup) => {
          trackPlayerInitialized.current = isSetup;

          if (isSetup) {
            // Configure TrackPlayer for optimal performance
            try {
              // Pre-initialize audio engine
              await TrackPlayer.setVolume(playbackState.volume);
            } catch (error) {
              console.error("Error configuring TrackPlayer:", error);
            }
          }

          playerSetupComplete.current = isSetup;
          console.log("TrackPlayer initialization status:", isSetup);

          // Execute any pending play action once setup is complete
          if (pendingPlayAction.current) {
            pendingPlayAction.current();
            pendingPlayAction.current = null;
          }

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
    if (playerSetupComplete.current) return true;

    if (playerSetupPromise.current) {
      const isReady = await playerSetupPromise.current;
      playerSetupComplete.current = isReady;
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
        // Skip event processing if player isn't ready
        if (!trackPlayerInitialized.current) return;

        switch (event.type) {
          case Event.PlaybackState:
            const playerState = await TrackPlayer.getState();
            // Only update UI if state actually changed
            if (
              (playerState === State.Playing) !==
              playbackStateRef.current.isPlaying
            ) {
              playbackDispatch({
                type: "SET_PLAYING",
                payload: playerState === State.Playing,
              });
            }
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

                  // Only update if the song actually changed
                  if (
                    currentSong.id !== playbackStateRef.current.currentSong?.id
                  ) {
                    playbackDispatch({
                      type: "SET_CURRENT_SONG",
                      payload: currentSong,
                    });
                  }

                  // Remove the current song from playlist after it starts playing
                  playlistDispatch({
                    type: "REMOVE_FROM_PLAYLIST",
                    payload: track.id,
                  });

                  // Preload next song in queue if available
                  if (playlistState.playlist.length > 1) {
                    const nextSong = playlistState.playlist[1];
                    // Convert and cache the next track
                    convertSongToTrack(nextSong);
                  }
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
            }, 300); // Reduced from 500ms for faster recovery
            break;

          case Event.PlaybackQueueEnded:
            // Handle queue ending based on play mode
            switch (playbackStateRef.current.playMode) {
              case PLAY_MODES.REPEAT_OFF:
                controls.stopSong();
                break;

              case PLAY_MODES.REPEAT_PLAYLIST:
                if (playlistState.playlist.length > 0) {
                  controls.playSong(playlistState.playlist[0]);
                } else if (playbackStateRef.current.currentSong) {
                  // If playlist is empty but we have a current song, replay it
                  controls.playSong(playbackStateRef.current.currentSong);
                }
                break;

              case PLAY_MODES.REPEAT_TRACK:
                if (playbackStateRef.current.currentSong) {
                  controls.playSong(playbackStateRef.current.currentSong);
                }
                break;
            }
            break;

          // Remote control events - optimized for immediate response
          case Event.RemotePlay:
            await TrackPlayer.play();
            playbackDispatch({ type: "SET_PLAYING", payload: true });
            break;

          case Event.RemotePause:
            await TrackPlayer.pause();
            playbackDispatch({ type: "SET_PLAYING", payload: false });
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

  // Player controls with optimized performance
  const controls: PlayerControls = useMemo(
    () => ({
      playSong: async (song: Song) => {
        if (!song?.id) return;

        try {
          // Update state immediately for perceived responsiveness
          playbackDispatch({ type: "SET_CURRENT_SONG", payload: song });
          playbackDispatch({ type: "SET_LOADING", payload: true });
          playbackDispatch({ type: "SET_PLAYING", payload: true });

          const playOperation = async () => {
            try {
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

              // Pre-cache the next track if available in playlist
              if (playlistState.playlist.length > 0) {
                convertSongToTrack(playlistState.playlist[0]);
              }

              // Set volume before playing
              await TrackPlayer.setVolume(playbackStateRef.current.volume);

              // Begin playback immediately
              await TrackPlayer.play();

              // Update loading state
              playbackDispatch({ type: "SET_LOADING", payload: false });
            } catch (error) {
              console.error("Error in play operation:", error);
              playbackDispatch({ type: "SET_LOADING", payload: false });

              // Try playing next song if available
              if (playlistState.playlist.length > 0) {
                setTimeout(() => controls.handleNextSong(), 300);
              }
            }
          };

          // Check if player is ready
          if (playerSetupComplete.current) {
            await playOperation();
          } else {
            // Queue the operation for after setup completes
            pendingPlayAction.current = playOperation;

            // Ensure player setup has started
            if (!playerSetupPromise.current) {
              playerSetupPromise.current = setupPlayer().then((isSetup) => {
                trackPlayerInitialized.current = isSetup;
                playerSetupComplete.current = isSetup;
                return isSetup;
              });
            }
          }
        } catch (error) {
          console.error("Song play error:", error);
          playbackDispatch({ type: "SET_LOADING", payload: false });
        }
      },

      stopSong: async () => {
        try {
          // Update UI immediately for responsiveness
          playbackDispatch({ type: "STOP_SONG" });

          if (trackPlayerInitialized.current) {
            await TrackPlayer.stop();
            await TrackPlayer.reset();
          }
        } catch (error) {
          console.error("Stop song error:", error);
        }
      },

      handlePlayPauseSong: async () => {
        try {
          // Update UI immediately
          const newPlayingState = !playbackStateRef.current.isPlaying;
          playbackDispatch({ type: "SET_PLAYING", payload: newPlayingState });

          if (!trackPlayerInitialized.current) {
            if (playerSetupPromise.current) {
              await playerSetupPromise.current;
            } else {
              return;
            }
          }

          const playerState = await TrackPlayer.getState();

          if (newPlayingState) {
            // Want to play
            if (
              playerState === State.None &&
              playbackStateRef.current.currentSong
            ) {
              // Player is reset, need to load song again
              await controls.playSong(playbackStateRef.current.currentSong);
            } else {
              // Player has content, just resume
              await TrackPlayer.play();
            }
          } else {
            // Want to pause
            await TrackPlayer.pause();
          }
        } catch (error) {
          console.error("Error toggling play/pause:", error);
          // Revert UI state if operation failed
          playbackDispatch({
            type: "SET_PLAYING",
            payload: playbackStateRef.current.isPlaying,
          });
        }
      },

      addToPlaylist: (songs: Song | Song[]) => {
        const newSongs = Array.isArray(songs) ? songs : [songs];
        playlistDispatch({
          type: "SET_PLAYLIST",
          payload: [...playlistState.playlist, ...newSongs],
        });

        // Pre-cache tracks for faster playback later
        setTimeout(() => {
          if (newSongs.length > 0) {
            // Only cache the first few songs to avoid excessive network requests
            const songsToCache = newSongs.slice(0, 3);
            songsToCache.forEach(convertSongToTrack);
          }
        }, 100);
      },

      setPlayMode: (mode: PlayMode) => {
        playbackDispatch({ type: "SET_PLAY_MODE", payload: mode });
      },

      clearQueue: async () => {
        playlistDispatch({ type: "CLEAR_PLAYLIST" });

        // Update UI immediately
        if (playbackStateRef.current.isPlaying) {
          playbackDispatch({ type: "SET_PLAYING", payload: false });
        }

        // Then handle player state
        if (trackPlayerInitialized.current) {
          await TrackPlayer.reset();
          playbackDispatch({ type: "STOP_SONG" });
        }
      },

      addToQueue: async (songs: Song | Song[]) => {
        if (queueUpdateInProgress.current) return;
        queueUpdateInProgress.current = true;

        try {
          const newSongs = Array.isArray(songs) ? songs : [songs];

          // Filter out the currently playing song and songs already in playlist
          const currentSongId = playbackStateRef.current.currentSong?.id;
          const uniqueNewSongs = newSongs.filter(
            (song) =>
              song.id !== currentSongId &&
              !playlistState.playlist.some((s) => s.id === song.id),
          );

          if (uniqueNewSongs.length > 0) {
            // Update the playlist state immediately
            playlistDispatch({
              type: "ADD_TO_PLAYLIST",
              payload: uniqueNewSongs,
            });

            // Pre-cache the first song for faster playback
            if (uniqueNewSongs.length > 0) {
              convertSongToTrack(uniqueNewSongs[0]);
            }

            // Add to player queue if ready
            if (trackPlayerInitialized.current) {
              // Filter out tracks with no URL
              const tracksToAdd = uniqueNewSongs
                .map(convertSongToTrack)
                .filter((track) => track.url);

              if (tracksToAdd.length > 0) {
                await TrackPlayer.add(tracksToAdd);
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
          // Update UI immediately
          playlistDispatch({ type: "REMOVE_FROM_PLAYLIST", payload: songId });

          if (trackPlayerInitialized.current) {
            const currentSongId = playbackStateRef.current.currentSong?.id;

            // If we're removing the current song, stop it and play next
            if (currentSongId === songId) {
              playbackDispatch({ type: "STOP_SONG" });
              await TrackPlayer.stop();

              // Play the next song if available
              if (playlistState.playlist.length > 0) {
                setTimeout(() => controls.handleNextSong(), 100);
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
        try {
          // Update UI immediately to feel responsive
          if (playlistState.playlist.length > 0) {
            const nextSong = playlistState.playlist[0];
            playbackDispatch({ type: "SET_CURRENT_SONG", payload: nextSong });
            playbackDispatch({ type: "SET_LOADING", payload: true });
          }

          if (!trackPlayerInitialized.current) {
            if (playerSetupPromise.current) {
              await playerSetupPromise.current;
            } else {
              playbackDispatch({ type: "SET_LOADING", payload: false });
              return;
            }
          }

          // Create a working copy of the current playlist
          const updatedPlaylist = [...playlistState.playlist];

          // Get the next song from the playlist
          const nextSong =
            updatedPlaylist.length > 0 ? updatedPlaylist[0] : null;

          // Play the next song or handle according to play mode
          if (nextSong) {
            await controls.playSong(nextSong);
          } else if (
            playbackStateRef.current.playMode === PLAY_MODES.REPEAT_TRACK &&
            playbackStateRef.current.currentSong
          ) {
            // In REPEAT_TRACK mode, replay the current song
            await controls.playSong(playbackStateRef.current.currentSong);
          } else {
            // Update UI before player operations
            playbackDispatch({ type: "STOP_SONG" });
            playbackDispatch({ type: "SET_LOADING", payload: false });

            // Then handle player state
            await TrackPlayer.stop();
          }
        } catch (error) {
          console.error("Next song error:", error);
          playbackDispatch({ type: "SET_LOADING", payload: false });
        }
      },

      handlePrevSong: async () => {
        try {
          if (!trackPlayerInitialized.current) {
            if (playerSetupPromise.current) {
              await playerSetupPromise.current;
            } else {
              return;
            }
          }

          // Get current playback position
          const { position } = await TrackPlayer.getProgress();

          // If we're more than 3 seconds into the song, just restart it
          if (position > 3) {
            // Update UI immediately
            playbackDispatch({ type: "SET_LOADING", payload: true });

            await TrackPlayer.seekTo(0);

            playbackDispatch({ type: "SET_LOADING", payload: false });
          } else if (playbackStateRef.current.currentSong) {
            // Otherwise replay the current song
            controls.playSong(playbackStateRef.current.currentSong);
          }
        } catch (error) {
          console.error("Error handling previous song:", error);
          playbackDispatch({ type: "SET_LOADING", payload: false });
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
    setVolume: (volume: number) => {
      playbackDispatch({ type: "SET_VOLUME", payload: volume });
      // Update player volume immediately if initialized
      if (trackPlayerInitialized.current) {
        TrackPlayer.setVolume(volume).catch(console.error);
      }
    },
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

      // Pre-cache first few songs for faster playback
      if (playlist.length > 0) {
        setTimeout(() => {
          playlist.slice(0, 2).forEach(convertSongToTrack);
        }, 100);
      }
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

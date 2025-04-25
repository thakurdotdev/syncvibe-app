import {
  PlaybackContextValue,
  PlaybackState,
  PlayerControls,
  PlaylistContextValue,
  PlaylistState,
} from "@/types/music";
import { Song } from "@/types/song";
import useApi from "@/utils/hooks/useApi";
import { setupPlayer, getOptimalAudioQuality } from "@/utils/playerSetup";
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
  RepeatMode,
} from "react-native-track-player";
import { getPlaybackState } from "react-native-track-player/lib/src/trackPlayer";
import { useUser } from "./UserContext";
import { addToHistory } from "@/utils/api/addToHistory";
import { AppState } from "react-native";
import * as Network from "expo-network";

const CUSTOM_EVENTS = {
  REMOTE_NEXT_TRIGGERED: "remote-next-triggered",
  REMOTE_PREV_TRIGGERED: "remote-prev-triggered",
};

// Use a global cache for tracks to improve performance
const trackCache = new Map<string, Track>();

// Context definitions remain unchanged
const PlayerControlsContext = createContext<PlayerControls | undefined>(
  undefined,
);

const PlayerStateContext = createContext<PlaybackContextValue | undefined>(
  undefined,
);
const PlaylistContext = createContext<PlaylistContextValue | undefined>(
  undefined,
);

// Reducers remain unchanged
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
    case "ADD_TO_PLAYLIST":
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
    case "REORDER_PLAYLIST":
      return {
        ...state,
        playlist: action.payload,
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

// Optimized function to convert songs to tracks with dynamic quality selection based on network
const convertSongToTrack = async (song: Song): Promise<Track> => {
  // Check if we already have this track in cache
  const cachedTrack = trackCache.get(song.id);
  if (cachedTrack) {
    return cachedTrack;
  }

  // Determine optimal audio quality based on network conditions
  const qualityIndex = await getOptimalAudioQuality();

  // Select audio URL based on quality and availability
  let audioUrl = "";
  if (song.download_url) {
    if (qualityIndex === 2 && song.download_url[3]?.link) {
      // High quality
      audioUrl = song.download_url[3].link;
    } else if (qualityIndex === 1 && song.download_url[2]?.link) {
      // Medium quality
      audioUrl = song.download_url[2].link;
    } else if (song.download_url[1]?.link) {
      // Low quality
      audioUrl = song.download_url[1].link;
    } else {
      // Fallback to any available quality
      audioUrl =
        song.download_url[3]?.link ||
        song.download_url[2]?.link ||
        song.download_url[1]?.link ||
        song.download_url[0]?.link;
    }
  }

  // Select image quality based on device screen density
  let artwork = "";
  if (song.image) {
    // Choose the best quality image available
    artwork = song.image[2]?.link || song.image[1]?.link || song.image[0]?.link;
  }

  const track = {
    id: song.id,
    url: audioUrl,
    title: song.name || "Unknown Title",
    artist: song?.artist_map?.primary_artists?.[0]?.name || "Unknown Artist",
    album: song.album || "Unknown Album",
    artwork: artwork,
    duration: song.duration || 0,
  };

  // Store in cache to avoid redundant conversions
  trackCache.set(song.id, track);

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
    isLoading: false,
  });
  const playerSetupPromise = useRef<Promise<boolean> | null>(null);
  const queueUpdateInProgress = useRef(false);
  const pendingPlayAction = useRef<(() => Promise<void>) | null>(null);
  const lastNetworkState = useRef({ isConnected: true, isWifi: true });
  const preBufferedSongs = useRef<Set<string>>(new Set());
  const isSwitchingTracks = useRef(false);

  const [playbackState, playbackDispatch] = useReducer(playbackReducer, {
    currentSong: null,
    isPlaying: false,
    isLoading: false,
  });

  const [playlistState, playlistDispatch] = useReducer(playlistReducer, {
    playlist: [] as Song[],
    userPlaylist: [] as Song[],
  });

  useEffect(() => {
    playbackStateRef.current = playbackState;
  }, [playbackState]);

  // Network monitoring for adaptive quality
  useEffect(() => {
    const monitorNetwork = async () => {
      const networkState = await Network.getNetworkStateAsync();
      lastNetworkState.current = {
        isConnected: networkState.isConnected || false,
        isWifi: networkState.type === Network.NetworkStateType.WIFI,
      };

      // Clear track cache when network changes significantly to allow quality adaptation
      if (
        networkState.type === Network.NetworkStateType.WIFI &&
        !lastNetworkState.current.isWifi
      ) {
        trackCache.clear();
        preBufferedSongs.current.clear();
      }
    };

    const subscription = Network.addNetworkStateListener(monitorNetwork);

    return () => {
      subscription.remove();
    };
  }, []);

  // Pre-buffer logic - more efficient track preloading
  const preBufferTracks = async (songs: Song[], currentIndex: number) => {
    try {
      if (!songs.length || songs.length <= 1) return;

      // Pre-buffer next track
      const nextIndex = (currentIndex + 1) % songs.length;
      const nextSong = songs[nextIndex];

      // Only pre-buffer if we haven't already
      if (nextSong && !preBufferedSongs.current.has(nextSong.id)) {
        const nextTrack = await convertSongToTrack(nextSong);
        preBufferedSongs.current.add(nextSong.id);
      }

      // Pre-buffer previous track (for faster back navigation)
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : songs.length - 1;
      const prevSong = songs[prevIndex];

      // Only pre-buffer if we haven't already
      if (
        prevSong &&
        currentIndex !== prevIndex &&
        !preBufferedSongs.current.has(prevSong.id)
      ) {
        const prevTrack = await convertSongToTrack(prevSong);
        preBufferedSongs.current.add(prevSong.id);
      }
    } catch (error) {
      console.error("Error pre-buffering tracks:", error);
    }
  };

  // Initialize TrackPlayer once with optimized settings
  useEffect(() => {
    if (!playerSetupPromise.current) {
      playerSetupPromise.current = setupPlayer()
        .then(async (isSetup) => {
          trackPlayerInitialized.current = isSetup;
          playerSetupComplete.current = isSetup;

          // Execute any pending play action once setup is complete
          if (pendingPlayAction.current) {
            pendingPlayAction.current();
            pendingPlayAction.current = null;
          }

          return isSetup;
        })
        .catch((error) => {
          console.error("Error initializing TrackPlayer:", error);
          // Reset promise so we can try again
          playerSetupPromise.current = null;
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

  // Listen for app state changes to optimize background/foreground transitions
  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      async (nextAppState) => {
        if (nextAppState === "active") {
          try {
            // App came to foreground
            if (
              playbackStateRef.current.currentSong &&
              playerSetupComplete.current
            ) {
              // Refresh the player state for better sync with notification controls
              const playerState = await getPlaybackState();
              playbackDispatch({
                type: "SET_PLAYING",
                payload: playerState.state === State.Playing,
              });

              // Pre-buffer tracks again if needed
              if (
                playlistState.playlist.length > 0 &&
                playbackStateRef.current.currentSong
              ) {
                const currentIndex = playlistState.playlist.findIndex(
                  (song) =>
                    song.id === playbackStateRef.current.currentSong?.id,
                );

                if (currentIndex >= 0) {
                  preBufferTracks(playlistState.playlist, currentIndex);
                }
              }
            }
          } catch (error) {
            console.error("Error handling app state change:", error);
          }
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, [playlistState.playlist]);

  // Handle TrackPlayer events with improved responsiveness
  useTrackPlayerEvents(
    [
      Event.PlaybackState,
      Event.PlaybackError,
      Event.PlaybackActiveTrackChanged,
      Event.PlaybackQueueEnded,
      Event.RemoteDuck,
      Event.RemotePlay,
      Event.RemotePause,
      Event.RemoteStop,
      Event.RemoteNext,
      Event.RemotePrevious,
      Event.RemoteSeek,
      Event.RemoteJumpForward,
      Event.RemoteJumpBackward,
      Event.PlaybackProgressUpdated,
      // Listen for custom events from service.ts for faster UI updates
      CUSTOM_EVENTS.REMOTE_NEXT_TRIGGERED as any,
      CUSTOM_EVENTS.REMOTE_PREV_TRIGGERED as any,
    ],
    async (event) => {
      try {
        // Skip event processing if player isn't ready
        if (!trackPlayerInitialized.current) return;

        switch (event.type) {
          case Event.PlaybackState:
            const playerState = (await getPlaybackState()).state;
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

            // If we're playing and just became active, make sure current song is in sync
            if (
              playerState === State.Playing &&
              !playbackStateRef.current.isLoading &&
              !playbackStateRef.current.currentSong
            ) {
              const currentTrack = await TrackPlayer.getActiveTrack();
              if (currentTrack) {
                const songIndex = playlistState.playlist.findIndex(
                  (song) => song.id === currentTrack.id,
                );

                if (songIndex >= 0) {
                  playbackDispatch({
                    type: "SET_CURRENT_SONG",
                    payload: playlistState.playlist[songIndex],
                  });
                }
              }
            }
            break;

          case Event.PlaybackActiveTrackChanged:
            if (event.index !== undefined && event.track) {
              const trackId = event.track.id;

              if (trackId) {
                const songIndex = playlistState.playlist.findIndex(
                  (song) => song.id === trackId,
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

                    // Add song to history in background
                    if (user?.userid && currentSong.id) {
                      addToHistory(currentSong, 10).catch((err: any) => {
                        console.error("Error adding to history:", err);
                      });
                    }

                    // Remove the song from the playlist after it starts playing
                    // This will update the React state but not affect current playback
                    playlistDispatch({
                      type: "REMOVE_FROM_PLAYLIST",
                      payload: currentSong.id,
                    });
                  }

                  // Pre-buffer next and previous songs for faster navigation
                  preBufferTracks(playlistState.playlist, songIndex);
                }
              }
            }

            // Reset track switching flag
            isSwitchingTracks.current = false;
            playbackDispatch({ type: "SET_LOADING", payload: false });
            break;

          case Event.PlaybackError:
            console.error(`Playback error: ${event.code} - ${event.message}`);
            playbackDispatch({ type: "SET_LOADING", payload: false });

            // Wait a moment before trying to recover
            setTimeout(async () => {
              try {
                // Try to recover by playing next song
                if (playbackStateRef.current.isPlaying) {
                  await controls.handleNextSong();
                }
              } catch (error) {
                console.error("Error recovering from playback error:", error);
              }
            }, 300);
            break;

          case Event.PlaybackQueueEnded:
            // Restart current song if we have one
            if (playbackStateRef.current.currentSong) {
              controls.playSong(playbackStateRef.current.currentSong);
            }
            break;

          case Event.RemoteDuck:
            if (!event.paused && event.permanent === false) {
              // Audio focus regained, we can resume if we were playing before
              const wasPlaying = playbackStateRef.current.isPlaying;
              if (wasPlaying) {
                await TrackPlayer.play();
              }
            }
            break;

          // Optimized for immediate UI feedback
          case CUSTOM_EVENTS.REMOTE_NEXT_TRIGGERED as any:
            // Show immediate UI feedback before the track actually changes
            if (!isSwitchingTracks.current) {
              isSwitchingTracks.current = true;
              playbackDispatch({ type: "SET_LOADING", payload: true });
            }
            break;

          case CUSTOM_EVENTS.REMOTE_PREV_TRIGGERED as any:
            // Show immediate UI feedback before the track actually changes
            if (!isSwitchingTracks.current) {
              isSwitchingTracks.current = true;
              playbackDispatch({ type: "SET_LOADING", payload: true });
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
            // Note: Primary handling is in service.ts
            // This is just for additional UI feedback
            if (!isSwitchingTracks.current) {
              isSwitchingTracks.current = true;
              playbackDispatch({ type: "SET_LOADING", payload: true });
            }
            break;

          case Event.RemotePrevious:
            // Note: Primary handling is in service.ts
            // This is just for additional UI feedback
            if (!isSwitchingTracks.current) {
              isSwitchingTracks.current = true;
              playbackDispatch({ type: "SET_LOADING", payload: true });
            }
            break;

          case Event.RemoteSeek:
            if (event.position !== undefined) {
              await TrackPlayer.seekTo(event.position);
            }
            break;

          case Event.RemoteJumpForward:
            const currentPositionForward = await TrackPlayer.getProgress().then(
              (progress) => progress.position,
            );

            await TrackPlayer.seekTo(
              currentPositionForward + (event.interval || 10),
            );
            break;

          case Event.RemoteJumpBackward:
            const currentPositionBackward =
              await TrackPlayer.getProgress().then(
                (progress) => progress.position,
              );
            await TrackPlayer.seekTo(
              Math.max(0, currentPositionBackward - (event.interval || 10)),
            );
            break;
        }
      } catch (error) {
        console.error("Error handling TrackPlayer event:", error);
        // Reset flag to ensure UI can recover from errors
        isSwitchingTracks.current = false;
        playbackDispatch({ type: "SET_LOADING", payload: false });
      }
    },
  );

  const controls: PlayerControls = useMemo(
    () => ({
      playSong: async (song: Song) => {
        if (!song?.id) return;

        try {
          // Prevent multiple simultaneous play operations
          if (playbackStateRef.current.isLoading) {
            console.log("Already loading a song, ignoring request");
            return;
          }

          playbackDispatch({ type: "SET_CURRENT_SONG", payload: song });
          playbackDispatch({ type: "SET_LOADING", payload: true });
          playbackDispatch({ type: "SET_PLAYING", payload: true });

          const playOperation = async () => {
            try {
              // Reset the player first to clear any existing queue
              await TrackPlayer.reset();
              preBufferedSongs.current.clear(); // Clear pre-buffered songs cache

              // Convert the selected song to a track
              const track = await convertSongToTrack(song);

              if (!track.url) {
                console.error("Song has no playable URL:", song.id);
                playbackDispatch({ type: "SET_LOADING", payload: false });
                return;
              }

              // Find the selected song's index in the playlist
              const songIndex = playlistState.playlist.findIndex(
                (s) => s.id === song.id,
              );

              // Set repeat mode to off by default
              await TrackPlayer.setRepeatMode(RepeatMode.Off);

              if (songIndex >= 0) {
                // Get the remaining songs in the playlist (including the current one)
                const remainingPlaylist =
                  playlistState.playlist.slice(songIndex);

                // For better performance, only add the first few songs immediately
                const initialBatch = remainingPlaylist.slice(
                  0,
                  Math.min(3, remainingPlaylist.length),
                );

                // Convert and add initial batch
                const tracksToAdd = await Promise.all(
                  initialBatch.map(convertSongToTrack),
                );
                const filteredTracks = tracksToAdd.filter((track) => track.url);

                if (filteredTracks.length > 0) {
                  await TrackPlayer.add(filteredTracks);
                  await TrackPlayer.skip(0); // Ensure we're at the first track
                }

                // Add remaining songs in the background
                if (remainingPlaylist.length > initialBatch.length) {
                  setTimeout(async () => {
                    try {
                      const remainingBatch = remainingPlaylist.slice(
                        initialBatch.length,
                      );
                      const remainingTracks = await Promise.all(
                        remainingBatch.map(convertSongToTrack),
                      );
                      const filteredRemainingTracks = remainingTracks.filter(
                        (track) => track.url,
                      );

                      if (filteredRemainingTracks.length > 0) {
                        await TrackPlayer.add(filteredRemainingTracks);
                      }
                    } catch (error) {
                      console.error("Error adding remaining tracks:", error);
                    }
                  }, 100);
                }
              } else {
                // If the song isn't in the playlist, just add and play it
                await TrackPlayer.add([track]);
                await TrackPlayer.skip(0); // Ensure we're at the first track
              }

              // Start playback
              await TrackPlayer.play();

              if (user?.userid && song.id) {
                addToHistory(song, 10).catch((err: any) => {
                  console.error("Error adding to history:", err);
                });
              }

              playbackDispatch({ type: "SET_LOADING", payload: false });
            } catch (error) {
              console.error("Error in play operation:", error);
              playbackDispatch({ type: "SET_LOADING", payload: false });

              // Only try next song if we're in a playlist and there was a real error
              if (playlistState.playlist.length > 0 && error instanceof Error) {
                setTimeout(() => controls.handleNextSong(), 300);
              }
            }
          };

          // Execute play operation if player is ready, or queue it for when ready
          if (playerSetupComplete.current) {
            await playOperation();
          } else {
            pendingPlayAction.current = playOperation;
            if (!playerSetupPromise.current) {
              // Reinitialize if needed
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
          playbackDispatch({ type: "STOP_SONG" });

          if (trackPlayerInitialized.current) {
            await TrackPlayer.stop();
            await TrackPlayer.reset();
            preBufferedSongs.current.clear();
          }
        } catch (error) {
          console.error("Stop song error:", error);
        }
      },

      handlePlayPauseSong: async () => {
        try {
          const newPlayingState = !playbackStateRef.current.isPlaying;
          // Update UI immediately for responsiveness
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
            if (
              playerState === State.None &&
              playbackStateRef.current.currentSong
            ) {
              await controls.playSong(playbackStateRef.current.currentSong);
            } else {
              await TrackPlayer.play();
            }
          } else {
            await TrackPlayer.pause();
          }
        } catch (error) {
          console.error("Error toggling play/pause:", error);
          // Revert UI state if operation failed
          playbackDispatch({
            type: "SET_PLAYING",
            payload: !playbackStateRef.current.isPlaying,
          });
        }
      },

      addToPlaylist: (songs: Song | Song[]) => {
        const newSongs = Array.isArray(songs) ? songs : [songs];
        playlistDispatch({
          type: "SET_PLAYLIST",
          payload: [...playlistState.playlist, ...newSongs],
        });

        // Pre-buffer a few songs in the background for faster playback
        if (playbackStateRef.current.currentSong) {
          setTimeout(() => {
            const currentIndex = playlistState.playlist.findIndex(
              (song) => song.id === playbackStateRef.current.currentSong?.id,
            );
            if (currentIndex >= 0) {
              preBufferTracks(playlistState.playlist, currentIndex);
            }
          }, 100);
        }
      },

      clearQueue: async () => {
        playlistDispatch({ type: "CLEAR_PLAYLIST" });

        if (playbackStateRef.current.isPlaying) {
          playbackDispatch({ type: "SET_PLAYING", payload: false });
        }

        if (trackPlayerInitialized.current) {
          await TrackPlayer.reset();
          playbackDispatch({ type: "STOP_SONG" });
          // Clear pre-buffer tracking
          preBufferedSongs.current.clear();
        }
      },

      addToQueue: async (songs: Song | Song[]) => {
        if (queueUpdateInProgress.current) return;
        queueUpdateInProgress.current = true;

        try {
          const newSongs = Array.isArray(songs) ? songs : [songs];

          const currentSongId = playbackStateRef.current.currentSong?.id;
          const uniqueNewSongs = newSongs.filter(
            (song) =>
              song.id !== currentSongId &&
              !playlistState.playlist.some((s) => s.id === song.id),
          );

          if (uniqueNewSongs.length > 0) {
            // Update React state immediately for UI responsiveness
            playlistDispatch({
              type: "ADD_TO_PLAYLIST",
              payload: uniqueNewSongs,
            });

            // Start pre-buffering the first new song
            if (uniqueNewSongs.length > 0) {
              convertSongToTrack(uniqueNewSongs[0]);
            }

            // Add to player queue if ready
            if (trackPlayerInitialized.current) {
              // Process in batches for better performance
              const processBatch = async (batch: Song[]) => {
                // Filter out tracks with no URL
                const tracksToAdd = await Promise.all(
                  batch.map(convertSongToTrack),
                );
                const filteredTracks = tracksToAdd.filter((track) => track.url);

                if (filteredTracks.length > 0) {
                  await TrackPlayer.add(filteredTracks);
                }
              };

              // Process first few songs immediately for best responsiveness
              const firstBatch = uniqueNewSongs.slice(
                0,
                Math.min(3, uniqueNewSongs.length),
              );
              await processBatch(firstBatch);

              // Process remaining songs in background
              if (uniqueNewSongs.length > firstBatch.length) {
                setTimeout(async () => {
                  const remainingBatch = uniqueNewSongs.slice(
                    firstBatch.length,
                  );
                  await processBatch(remainingBatch);
                }, 100);
              }
            }
          }
        } catch (error) {
          console.error("Queue addition error:", error);
        } finally {
          setTimeout(() => {
            queueUpdateInProgress.current = false;
          }, 100);
        }
      },

      removeFromQueue: async (songId: string) => {
        try {
          // Update playlist state
          playlistDispatch({ type: "REMOVE_FROM_PLAYLIST", payload: songId });

          if (trackPlayerInitialized.current) {
            const currentSongId = playbackStateRef.current.currentSong?.id;

            // If removing currently playing song
            if (currentSongId === songId) {
              playbackDispatch({ type: "SET_LOADING", payload: true });

              // Stop current song
              playbackDispatch({ type: "STOP_SONG" });
              await TrackPlayer.stop();

              // Play next song if available
              if (playlistState.playlist.length > 0) {
                setTimeout(() => controls.handleNextSong(), 100);
              }
            } else {
              // Remove from player queue
              try {
                const currentQueue = await TrackPlayer.getQueue();
                const songIndex = currentQueue.findIndex(
                  (track) => track.id === songId,
                );

                if (songIndex >= 0) {
                  await TrackPlayer.remove(songIndex);
                }
              } catch (error) {
                console.error("Error removing from player queue:", error);
              }
            }

            // Update prebuffer tracking
            preBufferedSongs.current.delete(songId);
          }
        } catch (error) {
          console.error("Queue removal error:", error);
        }
      },

      reorderPlaylist: async (newPlaylistOrder: Song[]) => {
        try {
          // Update the playlist state with the new order
          playlistDispatch({
            type: "REORDER_PLAYLIST",
            payload: newPlaylistOrder,
          });

          // If the player is initialized, update the queue without resetting
          if (trackPlayerInitialized.current) {
            // Get current queue and active track
            const currentQueue = await TrackPlayer.getQueue();
            const currentTrackIndex = await TrackPlayer.getActiveTrackIndex();
            const currentTrack =
              currentTrackIndex != null && currentTrackIndex >= 0
                ? currentQueue[currentTrackIndex]
                : undefined;
            const currentTrackId = currentTrack?.id;

            // Find where the current track is in the new order
            const newCurrentIndex = newPlaylistOrder.findIndex(
              (song) => song.id === currentTrackId,
            );

            if (newCurrentIndex >= 0) {
              // Keep playing current track while updating queue
              const currentPosition = await TrackPlayer.getProgress().then(
                (progress) => progress.position,
              );
              const isPlaying = await TrackPlayer.getState().then(
                (state) => state === State.Playing,
              );

              // Remove upcoming tracks and add new ones
              await TrackPlayer.removeUpcomingTracks();

              // Add tracks after current position
              if (newCurrentIndex < newPlaylistOrder.length - 1) {
                const tracksToAdd = await Promise.all(
                  newPlaylistOrder
                    .slice(newCurrentIndex + 1)
                    .map(convertSongToTrack),
                );
                const filteredTracks = tracksToAdd.filter((track) => track.url);

                if (filteredTracks.length > 0) {
                  await TrackPlayer.add(filteredTracks);
                }
              }

              // Restore playback state
              if (isPlaying) {
                await TrackPlayer.play();
              }

              // Reset prebuffer tracking and start prebuffering with new order
              preBufferedSongs.current.clear();
              preBufferTracks(newPlaylistOrder, newCurrentIndex);
            } else {
              // Current track not in new order, handle gracefully
              if (currentTrack) {
                // Keep current track playing
                const isPlaying = await TrackPlayer.getState().then(
                  (state) => state === State.Playing,
                );

                // Add new tracks in background
                setTimeout(async () => {
                  const tracksToAdd = await Promise.all(
                    newPlaylistOrder.slice(0, 5).map(convertSongToTrack),
                  );
                  const filteredTracks = tracksToAdd.filter(
                    (track) => track.url,
                  );

                  if (filteredTracks.length > 0) {
                    await TrackPlayer.add(filteredTracks);
                  }

                  // Add remaining tracks in background
                  if (newPlaylistOrder.length > 5) {
                    setTimeout(async () => {
                      const remainingTracks = await Promise.all(
                        newPlaylistOrder.slice(5).map(convertSongToTrack),
                      );
                      const filteredRemaining = remainingTracks.filter(
                        (track) => track.url,
                      );

                      if (filteredRemaining.length > 0) {
                        await TrackPlayer.add(filteredRemaining);
                      }
                    }, 100);
                  }
                }, 100);
              }
            }
          }
        } catch (error) {
          console.error("Error reordering playlist:", error);
        }
      },

      handleNextSong: async () => {
        try {
          if (!trackPlayerInitialized.current) {
            if (playerSetupPromise.current) {
              await playerSetupPromise.current;
            } else {
              playbackDispatch({ type: "SET_LOADING", payload: false });
              return;
            }
          }

          // Set loading state and track switching flag
          playbackDispatch({ type: "SET_LOADING", payload: true });
          isSwitchingTracks.current = true;

          // Get the current queue from TrackPlayer
          const queue = await TrackPlayer.getQueue();
          const currentIndex = await TrackPlayer.getActiveTrackIndex();

          // If we have a valid index and it's not the last track
          if (currentIndex !== undefined && currentIndex < queue.length - 1) {
            // Use TrackPlayer's built-in skipToNext for better performance
            await TrackPlayer.skipToNext();

            // Update UI state - PlaybackActiveTrackChanged will update current song
            playbackDispatch({ type: "SET_PLAYING", payload: true });

            // Pre-buffer upcoming tracks for even faster transitions
            const nextIndex = currentIndex + 1;
            if (nextIndex < queue.length - 1) {
              // Update pre-buffer tracking for next track
              const songId = queue[nextIndex + 1].id as string;
              if (songId && !preBufferedSongs.current.has(songId)) {
                preBufferedSongs.current.add(songId);
              }
            }
          } else if (queue.length > 0) {
            // We're at the end - restart from beginning
            await TrackPlayer.skip(0);
            await TrackPlayer.play();

            // Pre-buffer second track if available
            if (queue.length > 1) {
              const songId = queue[1].id as string;
              if (songId && !preBufferedSongs.current.has(songId)) {
                preBufferedSongs.current.add(songId);
              }
            }
          } else if (playlistState.playlist.length > 0) {
            // If queue is empty but we have songs in React state
            const nextSong = playlistState.playlist[0];
            await controls.playSong(nextSong);
          } else {
            // No more songs
            playbackDispatch({ type: "STOP_SONG" });
            await TrackPlayer.stop();
            isSwitchingTracks.current = false;
          }
        } catch (error) {
          console.error("Next song error:", error);
          isSwitchingTracks.current = false;
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

          // Set loading state and track switching flag
          playbackDispatch({ type: "SET_LOADING", payload: true });
          isSwitchingTracks.current = true;

          // Get current playback position and queue information
          const position = await TrackPlayer.getProgress().then(
            (progress) => progress.position,
          );
          const currentIndex = await TrackPlayer.getActiveTrackIndex();

          // If we're more than 3 seconds into the song, just restart it
          if (position > 3) {
            await TrackPlayer.seekTo(0);
            isSwitchingTracks.current = false;
            playbackDispatch({ type: "SET_LOADING", payload: false });
          }
          // If we have a valid index and it's not the first track
          else if (currentIndex !== undefined && currentIndex > 0) {
            // Use TrackPlayer's built-in skipToPrevious
            await TrackPlayer.skipToPrevious();

            // Pre-buffer for faster navigation
            if (currentIndex > 1) {
              const queue = await TrackPlayer.getQueue();
              const prevIndex = currentIndex - 1;
              if (prevIndex > 0) {
                const songId = queue[prevIndex - 1].id as string;
                if (songId && !preBufferedSongs.current.has(songId)) {
                  preBufferedSongs.current.add(songId);
                }
              }
            }
          }
          // If we're at the first track and repeating is desired
          else if (currentIndex === 0) {
            const queue = await TrackPlayer.getQueue();
            if (queue.length > 0) {
              // Restart current song
              await TrackPlayer.seekTo(0);
              await TrackPlayer.play();
              isSwitchingTracks.current = false;
              playbackDispatch({ type: "SET_LOADING", payload: false });
            }
          } else if (playlistState.playlist.length > 0) {
            // Fallback - play the last song in the playlist
            const lastSong =
              playlistState.playlist[playlistState.playlist.length - 1];
            await controls.playSong(lastSong);
          } else {
            isSwitchingTracks.current = false;
            playbackDispatch({ type: "SET_LOADING", payload: false });
          }
        } catch (error) {
          console.error("Previous song error:", error);
          isSwitchingTracks.current = false;
          playbackDispatch({ type: "SET_LOADING", payload: false });
        }
      },
    }),
    [playbackState, playlistState.playlist, user?.userid],
  );

  const playbackValue: PlaybackContextValue = {
    ...playbackState,
    setCurrentSong: (song: Song) =>
      playbackDispatch({ type: "SET_CURRENT_SONG", payload: song }),
    setPlaying: (isPlaying: boolean) =>
      playbackDispatch({ type: "SET_PLAYING", payload: isPlaying }),

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
          playlist.slice(0, 3).forEach((song) => {
            convertSongToTrack(song);
            preBufferedSongs.current.add(song.id);
          });
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

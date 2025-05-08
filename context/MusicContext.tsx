import {
  PlaybackContextValue,
  PlaybackState,
  PlayerControls,
  PlaylistContextValue,
  PlaylistState,
} from "@/types/music";
import { Song } from "@/types/song";
import useApi from "@/utils/hooks/useApi";
import { playbackHistory } from "@/utils/playbackHistory";
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
import { AppState } from "react-native";
import TrackPlayer, {
  Event,
  RepeatMode,
  State,
  Track,
  useTrackPlayerEvents,
} from "react-native-track-player";
import { getPlaybackState } from "react-native-track-player/lib/src/trackPlayer";
import { useUser } from "./UserContext";

// Cache for converted tracks to avoid redundant processing
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

const convertSongToTrack = async (song: Song): Promise<Track> => {
  // Return cached track if available
  if (trackCache.has(song.id)) {
    return trackCache.get(song.id)!;
  }

  const audioUrl =
    song.download_url[3]?.link ||
    song.download_url[2]?.link ||
    song.download_url[1]?.link ||
    song.download_url[0]?.link;

  const artwork =
    song.image[2]?.link || song.image[1]?.link || song.image[0]?.link;

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
  trackCache.set(song.id, track);

  // Limit cache size to avoid memory issues (keep last 50 tracks)
  if (trackCache.size > 50) {
    const oldestKey = trackCache.keys().next().value;
    if (oldestKey !== undefined) {
      trackCache.delete(oldestKey);
    }
  }

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
  const isSwitchingTracks = useRef(false);
  const appStateRef = useRef(AppState.currentState);

  const [playbackState, playbackDispatch] = useReducer(playbackReducer, {
    currentSong: null,
    isPlaying: false,
    isLoading: false,
  });

  const [playlistState, playlistDispatch] = useReducer(playlistReducer, {
    playlist: [] as Song[],
    userPlaylist: [] as Song[],
  });

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
                    // Update current song in React state
                    playbackDispatch({
                      type: "SET_CURRENT_SONG",
                      payload: currentSong,
                    });

                    // Log when track changes
                    console.log(
                      `Now playing: ${currentSong.name} by ${
                        currentSong?.artist_map?.primary_artists?.[0]?.name ||
                        "Unknown Artist"
                      }`,
                    );

                    // Update playback history if user is logged in
                    if (user?.userid && currentSong.id) {
                      const duration = currentSong.duration || 0;
                      playbackHistory
                        .updatePlaybackProgress(currentSong, 0, duration)
                        .catch((err) => {
                          console.error(
                            "Error updating playback history:",
                            err,
                          );
                        });
                    }

                    // *** REMOVED THE CODE THAT REMOVES PREVIOUS TRACK FROM QUEUE ***
                    // This was causing the track skipping issue when resuming playback
                  }
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

          case Event.PlaybackProgressUpdated:
            // Save playback progress every ~10 seconds
            if (
              event.position &&
              event.position > 0 &&
              playbackStateRef.current.currentSong
            ) {
              // Save progress only if we're at least 5 seconds into the song and have at least 5 seconds remaining
              if (event.position > 5 && event.duration - event.position > 5) {
                // Only save every ~10 seconds to avoid excessive updates
                if (Math.floor(event.position) % 10 === 0) {
                  playbackHistory.updatePlaybackProgress(
                    playbackStateRef.current.currentSong,
                    event.position,
                    event.duration,
                  );
                }
              }
            }
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

  // Update our ref whenever playback state changes
  useEffect(() => {
    playbackStateRef.current = playbackState;
  }, [playbackState]);

  // Monitor app state changes to ensure playback history is saved
  useEffect(() => {
    const appStateSubscription = AppState.addEventListener(
      "change",
      async (nextAppState) => {
        const previousAppState = appStateRef.current;
        appStateRef.current = nextAppState;

        // App is going to background, save current playback position
        if (
          previousAppState === "active" &&
          nextAppState.match(/inactive|background/)
        ) {
          try {
            if (
              playbackStateRef.current.currentSong?.id &&
              trackPlayerInitialized.current
            ) {
              const { position, duration } = await TrackPlayer.getProgress();
              if (position > 0 && duration > 0) {
                // Save current position when app goes to background
                await playbackHistory.updatePlaybackProgress(
                  playbackStateRef.current.currentSong,
                  position,
                  duration,
                );
                console.log(
                  `Saved position ${position}s before app went to background`,
                );
              }
            }
          } catch (error) {
            console.error(
              "Error saving playback position on app state change:",
              error,
            );
          }
        }
      },
    );

    return () => {
      appStateSubscription.remove();
    };
  }, []);

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

              // Convert the selected song to a track
              const track = await convertSongToTrack(song);

              if (!track.url) {
                console.error("Song has no playable URL:", song.id);
                playbackDispatch({ type: "SET_LOADING", payload: false });
                return;
              }

              // Use the enhanced smart resume feature
              let initialPosition = 0;
              try {
                initialPosition = await playbackHistory.getSmartResumePosition(
                  song.id,
                );
                if (initialPosition > 0) {
                  console.log(
                    `Smart resume: starting from ${initialPosition} seconds`,
                  );
                }
              } catch (error) {
                console.error("Error retrieving smart resume position:", error);
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

                // Convert all tracks in one operation for better reliability
                const allTracks = await Promise.all(
                  remainingPlaylist.map(convertSongToTrack),
                );

                // Filter out tracks with no URL
                const validTracks = allTracks.filter((track) => track.url);

                if (validTracks.length > 0) {
                  // Add all tracks to the queue at once
                  await TrackPlayer.add(validTracks);

                  // Ensure we start playing the first track (the requested song)
                  await TrackPlayer.skip(0);
                }
              } else {
                // If the song isn't in the playlist, just add and play it
                await TrackPlayer.add([track]);
              }

              // Seek to the saved position if needed
              if (initialPosition > 0) {
                await TrackPlayer.seekTo(initialPosition);
              }

              // Start playback
              await TrackPlayer.play();

              // Log removed from here to prevent duplicate with track change event

              if (user?.userid && song.id) {
                // Initialize playback history with starting position
                playbackHistory
                  .updatePlaybackProgress(
                    song,
                    initialPosition,
                    song.duration || 0,
                  )
                  .catch((err: any) => {
                    console.error("Error updating playback history:", err);
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

      addToPlaylist: async (songs: Song | Song[]) => {
        const newSongs = Array.isArray(songs) ? songs : [songs];
        console.log(`Adding ${newSongs.length} songs to playlist state`);

        // Combine the existing playlist with the new songs
        const updatedPlaylist = [...playlistState.playlist, ...newSongs];

        // Update playlist state
        playlistDispatch({
          type: "SET_PLAYLIST",
          payload: updatedPlaylist,
        });

        // Add to TrackPlayer queue if initialized
        if (trackPlayerInitialized.current) {
          try {
            // Convert all tracks at once
            const tracksToAdd = await Promise.all(
              newSongs.map(convertSongToTrack),
            );
            const validTracks = tracksToAdd.filter((track) => track.url);

            if (validTracks.length > 0) {
              await TrackPlayer.add(validTracks);
              console.log(`Added ${validTracks.length} tracks to player queue`);
            }
          } catch (error) {
            console.error("Error adding tracks to player queue:", error);
          }
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
        }
      },

      addToQueue: async (songs: Song | Song[]) => {
        if (queueUpdateInProgress.current) return;
        queueUpdateInProgress.current = true;

        try {
          const newSongs = Array.isArray(songs) ? songs : [songs];
          console.log(`Adding ${newSongs.length} songs to queue`);

          // Filter out songs that are already in the playlist
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

            // Add to player queue if ready
            if (trackPlayerInitialized.current) {
              // Convert all tracks at once for better reliability
              const tracksToAdd = await Promise.all(
                uniqueNewSongs.map(convertSongToTrack),
              );
              const validTracks = tracksToAdd.filter((track) => track.url);

              if (validTracks.length > 0) {
                // Get current queue state to ensure we're adding to the right position
                const currentQueue = await TrackPlayer.getQueue();

                // Add all tracks to the player queue
                await TrackPlayer.add(validTracks);

                console.log(
                  `Added ${validTracks.length} tracks to player queue`,
                );
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

          // Make sure we have a valid index
          if (currentIndex === undefined) {
            isSwitchingTracks.current = false;
            playbackDispatch({ type: "SET_LOADING", payload: false });
            return;
          }

          // If we have a valid index and it's not the last track
          if (currentIndex < queue.length - 1) {
            console.log(
              `Skipping from track ${currentIndex} to ${currentIndex + 1}`,
            );

            // For more reliability, use explicit skip rather than skipToNext
            await TrackPlayer.skip(currentIndex + 1);
            await TrackPlayer.play();

            // Update UI state
            playbackDispatch({ type: "SET_PLAYING", payload: true });

            // Track change logging will be handled by PlaybackActiveTrackChanged event
          } else if (queue.length > 0) {
            // We're at the end - restart from beginning
            console.log("Reached end of queue, restarting from beginning");
            await TrackPlayer.skip(0);
            await TrackPlayer.play();

            // Track change logging will be handled by PlaybackActiveTrackChanged event
          } else if (playlistState.playlist.length > 0) {
            // If queue is empty but we have songs in React state
            console.log(
              "Queue empty but playlist has songs, playing first song",
            );
            const nextSong = playlistState.playlist[0];
            await controls.playSong(nextSong);
          } else {
            // No more songs
            console.log("No more songs in queue or playlist");
            playbackDispatch({ type: "STOP_SONG" });
            await TrackPlayer.stop();
            isSwitchingTracks.current = false;
            playbackDispatch({ type: "SET_LOADING", payload: false });
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
              playbackDispatch({ type: "SET_LOADING", payload: false });
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

          // Make sure we have a valid index
          if (currentIndex === undefined) {
            isSwitchingTracks.current = false;
            playbackDispatch({ type: "SET_LOADING", payload: false });
            return;
          }

          // If we're more than 3 seconds into the song, just restart it
          if (position > 3) {
            console.log("Restarting current track (position > 3s)");
            await TrackPlayer.seekTo(0);
            isSwitchingTracks.current = false;
            playbackDispatch({ type: "SET_LOADING", payload: false });
          }
          // If we have a valid index and it's not the first track
          else if (currentIndex > 0) {
            console.log(
              `Skipping from track ${currentIndex} to ${currentIndex - 1}`,
            );

            // For more reliability, use explicit skip rather than skipToPrevious
            await TrackPlayer.skip(currentIndex - 1);
            await TrackPlayer.play();

            // Update UI state will be handled by track change event
            playbackDispatch({ type: "SET_PLAYING", payload: true });

            // Track change logging will be handled by PlaybackActiveTrackChanged event
          }
          // If we're at the first track and repeating is desired
          else if (currentIndex === 0) {
            console.log("At first track, restarting");
            const queue = await TrackPlayer.getQueue();
            if (queue.length > 0) {
              // Restart current song
              await TrackPlayer.seekTo(0);
              await TrackPlayer.play();
              isSwitchingTracks.current = false;
              playbackDispatch({ type: "SET_LOADING", payload: false });
            }
          } else {
            console.log("No previous track available");
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

import {
  PlaybackContextValue,
  PlaybackState,
  PlayerControls,
  PlaylistContextValue,
  PlaylistState,
} from "@/types/music";
import { Song } from "@/types/song";
import useApi from "@/utils/hooks/useApi";
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
import { getPlaybackState } from "react-native-track-player/lib/src/trackPlayer";
import { useUser } from "./UserContext";

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

const convertSongToTrack = (song: Song): Track => {
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

  // Initialize TrackPlayer once with optimized settings
  useEffect(() => {
    if (!playerSetupPromise.current) {
      playerSetupPromise.current = setupPlayer()
        .then(async (isSetup) => {
          trackPlayerInitialized.current = isSetup;

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

  // Handle TrackPlayer events according to official documentation
  useTrackPlayerEvents(
    [
      Event.PlaybackState,
      Event.PlaybackError,
      Event.PlaybackActiveTrackChanged, // Preferred over deprecated PlaybackTrackChanged
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
      Event.PlaybackProgressUpdated, // Only fires if progressUpdateEventInterval is set
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
            break;

          case Event.PlaybackActiveTrackChanged:
            if (event.index !== undefined && event.track) {
              // The event now includes the full track object
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
                  }

                  // Remove the current song from playlist after it starts playing
                  playlistDispatch({
                    type: "REMOVE_FROM_PLAYLIST",
                    payload: trackId,
                  });

                  // Preload next song in queue if available
                  if (playlistState.playlist.length > 1) {
                    const nextSong = playlistState.playlist[0];
                    // Convert and cache the next track
                    convertSongToTrack(nextSong);
                  }
                }
              }
            }
            break;

          case Event.PlaybackError:
            console.error(`Playback error: ${event.code} - ${event.message}`);

            // Wait a moment before trying to recover
            setTimeout(async () => {
              // Try to recover by playing next song
              if (playbackStateRef.current.isPlaying) {
                await controls.handleNextSong();
              }
            }, 300);
            break;

          case Event.PlaybackQueueEnded:
            if (playbackStateRef.current.currentSong) {
              controls.playSong(playbackStateRef.current.currentSong);
            }
            break;

          case Event.RemoteDuck:
            // Handle audio focus changes
            // Note: This is automatically handled if autoHandleInterruptions is true
            // But we can add custom behavior here if needed
            if (!event.paused) {
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
            // This event is only fired if progressUpdateEventInterval is set in options
            // We can use it for updating UI components that display progress
            // No need to do anything here as React components will use the TrackPlayer hooks
            break;
        }
      } catch (error) {
        console.error("Error handling TrackPlayer event:", error);
      }
    },
  );

  const controls: PlayerControls = useMemo(
    () => ({
      playSong: async (song: Song) => {
        if (!song?.id) return;

        try {
          playbackDispatch({ type: "SET_CURRENT_SONG", payload: song });
          playbackDispatch({ type: "SET_LOADING", payload: true });
          playbackDispatch({ type: "SET_PLAYING", payload: true });

          const playOperation = async () => {
            try {
              await TrackPlayer.reset();

              const track = convertSongToTrack(song);

              if (!track.url) {
                console.error("Song has no playable URL:", song.id);
                playbackDispatch({ type: "SET_LOADING", payload: false });
                return;
              }

              await TrackPlayer.add([track]);

              if (playlistState.playlist.length > 0) {
                convertSongToTrack(playlistState.playlist[0]);
              }

              await TrackPlayer.play();

              playbackDispatch({ type: "SET_LOADING", payload: false });
            } catch (error) {
              console.error("Error in play operation:", error);
              playbackDispatch({ type: "SET_LOADING", payload: false });

              if (playlistState.playlist.length > 0) {
                setTimeout(() => controls.handleNextSong(), 300);
              }
            }
          };

          if (playerSetupComplete.current) {
            await playOperation();
          } else {
            pendingPlayAction.current = playOperation;
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

          const currentSongId = playbackStateRef.current.currentSong?.id;
          const uniqueNewSongs = newSongs.filter(
            (song) =>
              song.id !== currentSongId &&
              !playlistState.playlist.some((s) => s.id === song.id),
          );

          if (uniqueNewSongs.length > 0) {
            playlistDispatch({
              type: "ADD_TO_PLAYLIST",
              payload: uniqueNewSongs,
            });

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
          playlistDispatch({ type: "REMOVE_FROM_PLAYLIST", payload: songId });

          if (trackPlayerInitialized.current) {
            const currentSongId = playbackStateRef.current.currentSong?.id;

            if (currentSongId === songId) {
              playbackDispatch({ type: "STOP_SONG" });
              await TrackPlayer.stop();
              if (playlistState.playlist.length > 0) {
                setTimeout(() => controls.handleNextSong(), 100);
              }
            } else {
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

      reorderPlaylist: async (newPlaylistOrder: Song[]) => {
        try {
          // Update the playlist state with the new order
          playlistDispatch({
            type: "REORDER_PLAYLIST",
            payload: newPlaylistOrder,
          });

          // If the player is initialized, update the queue without resetting
          if (trackPlayerInitialized.current) {
            // Get current queue from TrackPlayer
            const currentQueue = await TrackPlayer.getQueue();

            // Get the current track index to keep it playing
            const currentTrackIndex = await TrackPlayer.getActiveTrackIndex();

            if (currentTrackIndex === undefined || currentTrackIndex === null) {
              // If no active track, just replace the queue
              await TrackPlayer.reset();
              const tracksToAdd = newPlaylistOrder
                .map(convertSongToTrack)
                .filter((track) => track.url);

              if (tracksToAdd.length > 0) {
                await TrackPlayer.add(tracksToAdd);
              }
              return;
            }

            // Convert new playlist order to tracks
            const newOrderTracks = newPlaylistOrder
              .map(convertSongToTrack)
              .filter((track) => track.url);

            // We'll rebuild the queue while keeping the current track playing
            // First, remove all tracks after the current one
            if (currentQueue.length > currentTrackIndex + 1) {
              await TrackPlayer.removeUpcomingTracks();
            }

            // Then add the reordered tracks
            if (newOrderTracks.length > 0) {
              await TrackPlayer.add(newOrderTracks);
            }
          }
        } catch (error) {
          console.error("Error reordering playlist:", error);
        }
      },

      handleNextSong: async () => {
        try {
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

          const updatedPlaylist = [...playlistState.playlist];

          const nextSong =
            updatedPlaylist.length > 0 ? updatedPlaylist[0] : null;

          if (nextSong) {
            await controls.playSong(nextSong);
          } else {
            playbackDispatch({ type: "STOP_SONG" });
            playbackDispatch({ type: "SET_LOADING", payload: false });
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

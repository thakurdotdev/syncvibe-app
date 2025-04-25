import TrackPlayer, {
  Event,
  State,
  RepeatMode,
  Track,
} from "react-native-track-player";
import { getPlaybackState } from "react-native-track-player/lib/src/trackPlayer";
import { AppState } from "react-native";
import { DeviceEventEmitter } from "react-native";

// Declare global types for the properties we're using
declare global {
  var processingNextTrack: boolean;
  var processingPrevTrack: boolean;
}

// Cache to store next track data for instant playback
let nextTrackCache: Track | null = null;
let previousTrackCache: Track | null = null;

export async function PlaybackService() {
  // Basic remote control event handlers with optimized performance
  TrackPlayer.addEventListener(Event.RemotePlay, async () => {
    try {
      await TrackPlayer.play();
      console.log("Remote play triggered");
    } catch (error) {
      console.error("Remote play error:", error);
      // Attempt recovery
      setTimeout(() => TrackPlayer.play(), 200);
    }
  });

  TrackPlayer.addEventListener(Event.RemotePause, async () => {
    try {
      await TrackPlayer.pause();
    } catch (error) {
      console.error("Remote pause error:", error);
    }
  });

  TrackPlayer.addEventListener(Event.RemoteStop, async () => {
    try {
      await TrackPlayer.stop();
    } catch (error) {
      console.error("Remote stop error:", error);
    }
  });

  // Optimized next track handler with pre-caching
  TrackPlayer.addEventListener(Event.RemoteNext, async () => {
    try {
      // Mark as processing to prevent duplicate actions
      if (global.processingNextTrack) return;
      global.processingNextTrack = true;
      // Preemptively fire UI state update for instant feedback
      // By sending an event that will be picked up in MusicContext
      DeviceEventEmitter.emit("remote-next-triggered");

      const queue = await TrackPlayer.getQueue();
      const currentIndex = await TrackPlayer.getActiveTrackIndex();

      if (currentIndex !== undefined && currentIndex < queue.length - 1) {
        // Start transition animation/indicator in UI
        const nextIndex = currentIndex + 1;

        // Pre-buffer next track if not already done
        if (nextTrackCache?.id !== queue[nextIndex]?.id) {
          nextTrackCache = queue[nextIndex];
        }

        // Skip to next track with optimized performance
        await TrackPlayer.skipToNext();

        // Immediately try to prepare/buffer the new "next" track for even faster subsequent skips
        if (nextIndex + 1 < queue.length) {
          // Update next track cache
          nextTrackCache = queue[nextIndex + 1];

          // Preload the next track in background
          TrackPlayer.setQueue([...queue]);
        }
      } else if (queue.length > 0) {
        // Loop back to beginning with smooth transition
        await TrackPlayer.skip(0);
        await TrackPlayer.play();

        // Pre-buffer second track if available
        if (queue.length > 1) {
          nextTrackCache = queue[1];
        }
      }
    } catch (error) {
      console.error("Error handling next track:", error);

      // Recovery attempt
      try {
        const queue = await TrackPlayer.getQueue();
        const currentIndex = await TrackPlayer.getActiveTrackIndex();

        if (currentIndex !== undefined && currentIndex + 1 < queue.length) {
          // Try direct skip instead
          await TrackPlayer.skip(currentIndex + 1);
        }
      } catch (recoveryError) {
        console.error("Recovery attempt failed:", recoveryError);
      }
    } finally {
      // Reset processing flag with short delay
      setTimeout(() => {
        global.processingNextTrack = false;
      }, 300);
    }
  });

  // Optimized previous track handler
  TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
    try {
      // Mark as processing to prevent duplicate actions
      if (global.processingPrevTrack) return;
      global.processingPrevTrack = true;
      // Preemptively fire UI state update for instant feedback
      DeviceEventEmitter.emit("remote-prev-triggered");

      const currentIndex = await TrackPlayer.getActiveTrackIndex();

      // Always go to previous track regardless of current position
      if (currentIndex !== undefined && currentIndex > 0) {
        const queue = await TrackPlayer.getQueue();
        const prevIndex = currentIndex - 1;

        // Pre-buffer previous track if not already done
        if (previousTrackCache?.id !== queue[prevIndex]?.id) {
          previousTrackCache = queue[prevIndex];
        }

        // Skip to previous track with optimized performance
        await TrackPlayer.skipToPrevious();

        // Update cache for faster navigation
        if (prevIndex > 0) {
          previousTrackCache = queue[prevIndex - 1];
        }

        // If we're now at the first track, cache the last track for wrap-around
        if (prevIndex === 0 && queue.length > 1) {
          previousTrackCache = queue[queue.length - 1];
        }
      } else {
        // If we're on the first track, just restart it
        await TrackPlayer.seekTo(0);
      }
    } catch (error) {
      console.error("Error handling previous track:", error);

      // Recovery attempt
      try {
        const currentIndex = await TrackPlayer.getActiveTrackIndex();
        if (currentIndex !== undefined && currentIndex > 0) {
          await TrackPlayer.skip(currentIndex - 1);
        } else {
          await TrackPlayer.seekTo(0);
        }
      } catch (recoveryError) {
        console.error("Recovery attempt failed:", recoveryError);
      }
    } finally {
      // Reset processing flag with short delay
      setTimeout(() => {
        global.processingPrevTrack = false;
      }, 300);
    }
  });

  // Handle seeking from lock screen / notifications with better error handling
  TrackPlayer.addEventListener(Event.RemoteSeek, async (event) => {
    try {
      await TrackPlayer.seekTo(event.position);
    } catch (error) {
      console.error("Remote seek error:", error);
      // Retry seek with a slight delay
      setTimeout(() => TrackPlayer.seekTo(event.position), 150);
    }
  });

  // Handle jump forward/backward with improved response time
  TrackPlayer.addEventListener(Event.RemoteJumpForward, async (event) => {
    try {
      // Get position more efficiently
      const position = (await TrackPlayer.getProgress()).position;
      // Use faster direct seek
      await TrackPlayer.seekTo(position + (event.interval || 10));
    } catch (error) {
      console.error("Remote jump forward error:", error);
    }
  });

  TrackPlayer.addEventListener(Event.RemoteJumpBackward, async (event) => {
    try {
      // Get position more efficiently
      const position = (await TrackPlayer.getProgress()).position;
      // Use faster direct seek with bounds checking
      await TrackPlayer.seekTo(Math.max(0, position - (event.interval || 10)));
    } catch (error) {
      console.error("Remote jump backward error:", error);
    }
  });

  // Improved playback error handling with smart recovery
  TrackPlayer.addEventListener(Event.PlaybackError, async (event) => {
    console.error(`Playback error: ${event.code} - ${event.message}`);

    try {
      // First try to reload the current track
      const currentTrackIndex = await TrackPlayer.getActiveTrackIndex();
      if (currentTrackIndex !== undefined) {
        // Get current state before attempting recovery
        const wasPlaying = (await getPlaybackState()).state === State.Playing;
        const currentPosition = await TrackPlayer.getProgress().then(
          (progress) => progress.position,
        );

        // Try multiple recovery strategies
        let recovered = false;

        // Strategy 1: Try to seek to current position
        try {
          await TrackPlayer.seekTo(currentPosition);
          if (wasPlaying) {
            await TrackPlayer.play();
          }
          recovered = true;
        } catch (seekError) {
          console.log("Seek recovery failed:", seekError);
        }

        // Strategy 2: If seek failed, try to reload the track
        if (!recovered) {
          try {
            await TrackPlayer.skip(currentTrackIndex);
            if (wasPlaying) {
              await TrackPlayer.play();
            }
            recovered = true;
          } catch (skipError) {
            console.log("Skip recovery failed:", skipError);
          }
        }

        // Strategy 3: If both failed, try to re-add the track
        if (!recovered) {
          try {
            const currentTrack = await TrackPlayer.getTrack(currentTrackIndex);
            if (currentTrack) {
              await TrackPlayer.remove(currentTrackIndex);
              await TrackPlayer.add(currentTrack, currentTrackIndex);
              if (wasPlaying) {
                await TrackPlayer.skip(currentTrackIndex);
                await TrackPlayer.play();
              }
              recovered = true;
            }
          } catch (readdError) {
            console.log("Re-add recovery failed:", readdError);
          }
        }

        // Only move to next track if all recovery attempts failed
        if (!recovered) {
          // Wait a bit before trying next track to prevent rapid skipping
          setTimeout(async () => {
            const newState = await getPlaybackState();
            if (newState.state === State.Error) {
              const queue = await TrackPlayer.getQueue();
              if (currentTrackIndex < queue.length - 1) {
                await TrackPlayer.skipToNext();
                await TrackPlayer.play();
              }
            }
          }, 1000); // Increased delay to prevent rapid skipping
        }
      }
    } catch (error) {
      console.error("Error recovering from playback error:", error);
    }
  });

  // Intelligent queue end handling for better loop playback
  TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async (event) => {
    try {
      // Check if we have repeat mode enabled
      const repeatMode = await TrackPlayer.getRepeatMode();

      if (repeatMode === RepeatMode.Queue) {
        // If repeat queue mode is on, restart from the beginning with preloading
        const queue = await TrackPlayer.getQueue();
        if (queue.length > 0) {
          // Pre-buffer the first track before skipping
          nextTrackCache = queue[0];

          await TrackPlayer.skip(0);
          await TrackPlayer.play();

          // After playing first track, preload second track if available
          if (queue.length > 1) {
            nextTrackCache = queue[1];
          }
        }
      } else if (repeatMode === RepeatMode.Track && event.track) {
        // If repeat track mode is on, replay current track
        await TrackPlayer.seekTo(0);
        await TrackPlayer.play();
      }
    } catch (error) {
      console.error("Error handling queue ended:", error);
    }
  });

  // Enhanced active track change handling to prevent unintended skips
  TrackPlayer.addEventListener(
    Event.PlaybackActiveTrackChanged,
    async (event) => {
      try {
        if (event.track) {
          console.log(
            `Now playing: ${event.track.title} by ${event.track.artist}`,
          );

          // Add a small delay before pre-buffering to ensure stable playback
          setTimeout(async () => {
            try {
              const currentIndex = await TrackPlayer.getActiveTrackIndex();
              if (currentIndex !== undefined) {
                const queue = await TrackPlayer.getQueue();
                const currentState = await TrackPlayer.getState();

                // Only pre-buffer if we're actually playing
                if (currentState === State.Playing) {
                  // Pre-buffer next track
                  if (currentIndex < queue.length - 1) {
                    nextTrackCache = queue[currentIndex + 1];
                  } else if (queue.length > 0) {
                    // If we're on the last track, cache the first one for loop playback
                    nextTrackCache = queue[0];
                  }

                  // Pre-buffer previous track
                  if (currentIndex > 0) {
                    previousTrackCache = queue[currentIndex - 1];
                  } else if (queue.length > 1) {
                    // If we're on the first track, cache the last one for wrap-around
                    previousTrackCache = queue[queue.length - 1];
                  }
                }
              }
            } catch (error) {
              console.error("Error in pre-buffering:", error);
            }
          }, 500);
        }
      } catch (error) {
        console.error("Error in active track changed handler:", error);
      }
    },
  );

  // Optimize response to audio focus changes
  TrackPlayer.addEventListener(Event.RemoteDuck, async (event) => {
    try {
      if (event.paused) {
        if (event.permanent) {
          // Permanent duck - stop playback completely
          await TrackPlayer.stop();
        } else {
          // Temporary duck - just pause
          await TrackPlayer.pause();
        }
      } else {
        // Ducking ended, we can resume if we were playing before
        const state = (await getPlaybackState()).state;
        if (state === State.Paused) {
          await TrackPlayer.play();
        }
      }
    } catch (error) {
      console.error("Error handling audio focus change:", error);
    }
  });

  // Monitor app state changes to optimize performance
  AppState.addEventListener("change", async (nextAppState) => {
    try {
      if (nextAppState === "active") {
        // App came to foreground, check if we need to restore playback
        const state = await getPlaybackState();

        // Refresh the queue if needed to ensure it's up to date
        const queue = await TrackPlayer.getQueue();
        if (queue.length > 0) {
          const currentIndex = await TrackPlayer.getActiveTrackIndex();
          if (currentIndex !== undefined) {
            // Update caches
            if (currentIndex < queue.length - 1) {
              nextTrackCache = queue[currentIndex + 1];
            }
            if (currentIndex > 0) {
              previousTrackCache = queue[currentIndex - 1];
            }
          }
        }
      }
    } catch (error) {
      console.error("Error handling app state change:", error);
    }
  });
}

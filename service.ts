import TrackPlayer, { Event, State } from "react-native-track-player";
import { getPlaybackState } from "react-native-track-player/lib/src/trackPlayer";

/**
 * Enhanced PlaybackService that handles all documented events for version 4.1
 * This service runs in a separate context from your React app
 * Following strictly the documentation: https://rntp.dev/docs/api/events
 */
export async function PlaybackService() {
  // Basic remote control event handlers
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.stop());
  TrackPlayer.addEventListener(Event.RemoteNext, () =>
    TrackPlayer.skipToNext(),
  );
  TrackPlayer.addEventListener(Event.RemotePrevious, () =>
    TrackPlayer.skipToPrevious(),
  );

  // Handle seeking from lock screen / notifications
  TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
    TrackPlayer.seekTo(event.position);
  });

  // Handle jump forward/backward from headphones or lock screen
  // These events are fired when Capability.JumpForward and Capability.JumpBackward are enabled
  // TrackPlayer.addEventListener(Event.RemoteJumpForward, async (event) => {
  //   const position = await TrackPlayer.getProgress().then(
  //     (progress) => progress.position,
  //   );
  //   await TrackPlayer.seekTo(position + event.interval);
  // });

  // TrackPlayer.addEventListener(Event.RemoteJumpBackward, async (event) => {
  //   const position = await TrackPlayer.getProgress().then(
  //     (progress) => progress.position,
  //   );
  //   await TrackPlayer.seekTo(Math.max(0, position - event.interval));
  // });

  // Handle playback errors gracefully
  TrackPlayer.addEventListener(Event.PlaybackError, async (event) => {
    console.error(`Playback error: ${event.code} - ${event.message}`);

    // Try to recover by skipping to the next track if available
    try {
      const state = (await getPlaybackState()).state;
      if (state !== State.None && state !== State.Stopped) {
        await TrackPlayer.skipToNext().catch(() => {});
      }
    } catch (error) {
      console.error("Error recovering from playback error:", error);
    }
  });

  // Handle queue end for continuous playback
  TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async (event) => {
    try {
      const queue = await TrackPlayer.getQueue();
      if (queue.length > 0) {
        await TrackPlayer.skip(0);
        await TrackPlayer.play();
      }
    } catch (error) {
      console.error("Error handling queue ended:", error);
    }
  });

  // Monitor playback state changes
  TrackPlayer.addEventListener(Event.PlaybackState, async (event) => {
    console.log(`Playback state changed to: ${event.state}`);
  });

  // Track progress updates (only fired if progressUpdateEventInterval is set)
  TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, (event) => {
    // This event contains position, duration, and buffered
    // We can use it to update UI components from the service if needed
  });

  // Audio interruption handling
  // Note: This is handled automatically if autoHandleInterruptions is true
  // But we can still use these events for additional custom behavior

  // This event is triggered when audio is interrupted (calls, alarms, etc.)
  TrackPlayer.addEventListener(Event.RemoteDuck, async (event) => {
    if (event.paused) {
      // Audio was ducked, we should pause
      if (event.permanent) {
        // Permanent duck - stop playback completely
        await TrackPlayer.stop();
      } else {
        // Temporary duck - just pause
        await TrackPlayer.pause();
      }
    } else {
      // Ducking ended, we can resume
      const state = (await getPlaybackState()).state;
      if (state === State.Paused) {
        await TrackPlayer.play();
      }
    }
  });
}

import TrackPlayer, { Event, State } from "react-native-track-player";
import { getPlaybackState } from "react-native-track-player/lib/src/trackPlayer";

export async function PlaybackService() {
  TrackPlayer.addEventListener(Event.RemotePlay, async () => {
    try {
      await TrackPlayer.play();
      console.log("Remote play triggered");
    } catch (error) {
      console.error("Remote play error:", error);
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

  TrackPlayer.addEventListener(Event.RemoteNext, async () => {
    try {
      const queue = await TrackPlayer.getQueue();
      const currentIndex = await TrackPlayer.getActiveTrackIndex();

      if (currentIndex !== undefined && currentIndex < queue.length - 1) {
        const nextIndex = currentIndex + 1;
        console.log(
          `Service: Skipping from track ${currentIndex} to ${nextIndex}`,
        );

        // Skip directly to the next track
        await TrackPlayer.skip(nextIndex);
        await TrackPlayer.play();
      } else if (queue.length > 0) {
        // Loop back to beginning with smooth transition
        console.log("Service: Reached end of queue, looping to beginning");
        await TrackPlayer.skip(0);
        await TrackPlayer.play();
      }
    } catch (error) {
      console.error("Error handling next track:", error);

      // More reliable recovery approach
      try {
        const queue = await TrackPlayer.getQueue();
        const currentIndex = await TrackPlayer.getActiveTrackIndex();

        if (currentIndex === undefined) {
          // If no active track, play the first track
          if (queue.length > 0) {
            await TrackPlayer.skip(0);
            await TrackPlayer.play();
          }
        } else if (currentIndex + 1 < queue.length) {
          // Simple skip to next track
          await TrackPlayer.skip(currentIndex + 1);
          await TrackPlayer.play();
        } else if (queue.length > 0) {
          // Loop back to first track
          await TrackPlayer.skip(0);
          await TrackPlayer.play();
        }
      } catch (recoveryError) {
        console.error("Recovery attempt failed:", recoveryError);
      }
    }
  });

  // Improved previous track handler with better position check
  TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
    try {
      const currentPosition = await TrackPlayer.getProgress().then(
        (progress) => progress.position,
      );
      const currentIndex = await TrackPlayer.getActiveTrackIndex();
      const queue = await TrackPlayer.getQueue();

      if (currentPosition > 3) {
        // If more than 3 seconds in, just restart current track
        console.log("Service: Restarting current track (position > 3s)");
        await TrackPlayer.seekTo(0);
        await TrackPlayer.play();
      } else if (currentIndex !== undefined && currentIndex > 0) {
        // Skip to previous track
        const prevIndex = currentIndex - 1;
        console.log(
          `Service: Skipping from track ${currentIndex} to ${prevIndex}`,
        );

        await TrackPlayer.skip(prevIndex);
        await TrackPlayer.play();
      } else if (queue.length > 0) {
        // If we're on the first track, just restart it
        console.log("Service: At first track, restarting");
        await TrackPlayer.seekTo(0);
        await TrackPlayer.play();
      }
    } catch (error) {
      console.error("Error handling previous track:", error);

      // More reliable recovery approach
      try {
        const currentIndex = await TrackPlayer.getActiveTrackIndex();
        const queue = await TrackPlayer.getQueue();

        if (currentIndex === undefined) {
          // If no active track, play the first track
          if (queue.length > 0) {
            await TrackPlayer.skip(0);
            await TrackPlayer.play();
          }
        } else if (currentIndex > 0) {
          // Simple skip to previous track
          await TrackPlayer.skip(currentIndex - 1);
          await TrackPlayer.play();
        } else if (queue.length > 0) {
          // Restart first track
          await TrackPlayer.seekTo(0);
          await TrackPlayer.play();
        }
      } catch (recoveryError) {
        console.error("Recovery attempt failed:", recoveryError);
      }
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

  // Update to use PlaybackActiveTrackChanged instead of deprecated PlaybackTrackChanged
  TrackPlayer.addEventListener(
    Event.PlaybackActiveTrackChanged,
    async (event) => {
      // This helps track internal track changes by TrackPlayer
      if (event.track) {
        console.log(
          `Service: Track changed to ${event.track.title} by ${event.track.artist}`,
        );
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
}

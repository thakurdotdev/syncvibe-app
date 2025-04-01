// playerSetup.ts
import TrackPlayer, {
  Capability,
  AppKilledPlaybackBehavior,
  AndroidAudioContentType,
} from "react-native-track-player";

// Use a global variable to track initialization state
let setupPromise: Promise<boolean> | null = null;

export const setupPlayer = async (): Promise<boolean> => {
  // If setup is already in progress, return the existing promise
  if (setupPromise) {
    return setupPromise;
  }

  // Create a new setup promise
  setupPromise = (async () => {
    try {
      // Check if the player is already initialized by attempting an operation
      try {
        await TrackPlayer.getVolume();
        console.log("TrackPlayer is already initialized");
        return true;
      } catch (error) {
        // Player is not initialized, continue with setup
        console.log("Initializing TrackPlayer...");
      }

      // Initialize the player
      await TrackPlayer.setupPlayer({
        autoUpdateMetadata: true,
        androidAudioContentType: AndroidAudioContentType.Speech,
        autoHandleInterruptions: true,
        maxCacheSize: 1024 * 1024 * 100, // 100 MB
      });

      // Configure capabilities for background and lock screen
      await TrackPlayer.updateOptions({
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
          Capability.Stop,
          Capability.SeekTo,
        ],
        compactCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
          Capability.Stop,
          Capability.SeekTo,
        ],
        notificationCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
          Capability.Stop,
          Capability.SeekTo,
          Capability.PlayFromSearch,
        ],
        android: {
          appKilledPlaybackBehavior:
            AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
          alwaysPauseOnInterruption: true,
        },
      });

      console.log("TrackPlayer setup complete");
      return true;
    } catch (error) {
      console.error("Error setting up TrackPlayer:", error);
      // Reset the promise so we can try again
      setupPromise = null;
      return false;
    }
  })();

  return setupPromise;
};

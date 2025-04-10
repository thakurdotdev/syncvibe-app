// playerSetup.ts
import TrackPlayer, {
  Capability,
  AppKilledPlaybackBehavior,
  AndroidAudioContentType,
  IOSCategory,
  IOSCategoryOptions,
  IOSCategoryMode,
  RepeatMode,
  RatingType,
} from "react-native-track-player";
import { Platform } from "react-native";

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

      // Initialize the player with optimized settings
      // Following strictly the documentation: https://rntp.dev/docs/api/objects/player-options
      await TrackPlayer.setupPlayer({
        // Maximum cache size for smoother playback with less buffering
        maxCacheSize: 1024 * 1024 * 250, // 250 MB cache (Android only)

        // Enable automatic metadata updates for notifications/control center
        autoUpdateMetadata: true,

        // Platform-specific audio settings
        ...(Platform.OS === "android" && {
          // Set content type to music for better audio focus handling
          androidAudioContentType: AndroidAudioContentType.Music,

          // Android-specific buffer settings
          minBuffer: 15, // 15 seconds minimum buffer (Android only)
          maxBuffer: 50, // 50 seconds maximum buffer (Android only)
          playBuffer: 3, // Start playback after 3 seconds buffered (Android only)
          backBuffer: 10, // Keep 10 seconds of audio after played (Android only)
        }),

        ...(Platform.OS === "ios" && {
          // iOS audio session category
          iosCategory: IOSCategory.Playback,

          // iOS audio session category options
          iosCategoryOptions: [
            IOSCategoryOptions.MixWithOthers,
            IOSCategoryOptions.DuckOthers,
            IOSCategoryOptions.AllowAirPlay,
            IOSCategoryOptions.AllowBluetooth,
            IOSCategoryOptions.AllowBluetoothA2DP,
          ],

          // iOS audio session category mode
          iosCategoryMode: IOSCategoryMode.Default,
        }),

        // Handle audio interruptions automatically (calls, alarms, etc.)
        autoHandleInterruptions: true,

        // Optimize buffering strategy
        waitForBuffer: true,
      });

      // Set initial repeat mode
      await TrackPlayer.setRepeatMode(RepeatMode.Off);

      // Configure capabilities for background and lock screen controls
      // Following strictly the documentation for updateOptions
      await TrackPlayer.updateOptions({
        // Full capabilities when app is in foreground
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.Stop,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
          Capability.JumpForward, // For 10-second skip forward
          Capability.JumpBackward, // For 10-second skip backward
          Capability.SeekTo,
        ],

        // Capabilities for compact view (e.g. notification collapsed)
        compactCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
        ],

        // Notification/Control Center capabilities
        notificationCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.Stop,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
          Capability.SeekTo,
          Capability.JumpForward,
          Capability.JumpBackward,
        ],

        // Android-specific configuration
        android: {
          // Keep playback alive in background
          // Documentation confirms ContinuePlayback is the default
          appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,

          // Handle audio focus changes gracefully
          alwaysPauseOnInterruption: true,
        },

        // Set progress update interval for PlaybackProgressUpdated event
        progressUpdateEventInterval: 1, // Update every second
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

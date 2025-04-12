import TrackPlayer, {
  Capability,
  AppKilledPlaybackBehavior,
  AndroidAudioContentType,
  IOSCategory,
  IOSCategoryOptions,
  IOSCategoryMode,
  RepeatMode,
} from "react-native-track-player";
import { Platform } from "react-native";
import * as Network from "expo-network";

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

      // Check network connection to determine optimal buffer settings
      const networkState = await Network.getNetworkStateAsync();
      const isWifi = networkState.type === Network.NetworkStateType.WIFI;
      const isGoodConnection =
        networkState.isConnected &&
        (isWifi || networkState.isInternetReachable);

      // Initialize the player with optimized settings
      // Following strictly the documentation: https://rntp.dev/docs/api/objects/player-options
      await TrackPlayer.setupPlayer({
        // Maximum cache size for smoother playback with less buffering
        maxCacheSize: 1024 * 1024 * 500, // Increase to 500 MB cache for better experience

        // Enable automatic metadata updates for notifications/control center
        autoUpdateMetadata: true,

        // Platform-specific audio settings
        ...(Platform.OS === "android" && {
          // Set content type to music for better audio focus handling
          androidAudioContentType: AndroidAudioContentType.Music,

          // Android-specific buffer settings - optimize based on connection quality
          minBuffer: isGoodConnection ? 30 : 15, // Increased buffer for better experience
          maxBuffer: isGoodConnection ? 120 : 60, // Increased maximum buffer
          playBuffer: 1.5, // Start playback faster after buffering begins (reduced from 3)
          backBuffer: 30, // Increase back buffer to 30 seconds for smoother rewind experience
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
          iosCategoryMode: IOSCategoryMode.SpokenAudio, // Changed to SpokenAudio for better background playback
        }),

        // Handle audio interruptions automatically (calls, alarms, etc.)
        autoHandleInterruptions: true,

        // Optimize buffering strategy - changed to false for immediate playback
        waitForBuffer: false,
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
          appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,

          // Handle audio focus changes gracefully
          alwaysPauseOnInterruption: true,
        },

        // Set progress update interval for PlaybackProgressUpdated event
        progressUpdateEventInterval: 0.5, // Update twice per second for smoother UI updates
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

// New helper function to dynamically select audio quality based on network conditions
export const getOptimalAudioQuality = async () => {
  try {
    const networkState = await Network.getNetworkStateAsync();
    const isWifi = networkState.type === Network.NetworkStateType.WIFI;
    const isGoodConnection =
      networkState.isConnected && (isWifi || networkState.isInternetReachable);

    // Return index for optimal audio quality (0 = lowest, 2 = highest)
    if (isWifi) return 2; // High quality on WiFi
    if (isGoodConnection) return 1; // Medium quality on good cellular
    return 0; // Low quality on poor connections
  } catch (error) {
    console.error("Error getting network info:", error);
    return 1; // Default to medium quality
  }
};

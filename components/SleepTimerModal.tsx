import SwipeableModal from "@/components/common/SwipeableModal";
import { useSleepTimer } from "@/context/MusicContext";
import Slider from "@react-native-community/slider";
import { Clock, Music, Timer, X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSharedValue, withTiming } from "react-native-reanimated";

const SleepTimerModal = ({
  isVisible,
  onClose,
}: {
  isVisible: boolean;
  onClose: () => void;
}) => {
  const {
    setSleepTimer,
    clearSleepTimer,
    timeRemaining,
    songsRemaining,
    isActive,
  } = useSleepTimer();
  const [timerType, setTimerType] = useState("time");
  const [selectedTime, setSelectedTime] = useState(30);
  const [selectedSongs, setSelectedSongs] = useState(5);

  const sliderPosition = useSharedValue(
    timerType === "time" ? selectedTime / 120 : selectedSongs / 20,
  );

  // Update slider position when timer type changes
  useEffect(() => {
    sliderPosition.value = withTiming(
      timerType === "time" ? selectedTime / 120 : selectedSongs / 20,
      { duration: 300 },
    );
  }, [timerType]);

  const handleSetTimer = () => {
    if (timerType === "time") {
      setSleepTimer(selectedTime);
    } else {
      setSleepTimer(0, selectedSongs);
    }
    onClose();
  };

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
  };

  const handleSliderChange = (value: number) => {
    if (timerType === "time") {
      // Map 0-1 to 10-120
      const minutes = Math.round((value * 110 + 10) / 10) * 10;
      setSelectedTime(minutes);
    } else {
      // Map 0-1 to 1-20
      const songs = Math.round(value * 19 + 1);
      setSelectedSongs(songs);
    }
  };

  return (
    <SwipeableModal
      isVisible={isVisible}
      onClose={onClose}
      maxHeight="80%"
      backgroundColor="#0A0A0A"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Clock size={24} color="#FFFFFF" />
          <Text style={styles.title}>Sleep Timer</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.radioGroup}>
            <Pressable
              style={[
                styles.radioOption,
                timerType === "time" && styles.selectedRadio,
              ]}
              onPress={() => setTimerType("time")}
            >
              <Timer
                size={20}
                color={timerType === "time" ? "#FFFFFF" : "#6B6B6B"}
              />
              <Text
                style={[
                  styles.radioLabel,
                  timerType === "time" && styles.selectedRadioLabel,
                ]}
              >
                Time
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.radioOption,
                timerType === "songs" && styles.selectedRadio,
              ]}
              onPress={() => setTimerType("songs")}
            >
              <Music
                size={20}
                color={timerType === "songs" ? "#FFFFFF" : "#6B6B6B"}
              />
              <Text
                style={[
                  styles.radioLabel,
                  timerType === "songs" && styles.selectedRadioLabel,
                ]}
              >
                Songs
              </Text>
            </Pressable>
          </View>

          <View style={styles.sliderContainer}>
            <Text style={styles.sliderLabel}>
              {timerType === "time" ? "Duration (minutes)" : "Number of Songs"}
            </Text>

            {/* Replace custom slider with default Slider component */}
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={1}
              value={
                timerType === "time"
                  ? (selectedTime - 10) / 110
                  : (selectedSongs - 1) / 19
              }
              onValueChange={handleSliderChange}
              minimumTrackTintColor="#FFFFFF"
              maximumTrackTintColor="#2A2A2A"
              thumbTintColor="#FFFFFF"
            />

            <View style={styles.sliderValues}>
              <Text style={styles.sliderMinMax}>
                {timerType === "time" ? "10m" : "1"}
              </Text>
              <Text style={styles.sliderCurrent}>
                {timerType === "time" ? `${selectedTime}m` : selectedSongs}
              </Text>
              <Text style={styles.sliderMinMax}>
                {timerType === "time" ? "120m" : "20"}
              </Text>
            </View>
          </View>

          {isActive && (
            <View style={styles.activeTimerContainer}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {timerType === "time"
                    ? `Remaining: ${formatTime(timeRemaining)}`
                    : `Songs Left: ${songsRemaining}`}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={clearSleepTimer}
              >
                <X size={16} color="#000000" />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={[styles.startButton, isActive && styles.disabledButton]}
            onPress={handleSetTimer}
            disabled={isActive}
          >
            <Text style={styles.startButtonText}>
              {isActive ? "Timer Active" : "Start Timer"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SwipeableModal>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  card: {
    backgroundColor: "#141414",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  radioGroup: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 28,
    gap: 12,
  },
  radioOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#1A1A1A",
  },
  selectedRadio: {
    borderColor: "#FFFFFF",
    backgroundColor: "#2A2A2A",
  },
  radioLabel: {
    color: "#6B6B6B",
    fontWeight: "500",
    fontSize: 15,
  },
  selectedRadioLabel: {
    color: "#FFFFFF",
  },
  sliderContainer: {
    marginBottom: 28,
  },
  sliderLabel: {
    marginBottom: 12,
    color: "#FFFFFF",
    fontWeight: "500",
    fontSize: 15,
  },
  slider: {
    width: "100%",
    height: 40,
    marginVertical: 8,
  },
  sliderThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  sliderTrack: {
    height: 4,
    borderRadius: 2,
  },
  sliderValues: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  sliderMinMax: {
    color: "#6B6B6B",
    fontSize: 14,
  },
  sliderCurrent: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  activeTimerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  badge: {
    backgroundColor: "#2A2A2A",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  },
  cancelButton: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    gap: 6,
  },
  cancelButtonText: {
    color: "#000000",
    fontSize: 14,
    fontWeight: "600",
  },
  startButton: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#2A2A2A",
  },
  startButtonText: {
    color: "#000000",
    fontWeight: "600",
    fontSize: 16,
  },
});

export default SleepTimerModal;

import { Ionicons } from "@expo/vector-icons";
import {
  CameraView,
  Camera as ExpoCamera,
  FlashMode,
  useCameraPermissions,
} from "expo-camera";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Button,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";

const QRScannerScreen = () => {
  const [hasPermission, setHasPermission] = useState<null | boolean>(null);
  const [scanned, setScanned] = useState(false);
  const [flashMode, setFlashMode] = useState<FlashMode>("off");
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    (async () => {
      const { status } = await requestPermission();
      setHasPermission(status === "granted");
    })();
  }, []);

  if (!permission?.granted) {
    // Camera permissions are not granted yet.
    return (
      <View style={styles.container}>
        <Text>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="grant permission" />
      </View>
    );
  }

  const handleBarCodeScanned = ({
    type,
    data,
  }: {
    type: string;
    data: string;
  }) => {
    if (!scanned && isActive) {
      setScanned(true);
      setScannedData(data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Vibration.vibrate(100);
    }
  };

  const resetScanner = () => {
    setScanned(false);
    setScannedData(null);
  };

  const copyToClipboard = async () => {
    Alert.alert("Copied", "QR code data copied to clipboard!");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const toggleFlash = () => {
    setFlashMode(flashMode === "off" ? "on" : "off");
  };

  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.statusText}>Requesting camera permission...</Text>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.statusText}>No access to camera</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => ExpoCamera.requestCameraPermissionsAsync()}
        >
          <Text style={styles.buttonText}>Request Permission</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>QR Scanner</Text>
      </View>

      {/* Scanner View */}
      <View style={styles.scannerContainer}>
        <CameraView
          style={styles.camera}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
          enableTorch={flashMode === "on"}
          facing={"back"}
          flash={flashMode}
        >
          <View style={styles.overlay}>
            <View style={styles.unfilled} />
            <View style={styles.rowContainer}>
              <View style={styles.unfilled} />
              <View style={styles.scanner}>
                {/* Scanner frame corners */}
                <View style={[styles.cornerTL, styles.corner]} />
                <View style={[styles.cornerTR, styles.corner]} />
                <View style={[styles.cornerBL, styles.corner]} />
                <View style={[styles.cornerBR, styles.corner]} />
              </View>
              <View style={styles.unfilled} />
            </View>
            <View style={styles.unfilled} />
          </View>
        </CameraView>
      </View>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity style={styles.iconButton} onPress={toggleFlash}>
          <Ionicons
            name={flashMode === "on" ? "flash-off" : "flash"}
            size={28}
            color="#ffffff"
          />
          <Text style={styles.iconText}>Flash</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.scanButton}
          onPress={resetScanner}
          disabled={!scanned}
        >
          <Ionicons name="scan" size={32} color="#ffffff" />
          <Text style={styles.scanButtonText}>
            {scanned ? "Scan Again" : "Scanning..."}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setIsActive(!isActive)}
        >
          <Ionicons
            name={isActive ? "pause" : "play"}
            size={28}
            color="#ffffff"
          />
          <Text style={styles.iconText}>{isActive ? "Pause" : "Resume"}</Text>
        </TouchableOpacity>
      </View>

      {/* Result Panel */}
      {scannedData && (
        <View style={styles.resultContainer}>
          <View style={styles.resultHeader}>
            <Text style={styles.resultTitle}>QR Code Content</Text>
            <TouchableOpacity onPress={resetScanner}>
              <Ionicons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <View style={styles.resultContent}>
            <Text
              style={styles.resultText}
              numberOfLines={3}
              ellipsizeMode="tail"
            >
              {scannedData}
            </Text>
          </View>

          <View style={styles.resultActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={copyToClipboard}
            >
              <Ionicons name="copy-outline" size={20} color="#ffffff" />
              <Text style={styles.actionText}>Copy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => Alert.alert("Success", "Content will be shared")}
            >
              <Ionicons name="share-social-outline" size={20} color="#ffffff" />
              <Text style={styles.actionText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a2a",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ffffff",
  },
  scannerContainer: {
    flex: 1,
    overflow: "hidden",
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  rowContainer: {
    flex: 1,
    flexDirection: "row",
  },
  unfilled: {
    flex: 1,
  },
  scanner: {
    aspectRatio: 1,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 20,
    height: 20,
    borderColor: "#3D8FFF",
    borderWidth: 3,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderBottomWidth: 0,
    borderRightWidth: 0,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderTopWidth: 0,
    borderRightWidth: 0,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
  },
  controlsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 20,
    backgroundColor: "#1e1e1e",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
  },
  iconButton: {
    alignItems: "center",
  },
  iconText: {
    color: "#999999",
    marginTop: 4,
    fontSize: 12,
  },
  scanButton: {
    backgroundColor: "#3D8FFF",
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#3D8FFF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  scanButtonText: {
    color: "#ffffff",
    marginTop: 4,
    fontSize: 12,
    fontWeight: "500",
  },
  resultContainer: {
    backgroundColor: "#1e1e1e",
    borderTopColor: "#2a2a2a",
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 25,
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
  resultContent: {
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  resultText: {
    color: "#ffffff",
    fontSize: 14,
  },
  resultActions: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#333333",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  actionText: {
    color: "#ffffff",
    marginLeft: 6,
    fontSize: 14,
  },
  statusText: {
    color: "#ffffff",
    fontSize: 16,
    textAlign: "center",
    marginTop: 100,
  },
  button: {
    backgroundColor: "#3D8FFF",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 20,
    alignSelf: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "500",
  },
});

export default QRScannerScreen;

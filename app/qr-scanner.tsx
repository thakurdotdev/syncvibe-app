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
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";

const QRScannerScreen = ({
  onScanComplete,
  onClose,
}: {
  onScanComplete: (data: string) => void;
  onClose: () => void;
}) => {
  const [hasPermission, setHasPermission] = useState<null | boolean>(null);
  const [scanned, setScanned] = useState(false);
  const [flashMode, setFlashMode] = useState<FlashMode>("off");
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    (async () => {
      const { status } = await requestPermission();
      setHasPermission(status === "granted");
    })();

    // Cleanup function to handle unmounting
    return () => {
      setIsCameraActive(false);
    };
  }, []);

  if (!permission?.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>
            We need your permission to access the camera
          </Text>
          <TouchableOpacity style={styles.button} onPress={requestPermission}>
            <Text style={styles.buttonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onClose}
          >
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
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
    if (!scanned && isCameraActive) {
      setScanned(true);
      setScannedData(data);
      setIsCameraActive(false); // Turn off camera after successful scan
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Vibration.vibrate(100);
    }
  };

  const resetScanner = () => {
    setScanned(false);
    setScannedData(null);
    setIsCameraActive(true);
  };

  const toggleFlash = () => {
    setFlashMode(flashMode === "off" ? "on" : "off");
  };

  const handleClose = () => {
    setIsCameraActive(false);
    onClose();
  };

  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.statusText}>Requesting camera permission...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.statusText}>Camera access denied</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => ExpoCamera.requestCameraPermissionsAsync()}
          >
            <Text style={styles.buttonText}>Request Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onClose}
          >
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Show result screen with only the Join Group button after scan
  if (scanned && scannedData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.resultScreen}>
          <View style={styles.resultHeader}>
            <Text style={styles.headerTitle}>QR Code Scanned</Text>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Ionicons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <View style={styles.resultContent}>
            <Ionicons
              name="checkmark-circle"
              size={60}
              color="#3D8FFF"
              style={styles.successIcon}
            />
            <Text style={styles.resultMessage}>
              QR code detected successfully!
            </Text>

            <TouchableOpacity
              style={styles.joinButton}
              onPress={() => {
                onScanComplete(scannedData);
                handleClose();
              }}
            >
              <Text style={styles.buttonText}>Join Group</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={resetScanner}
            >
              <Text style={styles.buttonText}>Scan Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with close button */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>QR Scanner</Text>
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <Ionicons name="close" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Scanner View */}
      {isCameraActive && (
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

                  {/* Scanning indicator */}
                  <View style={styles.scanIndicator}>
                    <Text style={styles.scanningText}>Scanning...</Text>
                  </View>
                </View>
                <View style={styles.unfilled} />
              </View>
              <View style={styles.unfilled} />
            </View>
          </CameraView>
        </View>
      )}

      {/* Controls */}
      {isCameraActive && (
        <View style={styles.controlsContainer}>
          <TouchableOpacity style={styles.iconButton} onPress={toggleFlash}>
            <Ionicons
              name={flashMode === "on" ? "flash" : "flash-outline"}
              size={28}
              color="#ffffff"
            />
            <Text style={styles.iconText}>
              {flashMode === "on" ? "Flash On" : "Flash Off"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    paddingTop: 30,
    paddingBottom: 20,
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a2a",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ffffff",
  },
  closeButton: {
    position: "absolute",
    right: 16,
    padding: 8,
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
    width: 30,
    height: 30,
    borderColor: "#3D8FFF",
    borderWidth: 4,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderBottomWidth: 0,
    borderRightWidth: 0,
    borderTopLeftRadius: 12,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopRightRadius: 12,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomLeftRadius: 12,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomRightRadius: 12,
  },
  scanIndicator: {
    position: "absolute",
    bottom: -30,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  scanningText: {
    color: "#3D8FFF",
    fontSize: 14,
    fontWeight: "600",
  },
  controlsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    backgroundColor: "#1e1e1e",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
  },
  iconButton: {
    alignItems: "center",
    padding: 12,
    backgroundColor: "#2a2a2a",
    borderRadius: 12,
    width: 100,
  },
  iconText: {
    color: "#ffffff",
    marginTop: 6,
    fontSize: 12,
    fontWeight: "500",
  },
  statusText: {
    color: "#ffffff",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  permissionText: {
    color: "#ffffff",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#3D8FFF",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 16,
    alignSelf: "stretch",
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#333333",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "500",
  },
  resultScreen: {
    flex: 1,
    padding: 20,
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a2a",
    marginBottom: 30,
  },
  resultContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  resultMessage: {
    color: "#ffffff",
    fontSize: 18,
    marginBottom: 40,
    marginTop: 16,
    textAlign: "center",
  },
  successIcon: {
    marginBottom: 16,
  },
  joinButton: {
    backgroundColor: "#3D8FFF",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 10,
    marginBottom: 20,
    alignSelf: "stretch",
    alignItems: "center",
    shadowColor: "#3D8FFF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});

export default QRScannerScreen;

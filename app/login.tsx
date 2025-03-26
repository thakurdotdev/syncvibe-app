import { API_URL } from "@/constants";
import { useUser } from "@/context/UserContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as Google from "expo-auth-session/providers/google";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Complete auth session
WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get("window");

const LoginScreen = () => {
  const { getProfile } = useUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Configuration for Google Auth
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId:
      "752661424495-r0jl8s9kc6h4dsvd9ur121hci61vnch9.apps.googleusercontent.com",
    webClientId:
      "752661424495-hdf62mg8mfuje1c2f5pkoimj2rch0hjl.apps.googleusercontent.com",
    selectAccount: true,
  });

  useEffect(() => {
    if (response?.type === "success") {
      setLoading(true);
      const { authentication } = response;
      handleSignInWithGoogle(authentication?.accessToken);
    } else if (response?.type === "error") {
      console.error("Auth Error:", response.error);
      setError(
        `Authentication error: ${response.error?.message || "Unknown error"}`,
      );
    }
  }, [response]);

  const handleSignInWithGoogle = async (accessToken: string | undefined) => {
    try {
      if (!accessToken) {
        throw new Error("No access token received");
      }

      // Get user info from Google
      const userInfoResponse = await fetch(
        "https://www.googleapis.com/userinfo/v2/me",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      if (!userInfoResponse.ok) {
        const errorText = await userInfoResponse.text();
        throw new Error(
          `Google API error (${userInfoResponse.status}): ${errorText}`,
        );
      }

      const googleUserInfo = await userInfoResponse.json();

      // Authenticate with backend
      const backendResponse = await axios.post(
        `${API_URL}/api/auth/google/mobile`,
        {
          user: googleUserInfo,
        },
      );

      const token = backendResponse.data.token;
      await AsyncStorage.setItem("token", token);

      await getProfile();
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      setError(`Authentication failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.outerContainer}>
      {/* Background gradients */}
      <LinearGradient
        colors={["#000000", "#121212", "#1A1A1A"]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Subtle accent gradient overlays */}
      <View style={[styles.accentOverlay, styles.accentTopRight]} />
      <View style={[styles.accentOverlay, styles.accentBottomLeft]} />

      <View
        style={[
          styles.container,
          {
            paddingTop: insets.top + 20,
            paddingBottom: Math.max(insets.bottom + 80, 100), // Extra padding for tabs
          },
        ]}
      >
        {/* Logo and app title */}
        <View style={styles.logoContainer}>
          <View style={styles.logoWrapper}>
            <BlurView intensity={40} tint="dark" style={styles.logoBlur}>
              <Image
                source={require("../assets/icon.jpg")}
                style={styles.logo}
                resizeMode="contain"
              />
            </BlurView>
          </View>

          <View>
            <Text style={styles.appTitle}>Welcome to SyncVibe</Text>
            <Text style={styles.appSubtitle}>Sign in to discover music</Text>
          </View>
        </View>

        {/* Login button */}
        <View style={styles.buttonContainer}>
          <BlurView
            intensity={20}
            tint="dark"
            style={styles.buttonBlurContainer}
            className="rounded-full"
          >
            <TouchableOpacity
              style={[styles.googleButton, loading && styles.buttonDisabled]}
              onPress={() => {
                setError("");
                promptAsync({ showInRecents: true }).catch((err) => {
                  console.error("Error launching auth:", err);
                  setError(`Launch error: ${err.message}`);
                });
              }}
              disabled={!request || loading}
              activeOpacity={0.8}
            >
              <Image
                source={require("../assets/images/google.png")}
                style={styles.googleIcon}
              />
              {loading ? (
                <ActivityIndicator size="small" color="#5B5B5B" />
              ) : (
                <Text style={styles.buttonText}>Continue with Google</Text>
              )}
            </TouchableOpacity>
          </BlurView>

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By continuing, you agree to our{" "}
            <Text
              style={styles.footerLink}
              onPress={async () => {
                await WebBrowser.openBrowserAsync(
                  "https://syncvibe.xyz/terms-of-services",
                );
              }}
            >
              Terms of Service
            </Text>{" "}
            and{" "}
            <Text
              style={styles.footerLink}
              onPress={async () => {
                await WebBrowser.openBrowserAsync(
                  "https://syncvibe.xyz/privacy-policy",
                );
              }}
            >
              Privacy Policy
            </Text>
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
  },
  // Accent gradients
  accentOverlay: {
    position: "absolute",
    width: width * 0.8,
    height: height * 0.4,
    opacity: 0.15,
    borderRadius: 300,
  },
  accentTopRight: {
    top: -height * 0.05,
    right: -width * 0.2,
    backgroundColor: "#6366f1",
    transform: [{ rotate: "30deg" }],
  },
  accentBottomLeft: {
    bottom: -height * 0.05,
    left: -width * 0.2,
    backgroundColor: "#4f46e5",
    transform: [{ rotate: "-20deg" }],
  },
  logoContainer: {
    alignItems: "center",
    marginTop: 40,
  },
  logoWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6366f1",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  logoBlur: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: 60,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  appSubtitle: {
    fontSize: 16,
    color: "#AAAAAA",
    textAlign: "center",
    letterSpacing: 0.2,
  },
  buttonContainer: {
    width: "100%",
    alignItems: "center",
  },
  buttonBlurContainer: {
    width: "100%",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 24,
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333333",
  },
  errorContainer: {
    backgroundColor: "rgba(255, 59, 48, 0.15)",
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(255, 59, 48, 0.3)",
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 14,
  },
  footer: {
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 20,
  },
  footerText: {
    color: "#888888",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
  footerLink: {
    color: "#6366f1",
    fontWeight: "500",
  },
});

export default LoginScreen;

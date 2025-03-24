import ImageColors from "react-native-image-colors";
import { Platform } from "react-native";
import {
  AndroidImageColors,
  IOSImageColors,
} from "react-native-image-colors/build/types";

export async function extractImageColors(imageUri: string) {
  try {
    const result = await ImageColors.getColors(imageUri, {
      fallback: "#121212",
      cache: true,
      key: imageUri,
    });

    let colors = {
      primary: "#121212",
      secondary: "#000000",
      background: "#121212",
      tertiary: "#1E1E1E", // For glassmorphic effect
      isLight: false,
    };

    if (Platform.OS === "android") {
      // Android returns different properties
      const androidResult = result as AndroidImageColors;

      // Create a more sophisticated color palette
      colors = {
        // Make a slightly muted version of dominant
        primary: adjustColorSaturation(
          darkenColor(androidResult.dominant || "#121212", 0.3),
          0.75,
        ),
        // Create a complementary secondary color
        secondary: adjustColorSaturation(
          darkenColor(androidResult.vibrant || "#000000", 0.5),
          0.6,
        ),
        // Very dark, slightly tinted background
        background: blendColors(
          "#080808",
          darkenColor(androidResult.average || "#121212", 0.8),
          0.15,
        ),
        // Create a tertiary color for accents
        tertiary: adjustColorSaturation(
          darkenColor(androidResult.darkVibrant || "#1E1E1E", 0.3),
          0.5,
        ),
        isLight: false, // Always use dark theme for text
      };
    } else {
      // iOS returns different properties
      const iosResult = result as IOSImageColors;

      colors = {
        // Make a slightly muted version of primary
        primary: adjustColorSaturation(
          darkenColor(iosResult.primary || "#121212", 0.3),
          0.75,
        ),
        // Create a complementary secondary color
        secondary: adjustColorSaturation(
          darkenColor(iosResult.detail || "#000000", 0.5),
          0.6,
        ),
        // Very dark, slightly tinted background
        background: blendColors(
          "#080808",
          darkenColor(iosResult.background || "#121212", 0.8),
          0.15,
        ),
        // Create a tertiary color for accents
        tertiary: adjustColorSaturation(
          darkenColor(iosResult.secondary || "#1E1E1E", 0.3),
          0.5,
        ),
        isLight: false, // Always use dark theme for text
      };
    }

    return colors;
  } catch (error) {
    console.error("Error extracting colors:", error);
    return {
      primary: "#1E293B", // Dark slate blue
      secondary: "#0F172A", // Very dark blue
      background: "#030712", // Almost black
      tertiary: "#64748B", // Slate gray for accents
      isLight: false,
    };
  }
}

// Function to darken colors
export function darkenColor(hexColor: string, amount: number): string {
  // Convert hex to RGB
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);

  // Darken each component
  const darkenedR = Math.max(0, Math.floor(r * (1 - amount)));
  const darkenedG = Math.max(0, Math.floor(g * (1 - amount)));
  const darkenedB = Math.max(0, Math.floor(b * (1 - amount)));

  // Convert back to hex
  return `#${((1 << 24) + (darkenedR << 16) + (darkenedG << 8) + darkenedB)
    .toString(16)
    .slice(1)}`;
}

// Function to blend colors
export function blendColors(color1: string, color2: string, ratio: number) {
  // Convert hex to RGB
  const r1 = parseInt(color1.slice(1, 3), 16);
  const g1 = parseInt(color1.slice(3, 5), 16);
  const b1 = parseInt(color1.slice(5, 7), 16);

  const r2 = parseInt(color2.slice(1, 3), 16);
  const g2 = parseInt(color2.slice(3, 5), 16);
  const b2 = parseInt(color2.slice(5, 7), 16);

  // Blend colors
  const r = Math.round(r1 * (1 - ratio) + r2 * ratio);
  const g = Math.round(g1 * (1 - ratio) + g2 * ratio);
  const b = Math.round(b1 * (1 - ratio) + b2 * ratio);

  // Convert back to hex
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

// New function to adjust color saturation
export function adjustColorSaturation(
  hexColor: string,
  saturationFactor: number,
): string {
  // Convert hex to RGB
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);

  // Convert RGB to HSL
  const [h, s, l] = rgbToHsl(r, g, b);

  // Adjust saturation
  const newS = Math.max(0, Math.min(1, s * saturationFactor));

  // Convert back to RGB
  const [newR, newG, newB] = hslToRgb(h, newS, l);

  // Convert to hex
  return `#${((1 << 24) + (newR << 16) + (newG << 8) + newB)
    .toString(16)
    .slice(1)}`;
}

// Helper function: RGB to HSL conversion
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return [h, s, l];
}

// Helper function: HSL to RGB conversion
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

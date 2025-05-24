export interface ColorPalette {
  light: ThemeColors;
  dark: ThemeColors;
  name: string;
  description: string;
}

export interface ThemeColors {
  // Main palette
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
  text: string;

  // Button state variants
  primaryHover: string;
  primaryActive: string;
  primaryDisabled: string;
  secondaryHover: string;
  secondaryActive: string;
  secondaryDisabled: string;
  accentHover: string;
  accentActive: string;
  accentDisabled: string;
  destructiveHover: string;
  destructiveActive: string;
  destructiveDisabled: string;

  // Gradient colors
  gradients: {
    primary: string[];
    background: string[];
    card: string[];
    accent: string[];
    destructive: string[];
  };
}

const defaultPalette: ColorPalette = {
  name: "Default",
  description: "A more vibrant color scheme with enhanced contrast",
  light: {
    // Main palette (following shadcn/ui's color scheme)
    background: "#FFFFFF",
    foreground: "#1A1A1A", // Slightly softened for better readability
    card: "#FFFFFF",
    cardForeground: "#1A1A1A",
    popover: "#FFFFFF",
    popoverForeground: "#1A1A1A",
    primary: "#0066FF", // More balanced blue for better contrast
    primaryForeground: "#FFFFFF",
    secondary: "#F2F2F7", // Subtle gray with slight warmth
    secondaryForeground: "#1A1A1A",
    muted: "#F2F2F7", // Matching secondary
    mutedForeground: "#6E6E73", // Balanced mid-gray
    accent: "#E6F0FF", // Subtle blue accent
    accentForeground: "#1A1A1A",
    destructive: "#FF3B30", // Vibrant red
    destructiveForeground: "#FFFFFF",
    border: "#DEDEDE", // More distinctive border
    input: "#DEDEDE", // Matching border
    ring: "#0066FF", // Matching primary
    text: "#1A1A1A", // Matching foreground

    // Button state variants
    primaryHover: "#0052CC", // 20% darker blue
    primaryActive: "#0047B3", // 30% darker blue
    primaryDisabled: "#99C2FF", // 40% lighter blue

    secondaryHover: "#E5E5EA", // Slightly darker gray
    secondaryActive: "#D1D1D6", // Even darker gray
    secondaryDisabled: "#F9F9FC", // Lighter gray

    accentHover: "#D6E4FF", // More saturated accent
    accentActive: "#C2D8FF", // Even more saturated accent
    accentDisabled: "#F0F5FF", // Lighter accent

    destructiveHover: "#FF2D21", // More intense red
    destructiveActive: "#E0271C", // Deeper red
    destructiveDisabled: "#FFACA6", // Lighter red

    // Gradient colors
    gradients: {
      primary: ["#4D94FF", "#0066FF", "#0052CC"], // Balanced blue gradient
      background: ["#FFFFFF", "#F9F9F9"], // Subtle light gradient
      card: ["#FFFFFF", "#FAFAFA"], // Very subtle card gradient
      accent: ["#E6F0FF", "#D6E4FF"], // Subtle blue accent gradient
      destructive: ["#FF5B52", "#FF3B30", "#E0271C"], // Refined red gradient
    },
  },
  dark: {
    // Main palette
    background: "#0D0D0D", // Rich black with slight warmth
    foreground: "#F5F5F7", // Off-white with slight coolness
    card: "#1C1C1E", // Slightly lighter than background
    cardForeground: "#F5F5F7",
    popover: "#1C1C1E",
    popoverForeground: "#F5F5F7",
    primary: "#0A84FF", // Bright blue for dark mode
    primaryForeground: "#FFFFFF",
    secondary: "#2C2C2E", // Dark gray with slight warmth
    secondaryForeground: "#F5F5F7",
    muted: "#2C2C2E", // Matching secondary
    mutedForeground: "#AEAEB2", // Light gray with better contrast
    accent: "#1A2C45", // Dark blue-tinted accent
    accentForeground: "#F5F5F7",
    destructive: "#FF453A", // Bright red
    destructiveForeground: "#FFFFFF",
    border: "#38383A", // More visible border
    input: "#38383A", // Matching border
    ring: "#0A84FF", // Matching primary
    text: "#F5F5F7", // Matching foreground

    // Button state variants
    primaryHover: "#0070DB", // Slightly darker blue
    primaryActive: "#0062C2", // Even darker blue
    primaryDisabled: "#65A8F2", // Desaturated blue

    secondaryHover: "#3A3A3C", // Lighter gray
    secondaryActive: "#48484A", // Even lighter gray
    secondaryDisabled: "#222224", // Darker gray

    accentHover: "#223654", // Slightly lighter accent
    accentActive: "#2A4064", // Even lighter accent
    accentDisabled: "#142236", // Darker accent

    destructiveHover: "#FF6961", // Lighter red
    destructiveActive: "#FF8278", // Even lighter red
    destructiveDisabled: "#A3231B", // Darker red, more contrast

    // Gradient colors
    gradients: {
      primary: ["#47A3FF", "#0A84FF", "#0062C2"], // Enhanced blue gradient
      background: ["#0D0D0D", "#151517"], // Subtle dark gradient
      card: ["#1C1C1E", "#28282A"], // More dimensional card gradient
      accent: ["#1A2C45", "#223654"], // Dark blue accent gradient
      destructive: ["#A3231B", "#FF453A", "#FF6961"], // Enhanced red gradient with more depth
    },
  },
};

export const colorPalettes: Record<string, ColorPalette> = {
  default: defaultPalette,
};

export type ColorTheme = "light" | "dark";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { useColorScheme, Appearance, AppState } from "react-native";
import {
  colorPalettes,
  ThemeColors,
  ColorTheme,
  ColorPalette,
} from "@/theme/color";
import { storageCache } from "@/utils/storageCache";

const THEME_PREFERENCE_KEY = "@theme_preference";
const COLOR_PALETTE_KEY = "@color_palette";

type ThemePreference = ColorTheme | "system";
type PaletteKey = keyof typeof colorPalettes;

interface ThemeContextType {
  theme: ColorTheme;
  colors: ThemeColors;
  isLoading: boolean;
  toggleTheme: () => void;
  setTheme: (theme: ThemePreference) => void;
  setSystemTheme: () => void;
  themePreference: ThemePreference;
  colorPalette: PaletteKey;
  setColorPalette: (palette: PaletteKey) => void;
  availablePalettes: Record<PaletteKey, ColorPalette>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const deviceColorScheme = useColorScheme() as ColorTheme | null;
  const [theme, setThemeState] = useState<ColorTheme>(
    deviceColorScheme || "light",
  );
  const [themePreference, setThemePreference] =
    useState<ThemePreference>("system");
  const [colorPalette, setColorPaletteState] = useState<PaletteKey>("default");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Separate fast UI update from slower storage operation using our cache
  const updateTheme = useCallback(
    (newTheme: ThemePreference) => {
      // Update UI immediately
      if (newTheme === "system") {
        setThemeState(deviceColorScheme || "light");
      } else {
        setThemeState(newTheme as ColorTheme);
      }
      setThemePreference(newTheme);

      // Save preference in the background with caching
      storageCache.setItem(THEME_PREFERENCE_KEY, newTheme).catch((error) => {
        console.log("Error saving theme preference:", error);
      });
    },
    [deviceColorScheme],
  );

  const updateColorPalette = useCallback((newPalette: PaletteKey) => {
    setColorPaletteState(newPalette);
    storageCache.setItem(COLOR_PALETTE_KEY, newPalette).catch((error) => {
      console.log("Error saving color palette preference:", error);
    });
  }, []);

  // Load saved theme and palette preferences using cache
  useEffect(() => {
    let isMounted = true;

    const loadPreferences = async () => {
      try {
        // Load theme preference
        const savedTheme = await storageCache.getItem(THEME_PREFERENCE_KEY);
        const savedPalette = await storageCache.getItem(COLOR_PALETTE_KEY);

        if (!isMounted) return;

        if (savedTheme !== null) {
          setThemePreference(savedTheme as ThemePreference);
          if (savedTheme === "system") {
            setThemeState(deviceColorScheme || "light");
          } else {
            setThemeState(savedTheme as ColorTheme);
          }
        } else {
          setThemePreference("system");
          setThemeState(deviceColorScheme || "light");
        }

        if (savedPalette !== null && savedPalette in colorPalettes) {
          setColorPaletteState(savedPalette as PaletteKey);
        }
      } catch (error) {
        console.log("Error loading preferences:", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadPreferences();

    // Setup AppState listener to refresh system theme when app comes to foreground
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active" && themePreference === "system") {
        const currentColorScheme =
          Appearance.getColorScheme() as ColorTheme | null;
        if (currentColorScheme && currentColorScheme !== theme) {
          setThemeState(currentColorScheme);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    if (deviceColorScheme && themePreference === "system") {
      setThemeState(deviceColorScheme);
    }
  }, [deviceColorScheme, themePreference]);

  const setTheme = (newTheme: ThemePreference) => {
    updateTheme(newTheme);
  };

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    updateTheme(newTheme);
  };

  const setSystemTheme = () => {
    updateTheme("system");
  };

  const setColorPalette = (newPalette: PaletteKey) => {
    updateColorPalette(newPalette);
  };

  const themeColors = colorPalettes[colorPalette][theme];

  const contextValue: ThemeContextType = {
    theme,
    colors: themeColors,
    isLoading,
    toggleTheme,
    setTheme,
    setSystemTheme,
    themePreference,
    colorPalette,
    setColorPalette,
    availablePalettes: colorPalettes,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

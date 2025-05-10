import {
  ColorPalette,
  colorPalettes,
  ColorTheme,
  ThemeColors,
} from "@/theme/color";
import { storageCache } from "@/utils/storageCache";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  Appearance,
  AppState,
  InteractionManager,
  useColorScheme,
} from "react-native";

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
  // Use React 18 transitions for non-blocking UI updates
  const [isPending, startTransition] = useTransition();

  // Use refs to track previous values and avoid redundant updates
  const prevThemeRef = useRef<ThemePreference>(themePreference);
  const prevPaletteRef = useRef<PaletteKey>(colorPalette);
  const pendingThemeUpdate = useRef<NodeJS.Timeout | null>(null);
  const pendingPaletteUpdate = useRef<NodeJS.Timeout | null>(null);

  // Optimized theme update using React 18 transitions
  const updateTheme = useCallback(
    (newTheme: ThemePreference) => {
      // Skip if the theme is not changing
      if (newTheme === prevThemeRef.current) {
        return;
      }

      // Update our ref to avoid redundant updates
      prevThemeRef.current = newTheme;

      // Clear any pending update
      if (pendingThemeUpdate.current) {
        clearTimeout(pendingThemeUpdate.current);
      }

      // Update UI states immediately to improve perceived performance
      if (newTheme === "system") {
        setThemeState(deviceColorScheme || "light");
      } else {
        setThemeState(newTheme as ColorTheme);
      }

      // Use startTransition to mark state updates as non-urgent
      startTransition(() => {
        setThemePreference(newTheme);

        // Debounce storage operations to prevent jank during rapid changes
        pendingThemeUpdate.current = setTimeout(() => {
          InteractionManager.runAfterInteractions(() => {
            storageCache
              .setItem(THEME_PREFERENCE_KEY, newTheme)
              .catch((error) => {
                console.log("Error saving theme preference:", error);
              });
          });
        }, 300);
      });
    },
    [deviceColorScheme, startTransition],
  );

  const updateColorPalette = useCallback(
    (newPalette: PaletteKey) => {
      // Skip if not changing
      if (newPalette === prevPaletteRef.current) {
        return;
      }

      // Update ref to avoid redundant updates
      prevPaletteRef.current = newPalette;

      // Clear any pending update
      if (pendingPaletteUpdate.current) {
        clearTimeout(pendingPaletteUpdate.current);
      }

      // Update UI state immediately
      setColorPaletteState(newPalette);

      // Use startTransition for non-urgent updates
      startTransition(() => {
        // Debounce storage operations
        pendingPaletteUpdate.current = setTimeout(() => {
          InteractionManager.runAfterInteractions(() => {
            storageCache
              .setItem(COLOR_PALETTE_KEY, newPalette)
              .catch((error) => {
                console.log("Error saving color palette preference:", error);
              });
          });
        }, 300);
      });
    },
    [startTransition],
  );

  useEffect(() => {
    let isMounted = true;

    const loadPreferences = async () => {
      try {
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

  // Memoize theme colors to prevent unnecessary re-calculations
  const themeColors = useMemo(
    () => colorPalettes[colorPalette][theme],
    [colorPalette, theme],
  );

  // Use useMemo to avoid unnecessary re-renders of consuming components
  const contextValue = useMemo(
    () => ({
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
    }),
    [theme, themeColors, isLoading, toggleTheme, themePreference, colorPalette],
  );

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

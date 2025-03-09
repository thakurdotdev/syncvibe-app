import React from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  StyleSheet,
  PressableProps,
  ViewStyle,
  TextStyle,
  StyleProp,
} from "react-native";

// Types for button variants
type ButtonVariant = "solid" | "outline" | "link";
type ButtonSize = "xs" | "sm" | "md" | "lg" | "xl";
type ButtonAction =
  | "primary"
  | "secondary"
  | "positive"
  | "negative"
  | "default";

// Types for style props
interface StyleProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  action?: ButtonAction;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

interface ButtonProps extends PressableProps, StyleProps {
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

interface ButtonTextProps {
  style?: StyleProp<TextStyle>;
  children?: React.ReactNode;
}

interface ButtonIconProps {
  size?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

interface ButtonGroupProps {
  space?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
  isAttached?: boolean;
  flexDirection?: "row" | "column" | "row-reverse" | "column-reverse";
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

// Button component
const Button = React.forwardRef<Pressable, ButtonProps>(
  (
    {
      children,
      variant = "solid",
      size = "md",
      action = "primary",
      disabled = false,
      isLoading = false,
      leftIcon,
      rightIcon,
      style,
      ...props
    },
    ref,
  ) => {
    // Get base style for button based on props
    const buttonStyle = getButtonStyle({ variant, size, action, disabled });

    return (
      <Pressable
        ref={ref}
        disabled={disabled || isLoading}
        style={({ pressed, hovered }: any) => [
          buttonStyle.base,
          pressed && buttonStyle.pressed,
          hovered && buttonStyle.hovered,
          style,
        ]}
        {...props}
      >
        <View style={styles.buttonContent}>
          {isLoading && (
            <ActivityIndicator
              size="small"
              color={getSpinnerColor({ variant, action })}
              style={styles.spinner}
            />
          )}

          {!isLoading && leftIcon && (
            <View style={styles.iconContainer}>{leftIcon}</View>
          )}

          {children}

          {!isLoading && rightIcon && (
            <View style={styles.iconContainer}>{rightIcon}</View>
          )}
        </View>
      </Pressable>
    );
  },
);

// Button Text component
const ButtonText = React.forwardRef<Text, ButtonTextProps>(
  ({ children, style, ...props }, ref) => {
    return (
      <Text ref={ref} style={[styles.text, style]} {...props}>
        {children}
      </Text>
    );
  },
);

// Button Icon component
const ButtonIcon = React.forwardRef<View, ButtonIconProps>(
  ({ children, size, style, ...props }, ref) => {
    return (
      <View
        ref={ref}
        style={[styles.icon, size && { width: size, height: size }, style]}
        {...props}
      >
        {children}
      </View>
    );
  },
);

// Button Group component
const ButtonGroup = React.forwardRef<View, ButtonGroupProps>(
  (
    {
      children,
      space = "md",
      isAttached = false,
      flexDirection = "row",
      style,
      ...props
    },
    ref,
  ) => {
    const getSpacing = () => {
      if (isAttached) return 0;

      const spacings: Record<string, number> = {
        xs: 4,
        sm: 8,
        md: 12,
        lg: 16,
        xl: 20,
        "2xl": 24,
        "3xl": 28,
        "4xl": 32,
      };

      return spacings[space] || 12;
    };

    return (
      <View
        ref={ref}
        style={[
          {
            flexDirection: flexDirection,
            gap: getSpacing(),
          },
          style,
        ]}
        {...props}
      >
        {children}
      </View>
    );
  },
);

// Helper functions for styles
function getButtonStyle({ variant, size, action, disabled }: StyleProps) {
  // Base styles for all buttons
  const base: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    opacity: disabled ? 0.4 : 1,
    ...getSizeStyle(size),
    ...getVariantStyle(variant, action),
  };

  // Pressed state styles
  const pressed: ViewStyle = {
    ...getPressedStyle(variant, action),
  };

  // Hovered state styles (for web)
  const hovered: ViewStyle = {
    ...getHoveredStyle(variant, action),
  };

  return { base, pressed, hovered };
}

function getSizeStyle(size?: ButtonSize): ViewStyle {
  const sizes: Record<ButtonSize, ViewStyle> = {
    xs: { paddingHorizontal: 14, height: 32 },
    sm: { paddingHorizontal: 16, height: 36 },
    md: { paddingHorizontal: 20, height: 40 },
    lg: { paddingHorizontal: 24, height: 44 },
    xl: { paddingHorizontal: 28, height: 48 },
  };

  return sizes[size || "md"];
}

function getVariantStyle(
  variant?: ButtonVariant,
  action?: ButtonAction,
): ViewStyle {
  if (variant === "link") {
    return {
      backgroundColor: "transparent",
      paddingHorizontal: 0,
    };
  }

  if (variant === "outline") {
    return {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: getActionColor(action),
    };
  }

  // Solid variant (default)
  return {
    backgroundColor: getActionColor(action),
  };
}

function getActionColor(action?: ButtonAction): string {
  const colors: Record<ButtonAction, string> = {
    primary: "#6366F1", // Primary color
    secondary: "#94A3B8", // Secondary color
    positive: "#22C55E", // Success color
    negative: "#EF4444", // Error color
    default: "transparent",
  };

  return colors[action || "primary"];
}

function getPressedStyle(
  variant?: ButtonVariant,
  action?: ButtonAction,
): ViewStyle {
  if (variant === "link") {
    return {
      backgroundColor: "transparent",
    };
  }

  if (variant === "outline") {
    return {
      backgroundColor: "rgba(0, 0, 0, 0.05)",
    };
  }

  // Darken the background color for solid buttons
  const baseColor = getActionColor(action);
  // This is a simple darkening - in a real app you might want a more sophisticated approach
  return {
    backgroundColor: darkenColor(baseColor, 0.2),
  };
}

function getHoveredStyle(
  variant?: ButtonVariant,
  action?: ButtonAction,
): ViewStyle {
  if (variant === "link") {
    return {
      backgroundColor: "transparent",
    };
  }

  if (variant === "outline") {
    return {
      backgroundColor: "rgba(0, 0, 0, 0.03)",
    };
  }

  // Slightly darken the background color for solid buttons
  const baseColor = getActionColor(action);
  return {
    backgroundColor: darkenColor(baseColor, 0.1),
  };
}

function getSpinnerColor({ variant, action }: StyleProps): string {
  if (variant === "solid") {
    return "#ffffff"; // White for solid buttons
  }

  return getActionColor(action); // Use the action color for other variants
}

// Utility function to darken a color
function darkenColor(color: string, amount: number): string {
  // For transparent, we can't darken
  if (color === "transparent") return color;

  // This is a simple implementation - in a real app you'd want to use a proper color library
  // For example, you could use 'color' npm package in a real app
  return color; // Simplified for this example
}

// Base styles
const styles = StyleSheet.create({
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontWeight: "600",
    fontSize: 16,
    color: "#ffffff", // Default text color - should be overridden based on variant/action
  },
  icon: {
    width: 18,
    height: 18,
  },
  iconContainer: {
    marginHorizontal: 8,
  },
  spinner: {
    marginRight: 8,
  },
});

Button.displayName = "Button";
ButtonText.displayName = "ButtonText";
ButtonIcon.displayName = "ButtonIcon";
ButtonGroup.displayName = "ButtonGroup";

export { Button, ButtonText, ButtonIcon, ButtonGroup };

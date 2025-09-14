import React from 'react';
import {
  View,
  Text,
  StyleProp,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
  TouchableOpacityProps,
  Platform,
  Pressable,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

// Card variants
export type CardVariant = 'default' | 'outline' | 'secondary' | 'ghost';

export interface CardProps {
  variant?: CardVariant;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  className?: string; // Optional className prop for styling
}

// Card Header Props
export interface CardHeaderProps {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  className?: string; // Optional className prop for styling
}

// Card Title Props
export interface CardTitleProps {
  style?: StyleProp<TextStyle>;
  children?: React.ReactNode;
  className?: string; // Optional className prop for styling
}

// Card Description Props
export interface CardDescriptionProps {
  style?: StyleProp<TextStyle>;
  children?: React.ReactNode;
  className?: string; // Optional className prop for styling
}

// Card Content Props
export interface CardContentProps {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  className?: string; // Optional className prop for styling
}

// Card Footer Props
export interface CardFooterProps {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  className?: string; // Optional className prop for styling
}

// CardAction Props (extends TouchableOpacityProps for better DX)
export interface CardActionProps extends TouchableOpacityProps {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  className?: string; // Optional className prop for styling
}

// Main Card Component
export const Card: React.FC<CardProps> = ({
  variant = 'default',
  style,
  children,
  className,
  ...props
}) => {
  const { colors } = useTheme();

  // Generate styles for different card variants
  const getVariantStyles = () => {
    switch (variant) {
      case 'default':
        return {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderWidth: 1,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderColor: colors.border,
          borderWidth: 1,
        };
      case 'secondary':
        return {
          backgroundColor: colors.secondary,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
        };
      default:
        return {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderWidth: 1,
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <View
      style={{
        backgroundColor: variantStyles.backgroundColor,
        borderColor: variantStyles.borderColor,
        borderWidth: variantStyles.borderWidth,
        ...(style as any),
      }}
      {...props}
      className={cn('rounded-lg overflow-hidden', className)}
    >
      {children}
    </View>
  );
};

// Card Header Component
export const CardHeader: React.FC<CardHeaderProps> = ({ style, children, className }) => {
  return (
    <View style={style} className={cn('p-4 pb-0', className)}>
      {children}
    </View>
  );
};

// Card Title Component
export const CardTitle: React.FC<CardTitleProps> = ({ style, children, className }) => {
  const { colors } = useTheme();

  return (
    <Text
      style={{
        color: colors.cardForeground,
        ...(style as any),
      }}
      className={cn('text-lg font-semibold mb-1', className)}
    >
      {children}
    </Text>
  );
};

// Card Description Component
export const CardDescription: React.FC<CardDescriptionProps> = ({ style, children, className }) => {
  const { colors } = useTheme();

  return (
    <Text
      style={{
        color: colors.mutedForeground,
        ...(style as any),
      }}
      className={cn('text-sm mb-2', className)}
    >
      {children}
    </Text>
  );
};

// Card Content Component
export const CardContent: React.FC<CardContentProps> = ({ style, children, className }) => {
  return (
    <View style={style} className={cn('p-4 pt-2', className)}>
      {children}
    </View>
  );
};

// Card Footer Component
export const CardFooter: React.FC<CardFooterProps> = ({ style, children, className }) => {
  return (
    <View style={style} className={cn('p-4 pt-0 flex-row justify-end gap-2', className)}>
      {children}
    </View>
  );
};

// Card Action Component
export const CardAction: React.FC<CardActionProps> = ({ style, children, className, ...props }) => {
  const { theme } = useTheme();

  // Get ripple color for Android
  const getRippleColor = () => {
    return Platform.select({
      android: theme === 'light' ? '#00000010' : '#FFFFFF10', // 10% opacity
      default: 'transparent',
    });
  };

  // Use Pressable on Android for ripple effect, TouchableOpacity on iOS
  const ActionComponent = Platform.OS === 'android' ? Pressable : TouchableOpacity;

  // Android-specific props
  const androidProps =
    Platform.OS === 'android'
      ? {
          android_ripple: {
            color: getRippleColor(),
            borderless: false,
            foreground: true,
          },
        }
      : {};

  return (
    <ActionComponent
      style={style}
      className={cn('rounded-md overflow-hidden', className)}
      {...androidProps}
      {...props}
    >
      {children}
    </ActionComponent>
  );
};

// Default exports for each component
export default Object.assign(Card, {
  Header: CardHeader,
  Title: CardTitle,
  Description: CardDescription,
  Content: CardContent,
  Footer: CardFooter,
  Action: CardAction,
});

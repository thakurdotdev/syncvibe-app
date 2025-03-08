import React from 'react';
import { StyleProp, TextStyle, ViewStyle } from 'react-native';
export type BubbleProps = {
    /**
     * background color of the bubble
     */
    color?: string;
    /**
     * the style for the container view
     */
    containerStyle?: StyleProp<ViewStyle>;
    /**
     * the style for the TextInput inside bubble
     */
    textStyle?: StyleProp<TextStyle>;
    textColor?: string;
    bubbleMaxWidth?: number;
};
/**
 * a component to show text inside a bubble
 */
export type BubbleRef = {
    setText: (text: string) => void;
};
export declare const BubbleComponent: React.ForwardRefExoticComponent<BubbleProps & React.RefAttributes<BubbleRef>>;
export declare const Bubble: React.MemoExoticComponent<React.ForwardRefExoticComponent<BubbleProps & React.RefAttributes<BubbleRef>>>;
//# sourceMappingURL=ballon.d.ts.map
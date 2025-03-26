import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";

const { height } = Dimensions.get("window");

interface SwipeableModalProps {
  isVisible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  backgroundColor?: string;
  maxHeight?: number | "auto" | `${number}%`;
  hideHandle?: boolean;
  backdropOpacity?: number;
  style?: ViewStyle;
  scrollable?: boolean;
  useScrollView?: boolean;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

const SwipeableModal: React.FC<SwipeableModalProps> = ({
  isVisible,
  onClose,
  children,
  backgroundColor = "#18181B",
  maxHeight = height * 0.8,
  hideHandle = false,
  backdropOpacity = 0.6,
  style,
  scrollable = false,
  useScrollView = false,
  onScroll,
}) => {
  const [modalVisible, setModalVisible] = useState(isVisible);
  const [isAtScrollTop, setIsAtScrollTop] = useState(true);
  const panY = useRef(new Animated.Value(0)).current;
  const translateY = panY.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [0, 0, 1],
  });

  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (isVisible) {
      setModalVisible(true);
      Animated.spring(panY, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    } else {
      const timer = setTimeout(() => {
        setModalVisible(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  const resetPositionAnim = Animated.timing(panY, {
    toValue: 0,
    duration: 300,
    useNativeDriver: true,
  });

  const closeAnim = Animated.timing(panY, {
    toValue: height,
    duration: 300,
    useNativeDriver: true,
  });

  // Update the handleScroll function to be more reliable
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    // Only update isAtScrollTop if the offset has actually changed
    if ((offsetY <= 0 && !isAtScrollTop) || (offsetY > 0 && isAtScrollTop)) {
      setIsAtScrollTop(offsetY <= 0);
    }

    // Pass the scroll event to the parent component if needed
    if (onScroll) {
      onScroll(event);
    }
  };

  // Adjust panResponder to work better with nested scrolling
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      // Only allow modal swiping if we're at the top of the scroll content
      // or if the gesture is primarily horizontal
      const isVerticalSwipe =
        Math.abs(gestureState.dy) > Math.abs(gestureState.dx);

      // For FlatList content, we rely on the isAtScrollTop state
      if (
        scrollable &&
        !isAtScrollTop &&
        isVerticalSwipe &&
        gestureState.dy < 0
      ) {
        return false; // Moving up when not at top, let the FlatList handle it
      }

      // Allow swipe down when at top of scroll content
      if (isVerticalSwipe && gestureState.dy > 0) {
        return isAtScrollTop || gestureState.dy > 10; // Add a small threshold for pull-down
      }

      return isVerticalSwipe;
    },
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) {
        panY.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy > 100) {
        closeAnim.start(() => handleCloseModal());
      } else {
        resetPositionAnim.start();
      }
    },
  });

  const handleCloseModal = () => {
    setModalVisible(false);
    onClose();
  };

  const backdropStyle = {
    backgroundColor: `rgba(0, 0, 0, ${backdropOpacity})`,
  };

  const containerStyle = {
    backgroundColor,
    maxHeight,
  };

  if (!modalVisible) {
    return null;
  }

  // Wrapper for the content based on whether it's scrollable
  const contentWrapper = (content: React.ReactNode) => {
    // If the content isn't scrollable or we're explicitly told not to use ScrollView,
    // return the content directly. This is useful for FlatLists which are already scrollable.
    if (!scrollable || !useScrollView) return content;

    // Only wrap in ScrollView when explicitly asked to do so
    return (
      <ScrollView
        ref={scrollViewRef}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {content}
      </ScrollView>
    );
  };

  return (
    <Modal
      visible={modalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleCloseModal}
    >
      <View style={styles.modalContainer}>
        <TouchableOpacity
          style={[styles.backdropTouchable, backdropStyle]}
          activeOpacity={1}
          onPress={handleCloseModal}
        />
        <Animated.View
          style={[
            styles.drawerContainer,
            containerStyle,
            { transform: [{ translateY }] },
            style,
          ]}
          {...(scrollable && !useScrollView ? {} : panResponder.panHandlers)}
        >
          {!hideHandle && (
            <View style={styles.handleContainer} {...panResponder.panHandlers}>
              <View style={styles.handle} />
            </View>
          )}
          {contentWrapper(children)}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdropTouchable: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  drawerContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 30,
    width: "100%",
  },
  handleContainer: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 8,
    zIndex: 10,
  },
  handle: {
    width: 48,
    height: 4,
    backgroundColor: "#52525B",
    borderRadius: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});

export default SwipeableModal;

import { useThemeColor } from "@/hooks/useThemeColor";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

interface InlineTimePickerProps {
  selectedValue: number;
  onValueChange: (value: number) => void;
  onConfirm?: () => void;
  options: { label: string; value: number }[];
  width?: number;
  height?: number;
  fontSize?: number;
  itemHeight?: number;
}

export default function InlineTimePicker({
  selectedValue,
  onValueChange,
  onConfirm,
  options,
  width = 150,
  height = 180,
  fontSize = 80,
  itemHeight,
}: InlineTimePickerProps) {
  const colors = useThemeColor();
  const ITEM_HEIGHT = itemHeight ?? Math.round(fontSize * 1.4);
  const actualHeight = Math.min(height, ITEM_HEIGHT * 3);
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<any>(null);
  const lastEmittedValue = useRef(selectedValue);
  const currentCenterIndex = useRef(
    Math.max(
      0,
      options.findIndex((o) => o.value === selectedValue),
    ),
  );

  const verticalPadding = (actualHeight - ITEM_HEIGHT) / 2;

  const wheelData = options.map((opt) => ({
    value: opt.value,
    label: opt.label
      .replace(" minutes", "")
      .replace(" minute", "")
      .replace(" min", "")
      .trim(),
  }));

  // Scroll to initial value on mount
  useEffect(() => {
    const idx = options.findIndex((opt) => opt.value === selectedValue);
    const safeIdx = idx >= 0 ? idx : 0;
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: safeIdx * ITEM_HEIGHT,
        animated: false,
      });
    }, 50);
  }, []);

  // Only scroll if selectedValue changed externally
  useEffect(() => {
    if (selectedValue === lastEmittedValue.current) return;
    lastEmittedValue.current = selectedValue;
    const idx = options.findIndex((opt) => opt.value === selectedValue);
    if (idx >= 0) {
      scrollViewRef.current?.scrollTo({
        y: idx * ITEM_HEIGHT,
        animated: true,
      });
    }
  }, [selectedValue]);

  // Simple handler: just read final position, no corrective scrolls
  const isHandled = useRef(false);

  const handleScrollSettled = useCallback(
    (e: any) => {
      if (isHandled.current) return;
      isHandled.current = true;

      const offsetY = e.nativeEvent.contentOffset.y;
      const index = Math.round(offsetY / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(index, options.length - 1));
      currentCenterIndex.current = clampedIndex;

      const newValue = options[clampedIndex]?.value;
      if (newValue != null && newValue !== lastEmittedValue.current) {
        lastEmittedValue.current = newValue;
        onValueChange(newValue);
      }

      // Reset guard after a short delay for next gesture
      setTimeout(() => {
        isHandled.current = false;
      }, 100);
    },
    [options, onValueChange, ITEM_HEIGHT],
  );

  const handleItemPress = useCallback(
    (index: number) => {
      if (index === currentCenterIndex.current) {
        // Tapped the center item → confirm
        onConfirm?.();
      } else {
        // Tapped an off-center item → scroll to it
        scrollViewRef.current?.scrollTo({
          y: index * ITEM_HEIGHT,
          animated: true,
        });
        currentCenterIndex.current = index;
        const newValue = options[index]?.value;
        if (newValue != null) {
          lastEmittedValue.current = newValue;
          onValueChange(newValue);
        }
      }
    },
    [onConfirm, onValueChange, options, ITEM_HEIGHT],
  );

  return (
    <View style={[styles.container, { width, height: actualHeight }]}>
      {/* Selection indicator lines */}
      <View
        style={[
          styles.selectionLine,
          {
            top: verticalPadding,
            width: width * 0.7,
            borderColor: colors.primary,
          },
        ]}
        pointerEvents="none"
      />
      <View
        style={[
          styles.selectionLine,
          {
            top: verticalPadding + ITEM_HEIGHT,
            width: width * 0.7,
            borderColor: colors.primary,
          },
        ]}
        pointerEvents="none"
      />

      <Animated.ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        bounces={false}
        nestedScrollEnabled={true}
        overScrollMode="never"
        onMomentumScrollEnd={handleScrollSettled}
        onScrollEndDrag={handleScrollSettled}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingTop: verticalPadding,
          paddingBottom: verticalPadding,
        }}
      >
        {wheelData.map((item, index) => {
          // Optimization: Only animate/show ±1 neighbor.
          // Hide everything else with 0 opacity to save resources.
          const center = index * ITEM_HEIGHT;
          const dz = ITEM_HEIGHT * 0.2; // 20% dead zone for solid feel
          const inputRange = [
            center - ITEM_HEIGHT * 1.5, // Far above
            center - ITEM_HEIGHT, // Direct neighbor above
            center - dz, // Entering center zone
            center, // Dead center
            center + dz, // Leaving center zone
            center + ITEM_HEIGHT, // Direct neighbor below
            center + ITEM_HEIGHT * 1.5, // Far below
          ];

          const scale = scrollY.interpolate({
            inputRange,
            outputRange: [0.4, 0.75, 1, 1, 1, 0.75, 0.4],
            extrapolate: "clamp",
          });

          const opacity = scrollY.interpolate({
            inputRange,
            outputRange: [0, 0.4, 1, 1, 1, 0.4, 0],
            extrapolate: "clamp",
          });

          const rotateX = scrollY.interpolate({
            inputRange,
            outputRange: [
              "60deg",
              "45deg",
              "0deg",
              "0deg",
              "0deg",
              "-45deg",
              "-60deg",
            ],
            extrapolate: "clamp",
          });

          return (
            <Pressable key={item.value} onPress={() => handleItemPress(index)}>
              <Animated.View
                style={[
                  styles.itemContainer,
                  {
                    height: ITEM_HEIGHT,
                    transform: [{ scale }, { perspective: 600 }, { rotateX }],
                    opacity,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.itemText,
                    {
                      fontSize,
                      color: colors.text.primary,
                    },
                  ]}
                >
                  {item.label}
                </Text>
              </Animated.View>
            </Pressable>
          );
        })}
      </Animated.ScrollView>

      {/* Top gradient fade */}
      <LinearGradient
        colors={[colors.background, "transparent"]}
        style={[styles.gradient, { top: 0, height: actualHeight * 0.3, width }]}
        pointerEvents="none"
      />
      {/* Bottom gradient fade */}
      <LinearGradient
        colors={["transparent", colors.background]}
        style={[
          styles.gradient,
          { bottom: 0, height: actualHeight * 0.3, width },
        ]}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  itemContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  itemText: {
    fontFamily: "Outfit_500Medium",
    fontVariant: ["tabular-nums"],
    textAlign: "right",
  },
  selectionLine: {
    position: "absolute",
    alignSelf: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.15)",
    zIndex: 2,
  },
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 3,
  },
});

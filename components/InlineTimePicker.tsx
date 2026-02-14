import { useThemeColor } from "@/hooks/useThemeColor";
import WheelPicker from "@quidone/react-native-wheel-picker";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";

interface InlineTimePickerProps {
  selectedValue: number;
  onValueChange: (value: number) => void;
  options: { label: string; value: number }[];
  width?: number;
  height?: number;
  fontSize?: number;
  itemHeight?: number;
}

export default function InlineTimePicker({
  selectedValue,
  onValueChange,
  options,
  width = 150,
  height = 180,
  fontSize = 80,
  itemHeight = 90,
}: InlineTimePickerProps) {
  const colors = useThemeColor();

  // Transform labels for display (e.g. "20 minutes" -> "20") - Just show Number
  const wheelData = options.map((opt) => ({
    value: opt.value,
    label: opt.label
      .replace(" minutes", "")
      .replace(" minute", "")
      .replace(" min", "")
      .trim(),
  }));

  // Find current index
  const currentIndex = options.findIndex((opt) => opt.value === selectedValue);
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;

  return (
    <View style={[styles.container, { width, height }]}>
      <WheelPicker
        data={wheelData}
        value={options[safeIndex].value}
        onValueChanged={({ item: { value } }) => {
          onValueChange(value);
        }}
        style={{ width, height }}
        itemHeight={itemHeight}
        itemTextStyle={{
          color: colors.text.primary,
          fontSize: fontSize, // Dynamic font size
          fontFamily: "Outfit_500Medium",
          fontVariant: ["tabular-nums"], // fixed width numbers
          textAlign: "right",
        }}
        overlayItemStyle={{
          backgroundColor: "transparent",
        }}
      />
      <LinearGradient
        colors={[colors.background, "transparent"]}
        style={[
          styles.gradient,
          { top: 0, height: height * 0.3, width: width },
        ]}
        pointerEvents="none"
      />
      <LinearGradient
        colors={["transparent", colors.background]}
        style={[
          styles.gradient,
          { bottom: 0, height: height * 0.3, width: width },
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
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 1,
  },
});

export type ColorValue = string;

export type Colors = {
  primary: ColorValue;
  secondary: ColorValue;
  background: ColorValue;
  card: ColorValue;
  text: {
    primary: ColorValue;
    secondary: ColorValue;
    light: ColorValue;
  };
  border: ColorValue;
  success: ColorValue;
  warning: ColorValue;
  error: ColorValue;
  inactive: ColorValue;
};

const lightColors: Colors = {
  primary: "#4ECDC4",
  secondary: "#FF6B6B",
  background: "#F7F8FA",
  card: "#FFFFFF",
  text: {
    primary: "#2C3E50",
    secondary: "#666666",
    light: "#999999",
  },
  border: "#E0E0E0",
  success: "#2ECC71",
  warning: "#F39C12",
  error: "#E74C3C",
  inactive: "#CCCCCC",
};

const darkColors: Colors = {
  primary: "#4ECDC4", // Keep brand color or adjust slightly
  secondary: "#FF6B6B",
  background: "#121212",
  card: "#1E1E1E",
  text: {
    primary: "#ECF0F1",
    secondary: "#BDC3C7",
    light: "#7F8C8D",
  },
  border: "#333333",
  success: "#2ECC71",
  warning: "#F39C12",
  error: "#E74C3C",
  inactive: "#555555",
};

export { darkColors, lightColors };
export default lightColors; // Fallback for legacy imports until refactored

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

export default {
  primary: '#4ECDC4',
  secondary: '#FF6B6B',
  background: '#F7F8FA',
  card: '#FFFFFF',
  text: {
    primary: '#2C3E50',
    secondary: '#666666',
    light: '#999999',
  },
  border: '#E0E0E0',
  success: '#2ECC71',
  warning: '#F39C12',
  error: '#E74C3C',
  inactive: '#CCCCCC',
} satisfies Colors;
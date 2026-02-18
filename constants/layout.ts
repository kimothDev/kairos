import { DimensionValue } from "react-native";

/**
 * Layout Constants
 *
 * Centralized values for spacing, border radii, and other layout-related
 * tokens to ensure UI consistency and avoid magic numbers.
 */

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  p2: "2%" as DimensionValue,
  p4: "4%" as DimensionValue,
  p5: "5%" as DimensionValue,
  p10: "10%" as DimensionValue,
  p15: "15%" as DimensionValue,
  p20: "20%" as DimensionValue,
  p25: "25%" as DimensionValue,
};

export const RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
};

export const TYPOGRAPHY = {
  size: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 20,
    title: 24,
  },
};

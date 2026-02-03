import { Colors, darkColors, lightColors } from "@/constants/colors";
import { useThemeStore } from "@/store/themeStore";
import { useColorScheme } from "react-native";

export function useThemeColor(): Colors {
  const themeMode = useThemeStore((state) => state.themeMode);
  const systemScheme = useColorScheme();

  if (themeMode === "system") {
    return systemScheme === "dark" ? darkColors : lightColors;
  }

  return themeMode === "dark" ? darkColors : lightColors;
}

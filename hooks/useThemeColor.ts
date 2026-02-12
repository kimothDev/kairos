import { Colors, darkColors, lightColors } from "@/constants/colors";
import { useColorScheme } from "react-native";
import { useThemeStore } from "../store/themeStore";

export function useThemeColor(): Colors {
  const themeMode = useThemeStore((state) => state.themeMode);
  const systemScheme = useColorScheme();

  if (themeMode === "system") {
    return systemScheme === "dark" ? darkColors : lightColors;
  }

  return themeMode === "dark" ? darkColors : lightColors;
}

export function useIsDark(): boolean {
  const themeMode = useThemeStore((state) => state.themeMode);
  const systemScheme = useColorScheme();

  if (themeMode === "system") {
    return systemScheme === "dark";
  }

  return themeMode === "dark";
}

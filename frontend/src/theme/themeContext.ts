import { createContext } from "react";
import { themes } from "./colors";

export type ThemeMode = "light" | "system" | "dark";

export type ThemeContextType = {
  mode: ThemeMode;
  currentTheme: typeof themes.light;
  toggleMode: (mode: ThemeMode) => void;
  lightMode: boolean;
  darkMode: boolean;
};

export const ThemeContext = createContext<ThemeContextType>({
  mode: "system",
  currentTheme: themes.light,
  toggleMode: () => {},
  lightMode: false,
  darkMode: false,
});

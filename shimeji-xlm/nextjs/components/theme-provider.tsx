"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";

export type Theme = "neural" | "pink" | "kawaii" | "pastel";

export const THEMES: Theme[] = ["neural", "pink", "kawaii", "pastel"];

const SESSION_LAST_THEME_KEY = "shimeji-theme-last";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("neural");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme") as Theme | null;
    const resolved =
      current && THEMES.includes(current)
        ? current
        : "neural";
    setThemeState(resolved);
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      sessionStorage.setItem(SESSION_LAST_THEME_KEY, newTheme);
    } catch {
      // Ignore storage failures (private mode, blocked storage, etc.)
    }
    document.documentElement.setAttribute("data-theme", newTheme);
    document.body.setAttribute("data-theme", newTheme);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within a ThemeProvider");
  return context;
}

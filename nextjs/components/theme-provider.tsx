"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";

export type Theme = "neural" | "black-pink" | "kawaii" | "pastel";

export const THEMES: Theme[] = ["neural", "black-pink", "kawaii", "pastel"];

const SESSION_LAST_THEME_KEY = "mochi-theme-last";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("kawaii");

  useEffect(() => {
    const currentAttr = document.documentElement.getAttribute("data-theme");
    const current: Theme | null =
      currentAttr === "pink"
        ? "black-pink"
        : THEMES.includes(currentAttr as Theme)
          ? (currentAttr as Theme)
          : null;
    const resolved =
      current
        ? current
        : "kawaii";
    setThemeState(resolved);
    document.documentElement.setAttribute("data-theme", resolved);
    document.body.setAttribute("data-theme", resolved);
    try {
      sessionStorage.setItem(SESSION_LAST_THEME_KEY, resolved);
    } catch {
      // Ignore storage failures (private mode, blocked storage, etc.)
    }
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

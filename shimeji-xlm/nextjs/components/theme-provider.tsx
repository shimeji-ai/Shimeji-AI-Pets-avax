"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";

export type Theme = "neural" | "pink" | "kawaii" | "pastel";

export const THEMES: Theme[] = ["neural", "pink", "kawaii", "pastel"];

const STORAGE_KEY = "shimeji-theme";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("neural");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    const current = document.documentElement.getAttribute("data-theme") as Theme | null;
    const resolved =
      saved && THEMES.includes(saved)
        ? saved
        : current && THEMES.includes(current)
          ? current
          : "neural";
    setThemeState(resolved);
    // Lock in the random theme on first visit
    if (!saved && current) {
      localStorage.setItem(STORAGE_KEY, current);
    }
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
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

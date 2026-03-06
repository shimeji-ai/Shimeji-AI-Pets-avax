"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type Language = "en" | "es";

type LanguageContextValue = {
  language: Language;
  browserLanguage: Language;
  setLanguage: (language: Language) => void;
  isSpanish: boolean;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined
);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [browserLanguage, setBrowserLanguage] = useState<Language>("en");

  useEffect(() => {
    const detectedLanguage =
      typeof navigator !== "undefined" &&
      navigator.language.toLowerCase().startsWith("es")
        ? "es"
        : "en";
    setBrowserLanguage(detectedLanguage);

    const savedLanguage = localStorage.getItem("shimeji-language");
    if (savedLanguage === "en" || savedLanguage === "es") {
      setLanguageState(savedLanguage);
    } else {
      setLanguageState(detectedLanguage);
    }
  }, []);

  function setLanguage(languageValue: Language) {
    setLanguageState(languageValue);
    localStorage.setItem("shimeji-language", languageValue);
  }

  const value = useMemo(
    () => ({
      language,
      browserLanguage,
      setLanguage,
      isSpanish: language === "es",
    }),
    [language, browserLanguage]
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

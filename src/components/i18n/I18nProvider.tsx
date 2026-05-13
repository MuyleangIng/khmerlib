"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, Locale, messages, TranslationKey } from "@/lib/i18n";

type Values = Record<string, string | number>;

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (key: TranslationKey, values?: Values) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function format(text: string, values?: Values) {
  if (!values) return text;
  return text.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? `{${key}}`));
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
      if (saved === "km" || saved === "en") setLocaleState(saved);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((nextLocale: Locale) => {
    localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
    setLocaleState(nextLocale);
  }, []);

  const toggleLocale = useCallback(() => {
    const nextLocale = locale === "km" ? "en" : "km";
    localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
    setLocaleState(nextLocale);
  }, [locale]);

  const t = useCallback((key: TranslationKey, values?: Values) => {
    const text = messages[locale][key] ?? messages[DEFAULT_LOCALE][key] ?? key;
    return format(text, values);
  }, [locale]);

  const value = useMemo(
    () => ({ locale, setLocale, toggleLocale, t }),
    [locale, setLocale, toggleLocale, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used inside I18nProvider");
  }
  return context;
}

export function T({ k, values }: { k: TranslationKey; values?: Values }) {
  const { t } = useI18n();
  return <>{t(k, values)}</>;
}

"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useTransition } from "react";
import en from "@/messages/en.json";
import zhCN from "@/messages/zh-CN.json";

export type Locale = "en" | "zh-CN";

const locales: Record<Locale, typeof en> = {
  "en": en,
  "zh-CN": zhCN,
};

export const localeNames: Record<Locale, string> = {
  "en": "English",
  "zh-CN": "中文",
};

export const localeFlags: Record<Locale, string> = {
  "en": "🇺🇸",
  "zh-CN": "🇨🇳",
};

type NestedKeyOf<T> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object
        ? `${K}` | `${K}.${NestedKeyOf<T[K]>}`
        : `${K}`;
    }[keyof T & string]
  : never;

export type TranslationKey = NestedKeyOf<typeof en>;

export type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TranslateFn;
  isPending: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function getNestedValue(obj: unknown, path: string): string {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current && typeof current === "object" && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return path;
    }
  }
  return typeof current === "string" ? current : path;
}

function interpolate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    params[key] !== undefined ? String(params[key]) : `{${key}}`
  );
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [isClient, setIsClient] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setIsClient(true);
    const saved = localStorage.getItem("locale") as Locale | null;
    if (saved && saved in locales) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    startTransition(() => {
      setLocaleState(newLocale);
      localStorage.setItem("locale", newLocale);
    });
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const messages = locales[locale] || locales["en"];
      const value = getNestedValue(messages, key);
      if (params) {
        return interpolate(value, params);
      }
      return value;
    },
    [locale]
  );

  if (!isClient) {
    return (
      <LanguageContext.Provider
        value={{
          locale: "en",
          setLocale: () => {},
          t: (key: string) => getNestedValue(en, key),
          isPending: false,
        }}
      >
        {children}
      </LanguageContext.Provider>
    );
  }

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, isPending }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

/** Raw hook — returns context (or default) WITHOUT throwing. Use in non-React contexts like column-factories. */
export function useLanguageRaw() {
  const context = useContext(LanguageContext);
  return context ?? { locale: "en" as Locale, setLocale: () => {}, t: (k: string) => getNestedValue(en, k), isPending: false };
}

export { getNestedValue, interpolate };

"use client";

import { createContext, useContext, useMemo, useState } from "react";

import {
  DEFAULT_LOCALE,
  isLocale,
  LOCALE_COOKIE,
  type Locale,
  type MessageKey,
  translate,
} from "@/lib/i18n";

type Ctx = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey) => string;
};

const LocaleContext = createContext<Ctx>({
  locale: DEFAULT_LOCALE,
  setLocale: () => undefined,
  t: (key) => translate(DEFAULT_LOCALE, key),
});

/**
 * The server reads the cookie (or Accept-Language) and passes the result as `initial`, so the
 * first paint is already in the right language. Choosing another one saves a cookie and updates
 * every component that calls `useT()` immediately.
 */
export function LocaleProvider({
  initial,
  children,
}: {
  initial: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initial);
  const value = useMemo<Ctx>(
    () => ({
      locale,
      setLocale(next) {
        if (!isLocale(next)) return;
        setLocaleState(next);
        // One year, whole site, readable by the server on the next request.
        document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
        document.documentElement.lang = next;
      },
      t: (key) => translate(locale, key),
    }),
    [locale],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useT() {
  return useContext(LocaleContext);
}

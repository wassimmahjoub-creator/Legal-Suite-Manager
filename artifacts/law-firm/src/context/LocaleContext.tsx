import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { CurrencyLocale } from "@/lib/currency";
import { authFetch } from "@/lib/authFetch";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
const STORAGE_KEY = "app.locale";

/* ── Types ─────────────────────────────────────────────────── */

type LocaleCtx = {
  locale: CurrencyLocale;
  setLocale: (l: CurrencyLocale) => void;
};

/* ── Context ─────────────────────────────────────────────────── */

const LocaleContext = createContext<LocaleCtx>({ locale: "ar", setLocale: () => {} });

/* ── Hooks ─────────────────────────────────────────────────── */

/** Returns the current locale string ("ar" | "fr"). Backward-compatible. */
export const useLocale = (): CurrencyLocale => useContext(LocaleContext).locale;

/** Returns the setLocale dispatcher. */
export const useSetLocale = (): ((l: CurrencyLocale) => void) => useContext(LocaleContext).setLocale;

/* ── DOM effect ─────────────────────────────────────────────── */

function applyLocale(locale: CurrencyLocale) {
  document.documentElement.dir  = locale === "ar" ? "rtl" : "ltr";
  document.documentElement.lang = locale === "ar" ? "ar-TN" : "fr-TN";
}

/* ── Provider ─────────────────────────────────────────────── */

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<CurrencyLocale>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as CurrencyLocale | null;
    if (stored === "ar" || stored === "fr") return stored;
    return navigator.language.startsWith("fr") ? "fr" : "ar";
  });

  /* Apply dir/lang on every locale change */
  useEffect(() => {
    applyLocale(locale);
  }, [locale]);

  /* On first mount, reconcile with server preference */
  useEffect(() => {
    authFetch(`${BASE}/api/auth/me`)
      .then(r => r.ok ? r.json() : null)
      .then((user: { preferredLocale?: string } | null) => {
        const srv = user?.preferredLocale;
        if (srv === "ar" || srv === "fr") {
          const stored = localStorage.getItem(STORAGE_KEY);
          if (!stored) {
            setLocaleState(srv);
            localStorage.setItem(STORAGE_KEY, srv);
          }
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setLocale(next: CurrencyLocale) {
    setLocaleState(next);
    localStorage.setItem(STORAGE_KEY, next);
    /* Persist to server — fire & forget */
    authFetch(`${BASE}/api/auth/me`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferred_locale: next }),
    }).catch(() => {});
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

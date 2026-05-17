import type { CurrencyLocale } from "@/lib/currency";

/** Always Arabic — the app is 100% AR/RTL. */
export const useLocale = (): CurrencyLocale => "ar";

/** No-op kept for import compatibility. */
export const useSetLocale = (): ((l: CurrencyLocale) => void) => () => {};

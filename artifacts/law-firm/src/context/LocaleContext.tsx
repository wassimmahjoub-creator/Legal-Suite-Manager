import { createContext, useContext } from "react";
import type { CurrencyLocale } from "@/lib/currency";

const LocaleContext = createContext<CurrencyLocale>("ar");

export const useLocale = () => useContext(LocaleContext);
export const LocaleProvider = LocaleContext.Provider;

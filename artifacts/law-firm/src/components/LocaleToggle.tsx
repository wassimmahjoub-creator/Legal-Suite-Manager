import { cn } from "@/lib/utils";
import { useLocale, useSetLocale } from "@/context/LocaleContext";

interface LocaleToggleProps {
  className?: string;
}

/**
 * Pill switch AR | FR.
 * Uses dir="ltr" internally so the layout [AR][FR] is always
 * consistent regardless of the document direction.
 */
export function LocaleToggle({ className }: LocaleToggleProps) {
  const locale = useLocale();
  const setLocale = useSetLocale();

  return (
    <div
      dir="ltr"
      className={cn(
        "flex items-center gap-0.5 rounded-full bg-muted/70 p-0.5",
        className,
      )}
      title={locale === "ar" ? "Basculer en français" : "التبديل إلى العربية"}
    >
      {(["ar", "fr"] as const).map(l => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase transition-all duration-200",
            locale === l
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

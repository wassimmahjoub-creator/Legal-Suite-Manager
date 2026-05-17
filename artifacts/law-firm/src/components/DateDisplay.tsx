import { useLocale } from "@/context/LocaleContext";
import { formatDate, type DateFormat } from "@/lib/date";

interface DateDisplayProps {
  date: Date | string | null | undefined;
  format: DateFormat;
  /** Override the context locale for this instance */
  locale?: "ar" | "fr";
  fallback?: string;
  className?: string;
}

/**
 * Affiche une date formatée selon la locale du contexte (ou une override).
 *
 * @example
 * <DateDisplay date={c.nextHearing} format="long" />
 * <DateDisplay date={log.createdAt} format="datetime" />
 * <DateDisplay date={task.dueDate}  format="relative" />
 */
export function DateDisplay({
  date,
  format,
  locale: localeProp,
  fallback = "—",
  className,
}: DateDisplayProps) {
  const ctxLocale = useLocale();
  const locale = localeProp ?? ctxLocale;

  if (!date) return <span className={className}>{fallback}</span>;

  return (
    <span className={className}>
      {formatDate(date, locale, format)}
    </span>
  );
}

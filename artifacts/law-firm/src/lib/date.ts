/**
 * date.ts — Formatage de dates centralisé pour محامي بلوس
 *
 * Noms des mois en arabe tunisien (Darija) — différents du MSA standard.
 * date-fns "ar" locale utilise مايو au lieu de ماي, etc.
 */

/* ── Dictionnaires Tunisien (AR) ──────────────────────────── */

export const MONTHS_TN = [
  "جانفي",   // 0 – janvier
  "فيفري",   // 1 – février
  "مارس",    // 2 – mars
  "أفريل",   // 3 – avril
  "ماي",     // 4 – mai
  "جوان",    // 5 – juin
  "جويلية",  // 6 – juillet
  "أوت",     // 7 – août   (hamza required)
  "سبتمبر",  // 8 – septembre
  "أكتوبر",  // 9 – octobre (hamza required)
  "نوفمبر",  // 10 – novembre
  "ديسمبر",  // 11 – décembre
] as const;

export const WEEKDAYS_TN = [
  "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت",
] as const;

/* ── Dictionnaires Français (FR) ─────────────────────────── */

const MONTHS_FR = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
] as const;

const WEEKDAYS_FR = [
  "dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi",
] as const;

/* ── Types ────────────────────────────────────────────────── */

export type DateFormat =
  | "full"      // "الجمعة 14 ماي 2026"         / "vendredi 14 mai 2026"
  | "long"      // "14 ماي 2026"                / "14 mai 2026"
  | "short"     // "14/05/2026"                 / "14/05/2026"
  | "time"      // "14:30"                      / "14:30"
  | "datetime"  // "الجمعة 14 ماي 2026 الساعة 14:30" / "vendredi 14 mai 2026 à 14:30"
  | "relative"; // "منذ ساعتين"                / "il y a 2 heures"

/* ── Utilitaires internes ─────────────────────────────────── */

/** Converts any date input to a Date, treating bare ISO date strings (YYYY-MM-DD) as local noon */
function toDate(d: Date | string): Date {
  if (d instanceof Date) return d;
  return new Date(d.length === 10 ? d + "T00:00:00" : d);
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/* ── Formatage relatif (custom — pas date-fns ar qui utilise MSA) ── */

function relativeAR(dt: Date): string {
  const diffMs = dt.getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const isFuture = diffMs > 0;

  const mins  = Math.floor(abs / 60_000);
  const hours = Math.floor(abs / 3_600_000);
  const days  = Math.floor(abs / 86_400_000);

  if (days > 0) {
    if (days === 1) return isFuture ? "غداً" : "أمس";
    if (days === 2) return isFuture ? "بعد يومين" : "منذ يومين";
    return isFuture ? `بعد ${days} أيام` : `منذ ${days} أيام`;
  }
  if (hours > 0) {
    if (hours === 1) return isFuture ? "بعد ساعة" : "منذ ساعة";
    if (hours === 2) return isFuture ? "بعد ساعتين" : "منذ ساعتين";
    return isFuture ? `بعد ${hours} ساعات` : `منذ ${hours} ساعات`;
  }
  if (mins > 0) {
    if (mins === 1)  return isFuture ? "بعد دقيقة" : "منذ دقيقة";
    if (mins === 2)  return isFuture ? "بعد دقيقتين" : "منذ دقيقتين";
    return isFuture ? `بعد ${mins} دقائق` : `منذ ${mins} دقائق`;
  }
  return "الآن";
}

function relativeFR(dt: Date): string {
  const diffMs = dt.getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const isFuture = diffMs > 0;

  const mins  = Math.floor(abs / 60_000);
  const hours = Math.floor(abs / 3_600_000);
  const days  = Math.floor(abs / 86_400_000);

  if (days > 0) {
    if (days === 1) return isFuture ? "demain" : "hier";
    return isFuture ? `dans ${days} jour${days > 1 ? "s" : ""}` : `il y a ${days} jour${days > 1 ? "s" : ""}`;
  }
  if (hours > 0) {
    return isFuture ? `dans ${hours} heure${hours > 1 ? "s" : ""}` : `il y a ${hours} heure${hours > 1 ? "s" : ""}`;
  }
  if (mins > 0) {
    return isFuture ? `dans ${mins} minute${mins > 1 ? "s" : ""}` : `il y a ${mins} minute${mins > 1 ? "s" : ""}`;
  }
  return "maintenant";
}

/* ── API unifiée ──────────────────────────────────────────── */

/**
 * Formate une date selon la locale (fr | ar) et le format souhaité.
 *
 * @example
 * formatDate("2026-05-15", "ar", "long")    // "15 ماي 2026"
 * formatDate("2026-05-15", "fr", "full")    // "vendredi 15 mai 2026"
 * formatDate(new Date(), "ar", "relative")  // "منذ 3 أيام"
 */
export function formatDate(
  date: Date | string | null | undefined,
  locale: "fr" | "ar",
  fmt: DateFormat,
): string {
  if (!date) return "—";
  const dt = toDate(date as Date | string);

  if (fmt === "relative") {
    return locale === "fr" ? relativeFR(dt) : relativeAR(dt);
  }

  const day     = dt.getDate();
  const monthIdx = dt.getMonth();
  const year    = dt.getFullYear();
  const weekday = locale === "fr" ? WEEKDAYS_FR[dt.getDay()] : WEEKDAYS_TN[dt.getDay()];
  const month   = locale === "fr" ? MONTHS_FR[monthIdx] : MONTHS_TN[monthIdx];
  const hh = pad2(dt.getHours());
  const mm = pad2(dt.getMinutes());

  if (fmt === "short")    return `${pad2(day)}/${pad2(monthIdx + 1)}/${year}`;
  if (fmt === "time")     return `${hh}:${mm}`;
  if (fmt === "long")     return `${day} ${month} ${year}`;
  if (fmt === "full")     return `${weekday} ${day} ${month} ${year}`;
  if (fmt === "datetime") {
    return locale === "fr"
      ? `${weekday} ${day} ${month} ${year} à ${hh}:${mm}`
      : `${weekday} ${day} ${month} ${year} الساعة ${hh}:${mm}`;
  }

  return "—";
}

/* ── Aliases backward-compat (ne pas supprimer) ──────────── */

/** @deprecated Préférer formatDate(d, "ar", "long") */
export function formatDateTN(d: Date | string | null | undefined, hideYear = false): string {
  if (!d) return "—";
  const dt = toDate(d);
  const day = dt.getDate();
  const month = MONTHS_TN[dt.getMonth()];
  const year = dt.getFullYear();
  return hideYear ? `${day} ${month}` : `${day} ${month} ${year}`;
}

/** @deprecated Préférer formatDate(d, "ar", "full") */
export function formatDateLongTN(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const dt = toDate(d);
  const weekday = WEEKDAYS_TN[dt.getDay()];
  return `${weekday} ${formatDateTN(dt)}`;
}

/** @deprecated Préférer formatDate(d, "ar", "datetime") */
export function formatDateTimeTN(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const dt = toDate(d);
  const datePart = formatDateTN(dt);
  const hh = pad2(dt.getHours());
  const mm = pad2(dt.getMinutes());
  return `${datePart}، ${hh}:${mm}`;
}

/**
 * Calendar navigation title — handles day / week / month / list views.
 */
export function formatPeriodTitleTN(date: Date, view: "day" | "week" | "month" | "list" | string): string {
  const year      = date.getFullYear();
  const monthName = MONTHS_TN[date.getMonth()];

  if (view === "day") return formatDateLongTN(date);

  if (view === "week") {
    const dow = date.getDay();
    const diffToMon = dow === 0 ? -6 : 1 - dow;
    const start = new Date(date);
    start.setDate(date.getDate() + diffToMon);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()}–${end.getDate()} ${MONTHS_TN[start.getMonth()]} ${start.getFullYear()}`;
    }
    return `${start.getDate()} ${MONTHS_TN[start.getMonth()]} – ${end.getDate()} ${MONTHS_TN[end.getMonth()]} ${end.getFullYear()}`;
  }

  return `${monthName} ${year}`;
}

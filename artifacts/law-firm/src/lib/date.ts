/**
 * Noms des mois en arabe tunisien (Darija)
 * Utilisés à la place des noms MSA produits par Intl/date-fns
 */
export const MONTHS_TN = [
  "جانفي",   // 0 – janvier
  "فيفري",   // 1 – février
  "مارس",    // 2 – mars
  "أفريل",   // 3 – avril
  "ماي",     // 4 – mai
  "جوان",    // 5 – juin
  "جويلية",  // 6 – juillet
  "اوت",     // 7 – août
  "سبتمبر",  // 8 – septembre
  "اكتوبر",  // 9 – octobre
  "نوفمبر",  // 10 – novembre
  "ديسمبر",  // 11 – décembre
] as const;

export const WEEKDAYS_TN = [
  "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت",
] as const;

/** Converts any date input to a Date, treating bare ISO date strings (YYYY-MM-DD) as local noon */
function toDate(d: Date | string): Date {
  if (d instanceof Date) return d;
  return new Date(d.length === 10 ? d + "T00:00:00" : d);
}

/**
 * "12 جانفي 2026"
 * Set hideYear=true for same-year contexts where the year is redundant.
 */
export function formatDateTN(d: Date | string | null | undefined, hideYear = false): string {
  if (!d) return "—";
  const dt = toDate(d);
  const day = dt.getDate();
  const month = MONTHS_TN[dt.getMonth()];
  const year = dt.getFullYear();
  return hideYear ? `${day} ${month}` : `${day} ${month} ${year}`;
}

/**
 * "الاثنين 12 جانفي 2026"  — with weekday prefix
 */
export function formatDateLongTN(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const dt = toDate(d);
  const weekday = WEEKDAYS_TN[dt.getDay()];
  return `${weekday} ${formatDateTN(dt)}`;
}

/**
 * "12 جانفي 2026، 09:30"  — date + local time (HH:mm)
 */
export function formatDateTimeTN(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const dt = toDate(d);
  const datePart = formatDateTN(dt);
  const hh = String(dt.getHours()).padStart(2, "0");
  const mm = String(dt.getMinutes()).padStart(2, "0");
  return `${datePart}، ${hh}:${mm}`;
}

/**
 * Calendar navigation title — handles day / week / month / list views.
 * Replaces the date-fns ar-locale formatPeriodTitle (which uses MSA month names).
 */
export function formatPeriodTitleTN(date: Date, view: "day" | "week" | "month" | "list" | string): string {
  const year = date.getFullYear();
  const monthName = MONTHS_TN[date.getMonth()];

  if (view === "day") {
    return formatDateLongTN(date);
  }

  if (view === "week") {
    // start of week (Monday)
    const dow = date.getDay(); // 0=Sun
    const diffToMon = (dow === 0 ? -6 : 1 - dow);
    const start = new Date(date);
    start.setDate(date.getDate() + diffToMon);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()}–${end.getDate()} ${MONTHS_TN[start.getMonth()]} ${start.getFullYear()}`;
    }
    return `${start.getDate()} ${MONTHS_TN[start.getMonth()]} – ${end.getDate()} ${MONTHS_TN[end.getMonth()]} ${end.getFullYear()}`;
  }

  // month or list
  return `${monthName} ${year}`;
}

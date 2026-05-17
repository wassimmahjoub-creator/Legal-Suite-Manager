import { describe, it, expect } from "vitest";
import { formatDate, MONTHS_TN, WEEKDAYS_TN } from "@/lib/date";

/**
 * Reference date: Friday 15 May 2026 at 09:30 local time.
 * Verified: 2026-01-01 = Thursday → +134 days = Friday 15 May.
 */
const REF = new Date(2026, 4, 15, 9, 30, 0); // month 4 = May (0-indexed)

describe("formatDate — locale AR", () => {
  it("full AR → weekday + day + TN month + year", () => {
    expect(formatDate(REF, "ar", "full")).toBe("الجمعة 15 ماي 2026");
  });

  it("long AR → day + TN month + year", () => {
    expect(formatDate(REF, "ar", "long")).toBe("15 ماي 2026");
  });

  it("short AR → DD/MM/YYYY", () => {
    expect(formatDate(REF, "ar", "short")).toBe("15/05/2026");
  });

  it("time → HH:mm (locale-agnostic)", () => {
    expect(formatDate(REF, "ar", "time")).toBe("09:30");
  });

  it("datetime AR → weekday + date + الساعة + HH:mm", () => {
    expect(formatDate(REF, "ar", "datetime")).toBe(
      "الجمعة 15 ماي 2026 الساعة 09:30",
    );
  });
});

describe("formatDate — locale FR", () => {
  it("full FR → weekday + day + French month + year", () => {
    expect(formatDate(REF, "fr", "full")).toBe("vendredi 15 mai 2026");
  });

  it("long FR → day + French month + year", () => {
    expect(formatDate(REF, "fr", "long")).toBe("15 mai 2026");
  });

  it("short FR → DD/MM/YYYY (same as AR)", () => {
    expect(formatDate(REF, "fr", "short")).toBe("15/05/2026");
  });

  it("time FR → HH:mm", () => {
    expect(formatDate(REF, "fr", "time")).toBe("09:30");
  });

  it("datetime FR → weekday + date + à + HH:mm", () => {
    expect(formatDate(REF, "fr", "datetime")).toBe(
      "vendredi 15 mai 2026 à 09:30",
    );
  });
});

describe("formatDate — relative", () => {
  it("relative AR past (3 days ago)", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000);
    const result = formatDate(threeDaysAgo, "ar", "relative");
    expect(result).toBe("منذ 3 أيام");
  });

  it("relative FR past (2 hours ago)", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 3_600_000);
    const result = formatDate(twoHoursAgo, "fr", "relative");
    expect(result).toBe("il y a 2 heures");
  });

  it("relative AR future (5 days)", () => {
    const inFiveDays = new Date(Date.now() + 5 * 86_400_000);
    const result = formatDate(inFiveDays, "ar", "relative");
    expect(result).toBe("بعد 5 أيام");
  });

  it("relative FR future (1 day = demain)", () => {
    const tomorrow = new Date(Date.now() + 26 * 3_600_000); // ~26h = demain
    const result = formatDate(tomorrow, "fr", "relative");
    expect(result).toBe("demain");
  });
});

describe("formatDate — edge cases", () => {
  it("null → '—'", () => {
    expect(formatDate(null, "ar", "long")).toBe("—");
  });

  it("undefined → '—'", () => {
    expect(formatDate(undefined, "fr", "full")).toBe("—");
  });

  it("ISO string input is parsed correctly", () => {
    expect(formatDate("2026-05-15", "ar", "long")).toBe("15 ماي 2026");
  });
});

describe("Dictionnaire mois tunisien (hamzas)", () => {
  it("août utilise أوت (avec hamza, pas اوت)", () => {
    expect(MONTHS_TN[7]).toBe("أوت");
  });

  it("octobre utilise أكتوبر (avec hamza, pas اكتوبر)", () => {
    expect(MONTHS_TN[9]).toBe("أكتوبر");
  });

  it("mai utilise ماي (darija, pas مايو MSA)", () => {
    expect(MONTHS_TN[4]).toBe("ماي");
  });

  it("الإثنين avec kasra sous alef", () => {
    expect(WEEKDAYS_TN[1]).toBe("الإثنين");
  });
});

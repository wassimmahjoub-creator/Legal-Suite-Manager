import { Router } from "express";
import { db, eventsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// ── iCal helpers ──────────────────────────────────────────────────────────────

function escIcal(s: string) {
  return s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
}

function icalDate(dateStr: string, timeStr?: string | null): string {
  const d = dateStr.replace(/-/g, "");
  if (!timeStr) return `${d}`;
  const t = timeStr.replace(/:/g, "").slice(0, 6).padEnd(6, "0");
  return `${d}T${t}`;
}

function buildICal(events: typeof eventsTable.$inferSelect[], calName: string): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mahami Plus//AR//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${calName}`,
    "X-WR-TIMEZONE:Africa/Tunis",
  ];

  for (const ev of events) {
    const hasTime = !!ev.time;
    const dtStart = hasTime
      ? `DTSTART:${icalDate(ev.date, ev.time)}`
      : `DTSTART;VALUE=DATE:${icalDate(ev.date)}`;

    const durationMin = ev.duration ?? 60;
    let dtEnd = dtStart;
    if (hasTime) {
      const [h, m] = (ev.time!).split(":").map(Number);
      const startMinutes = h * 60 + m + durationMin;
      const endH = Math.floor(startMinutes / 60) % 24;
      const endM = startMinutes % 60;
      dtEnd = `DTEND:${icalDate(ev.date)}T${String(endH).padStart(2, "0")}${String(endM).padStart(2, "0")}00`;
    } else {
      dtEnd = `DTEND;VALUE=DATE:${icalDate(ev.date)}`;
    }

    const parts = [
      "BEGIN:VEVENT",
      `UID:mahami-event-${ev.id}@mahami.plus`,
      dtStart,
      dtEnd,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
      `SUMMARY:${escIcal(ev.title)}`,
      `CATEGORIES:${ev.type.toUpperCase()}`,
    ];

    if (ev.location) parts.push(`LOCATION:${escIcal(ev.location)}`);
    if (ev.notes) parts.push(`DESCRIPTION:${escIcal(ev.notes)}`);
    if (ev.legalStatus) parts.push(`STATUS:${ev.legalStatus === "cancelled" ? "CANCELLED" : "CONFIRMED"}`);

    parts.push("END:VEVENT");
    lines.push(...parts);
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

// ── Public iCal feed ──────────────────────────────────────────────────────────

router.get("/agenda/feed/:token", async (req, res): Promise<void> => {
  const token = req.params.token.replace(/\.ics$/, "");
  if (!token) { res.status(400).send("Missing token"); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.icalToken, token));
  if (!user) { res.status(404).send("Invalid token"); return; }

  const events = await db.select().from(eventsTable).orderBy(eventsTable.date);
  const ical = buildICal(events, `Mahami Plus — ${user.name}`);

  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="agenda-${user.name.replace(/\s+/g, "-")}.ics"`);
  res.send(ical);
});

// ── Token management (authenticated) ─────────────────────────────────────────

router.post("/agenda/ical-token", requireAuth, async (req, res): Promise<void> => {
  const uid = (req as { user?: { id?: number } }).user?.id;
  if (!uid) { res.status(401).json({ error: "Unauthorized" }); return; }
  const token = crypto.randomUUID();
  await db.update(usersTable).set({ icalToken: token }).where(eq(usersTable.id, uid));
  res.json({ token });
});

router.delete("/agenda/ical-token", requireAuth, async (req, res): Promise<void> => {
  const uid = (req as { user?: { id?: number } }).user?.id;
  if (!uid) { res.status(401).json({ error: "Unauthorized" }); return; }
  await db.update(usersTable).set({ icalToken: null }).where(eq(usersTable.id, uid));
  res.json({ revoked: true });
});

router.get("/agenda/ical-token", requireAuth, async (req, res): Promise<void> => {
  const uid = (req as { user?: { id?: number } }).user?.id;
  if (!uid) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [user] = await db.select({ icalToken: usersTable.icalToken }).from(usersTable).where(eq(usersTable.id, uid));
  res.json({ token: user?.icalToken ?? null });
});

export default router;

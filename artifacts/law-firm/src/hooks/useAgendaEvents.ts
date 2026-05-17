import { useState, useEffect, useCallback } from "react";
import { authFetch } from "@/lib/authFetch";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

export interface AgendaEvent {
  id: number;
  title: string;
  caseId: number | null;
  caseName: string | null;
  date: string;
  time: string | null;
  duration: number | null;
  location: string | null;
  court: string | null;
  division: string | null;
  type: string;
  objective: string | null;
  result: string | null;
  legalStatus: string | null;
  postponedTo: string | null;
  notes: string | null;
  createdAt: string;
}

export interface CalEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  resource: AgendaEvent;
}

export function toCalEvent(e: AgendaEvent): CalEvent {
  const [h = "09", m = "00"] = (e.time ?? "09:00").split(":");
  const start = new Date(`${e.date}T${h.padStart(2, "0")}:${m.padStart(2, "0")}:00`);
  const durationMs = (e.duration ?? 60) * 60 * 1000;
  const end = new Date(start.getTime() + durationMs);
  return { id: e.id, title: e.title, start, end, resource: e };
}

export function useAgendaEvents() {
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await authFetch(`${BASE}/api/events`);
    if (r.ok) setEvents(await r.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const calEvents = events.map(toCalEvent);

  return { events, setEvents, calEvents, loading, reload: load };
}

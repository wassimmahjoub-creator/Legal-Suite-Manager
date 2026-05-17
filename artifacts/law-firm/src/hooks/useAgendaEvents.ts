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
  isDeadline?: boolean;
  urgency?: string;
}

export interface CalEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  resource: AgendaEvent;
}

interface RawDeadline {
  id: number;
  caseId: number;
  caseName: string | null;
  title: string;
  type: string;
  dueDate: string;
  urgency: string;
  notes: string | null;
  completedAt: string | null;
  createdAt: string;
}

function deadlineToAgendaEvent(d: RawDeadline): AgendaEvent {
  return {
    id: -(d.id),
    title: d.title,
    caseId: d.caseId,
    caseName: d.caseName,
    date: d.dueDate,
    time: null,
    duration: 60,
    location: null,
    court: null,
    division: null,
    type: "deadline",
    objective: null,
    result: null,
    legalStatus: d.completedAt ? "completed" : "scheduled",
    postponedTo: null,
    notes: d.notes,
    createdAt: d.createdAt,
    isDeadline: true,
    urgency: d.urgency,
  };
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
    const [evRes, dlRes] = await Promise.all([
      authFetch(`${BASE}/api/events`, { cache: "no-store" }),
      authFetch(`${BASE}/api/deadlines`, { cache: "no-store" }),
    ]);
    const evts: AgendaEvent[] = evRes.ok ? await evRes.json() : [];
    const dls: RawDeadline[] = dlRes.ok ? await dlRes.json() : [];
    const dlEvents = dls
      .filter(d => !d.completedAt)
      .map(deadlineToAgendaEvent);
    setEvents([...evts, ...dlEvents]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const calEvents = events.map(toCalEvent);

  return { events, setEvents, calEvents, loading, reload: load };
}

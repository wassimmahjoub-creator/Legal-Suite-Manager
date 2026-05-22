import { SelectNative } from "@/components/SelectNative";
import { useState, useEffect, useCallback } from "react";
import { Calendar, dateFnsLocalizer, type View, type ToolbarProps } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import { format, parse, startOfWeek, getDay, addDays, startOfMonth, endOfMonth } from "date-fns";
import { ar } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import "@/styles/big-calendar.css";

import { authFetch } from "@/lib/authFetch";
import { CourtSelect } from "@/components/CourtSelect";
import { EmptyState } from "@/components/ui/EmptyState";
import { EmptyCalendarIllustration } from "@/components/illustrations/EmptyCalendar";
import { formatDateTN, formatDateLongTN, formatPeriodTitleTN } from "@/lib/date";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Modal, FormField } from "@/components/Modal";
import { SmartTextarea } from "@/components/SmartTextarea";
import { MicButton } from "@/components/MicButton";
import {
  CalendarIcon, Clock, MapPin, Briefcase, Plus, Pencil, Trash2,
  Target, CheckCircle2, Scale, ChevronRight, ChevronLeft,
  LayoutGrid, List, Columns2, ArrowRight,
} from "lucide-react";
import { useAgendaEvents, type AgendaEvent, type CalEvent, toCalEvent } from "@/hooks/useAgendaEvents";

// ── Setup ────────────────────────────────────────────────────────────────────

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
const VIEW_KEY = "agenda.preferredView";

const locales = { ar };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1 }),
  getDay,
  locales,
});

const DnDCalendar = withDragAndDrop<CalEvent>(Calendar);

// ── Color map (audience / rdv / deadline / task) ──────────────────────────────

const EVENT_STYLE_MAP: Record<string, { backgroundColor: string; color: string }> = {
  hearing:      { backgroundColor: "#C0392B", color: "#fff" },
  execution:    { backgroundColor: "#C0392B", color: "#fff" },
  meeting:      { backgroundColor: "#2874A6", color: "#fff" },
  notification: { backgroundColor: "#2874A6", color: "#fff" },
  expertise:    { backgroundColor: "#2874A6", color: "#fff" },
  deadline:     { backgroundColor: "#D35400", color: "#fff" },
  appeal:       { backgroundColor: "#D35400", color: "#fff" },
  cassation:    { backgroundColor: "#D35400", color: "#fff" },
  sealing:      { backgroundColor: "#D35400", color: "#fff" },
  other:        { backgroundColor: "#566573", color: "#fff" },
  judgment:     { backgroundColor: "#566573", color: "#fff" },
  declaration:  { backgroundColor: "#566573", color: "#fff" },
};

// ── Static data ──────────────────────────────────────────────────────────────

const EVENT_TYPES = [
  { value: "hearing",      label: "جلسة" },
  { value: "meeting",      label: "اجتماع" },
  { value: "deadline",     label: "أجل قانوني" },
  { value: "notification", label: "إعلام" },
  { value: "expertise",    label: "خبرة" },
  { value: "execution",    label: "تنفيذ" },
  { value: "appeal",       label: "استئناف" },
  { value: "cassation",    label: "تعقيب" },
  { value: "judgment",     label: "حكم" },
  { value: "declaration",  label: "تصريح" },
  { value: "sealing",      label: "ختم" },
  { value: "other",        label: "أخرى" },
];

const LEGAL_STATUSES = [
  { value: "scheduled",  label: "مبرمجة" },
  { value: "completed",  label: "منجزة" },
  { value: "postponed",  label: "مؤجلة" },
  { value: "cancelled",  label: "ملغاة" },
];

const TYPE_COLORS: Record<string, string> = {
  hearing: "bg-red-600", meeting: "bg-blue-600", deadline: "bg-orange-500",
  appeal: "bg-orange-500", cassation: "bg-orange-500", execution: "bg-red-600",
  notification: "bg-blue-600", expertise: "bg-blue-600", sealing: "bg-orange-500",
};

type ViewMode = "month" | "week" | "day" | "list";

interface CaseOption { id: number; title: string; caseNumber: string | null; }

const EMPTY_FORM = {
  title: "", date: "", time: "", location: "", court: "", division: "",
  type: "hearing", legalStatus: "scheduled", objective: "", result: "",
  postponedTo: "", caseId: "", notes: "", duration: "60",
};

// ── Arabic period title ───────────────────────────────────────────────────────

function formatPeriodTitle(date: Date, view: ViewMode): string {
  return formatPeriodTitleTN(date, view);
}

// ── Custom Toolbar (injected into react-big-calendar) ─────────────────────────

function AgendaToolbar({ date, onNavigate }: ToolbarProps<CalEvent>) {
  return (
    <div style={{ display: "none" }} data-date={date.toISOString()} data-nav={onNavigate.toString()} />
  );
}

// ── Custom Week/Day header: day name stacked above date circle ────────────────

const AR_DAY_NAMES = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

function WeekDayHeader({ date }: { date: Date }) {
  const today = new Date();
  const isToday =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "5px",
        padding: "6px 4px",
        width: "100%",
        borderBottom: isToday ? "2px solid #d4a017" : "2px solid transparent",
        boxSizing: "border-box",
      }}
    >
      <span style={{
        fontSize: "0.75rem",
        fontWeight: 600,
        color: "#d4a017",
        lineHeight: 1,
      }}>
        {AR_DAY_NAMES[date.getDay()]}
      </span>
      <span style={{
        fontSize: "0.875rem",
        fontWeight: 700,
        color: isToday ? "#d4a017" : "rgba(255,255,255,0.85)",
        lineHeight: 1,
      }}>
        {date.getDate()}
      </span>
    </div>
  );
}

// ── Color legend ─────────────────────────────────────────────────────────────

const LEGEND = [
  { color: "#C0392B", label: "جلسة / تنفيذ" },
  { color: "#2874A6", label: "اجتماع / إعلام" },
  { color: "#D35400", label: "أجل قانوني / استئناف" },
  { color: "#566573", label: "أحكام / أخرى" },
];

// ── Main component ────────────────────────────────────────────────────────────

const inputCls = "h-10 bg-muted/50 border-border focus-visible:ring-1 focus-visible:ring-primary rounded-lg w-full";

export default function CalendarView() {
  const { events, setEvents, loading, reload } = useAgendaEvents();
  const [cases, setCases] = useState<CaseOption[]>([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<AgendaEvent | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    (localStorage.getItem(VIEW_KEY) as ViewMode) ?? "month"
  );
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dndToast, setDndToast] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    authFetch(`${BASE}/api/cases`).then(r => r.ok ? r.json() : []).then(setCases);
  }, []);

  function changeView(v: ViewMode) {
    setViewMode(v);
    localStorage.setItem(VIEW_KEY, v);
  }

  function navigate(dir: "prev" | "next" | "today") {
    setCurrentDate(d => {
      if (dir === "today") return new Date();
      const delta = dir === "next" ? 1 : -1;
      const clone = new Date(d);
      if (viewMode === "day") clone.setDate(clone.getDate() + delta);
      else if (viewMode === "week") clone.setDate(clone.getDate() + delta * 7);
      else clone.setMonth(clone.getMonth() + delta);
      return clone;
    });
  }

  function openNew(date?: Date) {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      date: date ? format(date, "yyyy-MM-dd") : new Date().toISOString().slice(0, 10),
    });
    setModal(true);
  }

  function openEdit(e: AgendaEvent) {
    setEditing(e);
    setForm({
      title:       e.title,
      date:        e.date,
      time:        e.time ?? "",
      location:    e.location ?? "",
      court:       e.court ?? "",
      division:    e.division ?? "",
      type:        e.type,
      legalStatus: e.legalStatus ?? "scheduled",
      objective:   e.objective ?? "",
      result:      e.result ?? "",
      postponedTo: e.postponedTo ?? "",
      caseId:      e.caseId?.toString() ?? "",
      notes:       e.notes ?? "",
      duration:    String(e.duration ?? 60),
    });
    setModal(true);
  }

  async function save() {
    if (!form.title.trim() || !form.date) return;
    setSaving(true);
    setSaveError(null);
    const payload = {
      title:       form.title,
      date:        form.date,
      time:        form.time || null,
      location:    form.location || null,
      court:       form.court || null,
      division:    form.division || null,
      type:        form.type,
      legalStatus: form.legalStatus || null,
      objective:   form.objective || null,
      result:      form.result || null,
      postponedTo: form.postponedTo || null,
      caseId:      form.caseId ? Number(form.caseId) : null,
      notes:       form.notes || null,
      duration:    Number(form.duration) || 60,
    };
    try {
      const url = editing ? `${BASE}/api/events/${editing.id}` : `${BASE}/api/events`;
      const r = await authFetch(url, { method: editing ? "PUT" : "POST", body: JSON.stringify(payload) });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        setSaveError((err as { error?: string }).error ?? `خطأ ${r.status}`);
        setSaving(false);
        return;
      }
      await reload();
      setModal(false);
    } catch {
      setSaveError("فشل الاتصال بالخادم");
    }
    setSaving(false);
  }

  async function remove(id: number) {
    if (!confirm("حذف هذا الموعد؟")) return;
    if (id < 0) {
      await authFetch(`${BASE}/api/deadlines/${-id}`, { method: "DELETE" });
    } else {
      await authFetch(`${BASE}/api/events/${id}`, { method: "DELETE" });
    }
    await reload();
  }

  // ── Drag & Drop ────────────────────────────────────────────────────────────

  const onEventDrop = useCallback(async ({ event, start }: { event: CalEvent; start: Date | string }) => {
    if (event.id < 0) return; // deadlines are not draggable
    const newDate = format(new Date(start), "yyyy-MM-dd");
    const newTime = event.resource.time ? format(new Date(start), "HH:mm") : null;

    // Optimistic update
    const prev = [...events];
    setEvents(es => es.map(e => e.id === event.id
      ? { ...e, date: newDate, ...(newTime ? { time: newTime } : {}) }
      : e));

    try {
      const r = await authFetch(`${BASE}/api/events/${event.id}`, {
        method: "PATCH",
        body: JSON.stringify({ date: newDate, ...(newTime ? { time: newTime } : {}) }),
      });
      if (!r.ok) throw new Error("API error");
      setDndToast(`تم نقل "${event.title}" إلى ${formatDateTN(new Date(start), true)}`);
      setTimeout(() => setDndToast(null), 3000);
    } catch {
      setEvents(prev);
      setDndToast("فشل تحديث الموعد");
      setTimeout(() => setDndToast(null), 3000);
    }
  }, [events, setEvents]);

  // ── Props for react-big-calendar ──────────────────────────────────────────

  const calEvents: CalEvent[] = events.map(toCalEvent);

  function eventPropGetter(event: CalEvent) {
    const style = EVENT_STYLE_MAP[event.resource.type] ?? { backgroundColor: "#566573", color: "#fff" };
    return { style: { ...style, border: "none", borderRadius: "4px" } };
  }

  const rbcView: View = viewMode === "list" ? "month" : viewMode;

  // ── List view (existing grouped list) ─────────────────────────────────────

  const typeLabel = (t: string) => EVENT_TYPES.find(x => x.value === t)?.label ?? t;
  const typeColor = (t: string) => TYPE_COLORS[t] ?? "bg-primary";
  const statusLabel = (s: string | null) => LEGAL_STATUSES.find(x => x.value === s)?.label ?? s ?? "";

  const listEvents = events.filter(e => {
    const d = new Date(e.date);
    if (viewMode === "day") {
      return d.getFullYear() === currentDate.getFullYear()
        && d.getMonth() === currentDate.getMonth()
        && d.getDate() === currentDate.getDate();
    }
    if (viewMode === "week") {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      return d >= startOfWeek && d <= endOfWeek;
    }
    return d.getFullYear() === currentDate.getFullYear()
      && d.getMonth() === currentDate.getMonth();
  });

  const grouped = listEvents
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .reduce((acc, e) => {
      const key = formatDateLongTN(e.date);
      if (!acc[key]) acc[key] = [];
      acc[key].push(e);
      return acc;
    }, {} as Record<string, AgendaEvent[]>);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* DnD toast */}
      {dndToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card border border-border shadow-lg rounded-xl px-5 py-3 text-sm font-medium">
          {dndToast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <button onClick={() => window.history.back()}
            className="text-muted-foreground hover:text-foreground transition-colors mb-1">
            <ArrowRight className="h-4 w-4" />
          </button>
          <h1 className="text-2xl font-bold">الرزنامة</h1>
          <p className="text-muted-foreground text-sm mt-0.5">مواعيد الجلسات، الاجتماعات والآجال القانونية</p>
        </div>
        <Button onClick={() => openNew()} className="rounded-lg gap-2 px-5">
          <Plus className="h-4 w-4" /> حدث جديد
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-card border border-border rounded-xl p-3">
        {/* Navigation */}
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => navigate("prev")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" className="h-8 px-3 text-xs" onClick={() => navigate("today")}>
            اليوم
          </Button>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => navigate("next")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold text-sm px-2 min-w-[160px]">
            {formatPeriodTitle(currentDate, viewMode)}
          </span>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-1">
          {([
            { key: "day",   label: "يوم",    Icon: Clock },
            { key: "week",  label: "أسبوع",  Icon: Columns2 },
            { key: "month", label: "شهر",    Icon: LayoutGrid },
            { key: "list",  label: "قائمة",  Icon: List },
          ] as const).map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => changeView(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {LEGEND.map(l => (
          <div key={l.color} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: l.color }} />
            {l.label}
          </div>
        ))}
      </div>

      {/* Calendar grid views */}
      {viewMode !== "list" && (
        <div className="rounded-xl overflow-hidden" style={{ minHeight: 560 }}>
          {loading ? (
            <Skeleton className="h-[560px] w-full rounded-xl" />
          ) : (
            <div dir="ltr">
              <DnDCalendar
                localizer={localizer}
                events={calEvents}
                view={rbcView}
                date={currentDate}
                onNavigate={setCurrentDate}
                onView={() => {}}
                onEventDrop={onEventDrop as never}
                draggableAccessor={() => true}
                resizable={false}
                eventPropGetter={eventPropGetter}
                components={{
                  toolbar: AgendaToolbar as never,
                  week: { header: WeekDayHeader as never },
                  day:  { header: WeekDayHeader as never },
                }}
                onSelectSlot={({ start }) => openNew(new Date(start))}
                onSelectEvent={({ resource }) => openEdit(resource)}
                selectable
                culture="ar"
                min={new Date(0, 0, 0, 8, 0)}
                max={new Date(0, 0, 0, 20, 0)}
                step={30}
                timeslots={2}
                popup
                style={{ height: 560 }}
                messages={{
                  allDay: "اليوم كله",
                  previous: "السابق",
                  next: "التالي",
                  today: "اليوم",
                  month: "شهر",
                  week: "أسبوع",
                  day: "يوم",
                  agenda: "قائمة",
                  date: "التاريخ",
                  time: "الوقت",
                  event: "الحدث",
                  noEventsInRange: "لا توجد أحداث في هذه الفترة",
                  showMore: (total) => `+${total} أكثر`,
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* List view (existing grouped view) */}
      {viewMode === "list" && (
        <div className="space-y-8">
          {loading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-6 w-52" />
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
              </div>
            ))
          ) : Object.keys(grouped).length === 0 ? (
            <div className="bg-card rounded-xl shadow-sm">
              <EmptyState
                illustration={<EmptyCalendarIllustration />}
                title="لا مواعيد لهذه الفترة"
                description="أضف جلسة أو موعدًا — سيظهر هنا فور إضافته بالضغط على «+ موعد جديد» أعلاه"
              />
            </div>
          ) : (
            Object.entries(grouped).map(([date, dayEvents]) => (
              <div key={date} className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <CalendarIcon className="h-4 w-4 text-primary" />
                  </div>
                  <h2 className="text-base font-bold">{date}</h2>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
                    {dayEvents.length} {dayEvents.length === 1 ? "موعد" : "مواعيد"}
                  </span>
                </div>
                <div className="space-y-3 mr-9">
                  {dayEvents.map(event => (
                    <Card key={event.id} className="border-none shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                      <CardContent className="p-0 flex">
                        <div className={`w-1.5 shrink-0 ${typeColor(event.type)}`} />
                        <div className="p-4 flex-1">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-bold">{event.title}</h3>
                                <span className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
                                  {typeLabel(event.type)}
                                </span>
                                {event.legalStatus && (
                                  <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                                    {statusLabel(event.legalStatus)}
                                  </span>
                                )}
                              </div>
                              {event.caseName && (
                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                  <Briefcase className="h-3.5 w-3.5" /><span>{event.caseName}</span>
                                </div>
                              )}
                              {event.objective && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Target className="h-3 w-3" /><span>الهدف: {event.objective}</span>
                                </div>
                              )}
                              {event.result && (
                                <div className="flex items-center gap-1.5 text-xs text-green-400">
                                  <CheckCircle2 className="h-3 w-3" /><span>النتيجة: {event.result}</span>
                                </div>
                              )}
                              {event.postponedTo && (
                                <div className="flex items-center gap-1.5 text-xs text-orange-400">
                                  <ChevronRight className="h-3 w-3" />
                                  <span>مؤجل إلى: {formatDateTN(event.postponedTo)}</span>
                                </div>
                              )}
                            </div>
                            <div className="flex gap-3 items-start">
                              <div className="flex flex-col gap-2 text-sm">
                                {event.time && (
                                  <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full font-medium">
                                    <Clock className="h-3.5 w-3.5" /><span dir="ltr">{event.time}</span>
                                  </div>
                                )}
                                {(event.court || event.location) && (
                                  <div className="flex items-center gap-1.5 bg-muted/50 px-3 py-1 rounded-full text-muted-foreground text-xs">
                                    <Scale className="h-3.5 w-3.5" />
                                    <span>{event.court || event.location}{event.division ? ` — ${event.division}` : ""}</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <button onClick={() => openEdit(event)} className="p-1.5 hover:bg-muted rounded-lg">
                                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                </button>
                                <button onClick={() => remove(event.id)} className="p-1.5 hover:bg-destructive/10 rounded-lg">
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </button>
                              </div>
                            </div>
                          </div>
                          {event.notes && (
                            <p className="mt-3 text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border/40">
                              {event.notes}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Event form modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "تعديل الحدث" : "حدث جديد"} size="lg">
        <div className="space-y-4">
          <FormField label="عنوان الحدث *" htmlFor="ev-title">
            <Input id="ev-title" placeholder="مثال: جلسة محكمة تونس الابتدائية" className={inputCls}
              value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="نوع الحدث" htmlFor="ev-type">
              <SelectNative id="ev-type" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className={inputCls + " px-3 cursor-pointer"}>
                {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </SelectNative>
            </FormField>
            <FormField label="الحالة القانونية" htmlFor="ev-lstatus">
              <SelectNative id="ev-lstatus" value={form.legalStatus} onChange={e => setForm(f => ({ ...f, legalStatus: e.target.value }))}
                className={inputCls + " px-3 cursor-pointer"}>
                {LEGAL_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </SelectNative>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="التاريخ *" htmlFor="ev-date">
              <Input id="ev-date" type="date" className={inputCls} dir="ltr"
                value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </FormField>
            <FormField label="الوقت" htmlFor="ev-time">
              <Input id="ev-time" type="time" className={inputCls} dir="ltr"
                value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
            </FormField>
          </div>

          <FormField label="مدة الحدث" htmlFor="ev-duration">
            <SelectNative id="ev-duration" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
              className={inputCls + " px-3 cursor-pointer"}>
              <option value="30">30 دقيقة</option>
              <option value="60">ساعة واحدة</option>
              <option value="90">ساعة ونصف</option>
              <option value="120">ساعتان</option>
              <option value="180">3 ساعات</option>
              <option value="240">4 ساعات</option>
              <option value="480">نهار كامل</option>
            </SelectNative>
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="المحكمة" htmlFor="ev-court">
              <CourtSelect
                value={form.court}
                onChange={v => setForm(f => ({ ...f, court: v }))}
                placeholder="اختر المحكمة..."
              />
            </FormField>
            <FormField label="الدائرة" htmlFor="ev-div">
              <Input id="ev-div" placeholder="الدائرة الأولى" className={inputCls}
                value={form.division} onChange={e => setForm(f => ({ ...f, division: e.target.value }))} />
            </FormField>
          </div>

          <FormField label="المكان" htmlFor="ev-loc">
            <Input id="ev-loc" placeholder="قاعة المحاكمات، الطابق الثاني..." className={inputCls}
              value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
          </FormField>

          <FormField label="القضية المرتبطة" htmlFor="ev-case">
            <SelectNative id="ev-case" value={form.caseId} onChange={e => setForm(f => ({ ...f, caseId: e.target.value }))}
              className={inputCls + " px-3 cursor-pointer"}>
              <option value="">— بدون قضية —</option>
              {cases.map(c => (
                <option key={c.id} value={c.id}>
                  {c.caseNumber ? `${c.caseNumber} — ` : ""}{c.title}
                </option>
              ))}
            </SelectNative>
          </FormField>

          <div className="grid grid-cols-1 gap-3">
            <FormField label="الهدف" htmlFor="ev-obj">
              <div className="flex gap-2">
                <Input id="ev-obj" placeholder="الهدف من هذا الموعد..." className={inputCls + " flex-1"}
                  value={form.objective} onChange={e => setForm(f => ({ ...f, objective: e.target.value }))} />
                <MicButton onResult={t => setForm(f => ({ ...f, objective: f.objective ? f.objective + " " + t : t }))} />
              </div>
            </FormField>
            <FormField label="النتيجة" htmlFor="ev-result">
              <div className="flex gap-2">
                <Input id="ev-result" placeholder="نتيجة الجلسة أو الاجتماع..." className={inputCls + " flex-1"}
                  value={form.result} onChange={e => setForm(f => ({ ...f, result: e.target.value }))} />
                <MicButton onResult={t => setForm(f => ({ ...f, result: f.result ? f.result + " " + t : t }))} />
              </div>
            </FormField>
          </div>

          <FormField label="تاريخ التأجيل (إن وجد)" htmlFor="ev-postponed">
            <Input id="ev-postponed" type="date" className={inputCls} dir="ltr"
              value={form.postponedTo} onChange={e => setForm(f => ({ ...f, postponedTo: e.target.value }))} />
          </FormField>

          <FormField label="ملاحظات" htmlFor="ev-notes">
            <SmartTextarea id="ev-notes" rows={3} placeholder="ملاحظات إضافية..."
              aiContext="ملاحظات جلسة قانونية"
              value={form.notes} onChange={v => setForm(f => ({ ...f, notes: v }))} />
          </FormField>

          {saveError && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
              {saveError}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={save} disabled={saving || !form.title.trim() || !form.date}>
              {saving ? "جارٍ الحفظ..." : editing ? "حفظ التعديلات" : "حفظ الموعد"}
            </Button>
            <Button variant="outline" onClick={() => { setModal(false); setSaveError(null); }} className="px-6">إلغاء</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

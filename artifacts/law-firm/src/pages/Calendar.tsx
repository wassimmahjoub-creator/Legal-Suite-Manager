import { useState, useEffect } from "react";
import { authFetch } from "@/lib/authFetch";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Modal, FormField } from "@/components/Modal";
import { SmartTextarea } from "@/components/SmartTextarea";
import { MicButton } from "@/components/MicButton";
import {
  CalendarIcon, Clock, MapPin, Briefcase, Plus, Pencil, Trash2,
  Target, CheckCircle2, Scale, ChevronRight,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

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
  hearing:      "bg-blue-500",
  meeting:      "bg-purple-500",
  deadline:     "bg-red-500",
  judgment:     "bg-amber-500",
  appeal:       "bg-orange-500",
  cassation:    "bg-rose-500",
  execution:    "bg-emerald-500",
  notification: "bg-sky-500",
  expertise:    "bg-teal-500",
  declaration:  "bg-violet-500",
  sealing:      "bg-slate-500",
};

interface Event {
  id: number;
  title: string;
  caseId: number | null;
  caseName: string | null;
  date: string;
  time: string | null;
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

interface CaseOption { id: number; title: string; caseNumber: string | null; }

const EMPTY_FORM = {
  title: "",
  date: "",
  time: "",
  location: "",
  court: "",
  division: "",
  type: "hearing",
  legalStatus: "scheduled",
  objective: "",
  result: "",
  postponedTo: "",
  caseId: "",
  notes: "",
};

const inputCls = "h-10 bg-muted/50 border-border focus-visible:ring-1 focus-visible:ring-primary rounded-lg w-full";

export default function CalendarView() {
  const [events, setEvents] = useState<Event[]>([]);
  const [cases, setCases] = useState<CaseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  async function loadEvents() {
    setLoading(true);
    const r = await authFetch(`${BASE}/api/events`);
    if (r.ok) setEvents(await r.json());
    setLoading(false);
  }

  async function loadCases() {
    const r = await authFetch(`${BASE}/api/cases`);
    if (r.ok) setCases(await r.json());
  }

  useEffect(() => { loadEvents(); loadCases(); }, []);

  function openNew() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, date: new Date().toISOString().slice(0, 10) });
    setModal(true);
  }

  function openEdit(e: Event) {
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
    });
    setModal(true);
  }

  async function save() {
    if (!form.title.trim() || !form.date) return;
    setSaving(true);
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
    };
    const url = editing
      ? `${BASE}/api/events/${editing.id}`
      : `${BASE}/api/events`;
    await authFetch(url, { method: editing ? "PUT" : "POST", body: JSON.stringify(payload) });
    await loadEvents();
    setSaving(false);
    setModal(false);
  }

  async function remove(id: number) {
    if (!confirm("حذف هذا الموعد؟")) return;
    await authFetch(`${BASE}/api/events/${id}`, { method: "DELETE" });
    await loadEvents();
  }

  const typeLabel = (t: string) => EVENT_TYPES.find(x => x.value === t)?.label ?? t;
  const typeColor = (t: string) => TYPE_COLORS[t] ?? "bg-primary";
  const statusLabel = (s: string | null) => LEGAL_STATUSES.find(x => x.value === s)?.label ?? s ?? "";

  const grouped = events.reduce((acc, e) => {
    const key = new Date(e.date + "T00:00:00").toLocaleDateString("ar-TN", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {} as Record<string, Event[]>);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">الرزنامة</h1>
          <p className="text-muted-foreground text-sm mt-0.5">مواعيد الجلسات، الاجتماعات والآجال القانونية</p>
        </div>
        <Button onClick={openNew} className="rounded-lg gap-2 px-5">
          <Plus className="h-4 w-4" /> موعد جديد
        </Button>
      </div>

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
          <div className="text-center py-20 bg-card rounded-xl shadow-sm flex flex-col items-center gap-3">
            <CalendarIcon className="h-14 w-14 text-muted-foreground/20" />
            <p className="text-muted-foreground">لا توجد مواعيد</p>
            <Button variant="outline" onClick={openNew} className="gap-2">
              <Plus className="h-4 w-4" /> أضف موعدك الأول
            </Button>
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
                                <Briefcase className="h-3.5 w-3.5" />
                                <span>{event.caseName}</span>
                              </div>
                            )}
                            {event.objective && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Target className="h-3 w-3" />
                                <span>الهدف: {event.objective}</span>
                              </div>
                            )}
                            {event.result && (
                              <div className="flex items-center gap-1.5 text-xs text-green-400">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>النتيجة: {event.result}</span>
                              </div>
                            )}
                            {event.postponedTo && (
                              <div className="flex items-center gap-1.5 text-xs text-orange-400">
                                <ChevronRight className="h-3 w-3" />
                                <span>مؤجل إلى: {new Date(event.postponedTo + "T00:00:00").toLocaleDateString("ar-TN")}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex gap-3 items-start">
                            <div className="flex flex-col gap-2 text-sm">
                              {event.time && (
                                <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full font-medium">
                                  <Clock className="h-3.5 w-3.5" />
                                  <span dir="ltr">{event.time}</span>
                                </div>
                              )}
                              {(event.court || event.location) && (
                                <div className="flex items-center gap-1.5 bg-muted/50 px-3 py-1 rounded-full text-muted-foreground text-xs">
                                  <Scale className="h-3.5 w-3.5" />
                                  <span>
                                    {event.court || event.location}
                                    {event.division ? ` — ${event.division}` : ""}
                                  </span>
                                </div>
                              )}
                              {!event.court && event.location && event.court !== event.location && (
                                <div className="flex items-center gap-1.5 bg-muted/50 px-3 py-1 rounded-full text-muted-foreground text-xs">
                                  <MapPin className="h-3.5 w-3.5" />
                                  <span>{event.location}</span>
                                </div>
                              )}
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <button
                                onClick={() => openEdit(event)}
                                className="p-1.5 hover:bg-muted rounded-lg"
                              >
                                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                              <button
                                onClick={() => remove(event.id)}
                                className="p-1.5 hover:bg-destructive/10 rounded-lg"
                              >
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

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "تعديل الموعد" : "موعد جديد"} size="lg">
        <div className="space-y-4">
          <FormField label="عنوان الموعد *" htmlFor="ev-title">
            <Input id="ev-title" placeholder="مثال: جلسة محكمة تونس الابتدائية" className={inputCls}
              value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="نوع الحدث" htmlFor="ev-type">
              <select id="ev-type" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className={inputCls + " px-3 cursor-pointer"}>
                {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </FormField>
            <FormField label="الحالة القانونية" htmlFor="ev-lstatus">
              <select id="ev-lstatus" value={form.legalStatus} onChange={e => setForm(f => ({ ...f, legalStatus: e.target.value }))}
                className={inputCls + " px-3 cursor-pointer"}>
                {LEGAL_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
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

          <div className="grid grid-cols-2 gap-3">
            <FormField label="المحكمة" htmlFor="ev-court">
              <Input id="ev-court" placeholder="المحكمة الابتدائية بتونس" className={inputCls}
                value={form.court} onChange={e => setForm(f => ({ ...f, court: e.target.value }))} />
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
            <select id="ev-case" value={form.caseId} onChange={e => setForm(f => ({ ...f, caseId: e.target.value }))}
              className={inputCls + " px-3 cursor-pointer"}>
              <option value="">— بدون قضية —</option>
              {cases.map(c => (
                <option key={c.id} value={c.id}>
                  {c.caseNumber ? `${c.caseNumber} — ` : ""}{c.title}
                </option>
              ))}
            </select>
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

          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={save}
              disabled={saving || !form.title.trim() || !form.date}>
              {saving ? "جارٍ الحفظ..." : editing ? "حفظ التعديلات" : "حفظ الموعد"}
            </Button>
            <Button variant="outline" onClick={() => setModal(false)} className="px-6">إلغاء</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  FileText, UserPlus, UserMinus, Users, Gavel, Calendar,
  FileUp, FileX, Receipt, DollarSign, Archive, RefreshCw,
  XCircle, Clock, AlertTriangle, Lock, StickyNote, Plus,
  ChevronDown, Loader2, Bot, User, Link2, Pencil
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authFetch } from "@/lib/authFetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/SelectNative";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

// ── Types ────────────────────────────────────────────────────────────────────

interface CaseEventRow {
  id: number;
  caseId: number;
  eventType: string;
  occurredAt: string;
  titleAr: string;
  titleFr?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown>;
  actorUserId?: number | null;
  actorName?: string | null;
  relatedEntityType?: string | null;
  relatedEntityId?: number | null;
  isSystemGenerated: boolean;
  createdAt: string;
}

// ── Icon + color mapping ──────────────────────────────────────────────────────

const EVENT_META: Record<string, { icon: React.ReactNode; color: string }> = {
  case_filed:                { icon: <Gavel className="h-3.5 w-3.5" />,     color: "bg-primary/20 text-primary" },
  case_updated:              { icon: <Pencil className="h-3.5 w-3.5" />,    color: "bg-blue-500/20 text-blue-400" },
  opponent_added:            { icon: <UserPlus className="h-3.5 w-3.5" />,  color: "bg-red-500/20 text-red-400" },
  opponent_removed:          { icon: <UserMinus className="h-3.5 w-3.5" />, color: "bg-red-500/20 text-red-400" },
  team_member_added:         { icon: <UserPlus className="h-3.5 w-3.5" />,  color: "bg-green-500/20 text-green-400" },
  team_member_removed:       { icon: <UserMinus className="h-3.5 w-3.5" />, color: "bg-orange-500/20 text-orange-400" },
  responsible_changed:       { icon: <Users className="h-3.5 w-3.5" />,     color: "bg-blue-500/20 text-blue-400" },
  hearing_scheduled:         { icon: <Calendar className="h-3.5 w-3.5" />,  color: "bg-indigo-500/20 text-indigo-400" },
  hearing_held:              { icon: <Calendar className="h-3.5 w-3.5" />,  color: "bg-green-500/20 text-green-400" },
  hearing_postponed:         { icon: <Calendar className="h-3.5 w-3.5" />,  color: "bg-orange-500/20 text-orange-400" },
  judgment_recorded:         { icon: <Gavel className="h-3.5 w-3.5" />,     color: "bg-violet-500/20 text-violet-400" },
  stage_transitioned:        { icon: <RefreshCw className="h-3.5 w-3.5" />, color: "bg-indigo-500/20 text-indigo-400" },
  document_added:            { icon: <FileUp className="h-3.5 w-3.5" />,    color: "bg-cyan-500/20 text-cyan-400" },
  document_removed:          { icon: <FileX className="h-3.5 w-3.5" />,     color: "bg-red-500/20 text-red-400" },
  invoice_issued:            { icon: <Receipt className="h-3.5 w-3.5" />,   color: "bg-primary/20 text-primary" },
  invoice_paid:              { icon: <DollarSign className="h-3.5 w-3.5" />,color: "bg-green-500/20 text-green-400" },
  invoice_partially_paid:    { icon: <DollarSign className="h-3.5 w-3.5" />,color: "bg-orange-500/20 text-orange-400" },
  payment_received:          { icon: <DollarSign className="h-3.5 w-3.5" />,color: "bg-green-500/20 text-green-400" },
  expense_recorded:          { icon: <Receipt className="h-3.5 w-3.5" />,   color: "bg-orange-500/20 text-orange-400" },
  time_entry_logged:         { icon: <Clock className="h-3.5 w-3.5" />,     color: "bg-blue-500/20 text-blue-400" },
  legal_deadline_added:      { icon: <AlertTriangle className="h-3.5 w-3.5" />, color: "bg-orange-500/20 text-orange-400" },
  legal_deadline_approaching:{ icon: <AlertTriangle className="h-3.5 w-3.5" />, color: "bg-red-500/20 text-red-400" },
  legal_deadline_missed:     { icon: <AlertTriangle className="h-3.5 w-3.5" />, color: "bg-red-500/20 text-red-400" },
  confidentiality_changed:   { icon: <Lock className="h-3.5 w-3.5" />,      color: "bg-orange-500/20 text-orange-400" },
  internal_note_added:       { icon: <StickyNote className="h-3.5 w-3.5" />,color: "bg-orange-500/20 text-orange-400" },
  case_archived:             { icon: <Archive className="h-3.5 w-3.5" />,   color: "bg-muted text-muted-foreground" },
  case_closed:               { icon: <XCircle className="h-3.5 w-3.5" />,   color: "bg-red-500/20 text-red-400" },
  case_reopened:             { icon: <RefreshCw className="h-3.5 w-3.5" />, color: "bg-green-500/20 text-green-400" },
  manual_entry:              { icon: <FileText className="h-3.5 w-3.5" />,  color: "bg-muted text-muted-foreground" },
};

const FILTER_GROUPS = {
  "إجرائي": ["case_filed", "case_updated", "hearing_scheduled", "hearing_held", "hearing_postponed", "judgment_recorded", "stage_transitioned", "legal_deadline_added", "legal_deadline_approaching", "legal_deadline_missed"],
  "مالي":   ["invoice_issued", "invoice_paid", "invoice_partially_paid", "payment_received", "expense_recorded"],
  "إداري":  ["opponent_added", "opponent_removed", "team_member_added", "team_member_removed", "responsible_changed", "case_archived", "case_closed", "case_reopened", "confidentiality_changed"],
  "وثائق":  ["document_added", "document_removed"],
};

// ── Date helpers ──────────────────────────────────────────────────────────────

const DAYS_AR = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const MONTHS_AR = ["جانفي", "فيفري", "مارس", "أفريل", "ماي", "جوان", "جويليه", "أوت", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return `${DAYS_AR[d.getDay()]} ${d.getDate()} ${MONTHS_AR[d.getMonth()]} ${d.getFullYear()}`;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("fr-TN", { hour: "2-digit", minute: "2-digit" });
}

function toDateKey(dateStr: string): string {
  return new Date(dateStr).toISOString().slice(0, 10);
}

// ── Entity link helper ────────────────────────────────────────────────────────

function entityLink(type: string | null | undefined, id: number | null | undefined): string | null {
  if (!type || !id) return null;
  if (type === "invoice") return `/invoices/${id}`;
  if (type === "hearing") return `/agenda?event=${id}`;
  if (type === "opponent") return `/opponents`;
  return null;
}

// ── Manual entry modal ────────────────────────────────────────────────────────

function ManualEntryModal({ caseId, onClose, onSaved }: { caseId: number; onClose: () => void; onSaved: () => void }) {
  const inputCls = "h-10 bg-muted/50 border-border focus-visible:ring-1 focus-visible:ring-primary rounded-lg w-full";
  const [form, setForm] = useState({ eventType: "manual_entry", occurredAt: new Date().toISOString().slice(0, 16), titleAr: "", description: "" });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titleAr.trim()) return;
    setSaving(true);
    try {
      await authFetch(`${BASE}/api/cases/${caseId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, occurredAt: new Date(form.occurredAt).toISOString() }),
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-4">
        <h2 className="font-semibold text-base">إجراء يدوي جديد</h2>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">نوع الحدث</label>
            <SelectNative value={form.eventType} onChange={e => setForm(p => ({ ...p, eventType: e.target.value }))} className={inputCls}>
              <option value="manual_entry">إجراء يدوي</option>
              <option value="judgment_recorded">تسجيل حكم</option>
              <option value="hearing_held">انعقاد جلسة</option>
            </SelectNative>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">التاريخ والوقت</label>
            <input type="datetime-local" value={form.occurredAt} onChange={e => setForm(p => ({ ...p, occurredAt: e.target.value }))}
              className={cn(inputCls, "px-3")} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">العنوان <span className="text-destructive">*</span></label>
            <Input value={form.titleAr} onChange={e => setForm(p => ({ ...p, titleAr: e.target.value }))}
              placeholder="وصف الإجراء..." className={inputCls} required />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">الوصف (اختياري)</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={3} placeholder="تفاصيل إضافية..."
              className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={saving || !form.titleAr.trim()} className="flex-1 gap-1.5">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}حفظ
            </Button>
            <Button type="button" variant="ghost" onClick={onClose} className="flex-1">إلغاء</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function CaseTimeline({ caseId }: { caseId: number }) {
  const [events, setEvents] = useState<CaseEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [filterGroup, setFilterGroup] = useState<string>("الكل");
  const [filterSystem, setFilterSystem] = useState<"all" | "system" | "manual">("all");

  const fetchEvents = useCallback(async (cursor?: string, append = false) => {
    if (!append) setLoading(true); else setLoadingMore(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (cursor) params.set("cursor", cursor);
      if (filterGroup !== "الكل") {
        const types = FILTER_GROUPS[filterGroup as keyof typeof FILTER_GROUPS];
        if (types) params.set("eventType", types.join(","));
      }
      if (search.trim()) params.set("search", search.trim());
      if (filterSystem === "system") params.set("isSystem", "true");
      if (filterSystem === "manual") params.set("isSystem", "false");

      const r = await authFetch(`${BASE}/api/cases/${caseId}/events?${params}`);
      if (!r.ok) return;
      const data = await r.json() as { events: CaseEventRow[]; nextCursor: string | null; hasMore: boolean };
      setEvents(prev => append ? [...prev, ...data.events] : data.events);
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [caseId, filterGroup, search, filterSystem]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // Group by day
  const grouped = events.reduce<Record<string, CaseEventRow[]>>((acc, ev) => {
    const key = toDateKey(ev.occurredAt);
    (acc[key] ??= []).push(ev);
    return acc;
  }, {});
  const days = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-4">
      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-semibold">التسلسل الإجرائي</h3>
          <Button size="sm" onClick={() => setShowModal(true)} className="gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" />إجراء جديد
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-2">
          {/* Row 1: search + category */}
          <div className="flex flex-wrap items-center gap-2">
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="بحث..." className="h-8 text-xs w-40 bg-muted/50 border-border rounded-lg" />
            <span className="text-[10px] text-muted-foreground">النوع:</span>
            {["الكل", ...Object.keys(FILTER_GROUPS)].map(g => (
              <button key={g} onClick={() => setFilterGroup(g)}
                className={cn("text-xs px-3 py-1.5 rounded-full border transition-colors",
                  filterGroup === g
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary/50")}>
                {g}
              </button>
            ))}
          </div>
          {/* Row 2: system/manual toggle */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">المصدر:</span>
            {(["all", "system", "manual"] as const).map(f => (
              <button key={f} onClick={() => setFilterSystem(f)}
                className={cn("text-xs px-2.5 py-1.5 rounded-full border transition-colors",
                  filterSystem === f
                    ? "bg-muted border-primary text-foreground"
                    : "border-border text-muted-foreground hover:border-primary/50")}>
                {f === "all" ? "الكل" : f === "system" ? "تلقائي" : "يدوي"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Timeline ────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /><span className="text-sm">جارٍ التحميل...</span>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">
          <Clock className="h-8 w-8 mx-auto mb-2 opacity-20" />
          <p className="text-sm">لا توجد أحداث مسجلة بعد</p>
          <p className="text-xs mt-1">ستظهر هنا كل الأنشطة المتعلقة بهذا الملف</p>
        </div>
      ) : (
        <div className="space-y-6">
          {days.map(day => (
            <div key={day}>
              {/* Day separator */}
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-medium text-muted-foreground px-2 py-1 bg-muted/50 rounded-full border border-border">
                  {formatDayLabel(grouped[day][0].occurredAt)}
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>

              {/* Events of the day */}
              <div className="relative pr-6">
                <div className="absolute right-2.5 top-0 bottom-0 w-px bg-border/60" />
                <div className="space-y-3">
                  {grouped[day].map(ev => {
                    const meta = EVENT_META[ev.eventType] ?? { icon: <FileText className="h-3.5 w-3.5" />, color: "bg-muted text-muted-foreground" };
                    const link = entityLink(ev.relatedEntityType, ev.relatedEntityId);
                    return (
                      <div key={ev.id} className="flex gap-3">
                        {/* Icon dot */}
                        <div className={cn("h-6 w-6 rounded-full shrink-0 flex items-center justify-center z-10 border border-border/50 -mr-3", meta.color)}>
                          {meta.icon}
                        </div>
                        {/* Card */}
                        <div className="flex-1 p-3 bg-muted/20 rounded-xl border border-border/50 hover:border-border transition-colors">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <p className="font-medium text-sm leading-tight">{ev.titleAr}</p>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] text-muted-foreground font-mono">{formatTime(ev.occurredAt)}</span>
                              {!ev.isSystemGenerated && (
                                <span className="text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full">يدوي</span>
                              )}
                            </div>
                          </div>
                          {ev.description && (
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{ev.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            {ev.actorName ? (
                              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <User className="h-2.5 w-2.5" />{ev.actorName}
                              </span>
                            ) : ev.isSystemGenerated ? (
                              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Bot className="h-2.5 w-2.5" />تلقائي
                              </span>
                            ) : null}
                            {link && (
                              <a href={link} className="flex items-center gap-1 text-[10px] text-primary hover:underline">
                                <Link2 className="h-2.5 w-2.5" />عرض
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button variant="ghost" size="sm" disabled={loadingMore} onClick={() => fetchEvents(nextCursor ?? undefined, true)} className="gap-2 text-xs">
                {loadingMore ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ChevronDown className="h-3.5 w-3.5" />}
                تحميل المزيد
              </Button>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <ManualEntryModal
          caseId={caseId}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchEvents(); }}
        />
      )}
    </div>
  );
}

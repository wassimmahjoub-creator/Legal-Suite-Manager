import React, { useState, useEffect, useCallback } from "react";
import {
  FileText, UserPlus, UserMinus, Users, Gavel, Calendar,
  FileUp, FileX, Receipt, DollarSign, Archive, RefreshCw,
  XCircle, Clock, AlertTriangle, Lock, StickyNote, Plus, CheckCircle2,
  ChevronDown, Loader2, Bot, User, Link2, Pencil,
  Filter, History, ChevronUp, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authFetch } from "@/lib/authFetch";
import { Button } from "@/components/ui/button";
import { SelectNative } from "@/components/SelectNative";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

// ── Types ─────────────────────────────────────────────────────────────────────

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

type FilterGroup = "إجرائي" | "مالي" | "إداري" | "وثائق";

interface ActiveFilters {
  groups: FilterGroup[];
  from: string;
  to: string;
}

// ── Icon + color mapping ──────────────────────────────────────────────────────

const EVENT_META: Record<string, { icon: React.ReactNode; color: string }> = {
  case_filed:                 { icon: <Gavel className="h-4 w-4" />,         color: "bg-primary/20 text-primary" },
  case_updated:               { icon: <Pencil className="h-4 w-4" />,        color: "bg-blue-500/20 text-blue-400" },
  opponent_added:             { icon: <UserPlus className="h-4 w-4" />,      color: "bg-red-500/20 text-red-400" },
  opponent_removed:           { icon: <UserMinus className="h-4 w-4" />,     color: "bg-red-500/20 text-red-400" },
  team_member_added:          { icon: <UserPlus className="h-4 w-4" />,      color: "bg-green-500/20 text-green-400" },
  team_member_removed:        { icon: <UserMinus className="h-4 w-4" />,     color: "bg-orange-500/20 text-orange-400" },
  responsible_changed:        { icon: <Users className="h-4 w-4" />,         color: "bg-blue-500/20 text-blue-400" },
  hearing_scheduled:          { icon: <Calendar className="h-4 w-4" />,      color: "bg-indigo-500/20 text-indigo-400" },
  hearing_held:               { icon: <Calendar className="h-4 w-4" />,      color: "bg-green-500/20 text-green-400" },
  hearing_postponed:          { icon: <Calendar className="h-4 w-4" />,      color: "bg-orange-500/20 text-orange-400" },
  judgment_recorded:          { icon: <Gavel className="h-4 w-4" />,         color: "bg-violet-500/20 text-violet-400" },
  stage_transitioned:         { icon: <RefreshCw className="h-4 w-4" />,     color: "bg-indigo-500/20 text-indigo-400" },
  document_added:             { icon: <FileUp className="h-4 w-4" />,        color: "bg-cyan-500/20 text-cyan-400" },
  document_removed:           { icon: <FileX className="h-4 w-4" />,         color: "bg-red-500/20 text-red-400" },
  invoice_issued:             { icon: <Receipt className="h-4 w-4" />,       color: "bg-primary/20 text-primary" },
  invoice_paid:               { icon: <DollarSign className="h-4 w-4" />,    color: "bg-green-500/20 text-green-400" },
  invoice_partially_paid:     { icon: <DollarSign className="h-4 w-4" />,    color: "bg-orange-500/20 text-orange-400" },
  payment_received:           { icon: <DollarSign className="h-4 w-4" />,    color: "bg-green-500/20 text-green-400" },
  expense_recorded:           { icon: <Receipt className="h-4 w-4" />,       color: "bg-orange-500/20 text-orange-400" },
  time_entry_logged:          { icon: <Clock className="h-4 w-4" />,         color: "bg-blue-500/20 text-blue-400" },
  legal_deadline_added:       { icon: <AlertTriangle className="h-4 w-4" />, color: "bg-orange-500/20 text-orange-400" },
  legal_deadline_approaching: { icon: <AlertTriangle className="h-4 w-4" />, color: "bg-red-500/20 text-red-400" },
  legal_deadline_missed:      { icon: <AlertTriangle className="h-4 w-4" />, color: "bg-red-500/20 text-red-400" },
  confidentiality_changed:    { icon: <Lock className="h-4 w-4" />,          color: "bg-orange-500/20 text-orange-400" },
  internal_note_added:        { icon: <StickyNote className="h-4 w-4" />,    color: "bg-orange-500/20 text-orange-400" },
  case_archived:              { icon: <Archive className="h-4 w-4" />,       color: "bg-muted text-muted-foreground" },
  case_closed:                { icon: <XCircle className="h-4 w-4" />,       color: "bg-red-500/20 text-red-400" },
  case_reopened:              { icon: <RefreshCw className="h-4 w-4" />,     color: "bg-green-500/20 text-green-400" },
  manual_entry:               { icon: <FileText className="h-4 w-4" />,      color: "bg-muted text-muted-foreground" },
  // ── Nouveaux types multi-types ──────────────────────────────────────────
  file_opened:                { icon: <FileText className="h-4 w-4" />,      color: "bg-primary/20 text-primary" },
  consultation_held:          { icon: <CheckCircle2 className="h-4 w-4" />,  color: "bg-green-500/20 text-green-400" },
  contract_drafted:           { icon: <FileText className="h-4 w-4" />,      color: "bg-violet-500/20 text-violet-400" },
  contract_signed:            { icon: <CheckCircle2 className="h-4 w-4" />,  color: "bg-green-500/20 text-green-400" },
  company_step_completed:     { icon: <CheckCircle2 className="h-4 w-4" />,  color: "bg-green-500/20 text-green-400" },
  debt_payment_received:      { icon: <DollarSign className="h-4 w-4" />,    color: "bg-green-500/20 text-green-400" },
  debt_stage_changed:         { icon: <RefreshCw className="h-4 w-4" />,     color: "bg-orange-500/20 text-orange-400" },
  notice_sent:                { icon: <FileText className="h-4 w-4" />,      color: "bg-yellow-500/20 text-yellow-400" },
};

const FILTER_GROUPS: Record<FilterGroup, string[]> = {
  "إجرائي": [
    "case_filed", "case_updated", "file_opened",
    "hearing_scheduled", "hearing_held", "hearing_postponed",
    "judgment_recorded", "stage_transitioned",
    "legal_deadline_added", "legal_deadline_approaching", "legal_deadline_missed",
    "consultation_held", "contract_drafted", "contract_signed",
    "company_step_completed", "debt_stage_changed", "notice_sent",
  ],
  "مالي":   [
    "invoice_issued", "invoice_paid", "invoice_partially_paid",
    "payment_received", "expense_recorded", "debt_payment_received",
  ],
  "إداري":  [
    "opponent_added", "opponent_removed", "team_member_added",
    "team_member_removed", "responsible_changed",
    "case_archived", "case_closed", "case_reopened", "confidentiality_changed",
  ],
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
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}h${m}`;
}

function toDateKey(dateStr: string): string {
  return new Date(dateStr).toISOString().slice(0, 10);
}

function entityLink(type: string | null | undefined, id: number | null | undefined): string | null {
  if (!type || !id) return null;
  if (type === "invoice") return `/billing/${id}`;
  if (type === "document") return `/documents`;
  if (type === "hearing") return `/agenda?event=${id}`;
  if (type === "opponent") return `/opponents`;
  if (type === "deadline") return null;
  return null;
}

function hasActiveFilters(f: ActiveFilters): boolean {
  return f.groups.length > 0 || !!f.from || !!f.to;
}

// ── Manual entry modal ────────────────────────────────────────────────────────

function ManualEntryModal({ caseId, onClose, onSaved }: { caseId: number; onClose: () => void; onSaved: () => void }) {
  const inputCls = "h-10 bg-muted/50 border border-border focus:outline-none focus:ring-1 focus:ring-primary rounded-lg w-full px-3 text-sm";
  const [form, setForm] = useState({
    eventType: "manual_entry",
    occurredAt: new Date().toISOString().slice(0, 16),
    titleAr: "",
    description: "",
  });
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-base">تسجيل إجراء جديد</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">نوع الإجراء</label>
            <SelectNative value={form.eventType} onChange={e => setForm(p => ({ ...p, eventType: e.target.value }))} className={inputCls}>
              <option value="manual_entry">إجراء يدوي</option>
              <option value="judgment_recorded">تسجيل حكم</option>
              <option value="hearing_held">انعقاد جلسة</option>
            </SelectNative>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">التاريخ والوقت</label>
            <input type="datetime-local" value={form.occurredAt}
              onChange={e => setForm(p => ({ ...p, occurredAt: e.target.value }))}
              className={inputCls} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">
              العنوان <span className="text-destructive">*</span>
            </label>
            <input type="text" value={form.titleAr}
              onChange={e => setForm(p => ({ ...p, titleAr: e.target.value }))}
              placeholder="وصف الإجراء..." className={inputCls} required />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">الوصف (اختياري)</label>
            <textarea value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={3} placeholder="تفاصيل إضافية..."
              className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={saving || !form.titleAr.trim()} className="flex-1 gap-2">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}حفظ
            </Button>
            <Button type="button" variant="ghost" onClick={onClose} className="flex-1">إلغاء</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── State 1: Empty ────────────────────────────────────────────────────────────

function TimelineEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
      <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center">
        <History className="h-8 w-8 text-muted-foreground/30" />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">سيظهر هنا تاريخ هذا الملف</h3>
        <p className="text-sm text-muted-foreground">كل جلسة، حكم، فاتورة، أو وثيقة تضاف تلقائياً</p>
      </div>
      <Button onClick={onAdd} className="gap-2 mt-2">
        <Plus className="h-4 w-4" />
        تسجيل إجراء يدوي
      </Button>
    </div>
  );
}

// ── Filter panel (State 3) ────────────────────────────────────────────────────

function FilterPanel({
  filters,
  onChange,
  onClose,
}: {
  filters: ActiveFilters;
  onChange: (f: ActiveFilters) => void;
  onClose: () => void;
}) {
  function toggleGroup(g: FilterGroup) {
    const next = filters.groups.includes(g)
      ? filters.groups.filter(x => x !== g)
      : [...filters.groups, g];
    onChange({ ...filters, groups: next });
  }

  function clearAll() {
    onChange({ groups: [], from: "", to: "" });
  }

  const chipBase = "text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer select-none";
  const chipActive = "bg-primary text-primary-foreground border-primary";
  const chipIdle = "border-border text-muted-foreground hover:border-primary/50";

  return (
    <div className="border border-border rounded-xl bg-muted/20 p-4 space-y-4">
      {/* النوع */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">النوع</p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(FILTER_GROUPS) as FilterGroup[]).map(g => (
            <button key={g} onClick={() => toggleGroup(g)}
              className={cn(chipBase, filters.groups.includes(g) ? chipActive : chipIdle)}>
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* الفترة */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">الفترة</p>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">من</span>
            <input type="date" value={filters.from}
              onChange={e => onChange({ ...filters, from: e.target.value })}
              className="h-8 bg-muted/50 border border-border rounded-lg px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">إلى</span>
            <input type="date" value={filters.to}
              onChange={e => onChange({ ...filters, to: e.target.value })}
              className="h-8 bg-muted/50 border border-border rounded-lg px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-1">
        {hasActiveFilters(filters) && (
          <button onClick={clearAll}
            className="text-xs text-destructive hover:underline flex items-center gap-1">
            <X className="h-3 w-3" />مسح المرشحات
          </button>
        )}
        <button onClick={onClose}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mr-auto">
          <ChevronUp className="h-3.5 w-3.5" />إخفاء التصفية
        </button>
      </div>
    </div>
  );
}

// ── Timeline event list ───────────────────────────────────────────────────────

function TimelineList({
  events,
  hasMore,
  loadingMore,
  onLoadMore,
}: {
  events: CaseEventRow[];
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}) {
  const grouped = events.reduce<Record<string, CaseEventRow[]>>((acc, ev) => {
    const key = toDateKey(ev.occurredAt);
    (acc[key] ??= []).push(ev);
    return acc;
  }, {});
  const days = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-6">
      {days.map(day => (
        <div key={day}>
          {/* Day separator */}
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px flex-1 bg-border/60" />
            <span className="text-[11px] font-medium text-muted-foreground px-2.5 py-1 bg-muted/40 rounded-full border border-border/60">
              {formatDayLabel(grouped[day][0].occurredAt)}
            </span>
            <div className="h-px flex-1 bg-border/60" />
          </div>

          {/* Events */}
          <div className="relative pr-5">
            <div className="absolute right-2 top-3 bottom-3 w-px bg-border/40" />
            <div className="space-y-2.5">
              {grouped[day].map(ev => {
                const meta = EVENT_META[ev.eventType] ?? { icon: <FileText className="h-4 w-4" />, color: "bg-muted text-muted-foreground" };
                const link = entityLink(ev.relatedEntityType, ev.relatedEntityId);
                const fullLink = link ? `${BASE}${link}` : null;
                return (
                  <div key={ev.id}
                    className={cn(
                      "flex items-start gap-3 rounded-xl transition-colors",
                      fullLink && "cursor-pointer hover:bg-muted/30 -mx-2 px-2 py-1"
                    )}
                    onClick={fullLink ? () => { window.location.href = fullLink; } : undefined}
                  >
                    {/* Icon dot */}
                    <div className={cn(
                      "h-8 w-8 rounded-full shrink-0 flex items-center justify-center z-10",
                      "border border-border/50 -mr-1 mt-0.5 shadow-sm",
                      meta.color
                    )}>
                      {meta.icon}
                    </div>

                    {/* Card */}
                    <div className="flex-1 pb-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn("font-medium text-sm leading-snug", fullLink && "group-hover:text-primary")}>{ev.titleAr}</p>
                        <div className="flex items-center gap-2 shrink-0 mt-0.5">
                          {fullLink && (
                            <Link2 className="h-3 w-3 text-primary/50" />
                          )}
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {formatTime(ev.occurredAt)}
                          </span>
                        </div>
                      </div>

                      {ev.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 italic leading-relaxed">
                          {ev.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {ev.actorName ? (
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <User className="h-2.5 w-2.5" />{ev.actorName}
                          </span>
                        ) : ev.isSystemGenerated ? (
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Bot className="h-2.5 w-2.5" />تلقائي
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}

      {hasMore && (
        <div className="flex justify-center pt-1">
          <Button variant="ghost" size="sm" disabled={loadingMore} onClick={onLoadMore} className="gap-2 text-xs">
            {loadingMore ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ChevronDown className="h-3.5 w-3.5" />}
            تحميل المزيد
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function CaseTimeline({ caseId }: { caseId: number }) {
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [events, setEvents] = useState<CaseEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState<ActiveFilters>({ groups: [], from: "", to: "" });

  // Fetch total count on mount
  useEffect(() => {
    authFetch(`${BASE}/api/cases/${caseId}/events?count_only=true`)
      .then(r => r.json() as Promise<{ count: number }>)
      .then(d => setTotalCount(d.count))
      .catch(() => setTotalCount(0));
  }, [caseId]);

  const fetchEvents = useCallback(async (cursor?: string, append = false) => {
    if (!append) setLoading(true); else setLoadingMore(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (cursor) params.set("cursor", cursor);

      if (filters.groups.length > 0) {
        const types = filters.groups.flatMap(g => FILTER_GROUPS[g]);
        params.set("eventType", types.join(","));
      }
      if (filters.from) params.set("from", new Date(filters.from).toISOString());
      if (filters.to) {
        const toDate = new Date(filters.to);
        toDate.setHours(23, 59, 59, 999);
        params.set("to", toDate.toISOString());
      }

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
  }, [caseId, filters]);

  useEffect(() => {
    if (totalCount === null) return;
    if (totalCount === 0) { setLoading(false); return; }
    fetchEvents();
  }, [fetchEvents, totalCount]);

  function handleSaved() {
    setShowModal(false);
    // Increment count so useEffect fires fetchEvents() once — no direct call to avoid double fetch
    setTotalCount(c => (c ?? 0) + 1);
  }

  function handleFiltersChange(f: ActiveFilters) {
    setFilters(f);
  }

  const isState3 = totalCount !== null && totalCount >= 11;
  const filtersActive = hasActiveFilters(filters);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (totalCount === null) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  // ── State 1: Empty ────────────────────────────────────────────────────────
  if (totalCount === 0) {
    return (
      <>
        <TimelineEmptyState onAdd={() => setShowModal(true)} />
        {showModal && (
          <ManualEntryModal caseId={caseId} onClose={() => setShowModal(false)} onSaved={handleSaved} />
        )}
      </>
    );
  }

  // ── State 2 + 3 ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header — always justify-between so the add button stays on the right and never shifts */}
      <div className="flex items-center justify-between gap-2">
        {isState3 ? (
          <Button variant="ghost" size="sm" onClick={() => setShowFilter(v => !v)}
            className={cn("gap-1.5 text-xs", showFilter && "bg-muted")}>
            <Filter className="h-3.5 w-3.5" />
            تصفية
            {filtersActive && (
              <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
            )}
          </Button>
        ) : (
          <div />
        )}
        <Button size="sm" onClick={() => setShowModal(true)} className="gap-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" />
          تسجيل إجراء يدوي
        </Button>
      </div>

      {/* Filter panel (State 3 only) */}
      {isState3 && showFilter && (
        <FilterPanel
          filters={filters}
          onChange={handleFiltersChange}
          onClose={() => setShowFilter(false)}
        />
      )}

      {/* Timeline content */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">جارٍ التحميل...</span>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground border border-dashed border-border rounded-xl">
          <Clock className="h-7 w-7 mx-auto mb-2 opacity-20" />
          <p className="text-sm">لا نتائج لهذه التصفية.</p>
          {filtersActive && (
            <button onClick={() => setFilters({ groups: [], from: "", to: "" })}
              className="text-xs text-primary hover:underline mt-1">
              مسح المرشحات
            </button>
          )}
        </div>
      ) : (
        <TimelineList
          events={events}
          hasMore={hasMore}
          loadingMore={loadingMore}
          onLoadMore={() => fetchEvents(nextCursor ?? undefined, true)}
        />
      )}

      {showModal && (
        <ManualEntryModal caseId={caseId} onClose={() => setShowModal(false)} onSaved={handleSaved} />
      )}
    </div>
  );
}

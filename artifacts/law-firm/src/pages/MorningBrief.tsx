/**
 * إحاطة الصباح — Morning Brief
 * A creative command-centre page designed around a lawyer's morning workflow.
 *
 * Sections (deliberately chosen):
 *  1. Greeting banner — time-aware, personalised, motivational
 *  2. Quick-stats strip — 4 KPIs at a glance
 *  3. Agenda du jour (2/3) — unified session + task timeline sorted by time
 *  4. Priorités (1/3) — urgent alerts + deadlines ≤ 7 days
 *  5. Radar des dossiers — 4 most-recently active cases
 *  6. Santé financière — income bar + pending invoices
 *  7. Prochaines consultations — today/tomorrow client meetings
 */

import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetDashboardSummary, useGetDashboardToday, useGetDashboardAlerts,
  useUpdateTask, getGetDashboardTodayQueryKey,
} from "@workspace/api-client-react";
import { TNDAmount } from "@/components/Money";
import { cn } from "@/lib/utils";
import { authFetch } from "@/lib/authFetch";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Briefcase, CalendarClock, Timer, Receipt, CheckCircle2, Circle,
  AlertTriangle, ChevronLeft, Users, Scale, TrendingUp,
  Sunrise, ArrowLeft, Plus, Star, Zap, Coffee,
  Clock, FileText, MessageSquare, ClipboardList,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

/* ─── Types ─────────────────────────────────────────── */

type RawCase = {
  id: number; title: string; status: string;
  clientName?: string | null; caseNumber?: string | null;
  updatedAt?: string | null; procedureStage?: string | null;
};

type Deadline = {
  id: number; caseId: number; caseName?: string | null;
  title: string; type: string; dueDate: string;
  urgency: string; completedAt: string | null;
};

type Consultation = {
  id: number; subject?: string | null; clientName?: string | null;
  consultationDate?: string | null; status?: string | null; fee?: number | null;
};

/* ─── Helpers ────────────────────────────────────────── */

function daysLeft(d: string) {
  const today = new Date(); today.setHours(0,0,0,0);
  const due   = new Date(d); due.setHours(0,0,0,0);
  return Math.ceil((due.getTime() - today.getTime()) / 86_400_000);
}

function greeting(name?: string) {
  const h = new Date().getHours();
  const salut =
    h < 5  ? "ليلة سعيدة"   :
    h < 12 ? "صباح الخير"    :
    h < 17 ? "مساء النور"    :
             "مساء الخير";
  return name ? `${salut}، ${name.split(" ")[0]}` : salut;
}

function motivational(pendingCount: number, sessionsCount: number) {
  if (pendingCount === 0 && sessionsCount === 0)
    return "لا جلسات ولا مهام اليوم — يوم للتخطيط والمراجعة.";
  if (pendingCount === 0)
    return `لديك ${sessionsCount > 1 ? `${sessionsCount} جلسات` : "جلسة واحدة"} اليوم. أداء ممتاز!`;
  if (sessionsCount === 0)
    return `${pendingCount} مهمة تنتظرك. ابدأ بالأهم.`;
  return `${sessionsCount} جلسة و${pendingCount} مهمة اليوم. يوم مثمر!`;
}

const STAGE_LABELS: Record<string, string> = {
  ibtidai: "ابتدائي", istinaf: "استئناف",
  taaqqib: "تعقيب", tanfidh: "تنفيذ", khatm: "ختم",
};
const STATUS_META: Record<string, { label: string; cls: string }> = {
  active:    { label: "نشط",   cls: "bg-emerald-500/12 text-emerald-400 border-emerald-500/25" },
  pending:   { label: "انتظار", cls: "bg-amber-500/12 text-amber-400 border-amber-500/25"   },
  suspended: { label: "موقوف", cls: "bg-amber-500/12 text-amber-400 border-amber-500/25"    },
  closed:    { label: "مغلق",  cls: "bg-muted/60 text-muted-foreground border-border"        },
};

/* ─── Sub-components ─────────────────────────────────── */

function Pill({ label, value, icon: Icon, color }: {
  label: string; value: React.ReactNode;
  icon: React.ElementType; color: string;
}) {
  return (
    <div className={cn(
      "flex items-center gap-2.5 px-4 py-3 rounded-xl border",
      color
    )}>
      <Icon className="h-4 w-4 shrink-0" />
      <div className="text-right min-w-0">
        <p className="text-xs opacity-70 leading-tight">{label}</p>
        <p className="text-base font-bold leading-tight tabular-nums">{value}</p>
      </div>
    </div>
  );
}

function TimelineItem({
  time, title, subtitle, icon: Icon,
  iconCls, done, onToggle, onClick, toggling,
}: {
  time?: string | null; title: string; subtitle?: string | null;
  icon: React.ElementType; iconCls?: string;
  done?: boolean; onToggle?: () => void; onClick?: () => void;
  toggling?: boolean;
}) {
  return (
    <div className="flex gap-3">
      {/* vertical line + dot */}
      <div className="flex flex-col items-center shrink-0">
        <div className={cn(
          "h-7 w-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
          done
            ? "bg-emerald-500/15 border-emerald-500/40"
            : "bg-background border-border"
        )}>
          {onToggle ? (
            <button onClick={onToggle} disabled={toggling}
              className={cn("focus:outline-none transition-opacity", toggling && "opacity-40")}>
              {done
                ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                : <Circle className="h-3.5 w-3.5 text-muted-foreground/30" />}
            </button>
          ) : (
            <Icon className={cn("h-3.5 w-3.5", iconCls ?? "text-primary")} />
          )}
        </div>
        <div className="w-px flex-1 bg-border/40 my-0.5" />
      </div>
      {/* content */}
      <div
        className={cn(
          "flex-1 pb-4 text-right",
          (onToggle || onClick) && "cursor-pointer"
        )}
        onClick={onToggle ?? onClick}
      >
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            "text-sm font-medium leading-snug",
            done && "line-through text-muted-foreground"
          )}>{title}</p>
          {time && (
            <span className="text-xs text-muted-foreground/60 shrink-0 tabular-nums">{time}</span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────── */

export default function MorningBrief() {
  const [, navigate]  = useLocation();
  const { user }      = useAuth();
  const queryClient   = useQueryClient();
  const updateTask    = useUpdateTask();

  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary({ query: { staleTime: 0 } });
  const { data: today,   isLoading: loadingToday   } = useGetDashboardToday({ query: { staleTime: 0 } });
  const { data: alerts,  isLoading: loadingAlerts  } = useGetDashboardAlerts({ query: { staleTime: 0 } });

  const [deadlines,      setDeadlines]      = useState<Deadline[]>([]);
  const [recentCases,    setRecentCases]    = useState<RawCase[]>([]);
  const [consultations,  setConsultations]  = useState<Consultation[]>([]);
  const [loadingExtra,   setLoadingExtra]   = useState(true);
  const [togglingIds,    setTogglingIds]    = useState<Set<number>>(new Set());

  useEffect(() => {
    Promise.all([
      authFetch(`${BASE}/api/deadlines`).then(r => r.ok ? r.json() : []),
      authFetch(`${BASE}/api/cases`).then(r => r.ok ? r.json() : []),
      authFetch(`${BASE}/api/consultations`).then(r => r.ok ? r.json() : []),
    ]).then(([dl, cs, con]) => {
      const now = new Date(); now.setHours(0,0,0,0);
      const cutoff14 = new Date(now); cutoff14.setDate(cutoff14.getDate() + 14);
      setDeadlines(
        (Array.isArray(dl) ? dl as Deadline[] : [])
          .filter(d => !d.completedAt && new Date(d.dueDate) <= cutoff14)
          .sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
          .slice(0, 8)
      );
      setRecentCases(
        (Array.isArray(cs) ? cs as RawCase[] : [])
          .filter(c => c.status === "active")
          .slice(0, 4)
      );
      // consultations today + tomorrow
      const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 2);
      setConsultations(
        (Array.isArray(con) ? con as Consultation[] : [])
          .filter(c => {
            if (!c.consultationDate) return false;
            const d = new Date(c.consultationDate);
            return d >= now && d <= tomorrow;
          })
          .sort((a,b) => new Date(a.consultationDate!).getTime() - new Date(b.consultationDate!).getTime())
          .slice(0, 5)
      );
    }).catch(() => {}).finally(() => setLoadingExtra(false));
  }, []);

  function toggleTask(id: number, done: boolean, title: string) {
    setTogglingIds(prev => new Set(prev).add(id));
    updateTask.mutate(
      { id, data: { title, done: !done } },
      { onSettled: () => {
          setTogglingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
          queryClient.invalidateQueries({ queryKey: getGetDashboardTodayQueryKey() });
        },
      }
    );
  }

  const pendingTasks = today?.tasks?.filter(t => !t.done) ?? [];
  const urgentDl = deadlines.filter(d => daysLeft(d.dueDate) <= 3);
  const upcomingDl = deadlines.filter(d => daysLeft(d.dueDate) > 3);

  /* Merge sessions + tasks into one timeline (sessions first since they have times) */
  const agenda = useMemo(() => {
    const items: Array<{
      key: string; time?: string | null; title: string;
      subtitle?: string | null; kind: "session" | "task";
      id: number; done?: boolean; caseId?: number | null;
    }> = [];
    (today?.sessions ?? []).forEach(s => items.push({
      key: `s-${s.id}`, time: s.time, title: s.title ?? "جلسة",
      subtitle: s.caseName, kind: "session", id: s.id, caseId: s.caseId,
    }));
    (today?.tasks ?? []).forEach(t => items.push({
      key: `t-${t.id}`, title: t.title ?? "مهمة",
      subtitle: t.caseName, kind: "task", id: t.id,
      done: t.done ?? false, caseId: t.caseId,
    }));
    // sessions with times first, then tasks
    return items.sort((a, b) => {
      if (a.kind === "session" && b.kind !== "session") return -1;
      if (b.kind === "session" && a.kind !== "session") return 1;
      return 0;
    });
  }, [today]);

  /* Monthly income progress vs target (arbitrary 10k TND) */
  const income  = Number(summary?.monthlyIncome ?? 0);
  const target  = 10_000;
  const pct     = Math.min(100, Math.round((income / target) * 100));

  const greetText = greeting(user?.name ?? "");
  const motive    = motivational(pendingTasks.length, today?.sessions?.length ?? 0);

  return (
    <div className="space-y-6 pb-10">

      {/* ══════════════════════════════════════════════════════
          1. BANNER — Greeting
         ══════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-2xl px-6 py-5 border border-primary/20"
        style={{
          background: "linear-gradient(135deg, color-mix(in oklch, var(--primary) 12%, var(--background)), color-mix(in oklch, var(--primary) 4%, var(--background)))"
        }}>
        {/* decorative arc */}
        <div className="absolute -top-10 -start-10 h-40 w-40 rounded-full opacity-[0.06]"
          style={{ background: "var(--primary)" }} />
        <div className="absolute -bottom-8 -end-8 h-28 w-28 rounded-full opacity-[0.04]"
          style={{ background: "var(--primary)" }} />

        <div className="relative flex items-start justify-between gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <Sunrise className="h-5 w-5 text-primary/60" />
            <span className="text-xs text-muted-foreground tabular-nums">
              {new Date().toLocaleDateString("ar-TN", {
                weekday: "long", day: "numeric", month: "long", year: "numeric"
              })}
            </span>
          </div>
          <div className="text-right">
            <h1 className="text-xl font-bold text-foreground leading-tight">{greetText}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{motive}</p>
          </div>
        </div>

        {/* quick-action strip inside banner */}
        <div className="relative mt-4 flex flex-wrap gap-2 justify-end">
          {[
            { label: "ملف جديد",      path: "/cases/new",       icon: Briefcase    },
            { label: "جلسة جديدة",    path: "/calendar",        icon: CalendarClock},
            { label: "فاتورة",         path: "/billing/new",     icon: Receipt      },
            { label: "استشارة",        path: "/consultations",   icon: MessageSquare},
          ].map(a => (
            <button key={a.path}
              onClick={() => navigate(a.path)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/20 bg-background/60 hover:bg-background/90 text-xs font-medium transition-all"
            >
              <a.icon className="h-3.5 w-3.5 text-primary/70" />
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          2. KPI STRIP
         ══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Pill
          label="ملفات جارية"
          value={loadingSummary ? <Skeleton className="h-5 w-8 inline-block" /> : summary?.activeCases ?? 0}
          icon={Briefcase}
          color="bg-primary/6 border-primary/20 text-primary"
        />
        <Pill
          label="جلسات اليوم"
          value={loadingToday ? <Skeleton className="h-5 w-8 inline-block" /> : today?.sessions?.length ?? 0}
          icon={CalendarClock}
          color="bg-blue-500/8 border-blue-500/20 text-blue-400"
        />
        <Pill
          label="مهام معلقة"
          value={loadingToday ? <Skeleton className="h-5 w-8 inline-block" /> : pendingTasks.length}
          icon={ClipboardList}
          color={pendingTasks.length > 0
            ? "bg-amber-500/8 border-amber-500/20 text-amber-400"
            : "bg-emerald-500/8 border-emerald-500/20 text-emerald-400"}
        />
        <Pill
          label="فواتير معلقة"
          value={loadingSummary ? <Skeleton className="h-5 w-8 inline-block" /> : summary?.pendingInvoices ?? 0}
          icon={Receipt}
          color={(summary?.pendingInvoices ?? 0) > 0
            ? "bg-rose-500/8 border-rose-500/20 text-rose-400"
            : "bg-muted/40 border-border text-muted-foreground"}
        />
      </div>

      {/* ══════════════════════════════════════════════════════
          3. MAIN: Agenda (2/3) + Priorités (1/3)
         ══════════════════════════════════════════════════════ */}
      <div className="grid gap-5 lg:grid-cols-3">

        {/* ── Agenda du jour ── */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <button onClick={() => navigate("/calendar")}
              className="text-xs text-primary hover:underline flex items-center gap-1 font-medium">
              <ArrowLeft className="h-3 w-3" /> الرزنامة الكاملة
            </button>
            <h2 className="font-bold text-sm flex items-center gap-2">
              <Coffee className="h-4 w-4 text-primary/50" />
              أجندة اليوم
            </h2>
          </div>

          <div className="rounded-xl border border-border/60 bg-card px-5 pt-5 pb-2 shadow-sm">
            {(loadingToday) ? (
              <div className="space-y-4">
                {[1,2,3].map(i => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5 pt-1">
                      <Skeleton className="h-3.5 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : agenda.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm space-y-2">
                <Coffee className="h-8 w-8 mx-auto opacity-10 mb-3" />
                <p className="font-medium">لا جلسات ولا مهام اليوم</p>
                <p className="text-xs opacity-60">يوم مثالي للمراجعة والتخطيط</p>
                <button onClick={() => navigate("/calendar")}
                  className="mt-2 text-xs text-primary hover:underline">
                  + إضافة حدث
                </button>
              </div>
            ) : (
              <div>
                {agenda.map((item, idx) => {
                  const isLast = idx === agenda.length - 1;
                  const Icon = item.kind === "session" ? CalendarClock : FileText;
                  return (
                    <div key={item.key} className={cn("flex gap-3", !isLast && "")}>
                      {/* dot + line */}
                      <div className="flex flex-col items-center shrink-0">
                        <div className={cn(
                          "h-7 w-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                          item.done
                            ? "bg-emerald-500/15 border-emerald-500/40"
                            : item.kind === "session"
                              ? "bg-primary/10 border-primary/30"
                              : "bg-background border-border"
                        )}>
                          {item.kind === "task" ? (
                            <button
                              onClick={() => toggleTask(item.id, item.done!, today?.tasks?.find(t => t.id === item.id)?.title ?? "")}
                              disabled={togglingIds.has(item.id)}
                              className={cn("focus:outline-none", togglingIds.has(item.id) && "opacity-40")}
                            >
                              {item.done
                                ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                                : <Circle className="h-3.5 w-3.5 text-muted-foreground/30" />}
                            </button>
                          ) : (
                            <Icon className="h-3.5 w-3.5 text-primary" />
                          )}
                        </div>
                        {!isLast && <div className="w-px flex-1 bg-border/40 my-0.5 min-h-[16px]" />}
                      </div>
                      {/* content */}
                      <div
                        className={cn("flex-1 text-right pb-4", (item.caseId) && "cursor-pointer")}
                        onClick={() => item.caseId ? navigate(`/cases/${item.caseId}`) : undefined}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 shrink-0">
                            {item.time && (
                              <span className="text-xs text-muted-foreground/60 tabular-nums">{item.time}</span>
                            )}
                            {item.kind === "session" && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/15 font-medium">
                                جلسة
                              </span>
                            )}
                          </div>
                          <p className={cn(
                            "text-sm font-medium leading-snug",
                            item.done && "line-through text-muted-foreground"
                          )}>{item.title}</p>
                        </div>
                        {item.subtitle && (
                          <p className="text-xs text-muted-foreground mt-0.5">{item.subtitle}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Priorités du jour ── */}
        <div className="space-y-3">
          <h2 className="font-bold text-sm flex items-center gap-2 justify-end">
            <Zap className="h-4 w-4 text-amber-400" />
            الأولويات العاجلة
          </h2>

          {/* Urgent alerts */}
          {(loadingAlerts || (alerts && alerts.length > 0)) && (
            <div className="rounded-xl border border-red-500/25 bg-red-500/5 overflow-hidden shadow-sm">
              <div className="px-4 py-2.5 border-b border-red-500/15 flex items-center justify-end gap-2">
                <span className="text-xs font-semibold text-red-400">تنبيهات</span>
                <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
              </div>
              <div className="divide-y divide-red-500/10">
                {loadingAlerts ? (
                  <div className="p-3 space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : alerts?.map(a => (
                  <div key={a.id}
                    className="px-4 py-2.5 flex items-center gap-2 hover:bg-red-500/5 transition-colors cursor-pointer"
                    onClick={() => a.caseId ? navigate(`/cases/${a.caseId}`) : navigate("/billing")}
                  >
                    <ChevronLeft className="h-3 w-3 text-red-400/40 shrink-0" />
                    <p className="flex-1 text-xs font-medium text-right leading-snug truncate">{a.message}</p>
                    <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Urgent deadlines ≤ 7 days */}
          <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
            <div className="px-4 py-2.5 border-b border-border/50 flex items-center justify-between">
              <span className={cn(
                "text-xs font-bold tabular-nums px-2 py-0.5 rounded-full",
                urgentDl.length > 0
                  ? "bg-red-500/15 text-red-400"
                  : "bg-muted/50 text-muted-foreground"
              )}>
                {loadingExtra ? "…" : urgentDl.length}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold">آجال حرجة — 7 أيام</span>
                <Timer className="h-3.5 w-3.5 text-amber-400" />
              </div>
            </div>
            <div className="divide-y divide-border/40">
              {loadingExtra ? (
                <div className="p-3 space-y-2">
                  {[1,2].map(i => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : urgentDl.length === 0 ? (
                <div className="py-5 text-center text-muted-foreground text-xs space-y-1">
                  <CheckCircle2 className="h-6 w-6 mx-auto text-emerald-400/40 mb-1.5" />
                  <p>لا آجال حرجة قادمة</p>
                </div>
              ) : urgentDl.slice(0, 5).map(d => {
                const days = daysLeft(d.dueDate);
                const overdue = days < 0;
                return (
                  <div key={d.id}
                    className="px-4 py-2.5 flex items-center gap-2 hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => d.caseId ? navigate(`/cases/${d.caseId}`) : undefined}
                  >
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full border shrink-0 font-semibold tabular-nums",
                      overdue
                        ? "bg-red-500/15 text-red-400 border-red-500/25"
                        : days <= 1
                          ? "bg-red-500/12 text-red-400 border-red-500/20"
                          : "bg-amber-500/12 text-amber-400 border-amber-500/20"
                    )}>
                      {overdue ? `−${Math.abs(days)}ي` : days === 0 ? "اليوم" : `${days}ي`}
                    </span>
                    <div className="flex-1 text-right min-w-0">
                      <p className="text-xs font-medium truncate">{d.title}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{d.caseName}</p>
                    </div>
                    <Timer className="h-3 w-3 text-muted-foreground/30 shrink-0" />
                  </div>
                );
              })}
            </div>
            {upcomingDl.length > 0 && (
              <div className="px-4 py-2 border-t border-border/40">
                <button onClick={() => navigate("/cases")}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                  <ArrowLeft className="h-3 w-3" />
                  {upcomingDl.length} أجل قادم
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          4. RADAR — Active cases
         ══════════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => navigate("/cases")}
            className="text-xs text-primary hover:underline flex items-center gap-1 font-medium">
            <ArrowLeft className="h-3 w-3" /> كل الملفات
          </button>
          <h2 className="font-bold text-sm flex items-center gap-2">
            <Scale className="h-4 w-4 text-primary/60" />
            رادار الملفات الجارية
          </h2>
        </div>

        {loadingExtra ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        ) : recentCases.length === 0 ? (
          <div className="rounded-xl border border-border/60 bg-card py-8 text-center text-muted-foreground text-sm shadow-sm">
            <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-10" />
            <p>لا ملفات جارية حالياً</p>
            <button onClick={() => navigate("/cases/new")}
              className="mt-2 text-xs text-primary hover:underline">
              + ملف جديد
            </button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {recentCases.map(c => {
              const s = STATUS_META[c.status] || STATUS_META.active;
              const stage = c.procedureStage ? STAGE_LABELS[c.procedureStage] : null;
              return (
                <div key={c.id}
                  onClick={() => navigate(`/cases/${c.id}`)}
                  className="group rounded-xl border border-border/60 bg-card hover:border-primary/30 hover:shadow-md transition-all cursor-pointer p-4 space-y-3"
                >
                  {/* header */}
                  <div className="flex items-start justify-between gap-2">
                    <span className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full border font-medium shrink-0",
                      s.cls
                    )}>
                      {s.label}
                    </span>
                    {stage && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/8 text-primary border border-primary/15 font-medium shrink-0">
                        {stage}
                      </span>
                    )}
                  </div>
                  {/* title */}
                  <div className="text-right">
                    <p className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                      {c.title}
                    </p>
                    {c.clientName && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center justify-end gap-1">
                        {c.clientName}
                        <Users className="h-3 w-3" />
                      </p>
                    )}
                  </div>
                  {/* footer */}
                  {c.caseNumber && (
                    <p className="text-[10px] text-muted-foreground/50 text-right border-t border-border/30 pt-2">
                      {c.caseNumber}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════
          5. BOTTOM: Financial health + Consultations
         ══════════════════════════════════════════════════════ */}
      <div className="grid gap-5 lg:grid-cols-2">

        {/* Santé financière */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => navigate("/billing")}
              className="text-xs text-primary hover:underline flex items-center gap-1 font-medium">
              <ArrowLeft className="h-3 w-3" /> الفواتير
            </button>
            <h2 className="font-bold text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              النبضة المالية
            </h2>
          </div>
          <div className="rounded-xl border border-border/60 bg-card shadow-sm p-5 space-y-4">
            {/* income bar */}
            <div>
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-xs text-muted-foreground">
                  هدف الشهر: <TNDAmount amount={target} />
                </span>
                <div className="text-right">
                  <span className="text-lg font-bold text-emerald-400 tabular-nums">
                    {loadingSummary
                      ? <Skeleton className="h-5 w-24 inline-block" />
                      : <TNDAmount amount={income} />}
                  </span>
                  <span className="text-xs text-muted-foreground mr-1.5">المداخيل هذا الشهر</span>
                </div>
              </div>
              <div className="h-2.5 rounded-full bg-muted/40 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${pct}%`,
                    background: pct >= 100
                      ? "var(--color-emerald-500)"
                      : pct >= 60
                        ? "color-mix(in oklch, var(--primary) 80%, var(--color-emerald-500))"
                        : "var(--primary)"
                  }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-muted-foreground/50">{pct}%</span>
                <span className="text-[10px] text-muted-foreground/50">
                  {pct < 100 ? `${100-pct}% متبقٍ` : "الهدف محقق!"}
                </span>
              </div>
            </div>
            {/* metrics row */}
            <div className="grid grid-cols-3 gap-3 pt-1 border-t border-border/40">
              <div className="text-center">
                <p className="text-base font-bold tabular-nums text-primary">
                  {loadingSummary ? <Skeleton className="h-5 w-8 mx-auto" /> : summary?.activeCases ?? 0}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">ملف جارٍ</p>
              </div>
              <div className="text-center border-x border-border/40">
                <p className={cn(
                  "text-base font-bold tabular-nums",
                  (summary?.pendingInvoices ?? 0) > 0 ? "text-amber-400" : "text-foreground"
                )}>
                  {loadingSummary ? <Skeleton className="h-5 w-8 mx-auto" /> : summary?.pendingInvoices ?? 0}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">فاتورة معلقة</p>
              </div>
              <div className="text-center">
                <p className="text-base font-bold tabular-nums text-blue-400">
                  {loadingSummary ? <Skeleton className="h-5 w-8 mx-auto" /> : summary?.totalClients ?? 0}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">موكّل</p>
              </div>
            </div>
          </div>
        </div>

        {/* Consultations */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => navigate("/consultations")}
              className="text-xs text-primary hover:underline flex items-center gap-1 font-medium">
              <ArrowLeft className="h-3 w-3" /> كل الاستشارات
            </button>
            <h2 className="font-bold text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-400" />
              استشارات اليوم وغداً
            </h2>
          </div>
          <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
            {loadingExtra ? (
              <div className="p-4 space-y-2">
                {[1,2].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : consultations.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm space-y-2">
                <MessageSquare className="h-7 w-7 mx-auto opacity-10 mb-1.5" />
                <p>لا استشارات اليوم أو غداً</p>
                <button onClick={() => navigate("/consultations")}
                  className="text-xs text-primary hover:underline">
                  + استشارة جديدة
                </button>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {consultations.map(c => (
                  <div key={c.id}
                    className="px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => navigate("/consultations")}
                  >
                    <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
                    {c.fee != null && (
                      <span className="text-xs font-bold text-emerald-400 tabular-nums shrink-0">
                        <TNDAmount amount={c.fee} />
                      </span>
                    )}
                    <div className="flex-1 min-w-0 text-right">
                      <p className="text-sm font-medium truncate">{c.subject ?? "استشارة"}</p>
                      {c.clientName && (
                        <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                          {c.clientName} <Users className="h-3 w-3" />
                        </p>
                      )}
                    </div>
                    {c.consultationDate && (
                      <div className="text-right shrink-0">
                        <p className="text-xs font-medium tabular-nums text-blue-400">
                          {new Date(c.consultationDate).toLocaleTimeString("ar-TN", {
                            hour: "2-digit", minute: "2-digit"
                          })}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(c.consultationDate).toLocaleDateString("ar-TN", {
                            weekday: "short"
                          })}
                        </p>
                      </div>
                    )}
                    <MessageSquare className="h-4 w-4 text-blue-400/50 shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

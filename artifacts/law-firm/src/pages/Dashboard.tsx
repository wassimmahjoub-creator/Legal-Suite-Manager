import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { TNDAmount } from "@/components/Money";
import { formatDateTN } from "@/lib/date";
import { DateDisplay } from "@/components/DateDisplay";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetDashboardSummary, useGetDashboardToday, useGetDashboardAlerts,
  useUpdateTask, getGetDashboardTodayQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Briefcase, Clock, AlertTriangle, CheckCircle2,
  TrendingUp, Scale, Users, ArrowLeft, Circle, CalendarClock,
  Plus, FileText, Receipt, MessageSquare, Timer,
  ChevronLeft, Sparkles, ArrowUpRight,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { authFetch } from "@/lib/authFetch";
import { useAuth } from "@/context/AuthContext";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

type RecentCase = {
  id: number; title: string; status: string;
  clientName?: string | null; caseNumber?: string | null;
  serviceType?: string | null;
};
type Deadline = {
  id: number; caseId: number; caseName?: string | null;
  title: string; type: string; dueDate: string;
  urgency: string; completedAt: string | null;
};

function daysLeft(dueDate: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due   = new Date(dueDate); due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / 86_400_000);
}

function deadlineBadge(days: number) {
  if (days < 0)  return { label: `متأخر ${Math.abs(days)} يوم`, cls: "bg-red-500/15 text-red-400 border-red-500/20" };
  if (days === 0) return { label: "اليوم",        cls: "bg-red-500/15 text-red-400 border-red-500/20" };
  if (days <= 3)  return { label: `${days} أيام`,  cls: "bg-red-500/15 text-red-400 border-red-500/20" };
  if (days <= 7)  return { label: `${days} أيام`,  cls: "bg-amber-500/15 text-amber-400 border-amber-500/20" };
  return              { label: `${days} يوم`,     cls: "bg-muted text-muted-foreground border-border" };
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active:    { label: "نشطة",   color: "text-emerald-400 bg-emerald-500/10" },
  pending:   { label: "انتظار", color: "text-amber-400 bg-amber-500/10"    },
  suspended: { label: "موقوفة", color: "text-amber-400 bg-amber-500/10"    },
  closed:    { label: "مغلقة",  color: "text-muted-foreground bg-muted/50"  },
};

const ROLE_GREET: Record<string, string> = {
  admin:      "مدير المكتب",
  lawyer:     "محامي",
  secretary:  "سكرتيرة",
  trainee:    "متربص",
  accountant: "محاسب",
};

export default function Dashboard() {
  const { user } = useAuth();
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary({ query: { staleTime: 0 } });
  const { data: today,   isLoading: loadingToday   } = useGetDashboardToday({ query: { staleTime: 0 } });
  const { data: alerts,  isLoading: loadingAlerts  } = useGetDashboardAlerts({ query: { staleTime: 0 } });
  const [, navigate]  = useLocation();
  const queryClient   = useQueryClient();
  const updateTask    = useUpdateTask();

  const [togglingIds,  setTogglingIds]  = useState<Set<number>>(new Set());
  const [recentCases,  setRecentCases]  = useState<RecentCase[]>([]);
  const [deadlines,    setDeadlines]    = useState<Deadline[]>([]);
  const [loadingExtra, setLoadingExtra] = useState(true);

  const pendingTasks = today?.tasks?.filter(t => !t.done) ?? [];
  const doneTasks    = today?.tasks?.filter(t =>  t.done) ?? [];

  useEffect(() => {
    Promise.all([
      authFetch(`${BASE}/api/deadlines`).then(r => r.ok ? r.json() : []),
      authFetch(`${BASE}/api/cases`).then(r => r.ok ? r.json() : []),
    ]).then(([dl, cs]) => {
      const now = new Date(); now.setHours(0,0,0,0);
      const cutoff = new Date(now); cutoff.setDate(cutoff.getDate() + 30);
      setDeadlines(
        (Array.isArray(dl) ? dl as Deadline[] : [])
          .filter(d => !d.completedAt && new Date(d.dueDate) <= cutoff)
          .sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
          .slice(0, 6)
      );
      setRecentCases((Array.isArray(cs) ? cs as RecentCase[] : []).slice(0, 5));
    }).catch(() => {}).finally(() => setLoadingExtra(false));
  }, []);

  const urgentDeadlines = deadlines.filter(d => daysLeft(d.dueDate) <= 3);

  function toggleTask(taskId: number, currentDone: boolean, title: string) {
    setTogglingIds(prev => new Set(prev).add(taskId));
    updateTask.mutate(
      { id: taskId, data: { title, done: !currentDone } },
      { onSettled: () => {
          setTogglingIds(prev => { const s = new Set(prev); s.delete(taskId); return s; });
          queryClient.invalidateQueries({ queryKey: getGetDashboardTodayQueryKey() });
        },
      }
    );
  }

  const firstName = user?.name?.split(" ")[0] ?? "بالمكتب";
  const roleLabel = ROLE_GREET[user?.role ?? ""] ?? "";

  return (
    <div className="space-y-6">

      {/* ══ HEADER ═══════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs text-primary font-medium">{roleLabel}</span>
          </div>
          <h1 className="text-2xl font-bold">مرحباً، {firstName}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            <DateDisplay date={new Date()} format="full" />
          </p>
        </div>

        {/* Status pills */}
        {loadingToday || loadingExtra || loadingSummary ? (
          <Skeleton className="h-9 w-64 rounded-xl" />
        ) : (
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-primary/8 border-primary/20 text-primary font-medium">
              <Briefcase className="h-3 w-3" />
              {summary?.activeCases ?? 0} ملف نشط
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-emerald-500/8 border-emerald-500/20 text-emerald-400 font-medium">
              <CalendarClock className="h-3 w-3" />
              {today?.sessions?.length ?? 0} جلسة اليوم
            </span>
            {urgentDeadlines.length > 0 && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-red-500/10 border-red-500/25 text-red-400 font-medium">
                <Timer className="h-3 w-3" />
                {urgentDeadlines.length} آجال حرجة
              </span>
            )}
            {(summary?.pendingInvoices ?? 0) > 0 && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-amber-500/10 border-amber-500/25 text-amber-400 font-medium">
                <Receipt className="h-3 w-3" />
                {summary?.pendingInvoices} فاتورة معلقة
              </span>
            )}
          </div>
        )}
      </div>

      {/* ══ KPI CARDS ════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div onClick={() => navigate("/billing")}
          className="group flex items-center gap-3 rounded-xl bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border border-emerald-500/20 px-4 py-3 cursor-pointer hover:border-emerald-500/40 transition-all">
          <div className="p-1.5 rounded-lg bg-emerald-500/15 shrink-0">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="min-w-0">
            {loadingSummary ? <Skeleton className="h-5 w-20 mb-0.5" /> : (
              <p className="text-base font-extrabold text-emerald-400 tabular-nums leading-none">
                <TNDAmount amount={Number(summary?.monthlyIncome ?? 0)} />
              </p>
            )}
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">المداخيل هذا الشهر</p>
          </div>
        </div>

        <div onClick={() => navigate("/cases")}
          className="group flex items-center gap-3 rounded-xl bg-gradient-to-br from-blue-500/15 to-blue-500/5 border border-blue-500/20 px-4 py-3 cursor-pointer hover:border-blue-500/40 transition-all">
          <div className="p-1.5 rounded-lg bg-blue-500/15 shrink-0">
            <Briefcase className="h-4 w-4 text-blue-400" />
          </div>
          <div className="min-w-0">
            {loadingSummary ? <Skeleton className="h-5 w-10 mb-0.5" /> : (
              <p className="text-base font-extrabold text-blue-400 tabular-nums leading-none">
                {summary?.activeCases ?? 0}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">ملفات نشطة</p>
          </div>
        </div>

        <div onClick={() => navigate("/billing")}
          className={cn(
            "group flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-all",
            (summary?.pendingInvoices ?? 0) > 0
              ? "bg-gradient-to-br from-amber-500/15 to-amber-500/5 border-amber-500/20 hover:border-amber-500/40"
              : "bg-gradient-to-br from-muted/20 to-muted/5 border-border hover:border-border/80"
          )}>
          <div className={cn("p-1.5 rounded-lg shrink-0", (summary?.pendingInvoices ?? 0) > 0 ? "bg-amber-500/15" : "bg-muted/50")}>
            <Receipt className={cn("h-4 w-4", (summary?.pendingInvoices ?? 0) > 0 ? "text-amber-400" : "text-muted-foreground")} />
          </div>
          <div className="min-w-0">
            {loadingSummary ? <Skeleton className="h-5 w-10 mb-0.5" /> : (
              <p className={cn("text-base font-extrabold tabular-nums leading-none",
                (summary?.pendingInvoices ?? 0) > 0 ? "text-amber-400" : "text-foreground")}>
                {summary?.pendingInvoices ?? 0}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">فواتير معلقة</p>
          </div>
        </div>

        <div onClick={() => navigate("/cases")}
          className={cn(
            "group flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-all",
            urgentDeadlines.length > 0
              ? "bg-gradient-to-br from-red-500/15 to-red-500/5 border-red-500/20 hover:border-red-500/40"
              : "bg-gradient-to-br from-muted/20 to-muted/5 border-border hover:border-border/80"
          )}>
          <div className={cn("p-1.5 rounded-lg shrink-0", urgentDeadlines.length > 0 ? "bg-red-500/15" : "bg-muted/50")}>
            <Timer className={cn("h-4 w-4", urgentDeadlines.length > 0 ? "text-red-400" : "text-muted-foreground")} />
          </div>
          <div className="min-w-0">
            {loadingExtra ? <Skeleton className="h-5 w-10 mb-0.5" /> : (
              <p className={cn("text-base font-extrabold tabular-nums leading-none",
                urgentDeadlines.length > 0 ? "text-red-400" : "text-foreground")}>
                {urgentDeadlines.length}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">آجال حرجة (≤ 3 أيام)</p>
          </div>
        </div>
      </div>

      {/* ══ QUICK ACTIONS ════════════════════════════════════════════════════ */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: "ملف جديد",       icon: Briefcase,     path: "/cases/new",          color: "from-blue-500/20 to-blue-500/5 border-blue-500/25 text-blue-400 hover:border-blue-500/50"    },
          { label: "إضافة جلسة",     icon: CalendarClock, path: "/calendar",            color: "from-primary/20 to-primary/5 border-primary/25 text-primary hover:border-primary/50"         },
          { label: "استشارة جديدة",  icon: MessageSquare, path: "/consultations",       color: "from-violet-500/20 to-violet-500/5 border-violet-500/25 text-violet-400 hover:border-violet-500/50" },
          { label: "فاتورة جديدة",   icon: Receipt,       path: "/billing/new",         color: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/25 text-emerald-400 hover:border-emerald-500/50" },
          { label: "مراسلة جديدة",   icon: FileText,      path: "/correspondances",     color: "from-cyan-500/20 to-cyan-500/5 border-cyan-500/25 text-cyan-400 hover:border-cyan-500/50"   },
        ].map(a => (
          <button key={a.path}
            onClick={() => navigate(a.path)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl border bg-gradient-to-br transition-all",
              a.color
            )}
          >
            <a.icon className="h-3.5 w-3.5" />
            {a.label}
          </button>
        ))}
      </div>

      {/* ══ TODAY SECTION ════════════════════════════════════════════════════ */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
          <span className="h-px flex-1 bg-border/50" />
          اليوم
          <span className="h-px flex-1 bg-border/50" />
        </h2>
        <div className="grid gap-4 lg:grid-cols-3">

          {/* جلسات اليوم */}
          <Card className="border-border/60 shadow-sm overflow-hidden">
            <div className="h-1 bg-gradient-to-l from-primary via-primary/60 to-transparent" />
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <CalendarClock className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-semibold">جلسات اليوم</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold text-primary tabular-nums">{today?.sessions?.length ?? 0}</span>
                <button onClick={() => navigate("/calendar")} className="p-1 rounded hover:bg-muted transition-colors">
                  <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>
            <CardContent className="px-4 pb-4 pt-0">
              {loadingToday ? (
                <div className="space-y-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
              ) : today?.sessions?.length === 0 ? (
                <div className="py-5 text-center text-muted-foreground text-xs space-y-1">
                  <CalendarClock className="h-7 w-7 mx-auto opacity-15 mb-2" />
                  <p>لا توجد جلسات اليوم</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {today?.sessions?.map(s => (
                    <div key={s.id}
                      onClick={() => s.caseId ? navigate(`/cases/${s.caseId}`) : navigate("/calendar")}
                      className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer border border-border/40"
                    >
                      <div className="bg-primary/10 text-primary p-1.5 rounded shrink-0 mt-0.5">
                        <CalendarClock className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs truncate">{s.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{s.caseName ?? "—"}</p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0 tabular-nums mt-0.5">{s.time || "—"}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* آجال قريبة */}
          <Card className="border-border/60 shadow-sm overflow-hidden">
            <div className={cn("h-1 bg-gradient-to-l", urgentDeadlines.length > 0
              ? "from-red-500 via-red-500/60 to-transparent"
              : "from-muted via-muted/60 to-transparent"
            )} />
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <div className="flex items-center gap-2">
                <div className={cn("p-1.5 rounded-lg", urgentDeadlines.length > 0 ? "bg-red-500/10" : "bg-muted/50")}>
                  <Timer className={cn("h-4 w-4", urgentDeadlines.length > 0 ? "text-red-400" : "text-muted-foreground")} />
                </div>
                <span className="text-sm font-semibold">آجال قريبة</span>
              </div>
              <span className={cn("text-lg font-bold tabular-nums", urgentDeadlines.length > 0 ? "text-red-400" : "text-foreground")}>
                {deadlines.length}
              </span>
            </div>
            <CardContent className="px-4 pb-4 pt-0">
              {loadingExtra ? (
                <div className="space-y-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
              ) : deadlines.length === 0 ? (
                <div className="py-5 text-center text-muted-foreground text-xs space-y-1">
                  <CheckCircle2 className="h-7 w-7 mx-auto text-emerald-400 opacity-30 mb-2" />
                  <p>كل الآجال تحت السيطرة</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {deadlines.map(d => {
                    const days = daysLeft(d.dueDate);
                    const badge = deadlineBadge(days);
                    return (
                      <div key={d.id}
                        onClick={() => d.caseId ? navigate(`/cases/${d.caseId}`) : undefined}
                        className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer border border-border/40"
                      >
                        <div className={cn("p-1.5 rounded shrink-0 mt-0.5 border", badge.cls)}>
                          <Timer className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs truncate">{d.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{d.caseName ?? "—"}</p>
                        </div>
                        <span className={cn("text-xs px-1.5 py-0.5 rounded border shrink-0 mt-0.5 font-medium", badge.cls)}>
                          {badge.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* المهام العاجلة */}
          <Card className="border-border/60 shadow-sm overflow-hidden">
            <div className={cn("h-1 bg-gradient-to-l", pendingTasks.length > 0
              ? "from-amber-500 via-amber-500/60 to-transparent"
              : "from-emerald-500 via-emerald-500/60 to-transparent"
            )} />
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <div className="flex items-center gap-2">
                <div className={cn("p-1.5 rounded-lg", pendingTasks.length > 0 ? "bg-amber-500/10" : "bg-emerald-500/10")}>
                  <CheckCircle2 className={cn("h-4 w-4", pendingTasks.length > 0 ? "text-amber-400" : "text-emerald-400")} />
                </div>
                <span className="text-sm font-semibold">المهام العاجلة</span>
              </div>
              <div className="flex items-center gap-1.5">
                {doneTasks.length > 0 && (
                  <span className="text-xs text-emerald-400 font-medium">{doneTasks.length} ✓</span>
                )}
                <span className={cn("text-lg font-bold tabular-nums", pendingTasks.length > 0 ? "text-amber-400" : "text-foreground")}>
                  {pendingTasks.length}
                </span>
              </div>
            </div>
            <CardContent className="px-4 pb-4 pt-0">
              {loadingToday ? (
                <div className="space-y-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
              ) : today?.tasks?.length === 0 ? (
                <div className="py-5 text-center text-muted-foreground text-xs space-y-1">
                  <CheckCircle2 className="h-7 w-7 mx-auto text-emerald-400 opacity-30 mb-2" />
                  <p>لا توجد مهام اليوم</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {today?.tasks?.map(t => {
                    const toggling = togglingIds.has(t.id);
                    return (
                      <div key={t.id}
                        className={cn(
                          "flex items-center gap-2.5 p-2.5 rounded-lg border transition-all",
                          t.done ? "border-border/30 bg-muted/20 opacity-50" : "border-border/40 hover:bg-muted/50"
                        )}
                      >
                        <button
                          className={cn("shrink-0 focus:outline-none", toggling && "opacity-40")}
                          onClick={() => toggleTask(t.id, t.done ?? false, t.title ?? "")}
                          disabled={toggling}
                        >
                          {t.done
                            ? <CheckCircle2 className="h-[18px] w-[18px] text-emerald-400" />
                            : <Circle className="h-[18px] w-[18px] text-muted-foreground/40" />}
                        </button>
                        <div className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => t.caseId ? navigate(`/cases/${t.caseId}`) : undefined}>
                          <p className={cn("text-xs font-medium truncate", t.done && "line-through text-muted-foreground")}>
                            {t.title}
                          </p>
                          {t.caseName && <p className="text-xs text-muted-foreground truncate">{t.caseName}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ══ ALERTS ═══════════════════════════════════════════════════════════ */}
      {(loadingAlerts || (alerts && alerts.length > 0)) && (
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="h-px flex-1 bg-border/50" />
            تنبيهات مهمة
            <span className="h-px flex-1 bg-border/50" />
          </h2>
          <Card className="border-red-500/20 shadow-sm overflow-hidden">
            <div className="h-1 bg-gradient-to-l from-red-500 via-red-500/60 to-transparent" />
            <CardContent className="p-0">
              {loadingAlerts ? (
                <div className="p-4 space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
              ) : (
                <div className="divide-y divide-border/50">
                  {alerts?.map(a => (
                    <div key={a.id}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-red-500/8 active:bg-red-500/15 transition-colors cursor-pointer"
                      onClick={() => a.caseId ? navigate(`/cases/${a.caseId}`) : navigate("/billing")}
                    >
                      <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight truncate">{a.message}</p>
                        {a.caseName && <p className="text-xs text-muted-foreground">{a.caseName}</p>}
                      </div>
                      <span className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded shrink-0">
                        {formatDateTN(a.dueDate)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ══ RECENT CASES + FINANCIAL ═════════════════════════════════════════ */}
      <div className="grid gap-5 lg:grid-cols-3">

        {/* آخر الملفات */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">آخر الملفات</h2>
            <button onClick={() => navigate("/cases")}
              className="text-xs text-primary hover:underline flex items-center gap-1 font-medium">
              عرض الكل <ArrowLeft className="h-3 w-3" />
            </button>
          </div>
          <Card className="border-border/60 shadow-sm overflow-hidden">
            <div className="h-1 bg-gradient-to-l from-blue-500 via-blue-500/60 to-transparent" />
            <CardContent className="p-0">
              {loadingExtra ? (
                <div className="p-4 space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : recentCases.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  <Briefcase className="h-7 w-7 mx-auto mb-2 opacity-15" />
                  لا توجد ملفات بعد
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {recentCases.map(c => {
                    const s = STATUS_LABELS[c.status] || STATUS_LABELS.active;
                    return (
                      <div key={c.id}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 active:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/cases/${c.id}`)}
                      >
                        <div className="p-1.5 bg-blue-500/10 rounded-lg shrink-0">
                          <Scale className="h-3.5 w-3.5 text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{c.title}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Users className="h-3 w-3" /> {c.clientName ?? "—"}
                            {c.caseNumber && <span className="opacity-50">· {c.caseNumber}</span>}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${s.color}`}>{s.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ملخص مالي */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">ملخص مالي</h2>
          <Card className="border-border/60 shadow-sm overflow-hidden">
            <div className="h-1 bg-gradient-to-l from-emerald-500 via-emerald-500/60 to-transparent" />
            <CardContent className="p-4 space-y-1">
              {loadingSummary ? (
                <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : (
                <>
                  <div onClick={() => navigate("/billing")}
                    className="flex items-center justify-between py-2.5 border-b border-border/40 cursor-pointer hover:bg-muted/30 active:bg-muted/50 -mx-4 px-4 transition-colors">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="p-1 rounded bg-emerald-500/10"><TrendingUp className="h-3 w-3 text-emerald-400" /></div>
                      المداخيل هذا الشهر
                    </div>
                    <span className="text-sm font-bold text-emerald-400 tabular-nums">
                      <TNDAmount amount={Number(summary?.monthlyIncome ?? 0)} />
                    </span>
                  </div>
                  <div onClick={() => navigate("/billing")}
                    className="flex items-center justify-between py-2.5 border-b border-border/40 cursor-pointer hover:bg-muted/30 active:bg-muted/50 -mx-4 px-4 transition-colors">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="p-1 rounded bg-amber-500/10"><Clock className="h-3 w-3 text-amber-400" /></div>
                      فواتير معلقة
                    </div>
                    <span className={cn("text-sm font-bold tabular-nums",
                      (summary?.pendingInvoices ?? 0) > 0 ? "text-amber-400" : "text-foreground")}>
                      {summary?.pendingInvoices ?? 0}
                    </span>
                  </div>
                  <div onClick={() => navigate("/cases")}
                    className="flex items-center justify-between py-2.5 cursor-pointer hover:bg-muted/30 active:bg-muted/50 -mx-4 px-4 transition-colors">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="p-1 rounded bg-blue-500/10"><Briefcase className="h-3 w-3 text-blue-400" /></div>
                      الملفات الجارية
                    </div>
                    <span className="text-sm font-bold text-blue-400 tabular-nums">
                      {summary?.activeCases ?? 0}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  );
}

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
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { cn } from "@/lib/utils";
import {
  Briefcase, Clock, AlertTriangle, CheckCircle2,
  TrendingUp, Scale, Users, Circle, CalendarClock,
  ChevronLeft, Timer, Receipt, Plus, MessageSquare, FileText,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { authFetch } from "@/lib/authFetch";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

type RecentCase = {
  id: number; title: string; status: string;
  clientName?: string | null; caseNumber?: string | null;
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
  if (days < 0)  return { label: `متأخر ${Math.abs(days)} يوم`, cls: "bg-destructive/15 text-destructive border-destructive/20" };
  if (days === 0) return { label: "اليوم",        cls: "bg-destructive/15 text-destructive border-destructive/20" };
  if (days <= 3)  return { label: `${days} أيام`,  cls: "bg-destructive/15 text-destructive border-destructive/20" };
  if (days <= 7)  return { label: `${days} أيام`,  cls: "bg-warning/15 text-warning border-warning/20" };
  return              { label: `${days} يوم`,     cls: "bg-muted text-muted-foreground border-border" };
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active:    { label: "نشطة",   color: "text-success bg-success/10"              },
  pending:   { label: "انتظار", color: "text-warning bg-warning/10"              },
  suspended: { label: "موقوفة", color: "text-warning bg-warning/10"              },
  closed:    { label: "مغلقة",  color: "text-muted-foreground bg-muted/50"       },
};

export default function Dashboard() {
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

  const statusPills = (
    <div className="flex flex-wrap gap-2 text-xs">
      <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-primary/8 border-primary/20 text-primary font-medium">
        <CalendarClock className="h-3 w-3" />
        {loadingToday ? "…" : today?.sessions?.length ?? 0} جلسة
      </span>
      <span className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-full border font-medium",
        urgentDeadlines.length > 0
          ? "bg-destructive/10 border-destructive/25 text-destructive"
          : "bg-muted/40 border-border text-muted-foreground"
      )}>
        <Timer className="h-3 w-3" />
        {loadingExtra ? "…" : urgentDeadlines.length} آجال حرجة
      </span>
      <span className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-full border font-medium",
        pendingTasks.length > 0
          ? "bg-warning/10 border-warning/25 text-warning"
          : "bg-muted/40 border-border text-muted-foreground"
      )}>
        <CheckCircle2 className="h-3 w-3" />
        {loadingToday ? "…" : pendingTasks.length} مهمة
      </span>
      {(summary?.pendingInvoices ?? 0) > 0 && (
        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-destructive/10 border-destructive/25 text-destructive font-medium">
          <Receipt className="h-3 w-3" />
          {loadingSummary ? "…" : summary?.pendingInvoices} فاتورة معلقة
        </span>
      )}
    </div>
  );

  return (
    <div className="space-y-6">

      {/* ══ HEADER ═══════════════════════════════════════════════════════════ */}
      <PageHeader
        title="الرئيسية"
        subtitle={<DateDisplay date={new Date()} format="full" />}
        actions={statusPills}
      />

      {/* ══ QUICK ACTIONS ════════════════════════════════════════════════════ */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: "ملف +",        icon: Briefcase,     path: "/cases/new"      },
          { label: "جلسة +",       icon: CalendarClock, path: "/calendar"       },
          { label: "استشارة +",    icon: MessageSquare, path: "/consultations"  },
          { label: "فاتورة +",     icon: Receipt,       path: "/billing/new"    },
          { label: "مراسلة +",     icon: FileText,      path: "/correspondances"},
        ].map(a => (
          <Button key={a.path} size="sm"
            onClick={() => navigate(a.path)}
            className="gap-1.5 text-xs"
          >
            <a.icon className="h-3.5 w-3.5" />
            {a.label}
          </Button>
        ))}
      </div>

      {/* ══ TODAY ════════════════════════════════════════════════════════════ */}
      <div>
        <h2 className="font-semibold mb-3">اليوم</h2>
        <div className="grid gap-4 lg:grid-cols-3">

          {/* جلسات اليوم */}
          <Card className="border-border/60 shadow-sm">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold text-primary tabular-nums">
                  {loadingToday ? <Skeleton className="h-6 w-6" /> : today?.sessions?.length ?? 0}
                </span>
                <button onClick={() => navigate("/calendar")}
                  className="p-1 rounded hover:bg-muted transition-colors">
                  <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">جلسات اليوم</span>
                <CalendarClock className="h-4 w-4 text-primary" />
              </div>
            </div>
            <CardContent className="px-0 pb-0 pt-0">
              {loadingToday ? (
                <div className="p-4 space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
              ) : today?.sessions?.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground text-xs space-y-1">
                  <CalendarClock className="h-7 w-7 mx-auto opacity-10 mb-2" />
                  <p>لا توجد جلسات اليوم</p>
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {today?.sessions?.map(s => (
                    <div key={s.id}
                      onClick={() => s.caseId ? navigate(`/cases/${s.caseId}`) : navigate("/calendar")}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors cursor-pointer"
                    >
                      <span className="text-xs text-muted-foreground shrink-0 tabular-nums">{s.time || "—"}</span>
                      <div className="flex-1 min-w-0 text-right">
                        <p className="font-medium text-xs truncate">{s.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{s.caseName ?? "—"}</p>
                      </div>
                      <CalendarClock className="h-3.5 w-3.5 text-primary shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* آجال قريبة */}
          <Card className="border-border/60 shadow-sm">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <div className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold tabular-nums",
                urgentDeadlines.length > 0
                  ? "bg-destructive/15 text-destructive"
                  : "bg-muted/50 text-muted-foreground"
              )}>
                {loadingExtra ? "…" : deadlines.length}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">آجال قريبة</span>
                <Timer className={cn("h-4 w-4", urgentDeadlines.length > 0 ? "text-destructive" : "text-muted-foreground")} />
              </div>
            </div>
            <CardContent className="px-0 pb-0 pt-0">
              {loadingExtra ? (
                <div className="p-4 space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
              ) : deadlines.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground text-xs space-y-1">
                  <CheckCircle2 className="h-7 w-7 mx-auto text-emerald-400 opacity-20 mb-2" />
                  <p>كل الآجال تحت السيطرة</p>
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {deadlines.map(d => {
                    const days = daysLeft(d.dueDate);
                    const badge = deadlineBadge(days);
                    return (
                      <div key={d.id}
                        onClick={() => d.caseId ? navigate(`/cases/${d.caseId}`) : undefined}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors cursor-pointer"
                      >
                        <span className={cn("text-xs px-2 py-0.5 rounded-full border shrink-0 font-medium", badge.cls)}>
                          {badge.label}
                        </span>
                        <div className="flex-1 min-w-0 text-right">
                          <p className="font-medium text-xs truncate">{d.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{d.caseName ?? "—"}</p>
                        </div>
                        <Timer className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* المهام العاجلة */}
          <Card className="border-border/60 shadow-sm">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <div className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold tabular-nums",
                pendingTasks.length > 0
                  ? "bg-warning/15 text-warning"
                  : "bg-success/10 text-success"
              )}>
                {loadingToday ? "…" : pendingTasks.length}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">المهام العاجلة</span>
                <CheckCircle2 className={cn("h-4 w-4", pendingTasks.length > 0 ? "text-warning" : "text-success")} />
              </div>
            </div>
            <CardContent className="px-0 pb-0 pt-0">
              {loadingToday ? (
                <div className="p-4 space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
              ) : today?.tasks?.length === 0 ? (
                <p className="py-6 text-center text-muted-foreground text-xs">لا توجد مهام اليوم</p>
              ) : (
                <div className="divide-y divide-border/40">
                  {today?.tasks?.map(t => {
                    const toggling = togglingIds.has(t.id);
                    return (
                      <div key={t.id}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 transition-colors",
                          t.done ? "opacity-50" : "hover:bg-muted/40"
                        )}
                      >
                        <button
                          className={cn("shrink-0 focus:outline-none", toggling && "opacity-40")}
                          onClick={() => toggleTask(t.id, t.done ?? false, t.title ?? "")}
                          disabled={toggling}
                        >
                          {t.done
                            ? <CheckCircle2 className="h-4 w-4 text-success" />
                            : <Circle className="h-4 w-4 text-muted-foreground/30" />}
                        </button>
                        <div className="flex-1 min-w-0 cursor-pointer text-right"
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
          <h2 className="font-semibold mb-3">تنبيهات مهمة</h2>
          <Card className="border-border/60 shadow-sm">
            <CardContent className="px-0 pb-0 pt-0">
              {loadingAlerts ? (
                <div className="p-4 space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
              ) : (
                <div className="divide-y divide-border/40">
                  {alerts?.map(a => (
                    <div key={a.id}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors cursor-pointer"
                      onClick={() => a.caseId ? navigate(`/cases/${a.caseId}`) : navigate("/billing")}
                    >
                      <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded shrink-0 tabular-nums">
                        {formatDateTN(a.dueDate)}
                      </span>
                      <ChevronLeft className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                      <div className="flex-1 min-w-0 text-right">
                        <p className="text-sm font-semibold leading-tight truncate text-foreground">{a.message}</p>
                        {a.caseName && <p className="text-xs text-muted-foreground">{a.caseName}</p>}
                      </div>
                      <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
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
          <h2 className="font-semibold mb-3">آخر الملفات</h2>
          <Card className="border-border/60 shadow-sm">
            <CardContent className="px-0 pb-0 pt-0">
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
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors cursor-pointer"
                        onClick={() => navigate(`/cases/${c.id}`)}
                      >
                        <div className="flex-1 min-w-0 text-right">
                          <p className="font-medium text-sm truncate">{c.title}</p>
                        </div>
                        {c.clientName && (
                          <span className="text-xs font-medium text-foreground shrink-0 hidden sm:inline truncate max-w-[120px]">{c.clientName}</span>
                        )}
                        {c.caseNumber && (
                          <span className="text-xs font-medium text-foreground shrink-0 tabular-nums">{c.caseNumber}</span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${s.color}`}>{s.label}</span>
                        <Scale className="h-4 w-4 text-muted-foreground/30 shrink-0" />
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
          <h2 className="font-semibold mb-3 text-right">ملخص مالي</h2>
          <Card className="border-border/60 shadow-sm">
            <CardContent className="px-0 pb-0 pt-0">
              {loadingSummary ? (
                <div className="p-4 space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : (
                <>
                  <div onClick={() => navigate("/billing?from=dashboard")}
                    className="flex items-center justify-between px-4 py-3 border-b border-border/40 hover:bg-muted/40 transition-colors cursor-pointer">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <TrendingUp className="h-3.5 w-3.5 text-success" />
                      المداخيل هذا الشهر
                    </div>
                    <span className="text-sm font-bold text-success tabular-nums">
                      <TNDAmount amount={Number(summary?.monthlyIncome ?? 0)} />
                    </span>
                  </div>
                  <div onClick={() => navigate("/billing?from=dashboard")}
                    className="flex items-center justify-between px-4 py-3 border-b border-border/40 hover:bg-muted/40 transition-colors cursor-pointer">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 text-warning" />
                      فواتير معلقة
                    </div>
                    <span className={cn("text-sm font-bold tabular-nums",
                      (summary?.pendingInvoices ?? 0) > 0 ? "text-warning" : "text-foreground")}>
                      {summary?.pendingInvoices ?? 0}
                    </span>
                  </div>
                  <div onClick={() => navigate("/cases?from=dashboard")}
                    className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Briefcase className="h-3.5 w-3.5 text-primary" />
                      الملفات الجارية
                    </div>
                    <span className="text-sm font-bold text-primary tabular-nums">
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

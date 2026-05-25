import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useLocation } from "wouter";
import { TNDAmount } from "@/components/Money";
import { formatDateTN } from "@/lib/date";
import { DateDisplay } from "@/components/DateDisplay";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetDashboardSummary, useGetDashboardToday, useGetDashboardAlerts,
  useUpdateTask, getGetDashboardTodayQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Briefcase, Clock, AlertTriangle, CheckCircle2,
  TrendingUp, Scale, Users, ArrowLeft, Circle, CalendarClock,
  Plus, FileText, Receipt, MessageSquare, Timer,
  ChevronLeft,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { authFetch } from "@/lib/authFetch";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

// ── Types ────────────────────────────────────────────────────────────────────
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

// ── Helpers ──────────────────────────────────────────────────────────────────
function daysLeft(dueDate: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due   = new Date(dueDate); due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / 86_400_000);
}

function deadlineBadge(days: number) {
  if (days < 0)  return { label: `متأخر ${Math.abs(days)} يوم`, cls: "bg-destructive/10 text-destructive border-destructive/20" };
  if (days === 0) return { label: "اليوم",        cls: "bg-destructive/10 text-destructive border-destructive/20" };
  if (days <= 3)  return { label: `${days} أيام`,  cls: "bg-destructive/10 text-destructive border-destructive/20" };
  if (days <= 7)  return { label: `${days} أيام`,  cls: "bg-warning/10 text-warning border-warning/20" };
  return              { label: `${days} يوم`,     cls: "bg-muted text-muted-foreground border-border" };
}


const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active:    { label: "نشطة",   color: "text-success bg-success/10"        },
  pending:   { label: "انتظار", color: "text-warning bg-warning/10"        },
  suspended: { label: "موقوفة", color: "text-warning bg-warning/10"        },
  closed:    { label: "مغلقة",  color: "text-muted-foreground bg-muted/50" },
};

// ── Component ────────────────────────────────────────────────────────────────
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

  // ── Compact header summary counts ─────────────────────────────────────────
  const urgentDeadlines = deadlines.filter(d => daysLeft(d.dueDate) <= 3);
  const overdueTasks    = pendingTasks.filter(t => {
    if (!("dueDate" in t) || !(t as { dueDate?: string }).dueDate) return false;
    return new Date((t as { dueDate: string }).dueDate) < new Date();
  });

  return (
    <div className="space-y-5">

      <PageHeader
        title="الرئيسية"
        subtitle={<DateDisplay date={new Date()} format="full" />}
        actions={
          loadingToday || loadingExtra ? (
            <Skeleton className="h-6 w-48" />
          ) : (
            <div className="flex flex-wrap gap-2 text-xs">
              <span className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-full border font-medium",
                (today?.sessions?.length ?? 0) > 0
                  ? "bg-primary/10 text-primary border-primary/20"
                  : "bg-muted text-muted-foreground border-border"
              )}>
                <CalendarClock className="h-3 w-3" />
                {today?.sessions?.length ?? 0} جلسة
              </span>
              <span className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-full border font-medium",
                urgentDeadlines.length > 0
                  ? "bg-destructive/10 text-destructive border-destructive/20"
                  : "bg-muted text-muted-foreground border-border"
              )}>
                <Timer className="h-3 w-3" />
                {urgentDeadlines.length} آجال حرجة
              </span>
              <span className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-full border font-medium",
                pendingTasks.length > 0
                  ? "bg-warning/10 text-warning border-warning/20"
                  : "bg-muted text-muted-foreground border-border"
              )}>
                <CheckCircle2 className="h-3 w-3" />
                {pendingTasks.length} مهمة
              </span>
              <span className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-full border font-medium",
                (summary?.pendingInvoices ?? 0) > 0
                  ? "bg-warning/10 text-warning border-warning/20"
                  : "bg-muted text-muted-foreground border-border"
              )}>
                <Receipt className="h-3 w-3" />
                {loadingSummary ? "…" : (summary?.pendingInvoices ?? 0)} فاتورة معلقة
              </span>
            </div>
          )
        }
      />

      {/* ══ 2. QUICK ACTIONS ═════════════════════════════════════════════════ */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: "+ ملف",        icon: Briefcase,    path: "/cases/new"    },
          { label: "+ جلسة",       icon: CalendarClock, path: "/calendar"    },
          { label: "+ استشارة",    icon: MessageSquare, path: "/consultations" },
          { label: "+ فاتورة",     icon: Receipt,       path: "/billing/new" },
          { label: "+ مراسلة",     icon: FileText,      path: "/correspondances" },
        ].map(a => (
          <button key={a.path}
            onClick={() => navigate(a.path)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
          >
            <a.icon className="h-3.5 w-3.5" />
            {a.label}
          </button>
        ))}
      </div>

      {/* ══ 3. TODAY SECTION ═════════════════════════════════════════════════ */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          اليوم
        </h2>
        <div className="grid gap-4 lg:grid-cols-3">

          {/* 3A — جلسات اليوم */}
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-primary" /> جلسات اليوم
                </span>
                <div className="flex items-center gap-1">
                  <Badge variant="primary">{today?.sessions?.length ?? 0}</Badge>
                  <button onClick={() => navigate("/calendar")}
                    className="p-1 rounded hover:bg-muted transition-colors" title="الرزنامة">
                    <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              {loadingToday ? (
                <div className="space-y-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
              ) : today?.sessions?.length === 0 ? (
                <div className="py-4 text-center text-muted-foreground text-xs space-y-1">
                  <CalendarClock className="h-6 w-6 mx-auto opacity-20 mb-1" />
                  <p>لا توجد جلسات اليوم</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {today?.sessions?.map(s => (
                    <div key={s.id}
                      onClick={() => s.caseId ? navigate(`/cases/${s.caseId}`) : navigate("/calendar")}
                      className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-secondary transition-colors cursor-pointer border border-border/50"
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

          {/* 3B — آجال قريبة */}
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Timer className="h-4 w-4 text-destructive" /> آجال قريبة
                </span>
                <Badge variant={urgentDeadlines.length > 0 ? "destructive" : "neutral"}>
                  {deadlines.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              {loadingExtra ? (
                <div className="space-y-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
              ) : deadlines.length === 0 ? (
                <div className="py-4 text-center text-muted-foreground text-xs space-y-1">
                  <CheckCircle2 className="h-6 w-6 mx-auto text-success opacity-40 mb-1" />
                  <p>لا توجد آجال قريبة</p>
                  <p className="opacity-60">كل الآجال تحت السيطرة</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {deadlines.map(d => {
                    const days = daysLeft(d.dueDate);
                    const badge = deadlineBadge(days);
                    return (
                      <div key={d.id}
                        onClick={() => d.caseId ? navigate(`/cases/${d.caseId}`) : undefined}
                        className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-secondary transition-colors cursor-pointer border border-border/50"
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

          {/* 3C — المهام العاجلة */}
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> المهام العاجلة
                </span>
                <div className="flex items-center gap-1">
                  {doneTasks.length > 0 && <Badge variant="success">{doneTasks.length} ✓</Badge>}
                  <Badge variant={pendingTasks.length > 0 ? "warning" : "neutral"}>{pendingTasks.length}</Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              {loadingToday ? (
                <div className="space-y-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
              ) : today?.tasks?.length === 0 ? (
                <div className="py-4 text-center text-muted-foreground text-xs space-y-1">
                  <CheckCircle2 className="h-6 w-6 mx-auto text-success opacity-40 mb-1" />
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
                          t.done ? "border-border/30 bg-muted/30 opacity-55" : "border-border/50 hover:bg-secondary"
                        )}
                      >
                        <button
                          className={cn("shrink-0 focus:outline-none", toggling && "opacity-40")}
                          onClick={() => toggleTask(t.id, t.done ?? false, t.title ?? "")}
                          disabled={toggling}
                        >
                          {t.done
                            ? <CheckCircle2 className="h-4.5 w-4.5 text-success h-[18px] w-[18px]" />
                            : <Circle className="h-[18px] w-[18px] text-muted-foreground/50" />}
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

      {/* ══ 4. ALERTS ════════════════════════════════════════════════════════ */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          تنبيهات مهمة
        </h2>
        <Card className="border-none shadow-sm">
          <CardContent className="p-0">
            {loadingAlerts ? (
              <div className="p-4 space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
            ) : alerts?.length === 0 ? (
              <div className="py-5 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success opacity-60" />
                لا توجد تنبيهات — كل شيء على ما يرام
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {alerts?.map(a => (
                  <div key={a.id}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => a.caseId ? navigate(`/cases/${a.caseId}`) : navigate("/billing")}
                  >
                    <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight truncate">{a.message}</p>
                      {a.caseName && <p className="text-xs text-muted-foreground">{a.caseName}</p>}
                    </div>
                    <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded shrink-0">
                      {formatDateTN(a.dueDate)}
                    </span>
                    <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ══ 6 + 7. RECENT CASES + FINANCIAL SUMMARY ═════════════════════════ */}
      <div className="grid gap-5 lg:grid-cols-3">

        {/* آخر الملفات */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              آخر الملفات
            </h2>
            <button onClick={() => navigate("/cases")}
              className="text-xs text-primary hover:underline flex items-center gap-1">
              عرض الكل <ArrowLeft className="h-3 w-3" />
            </button>
          </div>
          <Card className="border-none shadow-sm">
            <CardContent className="p-0">
              {loadingExtra ? (
                <div className="p-4 space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : recentCases.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground text-sm">
                  <Briefcase className="h-6 w-6 mx-auto mb-1 opacity-20" />
                  لا توجد ملفات بعد
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {recentCases.map(c => {
                    const s = STATUS_LABELS[c.status] || STATUS_LABELS.active;
                    return (
                      <div key={c.id}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20 transition-colors cursor-pointer"
                        onClick={() => navigate(`/cases/${c.id}`)}
                      >
                        <div className="p-1.5 bg-muted/50 rounded shrink-0">
                          <Scale className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{c.title}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Users className="h-3 w-3" /> {c.clientName ?? "—"}
                            {c.caseNumber && <span className="opacity-50">· {c.caseNumber}</span>}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${s.color}`}>{s.label}</span>
                        <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
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
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            ملخص مالي
          </h2>
          <Card className="border-none shadow-sm">
            <CardContent className="p-4 space-y-3">
              {loadingSummary ? (
                <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
              ) : (
                <>
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <TrendingUp className="h-3.5 w-3.5 text-success" />
                      المداخيل هذا الشهر
                    </div>
                    <span className="text-sm font-bold text-success tabular-nums">
                      <TNDAmount amount={Number(summary?.monthlyIncome ?? 0)} />
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 text-warning" />
                      فواتير معلقة
                    </div>
                    <span className="text-sm font-bold text-warning tabular-nums">
                      {summary?.pendingInvoices ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Briefcase className="h-3.5 w-3.5 text-primary" />
                      الملفات الجارية
                    </div>
                    <span className="text-sm font-bold text-primary tabular-nums">
                      {summary?.activeCases ?? 0}
                    </span>
                  </div>
                  <button
                    onClick={() => navigate("/billing")}
                    className="w-full text-xs text-center text-primary hover:underline pt-1"
                  >
                    عرض الفوترة الكاملة <ArrowLeft className="inline h-3 w-3" />
                  </button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  );
}

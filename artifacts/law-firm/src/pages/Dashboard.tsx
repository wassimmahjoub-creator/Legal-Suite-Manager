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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Briefcase, Clock, AlertTriangle, CheckCircle2,
  Calendar, TrendingUp, Scale, Users, ArrowLeft,
  Circle, CalendarClock,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { authFetch } from "@/lib/authFetch";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
type RecentCase = { id: number; title: string; status: string; clientName?: string | null; };

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active:    { label: "نشطة",    color: "text-success bg-success/10"         },
  pending:   { label: "انتظار",  color: "text-warning bg-warning/10"         },
  suspended: { label: "موقوفة",  color: "text-warning bg-warning/10"         },
  closed:    { label: "مغلقة",   color: "text-muted-foreground bg-muted/50"  },
};

export default function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const { data: today,   isLoading: loadingToday   } = useGetDashboardToday();
  const { data: alerts,  isLoading: loadingAlerts  } = useGetDashboardAlerts();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const updateTask = useUpdateTask();

  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());
  const [recentCases, setRecentCases] = useState<RecentCase[]>([]);

  const pendingTasks = today?.tasks?.filter(t => !t.done) ?? [];
  const doneTasks    = today?.tasks?.filter(t => t.done)  ?? [];

  useEffect(() => {
    authFetch(`${BASE}/api/cases`)
      .then(r => r.ok ? r.json() : [])
      .then((d: RecentCase[]) => setRecentCases(Array.isArray(d) ? d.slice(0, 5) : []))
      .catch(() => {});
  }, []);

  function toggleTask(taskId: number, currentDone: boolean, title: string) {
    setTogglingIds(prev => new Set(prev).add(taskId));
    updateTask.mutate(
      { id: taskId, data: { title, done: !currentDone } },
      {
        onSettled: () => {
          setTogglingIds(prev => { const s = new Set(prev); s.delete(taskId); return s; });
          queryClient.invalidateQueries({ queryKey: getGetDashboardTodayQueryKey() });
        },
      }
    );
  }

  return (
    <div className="space-y-6">

      {/* ── En-tête ── */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-xl">
          <Scale className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">الرئيسية</h1>
          <p className="text-muted-foreground text-sm">
            <DateDisplay date={new Date()} format="full" />
          </p>
        </div>
      </div>

      {/* ── 4 KPI Cards ── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { title: "الملفات الجارية",    value: loadingSummary ? null : summary?.activeCases ?? 0,                                icon: Briefcase,     color: "text-primary",     bg: "bg-primary/10",     action: () => navigate("/cases")   },
          { title: "المداخيل هذا الشهر", value: loadingSummary ? null : <TNDAmount amount={Number(summary?.monthlyIncome ?? 0)} />, icon: TrendingUp,    color: "text-success",     bg: "bg-success/10",     action: () => navigate("/billing") },
          { title: "فواتير معلقة",        value: loadingSummary ? null : summary?.pendingInvoices ?? 0,                            icon: Clock,         color: "text-warning",     bg: "bg-warning/10",     action: () => navigate("/billing") },
          { title: "آجال قريبة",          value: loadingSummary ? null : summary?.upcomingDeadlines ?? 0,                         icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10", action: () => navigate("/calendar")},
        ].map((card, i) => (
          <Card key={i} className="border-none shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={card.action}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <p className="text-xs text-muted-foreground font-medium leading-tight">{card.title}</p>
                <div className={`p-2 rounded-lg ${card.bg} shrink-0`}>
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </div>
              {card.value === null
                ? <Skeleton className="h-8 w-16" />
                : <p className="text-3xl font-bold tabular-nums leading-none mt-1">{card.value}</p>
              }
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Jlasset + Tâches + Alertes ── */}
      <div className="grid gap-5 lg:grid-cols-3">

        {/* Séances */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-primary" /> جلسات اليوم
              </span>
              <Badge variant="primary">{today?.sessions?.length ?? 0}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {loadingToday ? (
              <div className="space-y-2"><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></div>
            ) : today?.sessions?.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground text-sm">
                <CalendarClock className="h-7 w-7 mx-auto mb-2 opacity-20" />
                لا توجد جلسات اليوم
              </div>
            ) : (
              <div className="space-y-2">
                {today?.sessions?.map(s => (
                  <div key={s.id}
                    onClick={() => s.caseId ? navigate(`/cases/${s.caseId}`) : navigate("/calendar")}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors cursor-pointer border border-border/50"
                  >
                    <div className="bg-primary/10 text-primary p-2 rounded-md shrink-0">
                      <CalendarClock className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{s.title}</p>
                      <p className="text-xs text-muted-foreground">{s.caseName ?? "—"}</p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 tabular-nums">{s.time || "—"}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tâches */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" /> المهام
              </span>
              <div className="flex items-center gap-1.5">
                {doneTasks.length > 0 && <Badge variant="success">{doneTasks.length} منجزة</Badge>}
                <Badge variant={pendingTasks.length > 0 ? "warning" : "neutral"}>{pendingTasks.length} متبقية</Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {loadingToday ? (
              <div className="space-y-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
            ) : today?.tasks?.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground text-sm">
                <CheckCircle2 className="h-7 w-7 mx-auto mb-2 opacity-20" />
                لا توجد مهام اليوم
              </div>
            ) : (
              <div className="space-y-1.5">
                {today?.tasks?.map(t => {
                  const toggling = togglingIds.has(t.id);
                  return (
                    <div key={t.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border transition-all",
                        t.done ? "border-border/30 bg-muted/30 opacity-60" : "border-border/50 hover:bg-secondary"
                      )}
                    >
                      <button
                        className={cn("shrink-0 transition-colors focus:outline-none", toggling && "opacity-40")}
                        onClick={() => toggleTask(t.id, t.done ?? false, t.title ?? "")}
                        disabled={toggling}
                        title="تحديد كمنجز"
                      >
                        {t.done
                          ? <CheckCircle2 className="h-5 w-5 text-success" />
                          : <Circle className="h-5 w-5 text-muted-foreground/50" />}
                      </button>
                      <div className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => t.caseId ? navigate(`/cases/${t.caseId}`) : undefined}>
                        <p className={cn("font-medium text-sm truncate", t.done && "line-through text-muted-foreground")}>
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

        {/* Alertes */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" /> تنبيهات عاجلة
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {loadingAlerts ? (
              <div className="space-y-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
            ) : alerts?.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                <CheckCircle2 className="h-7 w-7 mx-auto mb-2 text-success opacity-60" />
                لا توجد تنبيهات
              </div>
            ) : (
              <div className="space-y-2">
                {alerts?.map(a => (
                  <div key={a.id}
                    className="flex items-start gap-2 p-3 rounded-lg border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 transition-colors cursor-pointer"
                    onClick={() => a.caseId ? navigate(`/cases/${a.caseId}`) : navigate("/billing")}
                  >
                    <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight">{a.message}</p>
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-xs text-muted-foreground truncate">{a.caseName}</p>
                        <span className="text-xs bg-destructive/10 text-destructive px-1.5 py-0.5 rounded shrink-0 ms-2">
                          {formatDateTN(a.dueDate)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Derniers dossiers ── */}
      <Card className="border-none shadow-sm">
        <CardHeader className="border-b pb-4 flex-row flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" /> آخر الملفات
          </CardTitle>
          <button onClick={() => navigate("/cases")} className="text-xs text-primary hover:underline flex items-center gap-1">
            عرض الكل <ArrowLeft className="h-3 w-3" />
          </button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {recentCases.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-20" />
                لا توجد ملفات بعد
              </div>
            ) : recentCases.map(c => {
              const s = STATUS_LABELS[c.status] || STATUS_LABELS.active;
              return (
                <div key={c.id}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-muted/20 transition-colors cursor-pointer"
                  onClick={() => navigate(`/cases/${c.id}`)}
                >
                  <div className="p-2.5 bg-muted/50 rounded-lg shrink-0">
                    <Scale className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{c.title}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" /> {c.clientName ?? "—"}
                    </p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${s.color}`}>{s.label}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

import { useLocation } from "wouter";
import { formatDateTN } from "@/lib/date";
import { TNDAmount } from "@/components/Money";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetDashboardToday,
  useGetDashboardAlerts,
  useGetDashboardSummary,
  useUpdateTask,
  getGetDashboardTodayQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarClock, Circle, CheckCircle2, AlertTriangle,
  FileText, TrendingUp, ArrowLeft, CheckCheck,
} from "lucide-react";
import { useState } from "react";
import { DateDisplay } from "@/components/DateDisplay";
import { cn } from "@/lib/utils";

export default function Today() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());

  const { data: today, isLoading: loadingToday } = useGetDashboardToday();
  const { data: alerts, isLoading: loadingAlerts } = useGetDashboardAlerts();
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const updateTask = useUpdateTask();

  function toggleTask(taskId: number, currentDone: boolean) {
    setTogglingIds(prev => new Set(prev).add(taskId));
    updateTask.mutate(
      { id: taskId, data: { done: !currentDone } as { done: boolean; title: string } },
      {
        onSettled: () => {
          setTogglingIds(prev => { const s = new Set(prev); s.delete(taskId); return s; });
          queryClient.invalidateQueries({ queryKey: getGetDashboardTodayQueryKey() });
        },
      }
    );
  }

  const pendingTasks = today?.tasks?.filter(t => !t.done) ?? [];
  const doneTasks    = today?.tasks?.filter(t => t.done)  ?? [];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">لوحة اليوم</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            <DateDisplay date={new Date()} format="full" />
          </p>
        </div>
        {/* Quick KPI strip */}
        {!loadingSummary && (
          <div className="hidden sm:flex items-center gap-6 text-sm">
            <div className="text-center">
              <p className="text-xl font-bold tabular-nums text-primary">{summary?.activeCases ?? 0}</p>
              <p className="text-xs text-muted-foreground">قضايا نشطة</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold tabular-nums text-warning">{summary?.upcomingDeadlines ?? 0}</p>
              <p className="text-xs text-muted-foreground">آجال قريبة</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold tabular-nums text-destructive">{summary?.pendingInvoices ?? 0}</p>
              <p className="text-xs text-muted-foreground">فواتير معلقة</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* ── Séances du jour ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-primary" />
                جلسات اليوم
              </span>
              <Badge variant="primary">{today?.sessions?.length ?? 0}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {loadingToday ? (
              <div className="space-y-2">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : today?.sessions?.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                <CalendarClock className="h-8 w-8 mx-auto mb-2 opacity-20" />
                لا توجد جلسات اليوم
              </div>
            ) : (
              <div className="space-y-2">
                {today?.sessions?.map(s => (
                  <div
                    key={s.id}
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

        {/* ── Tâches du jour ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                المهام
              </span>
              <div className="flex items-center gap-1.5">
                {doneTasks.length > 0 && (
                  <Badge variant="success">{doneTasks.length} منجزة</Badge>
                )}
                <Badge variant={pendingTasks.length > 0 ? "warning" : "neutral"}>{pendingTasks.length} متبقية</Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {loadingToday ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : today?.tasks?.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                <CheckCheck className="h-8 w-8 mx-auto mb-2 opacity-20" />
                لا توجد مهام اليوم
              </div>
            ) : (
              <div className="space-y-1.5">
                {today?.tasks?.map(t => {
                  const toggling = togglingIds.has(t.id);
                  return (
                    <div
                      key={t.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border transition-all",
                        t.done
                          ? "border-border/30 bg-muted/30 opacity-60"
                          : "border-border/50 hover:bg-secondary"
                      )}
                    >
                      <button
                        className={cn(
                          "shrink-0 transition-colors focus:outline-none",
                          toggling && "opacity-40"
                        )}
                        onClick={() => toggleTask(t.id, t.done ?? false)}
                        disabled={toggling}
                        title="تحديد كمنجز"
                      >
                        {t.done
                          ? <CheckCircle2 className="h-5 w-5 text-success" />
                          : <Circle className="h-5 w-5 text-muted-foreground/50" />
                        }
                      </button>
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => t.caseId ? navigate(`/cases/${t.caseId}`) : undefined}
                      >
                        <p className={cn(
                          "font-medium text-sm truncate",
                          t.done && "line-through text-muted-foreground"
                        )}>
                          {t.title}
                        </p>
                        {t.caseName && (
                          <p className="text-xs text-muted-foreground truncate">{t.caseName}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Alertes / Délais ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                آجال عاجلة
              </span>
              {(alerts?.length ?? 0) > 0 && (
                <Badge variant="danger">{alerts?.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {loadingAlerts ? (
              <div className="space-y-2">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : alerts?.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success opacity-60" />
                لا توجد آجال عاجلة
              </div>
            ) : (
              <div className="space-y-2">
                {alerts?.map(a => (
                  <div
                    key={a.id}
                    onClick={() => a.caseId ? navigate(`/cases/${a.caseId}`) : navigate("/billing")}
                    className="flex items-start gap-3 p-3 rounded-lg border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 transition-colors cursor-pointer"
                  >
                    <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight text-foreground">{a.message}</p>
                      <div className="flex items-center justify-between mt-1 gap-2">
                        <p className="text-xs text-muted-foreground truncate">{a.caseName}</p>
                        <span className="text-xs tabular-nums text-destructive shrink-0">{formatDateTN(a.dueDate)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Aperçu financier ── */}
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate("/billing?from=today")}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              الملف المالي هذا الشهر
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {loadingSummary ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-40" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">مداخيل الفواتير</p>
                  <p className="text-2xl font-bold tabular-nums text-success">
                    <TNDAmount amount={Number(summary?.monthlyIncome ?? 0)} />
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-warning/10 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">فواتير معلقة</p>
                    <p className="text-xl font-bold tabular-nums text-warning mt-0.5">
                      {summary?.pendingInvoices ?? 0}
                    </p>
                  </div>
                  <div className="bg-primary/10 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">قضايا نشطة</p>
                    <p className="text-xl font-bold tabular-nums text-primary mt-0.5">
                      {summary?.activeCases ?? 0}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-end">
                  <span className="text-xs text-primary flex items-center gap-1 hover:underline">
                    تفاصيل الفوترة <ArrowLeft className="h-3 w-3" />
                  </span>
                </div>
              </div>
            )}
            {/* Invoices list teaser */}
            {!loadingSummary && (summary?.pendingInvoices ?? 0) > 0 && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <FileText className="h-3 w-3" />
                  يوجد {summary?.pendingInvoices} فاتورة تستوجب المتابعة
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { formatCurrency } from "@/lib/currency";
import { formatDateTN } from "@/lib/date";
import { DateDisplay } from "@/components/DateDisplay";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetDashboardSummary, useGetDashboardToday, useGetDashboardAlerts,
  useUpdateTask, getGetDashboardTodayQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Briefcase, Clock, AlertTriangle, CheckCircle2,
  Calendar, TrendingUp, Scale, Users, ArrowLeft,
  Circle, CalendarClock, Crown,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { authFetch } from "@/lib/authFetch";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
type RecentCase = { id: number; title: string; status: string; clientName?: string | null; };

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: "نشطة", color: "text-success bg-success/10" },
  pending: { label: "انتظار", color: "text-warning bg-warning/10" },
  suspended: { label: "موقوفة", color: "text-warning bg-warning/10" },
  closed: { label: "مغلقة", color: "text-muted-foreground bg-muted/50" },
};

interface OrgTrialInfo {
  subscriptionStatus: string;
  daysRemaining: number | null;
  isTrialExpired: boolean;
  subscriptionPlan: string;
  plan: { name: string };
}

export default function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const { data: today, isLoading: loadingToday } = useGetDashboardToday();
  const { data: alerts, isLoading: loadingAlerts } = useGetDashboardAlerts();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());
  const updateTask = useUpdateTask();
  const [orgInfo, setOrgInfo] = useState<OrgTrialInfo | null>(null);
  const [recentCases, setRecentCases] = useState<RecentCase[]>([]);

  useEffect(() => {
    authFetch(`${BASE}/api/organization`)
      .then(r => r.ok ? r.json() : null)
      .then((d: OrgTrialInfo | null) => { if (d) setOrgInfo(d); })
      .catch(() => {});
    authFetch(`${BASE}/api/cases`)
      .then(r => r.ok ? r.json() : [])
      .then((d: RecentCase[]) => setRecentCases(Array.isArray(d) ? d.slice(0, 5) : []))
      .catch(() => {});
  }, []);

  function toggleTask(taskId: number, currentDone: boolean) {
    setTogglingIds(prev => new Set(prev).add(taskId));
    updateTask.mutate(
      { id: taskId, data: { done: !currentDone } },
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
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-primary/10 rounded-xl">
          <Scale className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">لوحة القيادة</h1>
          <p className="text-muted-foreground text-sm">
            <DateDisplay date={new Date()} format="full" />
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: "القضايا الجارية",
            value: loadingSummary ? null : summary?.activeCases ?? 0,
            icon: Briefcase, color: "text-primary", bg: "bg-primary/10",
            action: () => navigate("/cases"),
          },
          {
            title: "المداخيل هذا الشهر",
            value: loadingSummary ? null : formatCurrency(Number(summary?.monthlyIncome ?? 0)),
            icon: TrendingUp, color: "text-success", bg: "bg-success/10",
            action: () => navigate("/billing"),
          },
          {
            title: "فواتير معلقة",
            value: loadingSummary ? null : summary?.pendingInvoices ?? 0,
            icon: Clock, color: "text-warning", bg: "bg-warning/10",
            action: () => navigate("/billing"),
          },
          {
            title: "آجال قريبة",
            value: loadingSummary ? null : summary?.upcomingDeadlines ?? 0,
            icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10",
            action: () => navigate("/calendar"),
          },
        ].map((card, i) => (
          <Card
            key={i}
            className="border-none shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            onClick={card.action}
          >
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

      {/* Subscription / Trial Banner */}
      {orgInfo && (orgInfo.subscriptionStatus === "trial" || orgInfo.isTrialExpired || orgInfo.subscriptionStatus === "expired") && (
        <div onClick={() => navigate("/subscription")} className="cursor-pointer">
          {orgInfo.isTrialExpired || orgInfo.subscriptionStatus === "expired" ? (
            <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/30 rounded-xl p-4">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-destructive text-sm">انتهت فترة التجربة المجانية</p>
                <p className="text-xs text-muted-foreground">اشترك الآن للاستمرار في استخدام جميع الميزات</p>
              </div>
              <Button size="sm" variant="destructive" className="shrink-0">اشترك الآن</Button>
            </div>
          ) : orgInfo.daysRemaining !== null && orgInfo.daysRemaining <= 14 ? (
            <div className="flex items-center gap-3 bg-warning/10 border border-warning/20 rounded-xl p-4">
              <Crown className="h-5 w-5 text-warning shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-warning text-sm">تجربة مجانية — {orgInfo.daysRemaining} يوم متبقٍ</p>
                <p className="text-xs text-muted-foreground">اشترك قبل انتهاء التجربة للاستمرار بدون انقطاع</p>
              </div>
              <Button size="sm" className="shrink-0 bg-warning hover:bg-warning/90">ترقية</Button>
            </div>
          ) : orgInfo.daysRemaining !== null ? (
            <div className="flex items-center gap-3 bg-primary/5 border border-primary/15 rounded-xl p-3">
              <Crown className="h-4 w-4 text-primary shrink-0" />
              <p className="text-sm text-muted-foreground flex-1">
                <span className="text-primary font-medium">تجربة مجانية</span> — {orgInfo.daysRemaining} يوم متبقٍ من أصل 90
              </p>
              <span className="text-xs text-primary hover:underline flex items-center gap-1">تفاصيل <ArrowLeft className="h-3 w-3" /></span>
            </div>
          ) : null}
        </div>
      )}

      {/* Financial Strip */}
      <Card onClick={() => navigate("/billing")} className="border-none shadow-sm bg-gradient-to-l from-primary/5 to-card cursor-pointer hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-6 items-center">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">الملف المالي لهذا الشهر:</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">مداخيل الفواتير:</span>
              <span className="font-bold text-sm text-success" dir="ltr">
                {loadingSummary ? "..." : formatCurrency(Number(summary?.monthlyIncome ?? 0))}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">فواتير معلقة:</span>
              <span className="font-bold text-sm text-warning">
                {loadingSummary ? "..." : summary?.pendingInvoices ?? 0}
              </span>
            </div>
            <span className="text-xs text-primary flex items-center gap-1 me-auto">
              تفاصيل <ArrowLeft className="h-3 w-3" />
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Today */}
        <Card className="border-none shadow-sm lg:col-span-2">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" /> جلسات ومهام اليوم
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loadingToday ? (
              <div className="p-5 space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <div className="divide-y divide-border">
                {today?.sessions?.length === 0 && today?.tasks?.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    <Calendar className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    لا توجد جلسات أو مهام اليوم
                  </div>
                ) : null}
                {today?.sessions?.map(s => (
                  <div
                    key={`s-${s.id}`}
                    className="flex items-center gap-4 px-5 py-3 hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => s.caseId ? navigate(`/cases/${s.caseId}`) : navigate("/calendar")}
                  >
                    <div className="bg-primary/10 text-primary p-2.5 rounded-lg shrink-0">
                      <CalendarClock className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{s.title}</p>
                      <p className="text-xs text-muted-foreground">{s.caseName ?? "—"} • {s.time || "وقت غير محدد"}</p>
                    </div>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-md shrink-0">جلسة</span>
                  </div>
                ))}
                {today?.tasks?.map(t => {
                  const toggling = togglingIds.has(t.id);
                  return (
                    <div key={`t-${t.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/20 transition-colors">
                      <button
                        className={`shrink-0 rounded-full transition-colors focus:outline-none ${toggling ? "opacity-50" : "hover:opacity-80"}`}
                        onClick={() => toggleTask(t.id, t.done ?? false)}
                        disabled={toggling}
                        title="تحديد كمنجز"
                      >
                        {t.done
                          ? <CheckCircle2 className="h-6 w-6 text-success" />
                          : <Circle className="h-6 w-6 text-warning" />
                        }
                      </button>
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => t.caseId ? navigate(`/cases/${t.caseId}`) : undefined}
                      >
                        <p className={`font-semibold text-sm truncate ${t.done ? "line-through text-muted-foreground" : ""}`}>{t.title}</p>
                        <p className="text-xs text-muted-foreground">{t.caseName ?? "—"}</p>
                      </div>
                      <span className="text-xs bg-warning/10 text-warning px-2 py-1 rounded-md shrink-0">مهمة</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card className="border-none shadow-sm">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> تنبيهات عاجلة
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loadingAlerts ? (
              <div className="p-5 space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <div className="divide-y divide-border">
                {alerts?.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success opacity-60" />
                    لا توجد تنبيهات
                  </div>
                ) : alerts?.map(a => (
                  <div
                    key={a.id}
                    className="px-4 py-3 hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => a.caseId ? navigate(`/cases/${a.caseId}`) : navigate("/billing")}
                  >
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight">{a.message}</p>
                        <div className="flex justify-between items-center mt-1">
                          <p className="text-xs text-muted-foreground truncate">{a.caseName}</p>
                          <span className="text-xs bg-destructive/10 text-destructive px-1.5 py-0.5 rounded shrink-0 me-1">
                            {formatDateTN(a.dueDate)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Cases */}
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
                <div
                  key={c.id}
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
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${s.color}`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

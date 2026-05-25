import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetDashboardSummary, useGetDashboardToday, useGetDashboardAlerts,
  useUpdateTask, getGetDashboardTodayQueryKey,
} from "@workspace/api-client-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TNDAmount } from "@/components/Money";
import { cn } from "@/lib/utils";
import { authFetch } from "@/lib/authFetch";
import { useAuth } from "@/context/AuthContext";
import {
  CalendarClock, Timer, CheckCircle2, Circle, AlertTriangle,
  ChevronLeft, Users, Scale, TrendingUp, Briefcase,
  ArrowLeft, Receipt,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

type RawCase = {
  id: number; title: string; status: string;
  clientName?: string | null; caseNumber?: string | null;
  procedureStage?: string | null;
};

type Deadline = {
  id: number; caseId: number; caseName?: string | null;
  title: string; dueDate: string; completedAt: string | null;
};

function daysLeft(d: string) {
  const today = new Date(); today.setHours(0,0,0,0);
  const due   = new Date(d); due.setHours(0,0,0,0);
  return Math.ceil((due.getTime() - today.getTime()) / 86_400_000);
}

const STAGE: Record<string, string> = {
  ibtidai: "ابتدائي", istinaf: "استئناف",
  taaqqib: "تعقيب",  tanfidh: "تنفيذ", khatm: "ختم",
};

const STATUS_CLS: Record<string, string> = {
  active:    "text-emerald-400 bg-emerald-500/10",
  pending:   "text-amber-400 bg-amber-500/10",
  suspended: "text-amber-400 bg-amber-500/10",
  closed:    "text-muted-foreground bg-muted/50",
};

export default function MorningBrief() {
  const [, navigate]  = useLocation();
  const { user }      = useAuth();
  const queryClient   = useQueryClient();
  const updateTask    = useUpdateTask();

  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary({ query: { staleTime: 0 } });
  const { data: today,   isLoading: loadingToday   } = useGetDashboardToday({ query: { staleTime: 0 } });
  const { data: alerts,  isLoading: loadingAlerts  } = useGetDashboardAlerts({ query: { staleTime: 0 } });

  const [deadlines,    setDeadlines]    = useState<Deadline[]>([]);
  const [cases,        setCases]        = useState<RawCase[]>([]);
  const [loadingExtra, setLoadingExtra] = useState(true);
  const [togglingIds,  setTogglingIds]  = useState<Set<number>>(new Set());

  useEffect(() => {
    Promise.all([
      authFetch(`${BASE}/api/deadlines`).then(r => r.ok ? r.json() : []),
      authFetch(`${BASE}/api/cases`).then(r => r.ok ? r.json() : []),
    ]).then(([dl, cs]) => {
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() + 14);
      setDeadlines(
        (Array.isArray(dl) ? dl as Deadline[] : [])
          .filter(d => !d.completedAt && new Date(d.dueDate) <= cutoff)
          .sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
          .slice(0, 6)
      );
      setCases(
        (Array.isArray(cs) ? cs as RawCase[] : [])
          .filter(c => c.status === "active")
          .slice(0, 5)
      );
    }).finally(() => setLoadingExtra(false));
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

  // greeting based on time
  const hour = new Date().getHours();
  const salut = hour < 12 ? "صباح الخير" : hour < 17 ? "مساء النور" : "مساء الخير";
  const firstName = user?.name?.split(" ")[0];

  const headerActions = (
    <div className="flex flex-wrap gap-2 text-xs">
      {(today?.sessions?.length ?? 0) > 0 && (
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-medium">
          <CalendarClock className="h-3 w-3" />
          {today?.sessions?.length} جلسة
        </span>
      )}
      {pendingTasks.length > 0 && (
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-medium">
          <CheckCircle2 className="h-3 w-3" />
          {pendingTasks.length} مهمة
        </span>
      )}
      {(summary?.pendingInvoices ?? 0) > 0 && (
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 font-medium">
          <Receipt className="h-3 w-3" />
          {summary?.pendingInvoices} فاتورة
        </span>
      )}
    </div>
  );

  return (
    <div className="space-y-6">

      <PageHeader
        title={firstName ? `${salut}، ${firstName}` : salut}
        subtitle={
          <span className="text-muted-foreground/70">
            {new Date().toLocaleDateString("ar-TN", {
              weekday: "long", day: "numeric", month: "long"
            })}
          </span>
        }
        actions={!loadingSummary && !loadingToday ? headerActions : undefined}
      />

      {/* ── اليوم: 3 cards ─────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* جلسات اليوم */}
        <Card className="border-border/60 shadow-sm">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <span className={cn(
              "h-7 w-7 rounded-full flex items-center justify-center text-sm font-bold",
              (today?.sessions?.length ?? 0) > 0
                ? "bg-primary/15 text-primary"
                : "bg-muted/50 text-muted-foreground"
            )}>
              {loadingToday ? "…" : today?.sessions?.length ?? 0}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">جلسات اليوم</span>
              <CalendarClock className="h-4 w-4 text-primary" />
            </div>
          </div>
          <CardContent className="px-0 pb-0 pt-0">
            {loadingToday ? (
              <div className="p-4 space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (today?.sessions?.length ?? 0) === 0 ? (
              <div className="py-6 text-center text-muted-foreground text-xs space-y-1">
                <CalendarClock className="h-6 w-6 mx-auto opacity-10 mb-2" />
                لا توجد جلسات اليوم
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {today?.sessions?.map(s => (
                  <div key={s.id}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 cursor-pointer transition-colors"
                    onClick={() => s.caseId ? navigate(`/cases/${s.caseId}`) : navigate("/calendar")}
                  >
                    <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
                    <div className="flex-1 min-w-0 text-right">
                      <p className="text-xs font-medium truncate">{s.title}</p>
                      {s.caseName && <p className="text-xs text-muted-foreground truncate">{s.caseName}</p>}
                    </div>
                    {s.time && <span className="text-xs text-muted-foreground/60 shrink-0 tabular-nums">{s.time}</span>}
                    <CalendarClock className="h-3.5 w-3.5 text-primary/50 shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* المهام */}
        <Card className="border-border/60 shadow-sm">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <span className={cn(
              "h-7 w-7 rounded-full flex items-center justify-center text-sm font-bold",
              pendingTasks.length > 0
                ? "bg-amber-500/15 text-amber-400"
                : "bg-emerald-500/10 text-emerald-400"
            )}>
              {loadingToday ? "…" : pendingTasks.length}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">المهام</span>
              <CheckCircle2 className={cn("h-4 w-4", pendingTasks.length > 0 ? "text-amber-400" : "text-emerald-400")} />
            </div>
          </div>
          <CardContent className="px-0 pb-0 pt-0">
            {loadingToday ? (
              <div className="p-4 space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (today?.tasks?.length ?? 0) === 0 ? (
              <div className="py-6 text-center text-muted-foreground text-xs">
                <CheckCircle2 className="h-6 w-6 mx-auto text-emerald-400/30 mb-2" />
                لا توجد مهام
              </div>
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
                        onClick={() => toggleTask(t.id, t.done ?? false, t.title ?? "")}
                        disabled={toggling}
                        className={cn("shrink-0", toggling && "opacity-40")}
                      >
                        {t.done
                          ? <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          : <Circle className="h-4 w-4 text-muted-foreground/30" />}
                      </button>
                      <div className="flex-1 min-w-0 text-right cursor-pointer"
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

        {/* الآجال */}
        <Card className="border-border/60 shadow-sm">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <span className={cn(
              "h-7 w-7 rounded-full flex items-center justify-center text-sm font-bold",
              deadlines.some(d => daysLeft(d.dueDate) <= 3)
                ? "bg-red-500/15 text-red-400"
                : "bg-muted/50 text-muted-foreground"
            )}>
              {loadingExtra ? "…" : deadlines.length}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">آجال قريبة</span>
              <Timer className={cn(
                "h-4 w-4",
                deadlines.some(d => daysLeft(d.dueDate) <= 3) ? "text-red-400" : "text-muted-foreground"
              )} />
            </div>
          </div>
          <CardContent className="px-0 pb-0 pt-0">
            {loadingExtra ? (
              <div className="p-4 space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : deadlines.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground text-xs">
                <CheckCircle2 className="h-6 w-6 mx-auto text-emerald-400/30 mb-2" />
                لا آجال قادمة
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {deadlines.map(d => {
                  const days = daysLeft(d.dueDate);
                  const urgent = days < 0;
                  const soon   = days <= 3;
                  return (
                    <div key={d.id}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 cursor-pointer transition-colors"
                      onClick={() => d.caseId ? navigate(`/cases/${d.caseId}`) : undefined}
                    >
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full border shrink-0 font-medium tabular-nums",
                        urgent
                          ? "bg-red-500/15 text-red-400 border-red-500/20"
                          : soon
                            ? "bg-amber-500/15 text-amber-400 border-amber-500/20"
                            : "bg-muted/40 text-muted-foreground border-border"
                      )}>
                        {urgent ? `−${Math.abs(days)}ي` : days === 0 ? "اليوم" : `${days}ي`}
                      </span>
                      <div className="flex-1 min-w-0 text-right">
                        <p className="text-xs font-medium truncate">{d.title}</p>
                        {d.caseName && <p className="text-xs text-muted-foreground truncate">{d.caseName}</p>}
                      </div>
                      <Timer className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* ── تنبيهات ────────────────────────────────────────── */}
      {(loadingAlerts || (alerts && alerts.length > 0)) && (
        <div>
          <h2 className="font-semibold text-sm mb-3">تنبيهات</h2>
          <Card className="border-border/60 shadow-sm">
            <CardContent className="px-0 pb-0 pt-0">
              {loadingAlerts ? (
                <div className="p-4 space-y-2">
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {alerts?.map(a => (
                    <div key={a.id}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 cursor-pointer transition-colors"
                      onClick={() => a.caseId ? navigate(`/cases/${a.caseId}`) : navigate("/billing")}
                    >
                      <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
                      <div className="flex-1 min-w-0 text-right">
                        <p className="text-sm font-semibold truncate">{a.message}</p>
                        {a.caseName && <p className="text-xs text-muted-foreground">{a.caseName}</p>}
                      </div>
                      <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Dossiers actifs + résumé financier ─────────────── */}
      <div className="grid gap-5 lg:grid-cols-3">

        {/* آخر الملفات الجارية */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => navigate("/cases")}
              className="text-xs text-primary hover:underline flex items-center gap-1 font-medium">
              <ArrowLeft className="h-3 w-3" /> كل الملفات
            </button>
            <h2 className="font-semibold text-sm">الملفات الجارية</h2>
          </div>
          <Card className="border-border/60 shadow-sm">
            <CardContent className="px-0 pb-0 pt-0">
              {loadingExtra ? (
                <div className="p-4 space-y-2">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : cases.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  <Briefcase className="h-7 w-7 mx-auto mb-2 opacity-10" />
                  لا ملفات جارية
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {cases.map(c => {
                    const cls = STATUS_CLS[c.status] ?? STATUS_CLS.active;
                    const stage = c.procedureStage ? STAGE[c.procedureStage] : null;
                    return (
                      <div key={c.id}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 cursor-pointer transition-colors"
                        onClick={() => navigate(`/cases/${c.id}`)}
                      >
                        <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
                        {stage && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/8 text-primary border border-primary/15 font-medium shrink-0">
                            {stage}
                          </span>
                        )}
                        <div className="flex-1 min-w-0 text-right">
                          <p className="text-sm font-medium truncate">{c.title}</p>
                          <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                            {c.clientName ?? "—"} <Users className="h-3 w-3" />
                          </p>
                        </div>
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
          <h2 className="font-semibold text-sm mb-3 text-right">ملخص مالي</h2>
          <Card className="border-border/60 shadow-sm">
            <CardContent className="px-0 pb-0 pt-0">
              {loadingSummary ? (
                <div className="p-4 space-y-2">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
                    <span className="text-sm font-bold text-emerald-400 tabular-nums">
                      <TNDAmount amount={Number(summary?.monthlyIncome ?? 0)} />
                    </span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      المداخيل هذا الشهر
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
                    <span className={cn(
                      "text-sm font-bold tabular-nums",
                      (summary?.pendingInvoices ?? 0) > 0 ? "text-amber-400" : "text-foreground"
                    )}>
                      {summary?.pendingInvoices ?? 0}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      فواتير معلقة
                      <Receipt className="h-3.5 w-3.5 text-amber-400" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm font-bold tabular-nums text-primary">
                      {summary?.activeCases ?? 0}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      ملفات جارية
                      <Briefcase className="h-3.5 w-3.5 text-primary" />
                    </div>
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

import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TrendingUp, Briefcase, Users, CreditCard, Download,
  BarChart3, CheckCircle2, AlertCircle, Clock, RefreshCw
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { authFetch } from "@/lib/authFetch";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

interface ReportData {
  monthly: { month: string; income: number }[];
  caseStatus: { label: string; value: number; color: string; pct: number }[];
  topClients: { id: number; name: string; cases: number; amount: number }[];
  billing: { paidCount: number; paidAmount: number; pendingCount: number; pendingAmount: number };
  tasks: { done: number; pending: number };
}

function useReports() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`${BASE_URL}/api/reports/summary`);
      if (!res.ok) throw new Error("فشل تحميل البيانات");
      setData(await res.json());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);
  return { data, loading, error, reload: load };
}

function BarChart({ monthly }: { monthly: { month: string; income: number }[] }) {
  const maxVal = Math.max(...monthly.map((m) => m.income), 1);
  return (
    <>
      <div className="flex items-end gap-2 mb-2" style={{ height: 120 }}>
        {monthly.map((m, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5 h-full justify-end">
            <span className="text-[10px] text-primary font-medium">
              {m.income > 0 ? m.income.toLocaleString() : ""}
            </span>
            <div
              className="w-full bg-primary rounded-sm transition-all duration-700"
              style={{ height: `${(m.income / maxVal) * 85}%`, minHeight: m.income > 0 ? 4 : 2 }}
            />
          </div>
        ))}
      </div>
      <div className="flex border-t border-border pt-2 gap-2">
        {monthly.map((m, i) => (
          <div key={i} className="flex-1 text-center text-[10px] text-muted-foreground leading-tight">{m.month}</div>
        ))}
      </div>
    </>
  );
}

function StatBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
      <div className="flex-1 bg-muted/30 rounded-full h-2">
        <div className={`h-2 rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold w-5 text-center shrink-0">{value}</span>
    </div>
  );
}

export default function Reports() {
  const { data, loading, error, reload } = useReports();
  const [, navigate] = useLocation();

  const totalIncome = data?.monthly.reduce((s, m) => s + m.income, 0) ?? 0;
  const avgMonthly = data ? Math.round(totalIncome / (data.monthly.filter((m) => m.income > 0).length || 1)) : 0;
  const totalCases = data?.caseStatus.reduce((s, c) => s + c.value, 0) ?? 0;
  const collectionRate = data
    ? data.billing.paidAmount + data.billing.pendingAmount > 0
      ? Math.round((data.billing.paidAmount / (data.billing.paidAmount + data.billing.pendingAmount)) * 100)
      : 0
    : 0;
  const totalTasks = (data?.tasks.done ?? 0) + (data?.tasks.pending ?? 0);
  const taskRate = totalTasks > 0 ? Math.round(((data?.tasks.done ?? 0) / totalTasks) * 100) : 0;

  function handleExportCSV() {
    if (!data) return;
    const rows = [
      ["الشهر", "المداخيل"],
      ...data.monthly.map((m) => [m.month, m.income]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `تقرير-محامي-بلوس-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">التقارير والإحصائيات</h1>
          <p className="text-muted-foreground text-sm mt-0.5">نظرة شاملة على أداء المكتب والوضع المالي</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-2" onClick={reload} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> تحديث
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportCSV} disabled={!data}>
            <Download className="h-4 w-4" /> CSV
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm text-center">
          {error} —{" "}
          <button className="underline" onClick={reload}>حاول مجدداً</button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "إجمالي المداخيل (7 أشهر)",
            value: loading ? null : `${totalIncome.toLocaleString()} د.ت`,
            icon: TrendingUp, color: "text-green-400", bg: "bg-green-500/10",
            action: () => navigate("/billing"),
          },
          {
            label: "فواتير مدفوعة",
            value: loading ? null : data?.billing.paidCount ?? 0,
            icon: CheckCircle2, color: "text-primary", bg: "bg-primary/10",
            action: () => navigate("/billing"),
          },
          {
            label: "فواتير معلقة",
            value: loading ? null : data?.billing.pendingCount ?? 0,
            icon: Clock, color: "text-orange-400", bg: "bg-orange-500/10",
            action: () => navigate("/billing"),
          },
          {
            label: "متوسط شهري",
            value: loading ? null : `${avgMonthly.toLocaleString()} د.ت`,
            icon: BarChart3, color: "text-blue-400", bg: "bg-blue-500/10",
            action: undefined,
          },
        ].map((k, i) => (
          <Card
            key={i}
            className={`border-none shadow-sm ${k.action ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
            onClick={k.action}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs text-muted-foreground leading-tight">{k.label}</p>
                <div className={`p-2 rounded-lg ${k.bg}`}>
                  <k.icon className={`h-4 w-4 ${k.color}`} />
                </div>
              </div>
              {k.value === null
                ? <Skeleton className="h-7 w-24" />
                : <p className="font-bold text-xl" dir="ltr">{k.value}</p>
              }
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Income Chart */}
        <Card className="border-none shadow-md">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" /> المداخيل الشهرية (7 أشهر)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : !data || data.monthly.every((m) => m.income === 0) ? (
              <div className="h-36 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
                <BarChart3 className="h-8 w-8 opacity-20" />
                لا توجد فواتير مسددة بعد
              </div>
            ) : (
              <BarChart monthly={data!.monthly} />
            )}
            <div className="flex gap-4 mt-4 justify-center text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-primary inline-block" /> مداخيل مسددة
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Case Stats */}
        <Card className="border-none shadow-md">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-base flex items-center gap-2 justify-between">
              <span className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" /> إحصائيات القضايا
              </span>
              <span className="text-xs font-normal text-muted-foreground">
                {loading ? "..." : `${totalCases} قضية`}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-3">حسب الحالة</p>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-4 w-full" />)}
                </div>
              ) : !data || data.caseStatus.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">لا توجد قضايا بعد</p>
              ) : (
                <div className="space-y-3">
                  {data!.caseStatus.map((s, i) => (
                    <StatBar key={i} label={s.label} value={s.value} total={totalCases} color={s.color} />
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="text-xs text-muted-foreground font-medium mb-3">المهام</p>
              {loading ? (
                <Skeleton className="h-4 w-full" />
              ) : (
                <div className="space-y-3">
                  <StatBar label="منجزة" value={data?.tasks.done ?? 0} total={totalTasks || 1} color="bg-green-500" />
                  <StatBar label="قيد التنفيذ" value={data?.tasks.pending ?? 0} total={totalTasks || 1} color="bg-orange-500" />
                </div>
              )}
              {!loading && totalTasks > 0 && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  نسبة الإنجاز: <span className="font-bold text-green-400">{taskRate}%</span>
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Clients */}
        <Card className="border-none shadow-md">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> أبرز الحرفاء
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
              </div>
            ) : !data || data.topClients.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-20" />
                لا يوجد حرفاء بعد
              </div>
            ) : (
              data!.topClients.map((c, i) => (
                <div
                  key={c.id}
                  className="flex items-center gap-4 p-3 bg-muted/30 rounded-xl cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(`/clients/${c.id}`)}
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.cases} قضايا</p>
                  </div>
                  <div className="text-left shrink-0">
                    <p className="font-bold text-sm text-primary" dir="ltr">
                      {c.amount.toLocaleString()} د.ت
                    </p>
                    <p className="text-xs text-muted-foreground">إجمالي الأتعاب</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Billing Stats */}
        <Card className="border-none shadow-md">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" /> حالة الفوترة
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-6 w-full" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    className="p-4 rounded-xl bg-green-500/10 cursor-pointer hover:bg-green-500/15 transition-colors"
                    onClick={() => navigate("/billing")}
                  >
                    <CheckCircle2 className="h-6 w-6 text-green-400 mb-2" />
                    <p className="text-2xl font-bold">{data?.billing.paidCount ?? 0}</p>
                    <p className="text-xs text-muted-foreground">فواتير مدفوعة</p>
                    <p className="text-sm font-medium mt-1 text-green-400" dir="ltr">
                      {(data?.billing.paidAmount ?? 0).toLocaleString()} د.ت
                    </p>
                  </div>
                  <div
                    className="p-4 rounded-xl bg-orange-500/10 cursor-pointer hover:bg-orange-500/15 transition-colors"
                    onClick={() => navigate("/billing")}
                  >
                    <AlertCircle className="h-6 w-6 text-orange-400 mb-2" />
                    <p className="text-2xl font-bold">{data?.billing.pendingCount ?? 0}</p>
                    <p className="text-xs text-muted-foreground">فواتير معلقة</p>
                    <p className="text-sm font-medium mt-1 text-orange-400" dir="ltr">
                      {(data?.billing.pendingAmount ?? 0).toLocaleString()} د.ت
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">نسبة التحصيل</span>
                    <span className={`font-bold ${collectionRate >= 70 ? "text-green-400" : collectionRate >= 40 ? "text-orange-400" : "text-red-400"}`}>
                      {collectionRate}%
                    </span>
                  </div>
                  <div className="w-full bg-muted/30 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-700 ${collectionRate >= 70 ? "bg-green-500" : collectionRate >= 40 ? "bg-orange-500" : "bg-red-500"}`}
                      style={{ width: `${collectionRate}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">نسبة إنجاز المهام</span>
                    <span className="font-bold text-primary">{taskRate}%</span>
                  </div>
                  <div className="w-full bg-muted/30 rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full bg-primary transition-all duration-700"
                      style={{ width: `${taskRate}%` }}
                    />
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

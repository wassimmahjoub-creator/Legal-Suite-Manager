import React, { useEffect, useState, useMemo } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp, Briefcase, Users, CreditCard, Download,
  BarChart3, CheckCircle2, AlertCircle, Clock, RefreshCw, ArrowRight,
  ChevronUp, ChevronDown, Wallet,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { authFetch } from "@/lib/authFetch";
import { Money, TNDAmount } from "@/components/Money";
import { formatAmount } from "@/lib/currency";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

/* ══════════════════════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════════════════════ */

interface ReportData {
  monthly: { month: string; income: number }[];
  caseStatus: { label: string; value: number; color: string; pct: number }[];
  topClients: { id: number; name: string; cases: number; amount: number }[];
  billing: { paidCount: number; paidAmount: number; pendingCount: number; pendingAmount: number };
  tasks: { done: number; pending: number };
}

interface CaseProfRow {
  caseId: number; caseNumber: string; title: string; clientName: string;
  status: string; caseType: string; createdAt: string;
  totalInvoiced: number; totalCollected: number; totalExpenses: number; grossMargin: number;
}

interface LawyerPerfRow {
  userId: number; name: string; role: string;
  activeCases: number; totalCases: number;
  totalInvoiced: number; totalCollected: number;
}

interface ClientSourceRow {
  clientType: string; clientTypeLabel: string;
  clientCount: number; caseCount: number;
  totalInvoiced: number; totalCollected: number;
  avgPerClient: number; conversionRate: number;
}

/* ══════════════════════════════════════════════════════════════
   SHARED HELPERS
══════════════════════════════════════════════════════════════ */

const STATUS_AR: Record<string, string> = {
  active: "نشطة", pending: "انتظار", suspended: "موقوفة", closed: "مغلقة", archived: "مؤرشفة",
};
const ROLE_AR: Record<string, string> = {
  admin: "مدير", lawyer: "محامي", secretary: "سكرتيرة", trainee: "متربص", accountant: "محاسب",
};

function fmtNum(n: number) {
  return formatAmount(n);
}

function periodDates(period: string, customFrom: string, customTo: string) {
  const now = new Date();
  if (period === "month") return {
    dateFrom: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
    dateTo: now.toISOString().slice(0, 10),
  };
  if (period === "quarter") {
    const q = Math.floor(now.getMonth() / 3);
    return {
      dateFrom: new Date(now.getFullYear(), q * 3, 1).toISOString().slice(0, 10),
      dateTo: now.toISOString().slice(0, 10),
    };
  }
  if (period === "year") return {
    dateFrom: new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10),
    dateTo: now.toISOString().slice(0, 10),
  };
  if (period === "custom") return { dateFrom: customFrom, dateTo: customTo };
  return { dateFrom: "", dateTo: "" };
}

function exportCsv(rows: string[][], filename: string) {
  const BOM = "﻿";
  const content = BOM + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\r\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/* ── Small KPI card ─────────────────────────────────────────── */
function KpiCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5 text-primary-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="text-lg font-bold text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}

/* ── Sortable table hook ─────────────────────────────────────── */
type SortDir = "asc" | "desc";

function useSortable<T>(data: T[], defaultKey: keyof T, defaultDir: SortDir = "desc") {
  const [sortKey, setSortKey] = useState<keyof T>(defaultKey);
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir);

  const sorted = useMemo(() => [...data].sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey];
    if (typeof av === "number" && typeof bv === "number") return sortDir === "asc" ? av - bv : bv - av;
    return sortDir === "asc"
      ? String(av).localeCompare(String(bv), "ar")
      : String(bv).localeCompare(String(av), "ar");
  }), [data, sortKey, sortDir]);

  function onSort(key: keyof T) {
    if (key === sortKey) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  function Th({ children, k }: { children: React.ReactNode; k: keyof T }) {
    const active = sortKey === k;
    return (
      <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground cursor-pointer select-none whitespace-nowrap hover:text-foreground"
          onClick={() => onSort(k)}>
        <span className="inline-flex items-center gap-1">
          {children}
          {active
            ? sortDir === "asc" ? <ChevronUp className="w-3 h-3 text-primary" /> : <ChevronDown className="w-3 h-3 text-primary" />
            : <ChevronUp className="w-3 h-3 opacity-20" />}
        </span>
      </th>
    );
  }

  return { sorted, Th };
}

/* ══════════════════════════════════════════════════════════════
   TAB 0 — ملخص عام (existing summary)
══════════════════════════════════════════════════════════════ */

const ARABIC_MONTHS: Record<string, string> = {
  "01": "جانفي", "02": "فيفري", "03": "مارس", "04": "أفريل",
  "05": "ماي",   "06": "جوان",  "07": "جويلية","08": "أوت",
  "09": "سبتمبر","10": "أكتوبر","11": "نوفمبر","12": "ديسمبر",
};

function IncomeBar({ monthly }: { monthly: { month: string; income: number }[] }) {
  const maxVal = Math.max(...monthly.map(m => m.income), 1);
  return (
    <>
      <div className="flex items-end gap-2 mb-2" style={{ height: 120 }}>
        {monthly.map((m, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5 h-full justify-end">
            <span className="text-[10px] text-primary font-medium">{m.income > 0 ? formatAmount(m.income) : ""}</span>
            <div className="w-full bg-primary rounded-sm transition-all duration-700"
                 style={{ height: `${(m.income / maxVal) * 85}%`, minHeight: m.income > 0 ? 4 : 2 }} />
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

function SummaryTab() {
  const [data, setData]     = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);
  const [, navigate]        = useLocation();

  async function load() {
    setLoading(true); setError(null);
    try {
      const res = await authFetch(`${BASE_URL}/api/reports/summary`);
      if (!res.ok) throw new Error("فشل تحميل البيانات");
      setData(await res.json());
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const totalIncome    = data?.monthly.reduce((s, m) => s + m.income, 0) ?? 0;
  const avgMonthly     = data ? Math.round(totalIncome / (data.monthly.filter(m => m.income > 0).length || 1)) : 0;
  const totalCases     = data?.caseStatus.reduce((s, c) => s + c.value, 0) ?? 0;
  const collectionRate = data && (data.billing.paidAmount + data.billing.pendingAmount) > 0
    ? Math.round((data.billing.paidAmount / (data.billing.paidAmount + data.billing.pendingAmount)) * 100) : 0;
  const totalTasks = (data?.tasks.done ?? 0) + (data?.tasks.pending ?? 0);
  const taskRate   = totalTasks > 0 ? Math.round(((data?.tasks.done ?? 0) / totalTasks) * 100) : 0;

  function handleExportCSV() {
    if (!data) return;
    const rows = [["الشهر", "المداخيل"], ...data.monthly.map(m => [m.month, String(m.income)])];
    exportCsv(rows, `ملخص-محامي-بلوس-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" className="gap-2" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> تحديث
        </Button>
        <Button variant="outline" size="sm" className="gap-2" onClick={handleExportCSV} disabled={!data}>
          <Download className="h-4 w-4" /> CSV
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm text-center">
          {error} — <button className="underline" onClick={load}>حاول مجدداً</button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "إجمالي المداخيل (7 أشهر)", value: loading ? null : <TNDAmount amount={totalIncome} />, icon: TrendingUp, color: "text-success", bg: "bg-success/10", action: () => navigate("/billing") },
          { label: "فواتير مدفوعة",  value: loading ? null : data?.billing.paidCount ?? 0,    icon: CheckCircle2, color: "text-primary",  bg: "bg-primary/10",  action: () => navigate("/billing") },
          { label: "فواتير معلقة",   value: loading ? null : data?.billing.pendingCount ?? 0,  icon: Clock,        color: "text-warning",  bg: "bg-warning/10",  action: () => navigate("/billing") },
          { label: "متوسط شهري",     value: loading ? null : <TNDAmount amount={avgMonthly} />, icon: BarChart3,    color: "text-info",     bg: "bg-info/10",     action: undefined },
        ].map((k, i) => (
          <Card key={i} className={`border-none shadow-sm ${k.action ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`} onClick={k.action}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs text-muted-foreground leading-tight">{k.label}</p>
                <div className={`p-2 rounded-lg ${k.bg}`}><k.icon className={`h-4 w-4 ${k.color}`} /></div>
              </div>
              {k.value === null ? <Skeleton className="h-7 w-24" /> : <p className="font-bold text-xl">{k.value}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-md">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" /> المداخيل الشهرية (7 أشهر)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {loading ? <div className="space-y-2"><Skeleton className="h-32 w-full" /><Skeleton className="h-4 w-full" /></div>
              : !data || data.monthly.every(m => m.income === 0)
              ? <div className="h-36 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2"><BarChart3 className="h-8 w-8 opacity-20" />لا توجد فواتير مسددة بعد</div>
              : <IncomeBar monthly={data!.monthly} />}
            <div className="flex gap-4 mt-4 justify-center text-xs">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-primary inline-block" /> مداخيل مسددة</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-base flex items-center gap-2 justify-between">
              <span className="flex items-center gap-2"><Briefcase className="h-5 w-5 text-primary" /> إحصائيات القضايا</span>
              <span className="text-xs font-normal text-muted-foreground">{loading ? "..." : `${totalCases} قضية`}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-3">حسب الحالة</p>
              {loading ? <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-4 w-full" />)}</div>
                : !data || data.caseStatus.length === 0
                ? <p className="text-xs text-muted-foreground text-center py-4">لا توجد قضايا بعد</p>
                : <div className="space-y-3">{data!.caseStatus.map((s, i) => <StatBar key={i} label={s.label} value={s.value} total={totalCases} color={s.color} />)}</div>}
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-3">المهام</p>
              {loading ? <Skeleton className="h-4 w-full" /> : (
                <div className="space-y-3">
                  <StatBar label="منجزة"      value={data?.tasks.done ?? 0}    total={totalTasks || 1} color="bg-success" />
                  <StatBar label="قيد التنفيذ" value={data?.tasks.pending ?? 0} total={totalTasks || 1} color="bg-warning" />
                </div>
              )}
              {!loading && totalTasks > 0 && (
                <p className="text-xs text-muted-foreground mt-2 text-center">نسبة الإنجاز: <span className="font-bold text-success">{taskRate}%</span></p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-base flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> أبرز الموكّلون</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {loading ? <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
              : !data || data.topClients.length === 0
              ? <div className="py-8 text-center text-sm text-muted-foreground"><Users className="h-8 w-8 mx-auto mb-2 opacity-20" />لا يوجد موكّلون بعد</div>
              : data!.topClients.map((c, i) => (
                <div key={c.id} className="flex items-center gap-4 p-3 bg-muted/30 rounded-xl cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate(`/clients/${c.id}`)}>
                  <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.cases} قضايا</p>
                  </div>
                  <div className="text-left shrink-0">
                    <p className="font-bold text-sm text-primary" dir="ltr"><Money amount={c.amount} /></p>
                    <p className="text-xs text-muted-foreground">إجمالي الأتعاب</p>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary" /> حالة الفوترة</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {loading ? <div className="space-y-3"><Skeleton className="h-24 w-full rounded-xl" /><Skeleton className="h-6 w-full" /></div> : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-success/10 cursor-pointer hover:bg-success/15 transition-colors" onClick={() => navigate("/billing")}>
                    <CheckCircle2 className="h-6 w-6 text-success mb-2" />
                    <p className="text-2xl font-bold">{data?.billing.paidCount ?? 0}</p>
                    <p className="text-xs text-muted-foreground">فواتير مدفوعة</p>
                    <p className="text-sm font-medium mt-1 text-success" dir="ltr"><Money amount={data?.billing.paidAmount ?? 0} /></p>
                  </div>
                  <div className="p-4 rounded-xl bg-warning/10 cursor-pointer hover:bg-warning/15 transition-colors" onClick={() => navigate("/billing")}>
                    <AlertCircle className="h-6 w-6 text-warning mb-2" />
                    <p className="text-2xl font-bold">{data?.billing.pendingCount ?? 0}</p>
                    <p className="text-xs text-muted-foreground">فواتير معلقة</p>
                    <p className="text-sm font-medium mt-1 text-warning" dir="ltr"><Money amount={data?.billing.pendingAmount ?? 0} /></p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">نسبة التحصيل</span>
                    <span className={`font-bold ${collectionRate >= 70 ? "text-success" : collectionRate >= 40 ? "text-warning" : "text-destructive"}`}>{collectionRate}%</span>
                  </div>
                  <div className="w-full bg-muted/30 rounded-full h-2.5">
                    <div className={`h-2.5 rounded-full transition-all duration-700 ${collectionRate >= 70 ? "bg-success" : collectionRate >= 40 ? "bg-warning" : "bg-destructive"}`} style={{ width: `${collectionRate}%` }} />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">نسبة إنجاز المهام</span>
                    <span className="font-bold text-primary">{taskRate}%</span>
                  </div>
                  <div className="w-full bg-muted/30 rounded-full h-2.5">
                    <div className="h-2.5 rounded-full bg-primary transition-all duration-700" style={{ width: `${taskRate}%` }} />
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

/* ══════════════════════════════════════════════════════════════
   TAB 1 — ربحية الملفات
══════════════════════════════════════════════════════════════ */

function CaseProfitability() {
  const [, navigate]            = useLocation();
  const [data, setData]         = useState<CaseProfRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [period, setPeriod]     = useState("all");
  const [customFrom, setCfrom]  = useState("");
  const [customTo, setCto]      = useState("");
  const [statusFilter, setStatus] = useState("all");
  const [search, setSearch]     = useState("");

  async function load() {
    setLoading(true);
    const { dateFrom, dateTo } = periodDates(period, customFrom, customTo);
    const p = new URLSearchParams();
    if (dateFrom) p.set("dateFrom", dateFrom);
    if (dateTo)   p.set("dateTo", dateTo);
    if (statusFilter !== "all") p.set("status", statusFilter);
    const r = await authFetch(`${BASE_URL}/api/reports/case-profitability?${p}`);
    if (r.ok) setData(await r.json());
    setLoading(false);
  }
  useEffect(() => { load(); }, [period, customFrom, customTo, statusFilter]);

  const filtered = useMemo(() => data.filter(r =>
    !search || r.title.includes(search) || r.caseNumber.includes(search) || r.clientName.includes(search)
  ), [data, search]);

  const { sorted, Th } = useSortable(filtered, "grossMargin");

  const totals = useMemo(() => ({
    invoiced:  data.reduce((s, r) => s + r.totalInvoiced,  0),
    collected: data.reduce((s, r) => s + r.totalCollected, 0),
    expenses:  data.reduce((s, r) => s + r.totalExpenses,  0),
    margin:    data.reduce((s, r) => s + r.grossMargin,    0),
  }), [data]);

  function marginColor(n: number) {
    return n > 0 ? "text-success" : n < 0 ? "text-destructive" : "text-foreground";
  }

  function doExport() {
    exportCsv([
      ["رقم الملف","العنوان","الموكّل","الحالة","النوع","المفوتر (د.ت)","المصاريف (د.ت)","المقبوض (د.ت)","الهامش (د.ت)"],
      ...sorted.map(r => [r.caseNumber, r.title, r.clientName, STATUS_AR[r.status] ?? r.status, r.caseType,
        fmtNum(r.totalInvoiced), fmtNum(r.totalExpenses), fmtNum(r.totalCollected), fmtNum(r.grossMargin)]),
    ], "ربحية-الملفات.csv");
  }

  return (
    <div className="space-y-5">
      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40 bg-muted/50 border-border"><SelectValue placeholder="الفترة" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الفترات</SelectItem>
            <SelectItem value="month">هذا الشهر</SelectItem>
            <SelectItem value="quarter">هذا الربع</SelectItem>
            <SelectItem value="year">هذه السنة</SelectItem>
            <SelectItem value="custom">مخصص</SelectItem>
          </SelectContent>
        </Select>
        {period === "custom" && <>
          <Input type="date" value={customFrom} onChange={e => setCfrom(e.target.value)} className="w-36 bg-muted/50 border-border" />
          <Input type="date" value={customTo}   onChange={e => setCto(e.target.value)}   className="w-36 bg-muted/50 border-border" />
        </>}
        <Select value={statusFilter} onValueChange={setStatus}>
          <SelectTrigger className="w-36 bg-muted/50 border-border"><SelectValue placeholder="الحالة" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            <SelectItem value="active">نشطة</SelectItem>
            <SelectItem value="closed">مغلقة</SelectItem>
            <SelectItem value="pending">انتظار</SelectItem>
            <SelectItem value="suspended">موقوفة</SelectItem>
          </SelectContent>
        </Select>
        <Input placeholder="بحث عن ملف أو موكّل…" value={search} onChange={e => setSearch(e.target.value)}
          className="w-52 bg-muted/50 border-border" />
        <div className="ms-auto">
          <Button onClick={doExport} size="sm"><Download className="w-4 h-4 me-2" />تصدير CSV</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="إجمالي المفوتر"  value={`${fmtNum(totals.invoiced)} د.ت`}  icon={Wallet}    color="bg-info" />
        <KpiCard label="إجمالي المقبوض"  value={`${fmtNum(totals.collected)} د.ت`} icon={TrendingUp} color="bg-success" />
        <KpiCard label="إجمالي المصاريف" value={`${fmtNum(totals.expenses)} د.ت`}  icon={BarChart3}  color="bg-warning" />
        <KpiCard label="الهامش الإجمالي" value={`${fmtNum(totals.margin)} د.ت`}    icon={Briefcase}
          color={totals.margin >= 0 ? "bg-primary" : "bg-destructive"} />
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-muted-foreground">جارٍ التحميل…</div>
        ) : sorted.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">لا توجد بيانات</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  <Th k="caseNumber">رقم الملف</Th>
                  <Th k="title">العنوان</Th>
                  <Th k="clientName">الموكّل</Th>
                  <Th k="status">الحالة</Th>
                  <Th k="totalInvoiced">المفوتر</Th>
                  <Th k="totalExpenses">المصاريف</Th>
                  <Th k="totalCollected">المقبوض</Th>
                  <Th k="grossMargin">الهامش</Th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, i) => (
                  <tr key={r.caseId}
                    onClick={() => navigate(`/cases/${r.caseId}?from=reports&fromTab=profitability`)}
                    className={`border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer ${i % 2 ? "bg-muted/10" : ""}`}>
                    <td className="px-3 py-2 font-mono text-primary whitespace-nowrap">{r.caseNumber}</td>
                    <td className="px-3 py-2 max-w-[16rem] truncate" title={r.title}>{r.title}</td>
                    <td className="px-3 py-2 max-w-[12rem] truncate" title={r.clientName}>{r.clientName}</td>
                    <td className="px-3 py-2">
                      <Badge variant="neutral">{STATUS_AR[r.status] ?? r.status}</Badge>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtNum(r.totalInvoiced)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-warning">{fmtNum(r.totalExpenses)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-success">{fmtNum(r.totalCollected)}</td>
                    <td className={`px-3 py-2 text-right tabular-nums font-bold ${marginColor(r.grossMargin)}`}>{fmtNum(r.grossMargin)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-border bg-muted/20">
                <tr>
                  <td colSpan={4} className="px-3 py-2 text-xs font-bold text-muted-foreground">{sorted.length} ملف</td>
                  <td className="px-3 py-2 text-right tabular-nums font-bold text-foreground">{fmtNum(totals.invoiced)}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-bold text-warning">{fmtNum(totals.expenses)}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-bold text-success">{fmtNum(totals.collected)}</td>
                  <td className={`px-3 py-2 text-right tabular-nums font-bold ${marginColor(totals.margin)}`}>{fmtNum(totals.margin)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   TAB 2 — أداء المحامين
══════════════════════════════════════════════════════════════ */

function LawyerPerformance() {
  const [, navigate]          = useLocation();
  const [data, setData]       = useState<LawyerPerfRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch(`${BASE_URL}/api/reports/lawyer-performance`).then(async r => {
      if (r.ok) setData(await r.json());
      setLoading(false);
    });
  }, []);

  const { sorted, Th } = useSortable(data, "totalCollected");

  const totals = useMemo(() => ({
    cases:     data.reduce((s, r) => s + r.totalCases,     0),
    invoiced:  data.reduce((s, r) => s + r.totalInvoiced,  0),
    collected: data.reduce((s, r) => s + r.totalCollected, 0),
  }), [data]);

  function rate(r: LawyerPerfRow) {
    return r.totalInvoiced === 0 ? 0 : Math.round((r.totalCollected / r.totalInvoiced) * 100);
  }

  function doExport() {
    exportCsv([
      ["المحامي","الصفة","الملفات النشطة","مجموع الملفات","المفوتر (د.ت)","المقبوض (د.ت)","معدل التحصيل"],
      ...sorted.map(r => [r.name, ROLE_AR[r.role] ?? r.role, String(r.activeCases), String(r.totalCases),
        fmtNum(r.totalInvoiced), fmtNum(r.totalCollected), `${rate(r)}%`]),
    ], "أداء-المحامين.csv");
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button onClick={doExport} size="sm"><Download className="w-4 h-4 me-2" />تصدير CSV</Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="إجمالي الملفات" value={String(totals.cases)} icon={Briefcase} color="bg-info" />
        <KpiCard label="إجمالي المفوتر" value={`${fmtNum(totals.invoiced)} د.ت`} icon={Wallet} color="bg-primary" />
        <KpiCard label="إجمالي المقبوض" value={`${fmtNum(totals.collected)} د.ت`} icon={TrendingUp} color="bg-success" />
      </div>

      {!loading && data.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sorted.map(r => {
            const rt = rate(r);
            return (
              <div key={r.userId}
                onClick={() => navigate(`/cases?userId=${r.userId}&userName=${encodeURIComponent(r.name)}&from=reports&fromTab=lawyers`)}
                className="bg-card border border-border rounded-xl p-4 space-y-3 cursor-pointer hover:border-primary/40 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-primary font-bold text-sm">{r.name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="font-bold text-foreground">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{ROLE_AR[r.role] ?? r.role}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-muted/20 rounded-lg p-2">
                    <p className="text-xs text-muted-foreground">ملفات نشطة</p>
                    <p className="font-bold text-success">{r.activeCases}</p>
                  </div>
                  <div className="bg-muted/20 rounded-lg p-2">
                    <p className="text-xs text-muted-foreground">مجموع الملفات</p>
                    <p className="font-bold">{r.totalCases}</p>
                  </div>
                  <div className="bg-muted/20 rounded-lg p-2">
                    <p className="text-xs text-muted-foreground">المفوتر</p>
                    <p className="font-bold text-foreground text-xs">{fmtNum(r.totalInvoiced)}</p>
                  </div>
                  <div className="bg-muted/20 rounded-lg p-2">
                    <p className="text-xs text-muted-foreground">المقبوض</p>
                    <p className="font-bold text-primary text-xs">{fmtNum(r.totalCollected)}</p>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>معدل التحصيل</span>
                    <span className="text-foreground font-bold">{rt}%</span>
                  </div>
                  <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(rt, 100)}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-muted-foreground">جارٍ التحميل…</div>
        ) : sorted.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">لا توجد بيانات</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  <Th k="name">المحامي</Th>
                  <Th k="role">الصفة</Th>
                  <Th k="activeCases">الملفات النشطة</Th>
                  <Th k="totalCases">مجموع الملفات</Th>
                  <Th k="totalInvoiced">المفوتر (د.ت)</Th>
                  <Th k="totalCollected">المقبوض (د.ت)</Th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">معدل التحصيل</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, i) => (
                  <tr key={r.userId}
                    onClick={() => navigate(`/cases?userId=${r.userId}&userName=${encodeURIComponent(r.name)}&from=reports&fromTab=lawyers`)}
                    className={`border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer ${i % 2 ? "bg-muted/10" : ""}`}>
                    <td className="px-3 py-2 font-medium">{r.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{ROLE_AR[r.role] ?? r.role}</td>
                    <td className="px-3 py-2 text-center text-success">{r.activeCases}</td>
                    <td className="px-3 py-2 text-center">{r.totalCases}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtNum(r.totalInvoiced)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-primary font-bold">{fmtNum(r.totalCollected)}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        rate(r) >= 80 ? "bg-success/20 text-success"
                        : rate(r) >= 50 ? "bg-warning/20 text-warning"
                        : "bg-destructive/20 text-destructive"
                      }`}>{rate(r)}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-border bg-muted/20">
                <tr>
                  <td colSpan={4} className="px-3 py-2 text-xs font-bold text-muted-foreground">{sorted.length} أعضاء</td>
                  <td className="px-3 py-2 text-right tabular-nums font-bold">{fmtNum(totals.invoiced)}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-bold text-primary">{fmtNum(totals.collected)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   TAB 3 — تحليل الموكّلين
══════════════════════════════════════════════════════════════ */

function ClientSources() {
  const [, navigate]          = useLocation();
  const [data, setData]       = useState<ClientSourceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch(`${BASE_URL}/api/reports/client-sources`).then(async r => {
      if (r.ok) setData(await r.json());
      setLoading(false);
    });
  }, []);

  const { sorted, Th } = useSortable(data, "totalCollected");

  const totals = useMemo(() => ({
    clients:   data.reduce((s, r) => s + r.clientCount,    0),
    cases:     data.reduce((s, r) => s + r.caseCount,      0),
    invoiced:  data.reduce((s, r) => s + r.totalInvoiced,  0),
    collected: data.reduce((s, r) => s + r.totalCollected, 0),
  }), [data]);

  function doExport() {
    exportCsv([
      ["نوع الموكّل","الموكّلون","الملفات","المفوتر (د.ت)","المقبوض (د.ت)","المتوسط/موكّل (د.ت)","معدل الملفات %"],
      ...sorted.map(r => [r.clientTypeLabel, String(r.clientCount), String(r.caseCount),
        fmtNum(r.totalInvoiced), fmtNum(r.totalCollected), fmtNum(r.avgPerClient), `${r.conversionRate}%`]),
    ], "تحليل-الموكّلين.csv");
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button onClick={doExport} size="sm"><Download className="w-4 h-4 me-2" />تصدير CSV</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="إجمالي الموكّلين" value={String(totals.clients)} icon={Users}    color="bg-info" />
        <KpiCard label="إجمالي الملفات"   value={String(totals.cases)}   icon={Briefcase} color="bg-primary" />
        <KpiCard label="إجمالي المفوتر"   value={`${fmtNum(totals.invoiced)} د.ت`}  icon={Wallet}    color="bg-warning" />
        <KpiCard label="إجمالي المقبوض"   value={`${fmtNum(totals.collected)} د.ت`} icon={TrendingUp} color="bg-success" />
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-muted-foreground">جارٍ التحميل…</div>
        ) : sorted.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">لا توجد بيانات</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  <Th k="clientTypeLabel">نوع الموكّل</Th>
                  <Th k="clientCount">الموكّلون</Th>
                  <Th k="caseCount">الملفات</Th>
                  <Th k="totalInvoiced">المفوتر (د.ت)</Th>
                  <Th k="totalCollected">المقبوض (د.ت)</Th>
                  <Th k="avgPerClient">المتوسط/موكّل (د.ت)</Th>
                  <Th k="conversionRate">معدل الملفات</Th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, i) => (
                  <tr key={r.clientType}
                    onClick={() => navigate(`/clients?type=${encodeURIComponent(r.clientType)}&typeName=${encodeURIComponent(r.clientTypeLabel)}&from=reports&fromTab=clients`)}
                    className={`border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer ${i % 2 ? "bg-muted/10" : ""}`}>
                    <td className="px-3 py-2 font-bold text-foreground">{r.clientTypeLabel}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{r.clientCount}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{r.caseCount}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtNum(r.totalInvoiced)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-primary font-bold">{fmtNum(r.totalCollected)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtNum(r.avgPerClient)}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        r.conversionRate >= 70 ? "bg-success/20 text-success"
                        : r.conversionRate >= 40 ? "bg-warning/20 text-warning"
                        : "bg-muted/50 text-muted-foreground"
                      }`}>{r.conversionRate}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-border bg-muted/20">
                <tr>
                  <td className="px-3 py-2 text-xs font-bold text-muted-foreground">المجموع</td>
                  <td className="px-3 py-2 text-center font-bold">{totals.clients}</td>
                  <td className="px-3 py-2 text-center font-bold">{totals.cases}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-bold">{fmtNum(totals.invoiced)}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-bold text-primary">{fmtNum(totals.collected)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════ */

type Tab = "summary" | "profitability" | "lawyers" | "clients";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "summary",       label: "ملخص عام",        icon: BarChart3  },
  { key: "profitability", label: "ربحية الملفات",   icon: TrendingUp },
  { key: "lawyers",       label: "أداء المحامين",   icon: Users      },
  { key: "clients",       label: "تحليل الموكّلين", icon: Briefcase  },
];

export default function Reports() {
  const getTabFromURL = (): Tab => {
    const t = new URLSearchParams(window.location.search).get("tab");
    return (["summary", "profitability", "lawyers", "clients"] as Tab[]).includes(t as Tab)
      ? (t as Tab)
      : "summary";
  };
  const [tab, setTab]   = useState<Tab>(getTabFromURL);
  const [, navigate]    = useLocation();

  function changeTab(t: Tab) {
    setTab(t);
    window.history.replaceState(null, "", `?tab=${t}`);
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => window.history.back()}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm transition-colors">
          <ArrowRight className="h-3.5 w-3.5" /> رجوع
        </button>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">تقارير الأداء والربحية</h1>
          <p className="text-xs text-muted-foreground">تحليل شامل للنشاط المالي والقانوني للمكتب</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="border-b border-border">
        <div className="flex gap-0.5 overflow-x-auto no-scrollbar">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.key} onClick={() => changeTab(t.key)}
                className={`flex items-center gap-1.5 px-3 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                  tab === t.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}>
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {tab === "summary"       && <SummaryTab />}
      {tab === "profitability" && <CaseProfitability />}
      {tab === "lawyers"       && <LawyerPerformance />}
      {tab === "clients"       && <ClientSources />}
    </div>
  );
}

import { SelectNative } from "@/components/SelectNative";
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
import { Input } from "@/components/ui/input";
import { Modal, FormField } from "@/components/Modal";
import { SmartTextarea } from "@/components/SmartTextarea";
import {
  Briefcase, CreditCard, Clock, AlertTriangle, CheckCircle2,
  Calendar, Plus, Timer, TrendingUp, Scale, Users, ArrowLeft,
  Circle, CalendarClock, Crown,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { authFetch } from "@/lib/authFetch";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
const STAGES = ["ابتدائي", "استئناف", "تعقيب", "تنفيذ", "ختم"];

const EMPTY_CASE = {
  title: "", clientId: "", court: "", division: "", lawyer: "", status: "active",
  nextHearing: "", description: "", procedureStage: "ابتدائي", courtCaseNumber: "", clientFileRef: "",
};

type QuickModal = "case" | "event" | "invoice" | null;

type RecentCase = { id: number; title: string; status: string; clientName?: string | null; };

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: "نشطة", color: "text-green-400 bg-green-500/10" },
  pending: { label: "انتظار", color: "text-orange-400 bg-orange-500/10" },
  suspended: { label: "موقوفة", color: "text-yellow-400 bg-yellow-500/10" },
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
  const [modal, setModal] = useState<QuickModal>(null);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());
  const updateTask = useUpdateTask();
  const [orgInfo, setOrgInfo] = useState<OrgTrialInfo | null>(null);
  const [caseForm, setCaseForm] = useState({ ...EMPTY_CASE });
  const [clients, setClients] = useState<Array<{ id: number; name: string }>>([]);
  const [savingCase, setSavingCase] = useState(false);
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

  async function openCaseModal() {
    const r = await authFetch(`${BASE}/api/clients`);
    if (r.ok) setClients(await r.json());
    setCaseForm({ ...EMPTY_CASE });
    setModal("case");
  }

  async function saveCase() {
    if (!caseForm.title || !caseForm.clientId) return;
    setSavingCase(true);
    const res = await authFetch(`${BASE}/api/cases`, {
      method: "POST",
      body: JSON.stringify({ ...caseForm, clientId: Number(caseForm.clientId), nextHearing: caseForm.nextHearing || undefined }),
    });
    setSavingCase(false);
    if (res.ok) {
      const created = await res.json() as { id: number };
      setModal(null);
      navigate(`${BASE}/cases/${created.id}`);
    }
  }

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

  const inputCls = "h-10 bg-muted/50 border-border focus-visible:ring-1 focus-visible:ring-primary rounded-lg w-full";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
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
        {/* Quick Actions Bar */}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={openCaseModal} className="gap-1.5 h-9">
            <Plus className="h-3.5 w-3.5" /> قضية
          </Button>
          <Button size="sm" onClick={() => setModal("event")} className="gap-1.5 h-9">
            <Calendar className="h-3.5 w-3.5" /> موعد
          </Button>
          <Button size="sm" onClick={() => setModal("invoice")} className="gap-1.5 h-9">
            <CreditCard className="h-3.5 w-3.5" /> فاتورة
          </Button>
          <Button size="sm" onClick={() => navigate("/time-tracking")} className="gap-1.5 h-9">
            <Timer className="h-3.5 w-3.5" /> كرونومتر
          </Button>
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
            icon: TrendingUp, color: "text-green-400", bg: "bg-green-500/10",
            action: () => navigate("/billing"),
          },
          {
            title: "فواتير معلقة",
            value: loadingSummary ? null : summary?.pendingInvoices ?? 0,
            icon: Clock, color: "text-orange-400", bg: "bg-orange-500/10",
            action: () => navigate("/billing"),
          },
          {
            title: "آجال قريبة",
            value: loadingSummary ? null : summary?.upcomingDeadlines ?? 0,
            icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10",
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
                : <p className="text-3xl font-bold">{card.value}</p>
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
            <div className="flex items-center gap-3 bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
              <Crown className="h-5 w-5 text-orange-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-orange-500 text-sm">تجربة مجانية — {orgInfo.daysRemaining} يوم متبقٍ</p>
                <p className="text-xs text-muted-foreground">اشترك قبل انتهاء التجربة للاستمرار بدون انقطاع</p>
              </div>
              <Button size="sm" className="shrink-0 bg-orange-500 hover:bg-orange-600">ترقية</Button>
            </div>
          ) : orgInfo.daysRemaining !== null ? (
            <div className="flex items-center gap-3 bg-primary/5 border border-primary/15 rounded-xl p-3">
              <Crown className="h-4 w-4 text-primary shrink-0" />
              <p className="text-sm text-muted-foreground flex-1">
                <span className="text-primary font-medium">تجربة مجانية</span> — {orgInfo.daysRemaining} يوم متبقٍ من أصل 90
              </p>
              <span className="text-xs text-primary hover:underline">تفاصيل</span>
            </div>
          ) : null}
        </div>
      )}

      {/* Financial Strip */}
      <Card className="border-none shadow-sm bg-gradient-to-l from-primary/5 to-card">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-6 items-center">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">الملف المالي لهذا الشهر:</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">مداخيل الفواتير:</span>
              <span className="font-bold text-sm text-green-400" dir="ltr">
                {loadingSummary ? "..." : formatCurrency(Number(summary?.monthlyIncome ?? 0))}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">فواتير معلقة:</span>
              <span className="font-bold text-sm text-orange-400">
                {loadingSummary ? "..." : summary?.pendingInvoices ?? 0}
              </span>
            </div>
            <button onClick={() => navigate("/billing")} className="text-xs text-primary hover:underline flex items-center gap-1 mr-auto">
              تفاصيل الفوترة <ArrowLeft className="h-3 w-3" />
            </button>
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
                          ? <CheckCircle2 className="h-6 w-6 text-green-400" />
                          : <Circle className="h-6 w-6 text-orange-400" />
                        }
                      </button>
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => t.caseId ? navigate(`/cases/${t.caseId}`) : undefined}
                      >
                        <p className={`font-semibold text-sm truncate ${t.done ? "line-through text-muted-foreground" : ""}`}>{t.title}</p>
                        <p className="text-xs text-muted-foreground">{t.caseName ?? "—"}</p>
                      </div>
                      <span className="text-xs bg-orange-500/10 text-orange-400 px-2 py-1 rounded-md shrink-0">مهمة</span>
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
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-400 opacity-60" />
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
                          <span className="text-xs bg-destructive/10 text-destructive px-1.5 py-0.5 rounded shrink-0 mr-1">
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

      {/* New Case Modal — identical to Cases page form */}
      <Modal open={modal === "case"} onClose={() => setModal(null)} title="قضية جديدة" size="lg">
        <div className="space-y-4">
          <FormField label="عنوان القضية *" htmlFor="dc-title">
            <Input id="dc-title" placeholder="مثال: قضية ميراث عائلة بن علي" className={inputCls}
              value={caseForm.title} onChange={e => setCaseForm(f => ({ ...f, title: e.target.value }))} />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="الحريف *" htmlFor="dc-client">
              <SelectNative id="dc-client" value={caseForm.clientId} onChange={e => setCaseForm(f => ({ ...f, clientId: e.target.value }))} className={inputCls + " px-3 cursor-pointer"}>
                <option value="">اختر حريفاً...</option>
                {clients.map(cl => <option key={cl.id} value={cl.id}>{cl.name}</option>)}
              </SelectNative>
            </FormField>
            <FormField label="المحامي المسؤول" htmlFor="dc-lawyer">
              <Input id="dc-lawyer" placeholder="اسم المحامي" className={inputCls}
                value={caseForm.lawyer} onChange={e => setCaseForm(f => ({ ...f, lawyer: e.target.value }))} />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="المحكمة" htmlFor="dc-court">
              <Input id="dc-court" placeholder="مثال: محكمة تونس الابتدائية" className={inputCls}
                value={caseForm.court} onChange={e => setCaseForm(f => ({ ...f, court: e.target.value }))} />
            </FormField>
            <FormField label="الدائرة" htmlFor="dc-div">
              <Input id="dc-div" placeholder="الدائرة الأولى" className={inputCls}
                value={caseForm.division} onChange={e => setCaseForm(f => ({ ...f, division: e.target.value }))} />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="رقم القضية لدى المحكمة" htmlFor="dc-court-num"
              hint="الرقم الذي خصصته المحكمة">
              <Input id="dc-court-num" placeholder="12345/2026" className={inputCls} dir="ltr"
                value={caseForm.courtCaseNumber} onChange={e => setCaseForm(f => ({ ...f, courtCaseNumber: e.target.value }))} />
            </FormField>
            <FormField label="مرجع الحريف" htmlFor="dc-client-ref"
              hint="رقم الملف لدى الحريف نفسه">
              <Input id="dc-client-ref" placeholder="مرجع داخلي للحريف" className={inputCls}
                value={caseForm.clientFileRef} onChange={e => setCaseForm(f => ({ ...f, clientFileRef: e.target.value }))} />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="الحالة" htmlFor="dc-status">
              <SelectNative id="dc-status" className={inputCls + " px-3 cursor-pointer"}
                value={caseForm.status} onChange={e => setCaseForm(f => ({ ...f, status: e.target.value }))}>
                <option value="active">نشطة</option>
                <option value="pending">في الانتظار</option>
                <option value="suspended">موقوفة</option>
                <option value="closed">مغلقة</option>
              </SelectNative>
            </FormField>
            <FormField label="المرحلة الإجرائية" htmlFor="dc-stage">
              <SelectNative id="dc-stage" className={inputCls + " px-3 cursor-pointer"}
                value={caseForm.procedureStage} onChange={e => setCaseForm(f => ({ ...f, procedureStage: e.target.value }))}>
                {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </SelectNative>
            </FormField>
          </div>

          <FormField label="موعد الجلسة القادمة" htmlFor="dc-hearing">
            <Input id="dc-hearing" type="date" className={inputCls} dir="ltr"
              value={caseForm.nextHearing} onChange={e => setCaseForm(f => ({ ...f, nextHearing: e.target.value }))} />
          </FormField>

          <FormField label="وصف القضية" htmlFor="dc-desc">
            <SmartTextarea id="dc-desc" rows={3} placeholder="وصف مختصر للقضية والوقائع..."
              aiContext="وصف قضية قانونية"
              value={caseForm.description} onChange={v => setCaseForm(f => ({ ...f, description: v }))} />
          </FormField>

          <div className="flex gap-3 pt-2">
            <Button className="flex-1" disabled={savingCase || !caseForm.title || !caseForm.clientId} onClick={saveCase}>
              {savingCase ? "جارٍ الحفظ..." : "حفظ وفتح الملف"}
            </Button>
            <Button variant="outline" onClick={() => setModal(null)} className="px-6">إلغاء</Button>
          </div>
        </div>
      </Modal>

      {/* Quick Add Event Modal */}
      <Modal open={modal === "event"} onClose={() => setModal(null)} title="حدث جديد">
        <div className="space-y-4">
          <FormField label="عنوان الحدث *" htmlFor="qe-title">
            <Input id="qe-title" placeholder="مثال: جلسة محكمة تونس" className={inputCls} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="التاريخ *" htmlFor="qe-date">
              <Input id="qe-date" type="date" className={inputCls} dir="ltr" />
            </FormField>
            <FormField label="الوقت" htmlFor="qe-time">
              <Input id="qe-time" type="time" className={inputCls} dir="ltr" />
            </FormField>
          </div>
          <FormField label="القضية" htmlFor="qe-case">
            <Input id="qe-case" placeholder="اسم القضية المرتبطة" className={inputCls} />
          </FormField>
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={() => setModal(null)}>حفظ الحدث</Button>
            <Button variant="outline" onClick={() => setModal(null)} className="px-5">إلغاء</Button>
          </div>
        </div>
      </Modal>

      {/* Quick Add Invoice Modal */}
      <Modal open={modal === "invoice"} onClose={() => setModal(null)} title="فاتورة جديدة">
        <div className="space-y-4">
          <FormField label="الحريف *" htmlFor="qi-client">
            <Input id="qi-client" placeholder="اسم الحريف" className={inputCls} />
          </FormField>
          <FormField label="المبلغ (د.ت) *" htmlFor="qi-amount">
            <Input id="qi-amount" type="number" placeholder="0.000" className={inputCls} dir="ltr" />
          </FormField>
          <FormField label="القضية" htmlFor="qi-case">
            <Input id="qi-case" placeholder="اسم القضية (اختياري)" className={inputCls} />
          </FormField>
          <FormField label="تاريخ الاستحقاق" htmlFor="qi-due">
            <Input id="qi-due" type="date" className={inputCls} dir="ltr" />
          </FormField>
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={() => setModal(null)}>إنشاء الفاتورة</Button>
            <Button variant="outline" onClick={() => setModal(null)} className="px-5">إلغاء</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

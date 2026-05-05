import { useState } from "react";
import { useLocation } from "wouter";
import { useGetDashboardSummary, useGetDashboardToday, useGetDashboardAlerts } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal, FormField } from "@/components/Modal";
import {
  Briefcase, CreditCard, Clock, AlertTriangle, CheckCircle2,
  Calendar, Plus, Timer, TrendingUp, Scale, Users, ArrowLeft
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type QuickModal = "case" | "event" | "invoice" | null;

const RECENT_CASES = [
  { id: 1, title: "قضية ميراث عائلة بن علي", status: "active", client: "محمد بن علي" },
  { id: 2, title: "قضية عقار الزهراء", status: "active", client: "فاطمة الزهراء" },
  { id: 3, title: "قضية عقد شراكة التريكي", status: "pending", client: "يوسف التريكي" },
];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: "نشطة", color: "text-green-400 bg-green-500/10" },
  pending: { label: "انتظار", color: "text-orange-400 bg-orange-500/10" },
  suspended: { label: "موقوفة", color: "text-yellow-400 bg-yellow-500/10" },
  closed: { label: "مغلقة", color: "text-muted-foreground bg-muted/50" },
};

export default function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const { data: today, isLoading: loadingToday } = useGetDashboardToday();
  const { data: alerts, isLoading: loadingAlerts } = useGetDashboardAlerts();
  const [modal, setModal] = useState<QuickModal>(null);
  const [, navigate] = useLocation();

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
              {new Date().toLocaleDateString("ar-TN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
        </div>
        {/* Quick Actions Bar */}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setModal("case")} className="gap-1.5 h-9">
            <Plus className="h-3.5 w-3.5" /> قضية
          </Button>
          <Button size="sm" variant="outline" onClick={() => setModal("event")} className="gap-1.5 h-9">
            <Calendar className="h-3.5 w-3.5" /> موعد
          </Button>
          <Button size="sm" variant="outline" onClick={() => setModal("invoice")} className="gap-1.5 h-9">
            <CreditCard className="h-3.5 w-3.5" /> فاتورة
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate("/time-tracking")} className="gap-1.5 h-9">
            <Timer className="h-3.5 w-3.5" /> كرونومتر
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: "القضايا النشطة",
            value: loadingSummary ? null : summary?.activeCases ?? 0,
            icon: Briefcase, color: "text-primary", bg: "bg-primary/10",
            action: () => navigate("/cases"),
          },
          {
            title: "المداخيل هذا الشهر",
            value: loadingSummary ? null : (summary?.monthlyIncome ? `${summary.monthlyIncome} د.ت` : "0 د.ت"),
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

      {/* Financial Strip */}
      <Card className="border-none shadow-sm bg-gradient-to-l from-primary/5 to-card">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-6 items-center">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">الملف المالي لهذا الشهر:</span>
            </div>
            {[
              { label: "مداخيل", value: "2200 د.ت", color: "text-green-400" },
              { label: "مصاريف", value: "200 د.ت", color: "text-red-400" },
              { label: "صافي", value: "2000 د.ت", color: "text-primary" },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">{f.label}:</span>
                <span className={`font-bold text-sm ${f.color}`} dir="ltr">{f.value}</span>
              </div>
            ))}
            <button onClick={() => navigate("/reports")} className="text-xs text-primary hover:underline flex items-center gap-1 mr-auto">
              تقرير مفصّل <ArrowLeft className="h-3 w-3" />
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
                  <div key={`s-${s.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/20 transition-colors">
                    <div className="bg-primary/10 text-primary p-2.5 rounded-lg shrink-0">
                      <Briefcase className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{s.title}</p>
                      <p className="text-xs text-muted-foreground">{s.caseName} • {s.time || "وقت غير محدد"}</p>
                    </div>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-md shrink-0">جلسة</span>
                  </div>
                ))}
                {today?.tasks?.map(t => (
                  <div key={`t-${t.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-muted/20 transition-colors">
                    <div className="bg-orange-500/10 text-orange-400 p-2.5 rounded-lg shrink-0">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{t.title}</p>
                      <p className="text-xs text-muted-foreground">{t.caseName}</p>
                    </div>
                    <span className="text-xs bg-orange-500/10 text-orange-400 px-2 py-1 rounded-md shrink-0">مهمة</span>
                  </div>
                ))}
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
                  <div key={a.id} className="px-4 py-3 hover:bg-muted/20 transition-colors">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight">{a.message}</p>
                        <div className="flex justify-between items-center mt-1">
                          <p className="text-xs text-muted-foreground truncate">{a.caseName}</p>
                          <span className="text-xs bg-destructive/10 text-destructive px-1.5 py-0.5 rounded shrink-0 mr-1">
                            {new Date(a.dueDate).toLocaleDateString("ar-TN")}
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
            {RECENT_CASES.map(c => {
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
                      <Users className="h-3 w-3" /> {c.client}
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

      {/* Quick Add Case Modal */}
      <Modal open={modal === "case"} onClose={() => setModal(null)} title="قضية جديدة" size="lg">
        <div className="space-y-4">
          <FormField label="عنوان القضية *" htmlFor="qc-title">
            <Input id="qc-title" placeholder="مثال: قضية ميراث عائلة..." className={inputCls} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="الحريف *" htmlFor="qc-client">
              <Input id="qc-client" placeholder="اسم الحريف" className={inputCls} />
            </FormField>
            <FormField label="المحكمة" htmlFor="qc-court">
              <Input id="qc-court" placeholder="محكمة..." className={inputCls} />
            </FormField>
          </div>
          <FormField label="رقم الملف القضائي" htmlFor="qc-ref">
            <Input id="qc-ref" placeholder="مثال: 2026/1234" className={inputCls} dir="ltr" />
          </FormField>
          <FormField label="نوع القضية" htmlFor="qc-type">
            <select id="qc-type" className={inputCls + " px-3 cursor-pointer"}>
              {["مدنية", "عقارية", "تجارية", "عائلية", "جزائية", "إدارية", "أخرى"].map(t =>
                <option key={t} value={t}>{t}</option>
              )}
            </select>
          </FormField>
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={() => setModal(null)}>حفظ وفتح الملف</Button>
            <Button variant="outline" onClick={() => setModal(null)} className="px-5">إلغاء</Button>
          </div>
        </div>
      </Modal>

      {/* Quick Add Event Modal */}
      <Modal open={modal === "event"} onClose={() => setModal(null)} title="موعد جديد">
        <div className="space-y-4">
          <FormField label="عنوان الموعد *" htmlFor="qe-title">
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
            <Button className="flex-1" onClick={() => setModal(null)}>حفظ الموعد</Button>
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

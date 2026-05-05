import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TrendingUp, Briefcase, Users, CreditCard, Download,
  BarChart3, PieChart, CheckCircle2, AlertCircle
} from "lucide-react";

const MONTHLY = [
  { month: "نوفمبر", income: 2800, expenses: 320 },
  { month: "ديسمبر", income: 3200, expenses: 450 },
  { month: "جانفي", income: 2100, expenses: 280 },
  { month: "فيفري", income: 3800, expenses: 520 },
  { month: "مارس", income: 4200, expenses: 610 },
  { month: "أفريل", income: 3600, expenses: 480 },
  { month: "ماي", income: 2200, expenses: 200 },
];

const CASE_STATUS = [
  { label: "نشطة", value: 2, color: "bg-green-500", pct: 40 },
  { label: "في الانتظار", value: 1, color: "bg-orange-500", pct: 20 },
  { label: "موقوفة", value: 1, color: "bg-yellow-500", pct: 20 },
  { label: "مغلقة", value: 1, color: "bg-muted-foreground", pct: 20 },
];

const CASE_TYPES = [
  { label: "قضايا مدنية", value: 8, pct: 40, color: "bg-blue-500" },
  { label: "قضايا عقارية", value: 6, pct: 30, color: "bg-primary" },
  { label: "قضايا تجارية", value: 4, pct: 20, color: "bg-purple-500" },
  { label: "قضايا عائلية", value: 2, pct: 10, color: "bg-pink-500" },
];

const TOP_CLIENTS = [
  { name: "محمد بن علي", cases: 3, amount: 4500 },
  { name: "فاطمة الزهراء", cases: 2, amount: 3200 },
  { name: "يوسف التريكي", cases: 1, amount: 1800 },
];

const maxIncome = Math.max(...MONTHLY.map(m => m.income));

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="flex-1 flex flex-col items-center gap-1">
      <div className="w-full bg-muted/30 rounded-t-sm overflow-hidden" style={{ height: 80 }}>
        <div
          className={`w-full ${color} rounded-t-sm transition-all duration-700`}
          style={{ height: `${(value / max) * 100}%`, marginTop: `${(1 - value / max) * 100}%` }}
        />
      </div>
    </div>
  );
}

export default function Reports() {
  const totalIncome = MONTHLY.reduce((s, m) => s + m.income, 0);
  const totalExpenses = MONTHLY.reduce((s, m) => s + m.expenses, 0);
  const net = totalIncome - totalExpenses;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">التقارير والإحصائيات</h1>
          <p className="text-muted-foreground text-sm mt-0.5">نظرة شاملة على أداء المكتب والوضع المالي</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" /> تصدير PDF
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" /> Excel
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "إجمالي المداخيل (7 أشهر)", value: `${totalIncome.toLocaleString()} د.ت`, icon: TrendingUp, color: "text-green-400", bg: "bg-green-500/10" },
          { label: "إجمالي المصاريف", value: `${totalExpenses.toLocaleString()} د.ت`, icon: CreditCard, color: "text-red-400", bg: "bg-red-500/10" },
          { label: "الصافي", value: `${net.toLocaleString()} د.ت`, icon: BarChart3, color: "text-primary", bg: "bg-primary/10" },
          { label: "متوسط شهري", value: `${Math.round(totalIncome / 7).toLocaleString()} د.ت`, icon: PieChart, color: "text-blue-400", bg: "bg-blue-500/10" },
        ].map((k, i) => (
          <Card key={i} className="border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs text-muted-foreground leading-tight">{k.label}</p>
                <div className={`p-2 rounded-lg ${k.bg}`}>
                  <k.icon className={`h-4 w-4 ${k.color}`} />
                </div>
              </div>
              <p className="font-bold text-lg" dir="ltr">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income Chart */}
        <Card className="border-none shadow-md">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" /> المداخيل والمصاريف الشهرية
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex items-end gap-3 mb-3" style={{ height: 120 }}>
              {MONTHLY.map((m, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full">
                  <div className="w-full flex flex-col justify-end gap-0.5 flex-1">
                    <div className="w-full bg-primary rounded-sm transition-all"
                      style={{ height: `${(m.income / maxIncome) * 90}%` }} />
                    <div className="w-full bg-red-400/60 rounded-sm transition-all"
                      style={{ height: `${(m.expenses / maxIncome) * 90}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex border-t border-border pt-2 gap-1">
              {MONTHLY.map((m, i) => (
                <div key={i} className="flex-1 text-center text-xs text-muted-foreground">{m.month}</div>
              ))}
            </div>
            <div className="flex gap-4 mt-4 justify-center text-xs">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-primary inline-block" />مداخيل</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-400/60 inline-block" />مصاريف</span>
            </div>
          </CardContent>
        </Card>

        {/* Case Stats */}
        <Card className="border-none shadow-md">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" /> إحصائيات القضايا
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-3">حسب الحالة</p>
              <div className="space-y-2">
                {CASE_STATUS.map((s, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-24">{s.label}</span>
                    <div className="flex-1 bg-muted/30 rounded-full h-2">
                      <div className={`h-2 rounded-full ${s.color} transition-all`} style={{ width: `${s.pct}%` }} />
                    </div>
                    <span className="text-xs font-bold w-4 text-center">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-3">حسب النوع</p>
              <div className="space-y-2">
                {CASE_TYPES.map((t, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-24">{t.label}</span>
                    <div className="flex-1 bg-muted/30 rounded-full h-2">
                      <div className={`h-2 rounded-full ${t.color} transition-all`} style={{ width: `${t.pct}%` }} />
                    </div>
                    <span className="text-xs font-bold w-4 text-center">{t.value}</span>
                  </div>
                ))}
              </div>
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
            {TOP_CLIENTS.map((c, i) => (
              <div key={i} className="flex items-center gap-4 p-3 bg-muted/30 rounded-xl">
                <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                  {c.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.cases} قضايا</p>
                </div>
                <div className="text-left shrink-0">
                  <p className="font-bold text-sm text-primary" dir="ltr">{c.amount.toLocaleString()} د.ت</p>
                  <p className="text-xs text-muted-foreground">إجمالي الأتعاب</p>
                </div>
              </div>
            ))}
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
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "فواتير مدفوعة", value: "3", sub: "2800 د.ت", icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/10" },
                { label: "فواتير معلقة", value: "2", sub: "2300 د.ت", icon: AlertCircle, color: "text-orange-400", bg: "bg-orange-500/10" },
              ].map((s, i) => (
                <div key={i} className={`p-4 rounded-xl ${s.bg}`}>
                  <s.icon className={`h-6 w-6 ${s.color} mb-2`} />
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className={`text-sm font-medium mt-1 ${s.color}`}>{s.sub}</p>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">نسبة التحصيل</span>
                <span className="font-bold text-green-400">54.9%</span>
              </div>
              <div className="w-full bg-muted/30 rounded-full h-2">
                <div className="h-2 rounded-full bg-green-500" style={{ width: "55%" }} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">متوسط أجل التسديد</span>
                <span className="font-bold">28 يوم</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

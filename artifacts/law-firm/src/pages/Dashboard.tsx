import { useGetDashboardSummary, useGetDashboardToday, useGetDashboardAlerts } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, CreditCard, Clock, AlertTriangle, CheckCircle2, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const { data: today, isLoading: loadingToday } = useGetDashboardToday();
  const { data: alerts, isLoading: loadingAlerts } = useGetDashboardAlerts();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">لوحة القيادة</h1>
        <p className="text-muted-foreground">{new Date().toLocaleDateString("ar-TN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="القضايا النشطة"
          value={summary?.activeCases}
          icon={<Briefcase className="h-4 w-4 text-primary" />}
          loading={loadingSummary}
        />
        <MetricCard
          title="المداخيل هذا الشهر"
          value={summary?.monthlyIncome ? `${summary.monthlyIncome} د.ت` : undefined}
          icon={<CreditCard className="h-4 w-4 text-green-500" />}
          loading={loadingSummary}
        />
        <MetricCard
          title="الفواتير المعلقة"
          value={summary?.pendingInvoices}
          icon={<Clock className="h-4 w-4 text-orange-500" />}
          loading={loadingSummary}
        />
        <MetricCard
          title="آجال قريبة"
          value={summary?.upcomingDeadlines}
          icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
          loading={loadingSummary}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-none shadow-md">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              جلسات ومهام اليوم
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loadingToday ? (
              <div className="p-6 space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <div className="divide-y">
                {today?.sessions.length === 0 && today?.tasks.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">لا توجد مهام أو جلسات اليوم.</div>
                )}
                {today?.sessions.map(s => (
                  <div key={`s-${s.id}`} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                    <div className="bg-primary/10 text-primary p-3 rounded-full">
                      <Briefcase className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{s.title}</p>
                      <p className="text-sm text-muted-foreground">{s.caseName} • {s.time || "وقت غير محدد"}</p>
                    </div>
                  </div>
                ))}
                {today?.tasks.map(t => (
                  <div key={`t-${t.id}`} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                    <div className="bg-orange-500/10 text-orange-500 p-3 rounded-full">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{t.title}</p>
                      <p className="text-sm text-muted-foreground">{t.caseName}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              تنبيهات
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loadingAlerts ? (
              <div className="p-6 space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <div className="divide-y">
                {alerts?.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">لا توجد تنبيهات حاليا.</div>
                )}
                {alerts?.map(a => (
                  <div key={a.id} className="flex items-start gap-4 p-4 hover:bg-muted/30 transition-colors">
                    <div className="mt-1 bg-destructive/10 text-destructive p-2 rounded-full">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{a.message}</p>
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-sm text-muted-foreground">{a.caseName}</p>
                        <span className="text-xs bg-muted px-2 py-1 rounded-md">{new Date(a.dueDate).toLocaleDateString('ar-TN')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, loading }: { title: string, value?: string | number, icon: React.ReactNode, loading: boolean }) {
  return (
    <Card className="border-none shadow-md overflow-hidden relative group">
      <div className="absolute top-0 right-0 w-1 h-full bg-primary/50 group-hover:bg-primary transition-colors" />
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div className="text-3xl font-bold text-foreground">{value || "0"}</div>
        )}
      </CardContent>
    </Card>
  );
}
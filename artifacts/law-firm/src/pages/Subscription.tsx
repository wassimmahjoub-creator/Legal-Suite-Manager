import { useState, useEffect } from "react";
import { authFetch } from "@/lib/authFetch";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Crown, CheckCircle2, Clock, Users, CreditCard, TrendingUp, Calendar,
  AlertTriangle, RefreshCw, UserPlus, UserCheck, UserX,
  Briefcase, FileText, HardDrive, Download, Plus, Phone, ArrowUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { PLANS, collabLabel } from "@workspace/plans";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

interface OrgInfo {
  id: number; name: string; subscriptionPlan: string; subscriptionStatus: string;
  billingCycle: string; trialStartDate: string; trialEndDate: string;
  daysRemaining: number | null; isTrialExpired: boolean;
  plan: {
    name: string; priceMonthly: number; priceYearly: number;
    includedCollaborators: number; extraCollaboratorPrice: number; features: string[];
  };
  memberCount: number;
  collaboratorsUsed: number;
  includedCollaborators: number;
  extraCollaborators: number;
  allowedTotal: number | null;
  remaining: number | null;
  estimatedMonthlyTotal: number;
  extraCost: number;
}

interface BillingItem {
  id: number; amount: string; currency: string; description: string;
  status: string; billingCycle: string | null; createdAt: string;
}

interface DashboardSummary {
  activeCases: number;
  monthlyIncome: number;
  pendingInvoices: number;
  upcomingDeadlines: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  trial:   { label: "تجربة مجانية", color: "text-blue-500",        bg: "bg-blue-500/10" },
  active:  { label: "نشط",           color: "text-green-500",       bg: "bg-green-500/10" },
  paused:  { label: "موقوف",         color: "text-orange-500",      bg: "bg-orange-500/10" },
  expired: { label: "منتهي",         color: "text-destructive",     bg: "bg-destructive/10" },
};

const PLAN_COLORS: Record<string, string> = {
  solo:    "from-blue-500/10 to-blue-500/5 border-blue-500/20",
  cabinet: "from-primary/10 to-primary/5 border-primary/20",
  premium: "from-purple-500/10 to-purple-500/5 border-purple-500/20",
};


export default function Subscription() {
  const { toast } = useToast();
  const [org, setOrg] = useState<OrgInfo | null>(null);
  const [billing, setBilling] = useState<BillingItem[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeCycle, setUpgradeCycle] = useState<"monthly" | "yearly">("monthly");

  async function reload() {
    const [o, b, s] = await Promise.all([
      authFetch(`${BASE}/api/organization`).then(r => r.json()) as Promise<OrgInfo>,
      authFetch(`${BASE}/api/organization/billing-history`).then(r => r.json()) as Promise<BillingItem[]>,
      authFetch(`${BASE}/api/dashboard/summary`).then(r => r.json()) as Promise<DashboardSummary>,
    ]);
    setOrg(o); setBilling(b); setSummary(s);
  }

  useEffect(() => { reload().finally(() => setLoading(false)); }, []);

  async function upgradePlan(planId: string) {
    const planName = PLANS.find(p => p.id === planId)?.name ?? planId;
    if (!confirm(`هل تريد الترقية إلى خطة "${planName}"؟`)) return;
    setUpgrading(true);
    try {
      const r = await authFetch(`${BASE}/api/organization/upgrade`, {
        method: "PUT", body: JSON.stringify({ plan: planId, billingCycle: upgradeCycle }),
      });
      if (!r.ok) { const d = await r.json() as { error?: string }; toast({ title: "خطأ", description: d.error, variant: "destructive" }); return; }
      await reload(); toast({ title: "تمت الترقية بنجاح" });
    } finally { setUpgrading(false); }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!org) {
    return <div className="text-center text-muted-foreground py-20">لا توجد معلومات اشتراك</div>;
  }

  const status = STATUS_CONFIG[org.subscriptionStatus] ?? STATUS_CONFIG.trial;
  const isUnlimited = org.includedCollaborators === -1;
  const cyclePrice = upgradeCycle === "yearly" ? org.plan.priceYearly : org.plan.priceMonthly;

  return (
    <div className="space-y-6 max-w-4xl">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold">الاشتراك والفوترة</h1>
        <p className="text-muted-foreground text-sm mt-0.5">إدارة الخطة، الفوترة، والمستخدمين في مكتبك</p>
      </div>

      {/* ── Current plan hero ── */}
      <div className={cn("bg-gradient-to-br rounded-2xl p-6 border", PLAN_COLORS[org.subscriptionPlan] ?? PLAN_COLORS.solo)}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Crown className="h-5 w-5 text-primary" />
              <span className="font-bold text-xl">{org.plan.name}</span>
              <span className={cn("text-xs px-2.5 py-0.5 rounded-full font-semibold", status.bg, status.color)}>
                {status.label}
              </span>
            </div>
            <p className="text-muted-foreground text-sm font-medium">{org.name}</p>

            {org.daysRemaining !== null && (
              <div className={cn("flex items-center gap-2 text-sm font-semibold",
                org.isTrialExpired ? "text-destructive"
                : org.daysRemaining <= 7 ? "text-destructive"
                : org.daysRemaining <= 30 ? "text-orange-500"
                : "text-blue-500")}>
                <Clock className="h-4 w-4" />
                {org.isTrialExpired
                  ? "انتهت التجربة المجانية — فعّل الاشتراك"
                  : `الأيام المتبقية: ${org.daysRemaining} يوم`}
              </div>
            )}

            <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {org.billingCycle === "yearly" ? "دورة سنوية" : "دورة شهرية"}
              </span>
              {org.trialEndDate && org.subscriptionStatus === "trial" && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  تنتهي التجربة: {new Date(org.trialEndDate).toLocaleDateString("ar-TN")}
                </span>
              )}
            </div>
          </div>

          <div className="text-left shrink-0 space-y-1">
            <p className="text-3xl font-extrabold text-primary">
              {cyclePrice}
              <span className="text-sm font-normal text-muted-foreground"> د.ت</span>
            </p>
            <p className="text-xs text-muted-foreground">/{org.billingCycle === "yearly" ? "سنة" : "شهر"}</p>
            {org.extraCost > 0 && (
              <p className="text-xs text-orange-500">+ {org.extraCost} د.ت (متعاونون إضافيون)</p>
            )}
            {org.extraCost > 0 && (
              <p className="text-xs font-bold text-foreground">المجموع: {org.estimatedMonthlyTotal} د.ت/شهر</p>
            )}
          </div>
        </div>

        {(org.isTrialExpired || org.subscriptionStatus === "expired") && (
          <div className="mt-4 flex items-center gap-2 bg-destructive/10 text-destructive text-sm p-3 rounded-xl">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            اشتراكك منتهي — يرجى تفعيل الاشتراك للاستمرار في استخدام جميع الميزات
          </div>
        )}
      </div>

      {/* ── Trial progress bar ── */}
      {org.subscriptionStatus === "trial" && org.daysRemaining !== null && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground font-medium">تجربة مجانية — 90 يوم</span>
            <span className={cn("font-bold",
              org.isTrialExpired ? "text-destructive"
              : org.daysRemaining <= 14 ? "text-orange-500"
              : "text-primary")}>
              {org.isTrialExpired ? "منتهية" : `${org.daysRemaining} يوم متبقٍ`}
            </span>
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
            <div className={cn("h-full rounded-full transition-all duration-500",
              org.isTrialExpired ? "bg-destructive"
              : org.daysRemaining <= 7 ? "bg-destructive"
              : org.daysRemaining <= 30 ? "bg-orange-500"
              : "bg-primary")}
              style={{ width: `${Math.max(2, (org.daysRemaining / 90) * 100)}%` }} />
          </div>
        </div>
      )}

      {/* ── Usage cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "المستخدمون",
            value: `${org.memberCount}${isUnlimited ? "" : ` / ${(org.includedCollaborators + 1)}`}`,
            sub: isUnlimited ? "غير محدودون" : `${org.remaining ?? 0} مقعد متاح`,
            icon: Users,
            color: "text-primary bg-primary/10",
            progress: isUnlimited ? null : ((org.memberCount / ((org.includedCollaborators + 1))) * 100),
            progressColor: org.remaining === 0 ? "bg-orange-500" : "bg-primary",
          },
          {
            label: "القضايا النشطة",
            value: String(summary?.activeCases ?? "—"),
            sub: "قضية جارية",
            icon: Briefcase,
            color: "text-blue-500 bg-blue-500/10",
            progress: null,
            progressColor: "bg-blue-500",
          },
          {
            label: "الفواتير المعلقة",
            value: String(summary?.pendingInvoices ?? "—"),
            sub: "بانتظار التسديد",
            icon: FileText,
            color: "text-orange-500 bg-orange-500/10",
            progress: null,
            progressColor: "bg-orange-500",
          },
          {
            label: "التخزين",
            value: "—",
            sub: "غير محدود",
            icon: HardDrive,
            color: "text-green-500 bg-green-500/10",
            progress: null,
            progressColor: "bg-green-500",
          },
        ].map(card => (
          <div key={card.label} className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", card.color)}>
              <card.icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight">{card.value}</p>
              <p className="text-xs font-medium text-foreground/80 leading-tight mt-0.5">{card.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{card.sub}</p>
            </div>
            {card.progress !== null && (
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full", card.progressColor)}
                  style={{ width: `${Math.min(100, card.progress)}%` }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Collaborator breakdown ── */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">المتعاونون</h3>
          </div>
          <Link href="/users">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8">
              <Plus className="h-3.5 w-3.5" /> إضافة متعاون
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "المشمولون في الخطة",
              value: isUnlimited ? "∞" : String(org.includedCollaborators + 1),
              sub: "بما فيهم المدير",
              icon: UserCheck,
              color: "text-blue-500 bg-blue-500/10",
            },
            {
              label: "المستخدمون الحاليون",
              value: String(org.memberCount),
              sub: `${org.collaboratorsUsed} متعاون`,
              icon: Users,
              color: "text-primary bg-primary/10",
            },
            {
              label: "المقاعد المتبقية",
              value: isUnlimited ? "∞" : String(org.remaining ?? 0),
              sub: isUnlimited ? "غير محدود" : (org.remaining === 0 ? "وصلتَ للحد" : "مقعد متاح"),
              icon: UserPlus,
              color: (org.remaining === 0 && !isUnlimited) ? "text-orange-500 bg-orange-500/10" : "text-green-500 bg-green-500/10",
            },
            {
              label: "مستخدمون إضافيون",
              value: isUnlimited ? "0" : String(org.extraCollaborators),
              sub: org.extraCollaborators > 0 ? `${org.extraCollaborators * 12} د.ت/شهر` : "لا تكلفة إضافية",
              icon: UserX,
              color: org.extraCollaborators > 0 ? "text-orange-500 bg-orange-500/10" : "text-muted-foreground bg-muted/50",
            },
          ].map(item => (
            <div key={item.label} className="bg-muted/30 rounded-xl p-3 space-y-2">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", item.color)}>
                <item.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xl font-bold">{item.value}</p>
                <p className="text-xs font-medium leading-tight">{item.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {org.extraCollaborators > 0 && (
          <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-3 text-sm">
            <p className="font-medium text-orange-500">تكلفة المستخدمين الإضافيين</p>
            <p className="text-muted-foreground text-xs mt-0.5">
              {org.extraCollaborators} مستخدم × 12 د.ت = <span className="font-bold text-foreground">{org.extraCost} د.ت / شهر</span>
            </p>
            <p className="text-muted-foreground text-xs mt-1">
              المجموع المقدّر: {org.plan.priceMonthly} + {org.extraCost} = <span className="font-bold text-foreground">{org.estimatedMonthlyTotal} د.ت / شهر</span>
            </p>
          </div>
        )}

        {!isUnlimited && org.remaining === 0 && !org.isTrialExpired && (
          <div className="bg-muted/40 border border-border rounded-xl p-3 text-sm text-muted-foreground">
            لقد بلغتَ الحدَّ المتاح في خطتك. يمكنك إضافة متعاون إضافي بـ <span className="font-semibold text-foreground">12 د.ت / شهر</span>، أو ترقية الاشتراك للحصول على المزيد.
          </div>
        )}
      </div>

      {/* ── Plan features ── */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold mb-3">ما يشمله اشتراكك الحالي</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {org.plan.features.map(f => (
            <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> {f}
            </div>
          ))}
        </div>
      </div>

      {/* ── Upgrade section ── */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">ترقية الخطة</h3>
          </div>
          <div className="flex items-center gap-1 bg-muted/50 p-0.5 rounded-lg text-xs">
            <button onClick={() => setUpgradeCycle("monthly")}
              className={cn("px-2.5 py-1 rounded-md transition-colors",
                upgradeCycle === "monthly" ? "bg-card shadow-sm font-medium" : "text-muted-foreground")}>
              شهري
            </button>
            <button onClick={() => setUpgradeCycle("yearly")}
              className={cn("px-2.5 py-1 rounded-md transition-colors flex items-center gap-1",
                upgradeCycle === "yearly" ? "bg-card shadow-sm font-medium" : "text-muted-foreground")}>
              سنوي <span className="text-green-500 font-medium">-17%</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PLANS.map(p => {
            const price = upgradeCycle === "yearly" ? p.priceYearly : p.priceMonthly;
            const isCurrent = org.subscriptionPlan === p.id;
            return (
              <div key={p.id} className={cn("border rounded-xl p-4 space-y-3 relative flex flex-col transition-colors",
                isCurrent ? "border-primary bg-primary/5"
                : p.isRecommended ? "border-primary/40 hover:border-primary shadow-sm"
                : "border-border hover:border-primary/40")}>
                {isCurrent && (
                  <span className="absolute -top-2.5 right-3 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-medium">
                    خطتك الحالية
                  </span>
                )}
                {p.isRecommended && !isCurrent && (
                  <span className="absolute -top-2.5 right-3 text-xs bg-primary/80 text-primary-foreground px-2 py-0.5 rounded-full font-medium">
                    الأكثر استعمالاً
                  </span>
                )}
                <div>
                  <p className="font-semibold text-sm">{p.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{collabLabel(p)} مشمول</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-primary">
                    {price}
                    <span className="text-xs font-normal text-muted-foreground"> د.ت/{upgradeCycle === "yearly" ? "سنة" : "شهر"}</span>
                  </p>
                  {upgradeCycle === "yearly" && (
                    <p className="text-xs text-green-500 font-medium">توفير {p.priceMonthly * 12 - p.priceYearly} د.ت</p>
                  )}
                </div>
                <ul className="space-y-1.5 flex-1">
                  {p.features.map(f => (
                    <li key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                {!isCurrent && (
                  <Button size="sm" variant={p.isRecommended ? "default" : "outline"}
                    onClick={() => upgradePlan(p.id)} disabled={upgrading} className="w-full text-xs mt-auto">
                    <RefreshCw className="h-3 w-3 ml-1" />
                    {org.subscriptionStatus === "trial" ? "تفعيل الاشتراك" : "اختر هذه الخطة"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground text-center">
          كل متعاون إضافي بـ 12 د.ت / شهر • سيتم التكامل مع بوابة الدفع قريباً
        </p>
      </div>

      {/* ── Estimated monthly total ── */}
      {org.extraCost > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold mb-3">التكلفة الشهرية المتوقعة</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">الخطة ({org.plan.name})</span>
              <span className="font-medium">{org.plan.priceMonthly} د.ت</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">مستخدمون إضافيون ({org.extraCollaborators} × 12 د.ت)</span>
              <span className="font-medium text-orange-500">{org.extraCost} د.ت</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between text-sm font-bold">
              <span>المجموع الشهري</span>
              <span className="text-primary">{org.estimatedMonthlyTotal} د.ت / شهر</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Payment method ── */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">طريقة الدفع</h3>
        </div>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-8 bg-muted rounded-md flex items-center justify-center">
              <CreditCard className="h-4 w-4 text-muted-foreground/50" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">لا توجد طريقة دفع مسجلة</p>
              <p className="text-xs text-muted-foreground/60">سيتم التكامل مع بوابة الدفع قريباً</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="text-xs h-8" disabled>
              تغيير البطاقة
            </Button>
            <Button size="sm" variant="outline" className="text-xs h-8" disabled>
              <Plus className="h-3.5 w-3.5 ml-1" /> إضافة طريقة دفع
            </Button>
          </div>
        </div>
      </div>

      {/* ── Billing history ── */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">سجل الفوترة</h3>
        </div>
        {billing.length === 0 ? (
          <div className="text-center py-8 space-y-1">
            <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto" />
            <p className="text-sm text-muted-foreground">لا توجد فواتير بعد</p>
            <p className="text-xs text-muted-foreground/60">ستظهر الفواتير هنا بعد تفعيل الاشتراك</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="text-right py-2 font-medium">الفاتورة</th>
                  <th className="text-right py-2 font-medium">التاريخ</th>
                  <th className="text-right py-2 font-medium">المبلغ</th>
                  <th className="text-right py-2 font-medium">الحالة</th>
                  <th className="text-right py-2 font-medium">تحميل</th>
                </tr>
              </thead>
              <tbody>
                {billing.map(b => (
                  <tr key={b.id} className="border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 font-medium">{b.description}</td>
                    <td className="py-2.5 text-muted-foreground">{new Date(b.createdAt).toLocaleDateString("ar-TN")}</td>
                    <td className="py-2.5 font-bold">{b.amount} {b.currency}</td>
                    <td className="py-2.5">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium",
                        b.status === "paid" ? "bg-green-500/10 text-green-500" : "bg-orange-500/10 text-orange-500")}>
                        {b.status === "paid" ? "مدفوعة" : "معلقة"}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <button className="flex items-center gap-1 text-xs text-primary hover:underline" disabled>
                        <Download className="h-3.5 w-3.5" /> PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Bottom CTA ── */}
      <div className="bg-gradient-to-br from-primary/8 to-primary/3 border border-primary/20 rounded-2xl p-6 text-center space-y-4"
        style={{ background: "color-mix(in oklch, var(--primary) 6%, var(--card))" }}>
        <div>
          <p className="font-semibold text-base">تحتاج مستخدمين أكثر أو ميزات متقدمة؟</p>
          <p className="text-sm text-muted-foreground mt-1">رقّ خطتك اليوم وانتفع بكامل إمكانيات المنصة</p>
        </div>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Button className="gap-1.5" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <ArrowUp className="h-4 w-4" /> ترقية الخطة
          </Button>
          <Link href="/pricing">
            <Button variant="outline" className="gap-1.5">
              مقارنة الخطط
            </Button>
          </Link>
          <Button variant="ghost" className="gap-1.5" disabled>
            <Phone className="h-4 w-4" /> تواصل معنا
          </Button>
        </div>
      </div>

    </div>
  );
}

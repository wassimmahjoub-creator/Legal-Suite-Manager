import { useState, useEffect } from "react";
import { authFetch } from "@/lib/authFetch";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Crown, CheckCircle2, Clock, Users, CreditCard, TrendingUp, Calendar,
  AlertTriangle, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

interface OrgInfo {
  id: number; name: string; subscriptionPlan: string; subscriptionStatus: string;
  billingCycle: string; trialStartDate: string; trialEndDate: string;
  daysRemaining: number | null; isTrialExpired: boolean;
  plan: { name: string; priceMonthly: number; priceYearly: number; collaborators: number; features: string[] };
  memberCount: number;
}

interface BillingItem {
  id: number; amount: string; currency: string; description: string;
  status: string; billingCycle: string | null; createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  trial: { label: "تجربة مجانية", color: "text-blue-500", bg: "bg-blue-500/10" },
  active: { label: "نشط", color: "text-green-500", bg: "bg-green-500/10" },
  paused: { label: "موقوف", color: "text-orange-500", bg: "bg-orange-500/10" },
  expired: { label: "منتهي", color: "text-destructive", bg: "bg-destructive/10" },
};

const PLAN_COLORS: Record<string, string> = {
  solo: "from-blue-500/10 to-blue-500/5 border-blue-500/20",
  cabinet: "from-primary/10 to-primary/5 border-primary/20",
  premium: "from-purple-500/10 to-purple-500/5 border-purple-500/20",
};

export default function Subscription() {
  const { toast } = useToast();
  const [org, setOrg] = useState<OrgInfo | null>(null);
  const [billing, setBilling] = useState<BillingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    Promise.all([
      authFetch(`${BASE}/api/organization`).then(r => r.json()) as Promise<OrgInfo>,
      authFetch(`${BASE}/api/organization/billing-history`).then(r => r.json()) as Promise<BillingItem[]>,
    ]).then(([o, b]) => { setOrg(o); setBilling(b); }).finally(() => setLoading(false));
  }, []);

  async function upgradePlan(plan: string, cycle: string) {
    if (!confirm(`هل تريد الترقية إلى خطة ${plan}؟`)) return;
    setUpgrading(true);
    try {
      const r = await authFetch(`${BASE}/api/organization/upgrade`, {
        method: "PUT", body: JSON.stringify({ plan, billingCycle: cycle }),
      });
      if (!r.ok) { const d = await r.json() as { error?: string }; toast({ title: "خطأ", description: d.error, variant: "destructive" }); return; }
      const o = await authFetch(`${BASE}/api/organization`).then(r2 => r2.json()) as OrgInfo;
      setOrg(o); toast({ title: "تمت الترقية بنجاح" });
    } finally { setUpgrading(false); }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!org) {
    return <div className="text-center text-muted-foreground py-20">لا توجد معلومات اشتراك</div>;
  }

  const status = STATUS_CONFIG[org.subscriptionStatus] ?? STATUS_CONFIG.trial;
  const maxCollabs = org.plan.collaborators === -1 ? "∞" : org.plan.collaborators;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">الاشتراك والفوترة</h1>
        <p className="text-muted-foreground text-sm mt-0.5">إدارة خطة الاشتراك والمعلومات البنكية</p>
      </div>

      {/* Current plan card */}
      <div className={cn("bg-gradient-to-br rounded-2xl p-6 border", PLAN_COLORS[org.subscriptionPlan] ?? PLAN_COLORS.solo)}>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              <span className="font-bold text-lg">{org.plan.name}</span>
              <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", status.bg, status.color)}>
                {status.label}
              </span>
            </div>
            <p className="text-muted-foreground text-sm">{org.name}</p>

            {org.daysRemaining !== null && (
              <div className={cn("flex items-center gap-2 text-sm font-medium",
                org.daysRemaining <= 7 ? "text-destructive" : org.daysRemaining <= 30 ? "text-orange-500" : "text-blue-500")}>
                <Clock className="h-4 w-4" />
                {org.isTrialExpired
                  ? "انتهت التجربة المجانية"
                  : `${org.daysRemaining} يوم متبقٍ في التجربة المجانية`}
              </div>
            )}

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" /> {org.memberCount} / {maxCollabs} مستخدم
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {org.billingCycle === "yearly" ? "سنوي" : "شهري"}
              </span>
            </div>
          </div>

          <div className="text-left shrink-0">
            <p className="text-3xl font-bold text-primary">
              {org.billingCycle === "yearly" ? org.plan.priceYearly : org.plan.priceMonthly}
              <span className="text-sm font-normal text-muted-foreground"> TND</span>
            </p>
            <p className="text-xs text-muted-foreground">
              /{org.billingCycle === "yearly" ? "سنة" : "شهر"}
            </p>
          </div>
        </div>

        {(org.isTrialExpired || org.subscriptionStatus === "expired") && (
          <div className="mt-4 flex items-center gap-2 bg-destructive/10 text-destructive text-sm p-3 rounded-xl">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            اشتراكك منتهي — يرجى ترقية الخطة للاستمرار في الاستخدام
          </div>
        )}
      </div>

      {/* Trial progress bar */}
      {org.subscriptionStatus === "trial" && org.daysRemaining !== null && !org.isTrialExpired && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">مدة التجربة المجانية (90 يوم)</span>
            <span className="font-medium">{org.daysRemaining} يوم متبقٍ</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className={cn("h-full rounded-full transition-all",
              org.daysRemaining <= 7 ? "bg-destructive" : org.daysRemaining <= 30 ? "bg-orange-500" : "bg-primary")}
              style={{ width: `${Math.max(2, (org.daysRemaining / 90) * 100)}%` }} />
          </div>
        </div>
      )}

      {/* Features */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold mb-3">ما يشمله اشتراكك</h3>
        <div className="grid grid-cols-2 gap-2">
          {org.plan.features.map(f => (
            <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> {f}
            </div>
          ))}
        </div>
      </div>

      {/* Upgrade CTA */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">ترقية الخطة</h3>
          <TrendingUp className="h-5 w-5 text-primary" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { id: "solo", name: "محامي فردي", monthly: 39, yearly: 390, collabs: "0" },
            { id: "cabinet", name: "مكتب محاماة", monthly: 99, yearly: 990, collabs: "5" },
            { id: "premium", name: "مؤسسة قانونية", monthly: 249, yearly: 2490, collabs: "∞" },
          ].map(p => (
            <div key={p.id} className={cn("border rounded-xl p-4 space-y-3 relative",
              org.subscriptionPlan === p.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 transition-colors")}>
              {org.subscriptionPlan === p.id && (
                <span className="absolute -top-2 right-3 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">خطتك الحالية</span>
              )}
              <div>
                <p className="font-semibold text-sm">{p.name}</p>
                <p className="text-xs text-muted-foreground">حتى {p.collabs} {p.collabs === "∞" ? "مستخدم" : "مستخدمين"}</p>
              </div>
              <div>
                <p className="text-xl font-bold text-primary">{p.monthly} <span className="text-xs font-normal text-muted-foreground">TND/شهر</span></p>
                <p className="text-xs text-muted-foreground">أو {p.yearly} TND/سنة</p>
              </div>
              {org.subscriptionPlan !== p.id && (
                <Button size="sm" variant="outline" onClick={() => upgradePlan(p.id, "monthly")} disabled={upgrading} className="w-full text-xs">
                  <RefreshCw className="h-3 w-3 ml-1" /> اختيار هذه الخطة
                </Button>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center">
          مستخدم إضافي: 15 TND / شهر • سيتم التكامل مع بوابة الدفع قريباً
        </p>
      </div>

      {/* Billing history */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">سجل الفوترة</h3>
        </div>
        {billing.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">لا توجد فواتير بعد</p>
        ) : (
          <div className="space-y-2">
            {billing.map(b => (
              <div key={b.id} className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0">
                <div>
                  <p className="font-medium">{b.description}</p>
                  <p className="text-xs text-muted-foreground">{new Date(b.createdAt).toLocaleDateString("ar-TN")}</p>
                </div>
                <div className="text-left">
                  <p className="font-bold">{b.amount} {b.currency}</p>
                  <span className={cn("text-xs", b.status === "paid" ? "text-green-500" : "text-orange-500")}>
                    {b.status === "paid" ? "مدفوع" : "معلق"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-center">
        <Link href="/pricing" className="text-sm text-primary hover:underline">عرض جميع الخطط والأسعار ←</Link>
      </div>
    </div>
  );
}

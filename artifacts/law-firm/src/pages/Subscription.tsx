import { useState, useEffect } from "react";
import { authFetch } from "@/lib/authFetch";
import { Money } from "@/components/Money";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal, FormField } from "@/components/Modal";
import {
  Crown, CheckCircle2, Clock, Users, CreditCard, TrendingUp, Calendar,
  AlertTriangle, RefreshCw, FileText, Download, Plus, Phone, Trash2,
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
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeCycle, setUpgradeCycle] = useState<"monthly" | "yearly">("monthly");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ holder: "", number: "", expiry: "", cvv: "" });
  const [savedCard, setSavedCard] = useState<{ holder: string; last4: string; expiry: string } | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);

  async function reload() {
    const [o, b] = await Promise.all([
      authFetch(`${BASE}/api/organization`).then(r => r.json()) as Promise<OrgInfo>,
      authFetch(`${BASE}/api/organization/billing-history`).then(r => r.json()) as Promise<BillingItem[]>,
    ]);
    setOrg(o); setBilling(b);
  }

  useEffect(() => { reload().finally(() => setLoading(false)); }, []);

  function saveCard() {
    const raw = paymentForm.number.replace(/\s/g, "");
    if (!paymentForm.holder || raw.length < 12 || !paymentForm.expiry) {
      toast({ title: "يرجى ملء جميع الحقول المطلوبة", variant: "destructive" }); return;
    }
    setSavedCard({ holder: paymentForm.holder, last4: raw.slice(-4), expiry: paymentForm.expiry });
    setPaymentForm({ holder: "", number: "", expiry: "", cvv: "" });
    setShowPaymentModal(false);
    toast({ title: "تمت إضافة طريقة الدفع", description: "سيتم استخدامها عند تفعيل بوابة الدفع" });
  }

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
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {isUnlimited
                  ? "مستخدمون غير محدودون"
                  : `${org.memberCount} / ${org.includedCollaborators + 1} مستخدم · ${org.remaining ?? 0} مقعد متاح`}
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
              <Money amount={Number(cyclePrice)} />
            </p>
            <p className="text-xs text-muted-foreground">/{org.billingCycle === "yearly" ? "سنة" : "شهر"}</p>
            {org.extraCost > 0 && (
              <p className="text-xs text-orange-500">+ <Money amount={Number(org.extraCost)} /> (متعاونون إضافيون)</p>
            )}
            {org.extraCost > 0 && (
              <p className="text-xs font-bold text-foreground">المجموع: <Money amount={Number(org.estimatedMonthlyTotal)} />/شهر</p>
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
                    <Money amount={Number(price)} />
                    <span className="text-xs font-normal text-muted-foreground">/{upgradeCycle === "yearly" ? "سنة" : "شهر"}</span>
                  </p>
                  {upgradeCycle === "yearly" && (
                    <p className="text-xs text-green-500 font-medium">توفير <Money amount={p.priceMonthly * 12 - p.priceYearly} /></p>
                  )}
                </div>
                <ul className="space-y-1.5 flex-1">
                  {p.features.map(f => (
                    <li key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <Button size="sm" variant="default"
                    onClick={() => { setPaymentForm({ holder: "", number: "", expiry: "", cvv: "" }); setShowPaymentModal(true); }}
                    className="w-full text-xs mt-auto gap-1">
                    <CreditCard className="h-3 w-3" />
                    {org.subscriptionStatus === "trial" ? "تفعيل الاشتراك والدفع" : "ادفع الآن"}
                  </Button>
                ) : (
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
              <Money amount={Number(org.plan.priceMonthly)} className="font-medium" />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">مستخدمون إضافيون ({org.extraCollaborators} × 12 DT)</span>
              <Money amount={Number(org.extraCost)} className="font-medium text-orange-500" />
            </div>
            <div className="border-t border-border pt-2 flex justify-between text-sm font-bold">
              <span>المجموع الشهري</span>
              <span className="text-primary"><Money amount={Number(org.estimatedMonthlyTotal)} /> / شهر</span>
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
            <div className={cn("w-12 h-8 rounded-md flex items-center justify-center", savedCard ? "bg-primary/10" : "bg-muted")}>
              <CreditCard className={cn("h-4 w-4", savedCard ? "text-primary" : "text-muted-foreground/50")} />
            </div>
            <div>
              {savedCard ? (
                <>
                  <p className="text-sm font-semibold">{savedCard.holder}</p>
                  <p className="text-xs text-muted-foreground">•••• •••• •••• {savedCard.last4} &nbsp;|&nbsp; {savedCard.expiry}</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-muted-foreground">لا توجد طريقة دفع مسجلة</p>
                  <p className="text-xs text-muted-foreground/60">أضف بطاقتك لتفعيل الاشتراك عند توفر بوابة الدفع</p>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {savedCard && (
              <Button size="sm" variant="ghost" className="text-xs h-8 text-destructive hover:text-destructive"
                onClick={() => setSavedCard(null)}>
                <Trash2 className="h-3.5 w-3.5 ml-1" /> حذف
              </Button>
            )}
            <Button size="sm" variant="outline" className="text-xs h-8"
              onClick={() => { setPaymentForm({ holder: "", number: "", expiry: "", cvv: "" }); setShowPaymentModal(true); }}>
              {savedCard ? <><RefreshCw className="h-3.5 w-3.5 ml-1" /> تغيير البطاقة</> : <><Plus className="h-3.5 w-3.5 ml-1" /> إضافة طريقة دفع</>}
            </Button>
          </div>
        </div>
      </div>

      {/* Payment modal */}
      <Modal open={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="إضافة طريقة دفع">
        <div className="space-y-4">
          <div className="bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 text-xs text-muted-foreground">
            ℹ️ سيتم ربط بطاقتك بشكل آمن عند تفعيل بوابة الدفع. معلوماتك محفوظة بشكل مشفر.
          </div>
          <FormField label="اسم صاحب البطاقة *" htmlFor="pm-holder">
            <Input id="pm-holder" placeholder="الاسم كما يظهر على البطاقة" dir="ltr"
              className="h-10 bg-muted/50 border-border rounded-lg"
              value={paymentForm.holder} onChange={e => setPaymentForm(f => ({ ...f, holder: e.target.value }))} />
          </FormField>
          <FormField label="رقم البطاقة *" htmlFor="pm-number">
            <Input id="pm-number" placeholder="0000 0000 0000 0000" dir="ltr" maxLength={19}
              className="h-10 bg-muted/50 border-border rounded-lg font-mono tracking-widest"
              value={paymentForm.number}
              onChange={e => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 16);
                setPaymentForm(f => ({ ...f, number: v.replace(/(.{4})/g, "$1 ").trim() }));
              }} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="تاريخ الانتهاء *" htmlFor="pm-expiry">
              <Input id="pm-expiry" placeholder="MM/YY" dir="ltr" maxLength={5}
                className="h-10 bg-muted/50 border-border rounded-lg font-mono"
                value={paymentForm.expiry}
                onChange={e => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                  setPaymentForm(f => ({ ...f, expiry: v.length > 2 ? v.slice(0, 2) + "/" + v.slice(2) : v }));
                }} />
            </FormField>
            <FormField label="CVV *" htmlFor="pm-cvv">
              <Input id="pm-cvv" placeholder="000" dir="ltr" maxLength={4} type="password"
                className="h-10 bg-muted/50 border-border rounded-lg font-mono"
                value={paymentForm.cvv} onChange={e => setPaymentForm(f => ({ ...f, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) }))} />
            </FormField>
          </div>
          <div className="flex gap-3 pt-1">
            <Button className="flex-1" onClick={saveCard}>حفظ طريقة الدفع</Button>
            <Button variant="outline" className="px-6" onClick={() => setShowPaymentModal(false)}>إلغاء</Button>
          </div>
        </div>
      </Modal>

      {/* Contact modal */}
      <Modal open={showContactModal} onClose={() => setShowContactModal(false)} title="تواصل معنا" size="sm">
        <div className="space-y-5">
          <p className="text-sm text-muted-foreground">فريق الدعم متاح للإجابة على استفساراتك حول الاشتراكات والخطط.</p>
          <div className="space-y-3">
            <a href="mailto:support@mahamiplus.tn"
              className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors group">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">البريد الإلكتروني</p>
                <p className="text-sm font-medium group-hover:text-primary transition-colors">support@mahamiplus.tn</p>
              </div>
            </a>
            <a href="tel:+21671000000"
              className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors group">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Phone className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">الهاتف</p>
                <p className="text-sm font-medium group-hover:text-primary transition-colors dir-ltr" dir="ltr">+216 71 000 000</p>
              </div>
            </a>
            <a href="https://wa.me/21671000000" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors group">
              <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                <Phone className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">واتساب</p>
                <p className="text-sm font-medium group-hover:text-green-500 transition-colors" dir="ltr">+216 71 000 000</p>
              </div>
            </a>
          </div>
          <p className="text-xs text-muted-foreground/60 text-center">أوقات العمل: الإثنين–الجمعة، 8ص–6م</p>
        </div>
      </Modal>

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


    </div>
  );
}

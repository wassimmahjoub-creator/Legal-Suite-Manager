import { useState } from "react";
import { CheckCircle2, Crown, Users, Zap, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

const PLANS = [
  {
    id: "solo",
    name: "محامي فردي",
    subtitle: "للمحامي الفردي",
    priceMonthly: 39,
    priceYearly: 390,
    collaborators: "حساب واحد فقط",
    icon: Star,
    color: "border-border",
    badge: null as string | null,
    features: [
      "قضايا غير محدودة",
      "حرفاء غير محدودون",
      "نظام الفوترة والفواتير",
      "الوثائق والنماذج",
      "الرزنامة والمواعيد",
      "التقارير الأساسية",
      "سجل الاتصالات",
      "الإملاء الصوتي بالذكاء الاصطناعي",
    ],
    notIncluded: ["مستخدمون إضافيون", "صلاحيات متقدمة", "محاسبة متقدمة"],
  },
  {
    id: "cabinet",
    name: "مكتب محاماة",
    subtitle: "للمكاتب الصغيرة والمتوسطة",
    priceMonthly: 99,
    priceYearly: 990,
    collaborators: "حتى 5 مستخدمين",
    icon: Users,
    color: "border-primary shadow-lg shadow-primary/10",
    badge: "الأكثر شعبية" as string | null,
    features: [
      "جميع ميزات المحامي الفردي",
      "حتى 5 مستخدمين إضافيين",
      "نظام الصلاحيات المتقدم",
      "إدارة الفريق",
      "دعوة المستخدمين",
      "التقارير المتقدمة",
      "المحاسبة والحسابات البنكية",
      "سير العمل القانوني",
    ],
    notIncluded: ["مستخدمون غير محدودون", "دعم متعدد الفروع"],
  },
  {
    id: "premium",
    name: "مؤسسة قانونية",
    subtitle: "للمؤسسات القانونية الكبيرة",
    priceMonthly: 249,
    priceYearly: 2490,
    collaborators: "مستخدمون غير محدودون",
    icon: Crown,
    color: "border-purple-500/40",
    badge: null as string | null,
    features: [
      "جميع ميزات مكتب المحاماة",
      "مستخدمون غير محدودون",
      "دعم متعدد الفروع",
      "التحليلات المتقدمة",
      "سجل التعديلات الكامل",
      "ميزات الذكاء الاصطناعي المتقدمة",
      "دعم مميز على مدار الساعة",
      "تكامل مخصص",
    ],
    notIncluded: [],
  },
];

export default function Pricing() {
  const [yearly, setYearly] = useState(false);

  return (
    <div className="space-y-8" dir="rtl">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold">خطط الأسعار</h1>
        <p className="text-muted-foreground">ابدأ بتجربة مجانية 3 أشهر — بدون بطاقة بنكية</p>

        <div className="inline-flex items-center gap-1 bg-muted/50 p-1 rounded-xl">
          <button onClick={() => setYearly(false)}
            className={cn("px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
              !yearly ? "bg-card shadow-sm text-foreground" : "text-muted-foreground")}>
            شهري
          </button>
          <button onClick={() => setYearly(true)}
            className={cn("px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5",
              yearly ? "bg-card shadow-sm text-foreground" : "text-muted-foreground")}>
            سنوي
            <span className="text-xs bg-green-500/15 text-green-500 px-1.5 py-0.5 rounded-full">وفر 17%</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map(plan => {
          const Icon = plan.icon;
          const price = yearly ? plan.priceYearly : plan.priceMonthly;
          const period = yearly ? "سنة" : "شهر";
          return (
            <div key={plan.id} className={cn("relative bg-card border-2 rounded-2xl p-6 space-y-5 flex flex-col", plan.color)}>
              {plan.badge && (
                <div className="absolute -top-3 right-1/2 translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap">
                  {plan.badge}
                </div>
              )}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-primary/10 rounded-lg">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold">{plan.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{plan.subtitle}</p>
                <p className="text-xs text-muted-foreground">{plan.collaborators}</p>
              </div>

              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-primary">{price}</span>
                  <span className="text-muted-foreground text-sm">TND / {period}</span>
                </div>
                {yearly && (
                  <p className="text-xs text-muted-foreground mt-1">
                    بدلاً من {plan.priceMonthly * 12} TND
                  </p>
                )}
              </div>

              <div className="flex-1 space-y-2">
                {plan.features.map(f => (
                  <div key={f} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> {f}
                  </div>
                ))}
                {plan.notIncluded.map(f => (
                  <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground/40">
                    <div className="h-4 w-4 rounded-full border border-muted-foreground/20 shrink-0" /> {f}
                  </div>
                ))}
              </div>

              <Link href="/subscription">
                <Button className="w-full" variant={plan.id === "cabinet" ? "default" : "outline"}>
                  {plan.id === "solo" ? "ابدأ مجاناً" : "اختر هذه الخطة"}
                </Button>
              </Link>
            </div>
          );
        })}
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">مستخدمون إضافيون</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          تحتاج إلى أكثر من الحد المتاح في خطتك؟ يمكنك إضافة مستخدمين إضافيين بـ{" "}
          <span className="font-bold text-foreground">15 TND / شهر / مستخدم</span>.
        </p>
      </div>

      <div className="bg-muted/30 rounded-2xl p-6 text-center space-y-2">
        <p className="font-semibold">هل تحتاج إلى حل مخصص؟</p>
        <p className="text-sm text-muted-foreground">تواصل معنا للحصول على عرض مخصص لمكتبك</p>
        <p className="text-sm text-primary font-medium">contact@mahamiplus.tn</p>
      </div>
    </div>
  );
}

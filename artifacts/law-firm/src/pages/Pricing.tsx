import { useState } from "react";
import { CheckCircle2, Crown, Users, Zap, Star } from "lucide-react";
import { Money } from "@/components/Money";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { PLANS } from "@workspace/plans";

const PLAN_UI: Record<string, { icon: React.ElementType; color: string }> = {
  solo:    { icon: Star,  color: "border-border" },
  cabinet: { icon: Users, color: "border-primary shadow-lg shadow-primary/10" },
  premium: { icon: Crown, color: "border-purple-500/40" },
};

export default function Pricing() {
  const [yearly, setYearly] = useState(false);

  return (
    <div className="space-y-8" dir="rtl">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold">خطط الأسعار</h1>
        <p className="text-muted-foreground">ابدأ بتجربة مجانية 3 أشهر — بدون بطاقة بنكية</p>
        <p className="text-xs text-muted-foreground bg-primary/5 border border-primary/15 rounded-full px-4 py-1.5 inline-block">
          كل خطة تشمل المدير الرئيسي وعدد من المتعاونين حسب الخطة.
        </p>

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
            <span className="text-xs bg-green-500/15 text-green-500 px-1.5 py-0.5 rounded-full">وفر شهرين</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map(plan => {
          const ui = PLAN_UI[plan.id] ?? { icon: Star, color: "border-border" };
          const Icon = ui.icon;
          const price = yearly ? plan.priceYearly : plan.priceMonthly;
          const period = yearly ? "سنة" : "شهر";
          const cl = plan.includedCollaborators === -1
            ? "متعاونون غير محدودون"
            : `${plan.includedCollaborators} متعاون مشمول`;

          return (
            <div key={plan.id} className={cn("relative bg-card border-2 rounded-2xl p-6 space-y-5 flex flex-col", ui.color)}>
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
                <div className="inline-flex items-center gap-1 bg-primary/8 text-primary text-xs font-medium px-2 py-0.5 rounded-full">
                  <Users className="h-3 w-3" /> {cl}
                </div>
              </div>

              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-primary">{price}</span>
                  <span className="text-muted-foreground text-sm">DT / {period}</span>
                </div>
                {yearly && (
                  <p className="text-xs text-green-500 mt-1 font-medium">
                    توفير <Money amount={plan.priceMonthly * 12 - plan.priceYearly} locale="fr" /> مقارنة بالشهري
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

              <Link href={`/subscription`}>
                <Button className="w-full" variant={plan.id === "cabinet" ? "default" : "outline"}>
                  {plan.id === "solo"
                    ? "ابدأ التجربة المجانية"
                    : plan.id === "cabinet"
                    ? "اختر الخطة"
                    : "ترقية الاشتراك"}
                </Button>
              </Link>
            </div>
          );
        })}
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">متعاونون إضافيون</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          {[
            { plan: "محامي فردي", included: "1", extra: "12 DT / شهر" },
            { plan: "مكتب محاماة", included: "5", extra: "12 DT / شهر" },
            { plan: "مؤسسة قانونية", included: "غير محدود", extra: "مجاناً" },
          ].map(r => (
            <div key={r.plan} className="bg-muted/30 rounded-xl p-3 space-y-1">
              <p className="font-medium">{r.plan}</p>
              <p className="text-muted-foreground">مشمول: <span className="text-foreground font-medium">{r.included}</span></p>
              <p className="text-muted-foreground">إضافي: <span className="text-primary font-medium">{r.extra}</span></p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          لا تُحاسَب على المتعاونين المشمولين في خطتك. فقط المتعاونون الزائدون عن الحد يُحتسَبون.
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

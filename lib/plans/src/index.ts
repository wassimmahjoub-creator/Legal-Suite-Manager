export interface Plan {
  id: string;
  name: string;
  subtitle: string;
  priceMonthly: number;
  priceYearly: number;
  includedCollaborators: number;
  extraCollaboratorPrice: number;
  isRecommended: boolean;
  badge: string | null;
  features: string[];
  notIncluded: string[];
}

export const PLANS: Plan[] = [
  {
    id: "solo",
    name: "محامي فردي",
    subtitle: "للمحامي الفردي والمكتب الصغير",
    priceMonthly: 49,
    priceYearly: 490,
    includedCollaborators: 1,
    extraCollaboratorPrice: 12,
    isRecommended: false,
    badge: null,
    features: [
      "المدير الرئيسي + 1 متعاون مشمول",
      "قضايا غير محدودة",
      "حرفاء غير محدودون",
      "نظام الفوترة والفواتير",
      "الوثائق والنماذج",
      "الرزنامة والمواعيد",
      "التنبيهات والتذكيرات",
      "سجل الاتصالات",
    ],
    notIncluded: ["تقارير متقدمة", "محاسبة متقدمة", "بوابة الحرفاء"],
  },
  {
    id: "cabinet",
    name: "مكتب محاماة",
    subtitle: "للمكاتب الصغيرة والمتوسطة",
    priceMonthly: 119,
    priceYearly: 1190,
    includedCollaborators: 5,
    extraCollaboratorPrice: 12,
    isRecommended: true,
    badge: "الأكثر شعبية",
    features: [
      "المدير الرئيسي + 5 متعاونين مشمولين",
      "جميع ميزات المحامي الفردي",
      "نظام الصلاحيات المتقدم",
      "التقارير المتقدمة",
      "المحاسبة والحسابات البنكية",
      "سير العمل القانوني",
      "بوابة الحرفاء",
      "إدارة الفريق بالكامل",
    ],
    notIncluded: ["متعاونون غير محدودون", "دعم متعدد الفروع"],
  },
  {
    id: "premium",
    name: "مؤسسة قانونية",
    subtitle: "للمؤسسات القانونية الكبيرة",
    priceMonthly: 249,
    priceYearly: 2490,
    includedCollaborators: -1,
    extraCollaboratorPrice: 0,
    isRecommended: false,
    badge: null,
    features: [
      "متعاونون غير محدودون مشمولون",
      "جميع ميزات مكتب المحاماة",
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

export const PLANS_MAP: Record<string, Plan> = Object.fromEntries(
  PLANS.map(p => [p.id, p])
);

export function collabLabel(plan: Plan): string {
  return plan.includedCollaborators === -1
    ? "غير محدود"
    : `${plan.includedCollaborators} متعاول${plan.includedCollaborators > 1 ? "ين" : ""}`;
}

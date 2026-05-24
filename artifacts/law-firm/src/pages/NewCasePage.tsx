import { useState } from "react";
import { useLocation } from "wouter";
import {
  Scale, Building2, Briefcase, Receipt, Gavel,
  Bell, FileText, Handshake, FolderOpen,
  MessageCircle, FileSignature, Building, CreditCard,
  ArrowRight,
} from "lucide-react";
import { CaseWizard } from "@/components/cases/CaseWizard";
import { useQueryClient } from "@tanstack/react-query";

interface ServiceTypeCard {
  value: string;
  label: string;
  desc: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}

const GROUPS: { label: string; types: ServiceTypeCard[] }[] = [
  {
    label: "الملفات القضائية",
    types: [
      { value: "lawsuit",           label: "دعوى قضائية",   desc: "نزاعات مدنية وتجارية وجزائية",          icon: Scale,         color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/20" },
      { value: "real_estate_file",  label: "ملف عقاري",     desc: "نزاعات ومعاملات عقارية",                 icon: Building2,     color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20" },
      { value: "labor_file",        label: "ملف شغل",       desc: "نزاعات عمالية وقانون الشغل",             icon: Briefcase,     color: "text-purple-400",  bg: "bg-purple-500/10 border-purple-500/20" },
      { value: "tax_file",          label: "ملف جبائي",     desc: "نزاعات مع الإدارة الجبائية",             icon: Receipt,       color: "text-red-400",     bg: "bg-red-500/10 border-red-500/20" },
      { value: "judgment_execution",label: "تنفيذ حكم",     desc: "متابعة تنفيذ الأحكام القضائية",          icon: Gavel,         color: "text-orange-400",  bg: "bg-orange-500/10 border-orange-500/20" },
    ],
  },
  {
    label: "الاستشارات والعقود",
    types: [
      { value: "consultation",      label: "استشارة قانونية", desc: "رأي قانوني وتوجيه في مسائل قانونية",   icon: MessageCircle, color: "text-green-400",   bg: "bg-green-500/10 border-green-500/20" },
      { value: "contract",          label: "تحرير عقد",       desc: "صياغة ومراجعة العقود والاتفاقيات",     icon: FileSignature, color: "text-teal-400",    bg: "bg-teal-500/10 border-teal-500/20" },
      { value: "company_creation",  label: "تأسيس شركة",      desc: "إجراءات تأسيس الشركات والمؤسسات",      icon: Building,      color: "text-cyan-400",    bg: "bg-cyan-500/10 border-cyan-500/20" },
      { value: "debt_recovery",     label: "استخلاص ديون",    desc: "متابعة الديون والمطالبة بالاستحقاقات", icon: CreditCard,    color: "text-pink-400",    bg: "bg-pink-500/10 border-pink-500/20" },
    ],
  },
  {
    label: "الإجراءات الأخرى",
    types: [
      { value: "legal_notice",      label: "إنذار",           desc: "إنذارات وتنبيهات رسمية",               icon: Bell,          color: "text-yellow-400",  bg: "bg-yellow-500/10 border-yellow-500/20" },
      { value: "administrative",    label: "ملف إداري",       desc: "إجراءات أمام الجهات الإدارية",         icon: FolderOpen,    color: "text-indigo-400",  bg: "bg-indigo-500/10 border-indigo-500/20" },
      { value: "mediation",         label: "وساطة",           desc: "حل النزاعات بالتفاوض والوساطة",        icon: Handshake,     color: "text-sky-400",     bg: "bg-sky-500/10 border-sky-500/20" },
      { value: "other",             label: "أخرى",            desc: "ملفات متنوعة لا تندرج ضمن الأصناف",    icon: FileText,      color: "text-muted-foreground", bg: "bg-muted/40 border-border" },
    ],
  },
];

export default function NewCasePage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("lawsuit");

  function pick(value: string) {
    setSelectedType(value);
    setWizardOpen(true);
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/cases")}
          className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowRight className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">ملف جديد</h1>
          <p className="text-sm text-muted-foreground mt-0.5">اختر نوع الملف للمتابعة</p>
        </div>
      </div>

      {/* Groups */}
      {GROUPS.map(group => (
        <section key={group.label} className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-1">
            {group.label}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {group.types.map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.value}
                  onClick={() => pick(t.value)}
                  className={`group flex flex-col items-start gap-3 p-4 rounded-xl border-2 transition-all text-start hover:scale-[1.02] hover:shadow-md active:scale-[0.98] ${t.bg}`}
                >
                  <div className={`p-2.5 rounded-lg bg-background/60 ${t.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm leading-snug">{t.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{t.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      <CaseWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        initialData={{ serviceType: selectedType }}
        onCreated={(id) => {
          setWizardOpen(false);
          queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
          navigate(`/cases/${id}`);
        }}
      />
    </div>
  );
}

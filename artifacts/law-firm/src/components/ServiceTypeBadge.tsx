import { Badge } from "@/components/ui/badge";

const TYPE_MAP: Record<string, { label: string; className: string }> = {
  lawsuit:           { label: "قضية",           className: "bg-destructive/10 text-destructive border-destructive/20" },
  consultation:      { label: "استشارة",         className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  contract:          { label: "عقد",             className: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
  company_creation:  { label: "تأسيس شركة",      className: "bg-green-500/10 text-green-400 border-green-500/20" },
  debt_recovery:     { label: "استخلاص ديون",    className: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  legal_notice:      { label: "إعذار قانوني",    className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  judgment_execution:{ label: "تنفيذ حكم",       className: "bg-destructive/10 text-destructive border-destructive/20" },
  real_estate_file:  { label: "ملف عقاري",       className: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
  labor_file:        { label: "ملف شغل",         className: "bg-teal-500/10 text-teal-400 border-teal-500/20" },
  tax_file:          { label: "ملف جبائي",       className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  administrative:    { label: "إداري",           className: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
  mediation:         { label: "وساطة",           className: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  other:             { label: "أخرى",            className: "bg-muted text-muted-foreground border-border" },
};

interface ServiceTypeBadgeProps {
  type: string | null | undefined;
  className?: string;
}

export function ServiceTypeBadge({ type, className }: ServiceTypeBadgeProps) {
  if (!type) return null;
  const cfg = TYPE_MAP[type] ?? { label: type, className: "bg-muted text-muted-foreground border-border" };
  return (
    <Badge
      variant="outline"
      className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${cfg.className} ${className ?? ""}`}
    >
      {cfg.label}
    </Badge>
  );
}

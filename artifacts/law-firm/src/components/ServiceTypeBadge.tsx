import { Badge } from "@/components/ui/badge";

const TYPE_MAP: Record<string, { label: string; color: string }> = {
  lawsuit:            { label: "قضية",    color: "bg-destructive/10 text-destructive border-destructive/20" },
  consultation:       { label: "استشارة", color: "bg-info/10 text-info border-info/20" },
  contract:           { label: "عقد",     color: "bg-success/10 text-success border-success/20" },
  company_creation:   { label: "شركة",    color: "bg-primary/10 text-primary border-primary/20" },
  debt_recovery:      { label: "تحصيل",  color: "bg-warning/10 text-warning border-warning/20" },
  legal_notice:       { label: "تنبيه",  color: "bg-warning/10 text-warning border-warning/20" },
  judgment_execution: { label: "تنفيذ",  color: "bg-info/10 text-info border-info/20" },
  real_estate_file:   { label: "عقاري",  color: "bg-muted text-muted-foreground border-border" },
  labor_file:         { label: "شغل",    color: "bg-muted text-muted-foreground border-border" },
  tax_file:           { label: "جبائي",  color: "bg-muted text-muted-foreground border-border" },
  administrative:     { label: "إداري",  color: "bg-muted text-muted-foreground border-border" },
  mediation:          { label: "وساطة",  color: "bg-muted text-muted-foreground border-border" },
  other:              { label: "أخرى",   color: "bg-muted text-muted-foreground border-border" },
};

export function ServiceTypeBadge({ type }: { type: string | null | undefined }) {
  const mapped = type ? TYPE_MAP[type] : undefined;
  const label = mapped?.label ?? type ?? "—";
  const color = mapped?.color ?? "bg-muted text-muted-foreground border-border";
  return (
    <Badge variant="outline" className={`${color} rounded-full px-2.5 py-0.5 text-xs font-medium border`}>
      {label}
    </Badge>
  );
}

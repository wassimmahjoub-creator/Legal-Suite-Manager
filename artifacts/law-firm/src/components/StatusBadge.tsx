import { Badge } from "@/components/ui/badge";

export const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; color: string }> = {
    active:    { label: "نشط",          color: "bg-success/10 text-success hover:bg-success/20 border-success/20" },
    closed:    { label: "مغلقة",        color: "bg-muted text-muted-foreground hover:bg-muted/80 border-border" },
    suspended: { label: "موقوفة",       color: "bg-warning/10 text-warning hover:bg-warning/20 border-warning/20" },
    pending:   { label: "في الانتظار", color: "bg-info/10 text-info hover:bg-info/20 border-info/20" },
    paid:      { label: "مدفوع",        color: "bg-success/10 text-success hover:bg-success/20 border-success/20" },
    cancelled: { label: "ملغي",         color: "bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20" },
  };
  const s = map[status] || { label: status, color: "bg-muted text-muted-foreground" };
  return (
    <Badge variant="outline" className={`${s.color} rounded-full px-3 font-medium border`}>
      {s.label}
    </Badge>
  );
};

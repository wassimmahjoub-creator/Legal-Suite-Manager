import { Badge } from "@/components/ui/badge";

export const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; color: string }> = {
    active: { label: "نشط", color: "bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20" },
    closed: { label: "مغلقة", color: "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20 border-gray-500/20" },
    suspended: { label: "موقوفة", color: "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 border-orange-500/20" },
    pending: { label: "في الانتظار", color: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20" },
    paid: { label: "مدفوع", color: "bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20" },
    cancelled: { label: "ملغي", color: "bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20" },
  };
  const s = map[status] || { label: status, color: "bg-muted" };
  return (
    <Badge variant="outline" className={`${s.color} rounded-full px-3 font-medium border`}>
      {s.label}
    </Badge>
  );
};
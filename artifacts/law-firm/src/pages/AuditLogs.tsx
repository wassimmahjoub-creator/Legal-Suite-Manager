import { SelectNative } from "@/components/SelectNative";
import { useState, useEffect } from "react";
import { authFetch } from "@/lib/authFetch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ClipboardList, Search, Filter } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonTable } from "@/components/ui/skeletons";
import { DateDisplay } from "@/components/DateDisplay";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
interface AuditLog { id: number; entityType: string; entityId: number | null; action: string; oldValue: string | null; newValue: string | null; userName: string | null; ipAddress: string | null; createdAt: string; }

const ACTION_COLORS: Record<string, string> = {
  create: "bg-green-500/10 text-green-400",
  update: "bg-blue-500/10 text-blue-400",
  delete: "bg-red-500/10 text-red-400",
  archive: "bg-orange-500/10 text-orange-400",
  restore: "bg-purple-500/10 text-purple-400",
  login: "bg-primary/10 text-primary",
};

const ENTITY_AR: Record<string, string> = {
  cases: "قضية", clients: "حريف", invoices: "فاتورة", events: "جلسة",
  documents: "وثيقة", opponents: "خصم", consultations: "استشارة", templates: "نموذج",
};

export default function AuditLogs() {
  const [data, setData] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [entityType, setEntityType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (userName) params.set("userName", userName);
    if (entityType) params.set("entityType", entityType);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const r = await authFetch(`${BASE}/api/audit-logs?${params}`);
    if (r.ok) setData(await r.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-yellow-500/10 rounded-xl"><ClipboardList className="h-6 w-6 text-yellow-400" /></div>
        <div><h1 className="text-2xl font-bold">سجل التعديلات</h1><p className="text-muted-foreground text-sm">تاريخ كل العمليات على النظام</p></div>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">المستخدم</label>
          <Input value={userName} onChange={e => setUserName(e.target.value)} placeholder="اسم المستخدم" className="h-9 w-40 bg-muted/50 border-border rounded-lg text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">نوع السجل</label>
          <SelectNative value={entityType} onChange={e => setEntityType(e.target.value)} className="h-9 px-3 bg-muted/50 border border-border rounded-lg text-sm cursor-pointer w-36">
            <option value="">الكل</option>
            {Object.entries(ENTITY_AR).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
          </SelectNative>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">من</label>
          <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-9 w-36 bg-muted/50 border-border rounded-lg text-sm" dir="ltr" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">إلى</label>
          <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-9 w-36 bg-muted/50 border-border rounded-lg text-sm" dir="ltr" />
        </div>
        <Button onClick={load} size="sm" className="gap-2 h-9"><Filter className="h-4 w-4" />تصفية</Button>
      </div>

      {loading ? (
        <SkeletonTable rows={8} cols={5} />
      ) : data.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground"><ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-20" /><p>لا توجد سجلات</p></div>
      ) : (
        <div className="border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-right">
                <th className="px-4 py-3 font-medium text-muted-foreground">العملية</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">السجل</th>
                <th className="px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">المستخدم</th>
                <th className="px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">القيمة الجديدة</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">التاريخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {data.map(log => (
                <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${ACTION_COLORS[log.action] ?? "bg-muted text-muted-foreground"}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {ENTITY_AR[log.entityType] ?? log.entityType} {log.entityId ? `#${log.entityId}` : ""}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{log.userName ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell max-w-[200px] truncate">{log.newValue ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap"><DateDisplay date={log.createdAt} format="datetime" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

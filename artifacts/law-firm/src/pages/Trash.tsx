import { useState, useEffect } from "react";
import { authFetch } from "@/lib/authFetch";
import { formatCurrency } from "@/lib/currency";
import { DateDisplay } from "@/components/DateDisplay";
import { Button } from "@/components/ui/button";
import { Trash2, RotateCcw, AlertTriangle, Briefcase, Users, FileText, CreditCard } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { ConfirmDestructive } from "@/components/ui/ConfirmDestructive";
import { EmptyState } from "@/components/ui/EmptyState";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

interface TrashData {
  cases: Array<{ id: number; title: string; deletedAt: string }>;
  clients: Array<{ id: number; name: string; deletedAt: string }>;
  documents: Array<{ id: number; name: string; deletedAt: string }>;
  invoices: Array<{ id: number; amount: string; status: string; deletedAt: string }>;
}

export default function Trash() {
  const [data, setData] = useState<TrashData>({ cases: [], clients: [], documents: [], invoices: [] });
  const [loading, setLoading] = useState(true);
  const [confirmPerm, setConfirmPerm] = useState<{ entity: string; id: number } | null>(null);
  const { user } = useAuth();

  async function load() { setLoading(true); const r = await authFetch(`${BASE}/api/trash`); if (r.ok) setData(await r.json()); setLoading(false); }
  useEffect(() => { load(); }, []);

  async function restore(entity: string, id: number) {
    await authFetch(`${BASE}/api/trash/restore/${entity}/${id}`, { method: "PATCH" });
    await load();
  }

  async function permanent(entity: string, id: number) {
    await authFetch(`${BASE}/api/trash/permanent/${entity}/${id}`, { method: "DELETE" });
    setConfirmPerm(null);
    await load();
  }

  const total = data.cases.length + data.clients.length + data.documents.length + data.invoices.length;
  const isAdmin = user?.role === "admin";

  function Section({ title, icon: Icon, items, entity }: { title: string; icon: React.ElementType; items: Array<{ id: number; label: string; deletedAt: string }>; entity: string }) {
    if (items.length === 0) return null;
    return (
      <div className="space-y-2">
        <p className="text-sm font-semibold text-muted-foreground flex items-center gap-2"><Icon className="h-4 w-4" />{title}</p>
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.id} className="flex items-center justify-between p-3 bg-card rounded-xl border border-border">
              <div>
                <p className="font-medium text-sm" dir="ltr">{item.label}</p>
                <p className="text-xs text-muted-foreground"><DateDisplay date={item.deletedAt} format="datetime" /></p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => restore(entity, item.id)} className="gap-1.5 text-xs h-8">
                  <RotateCcw className="h-3 w-3" /> استرجاع
                </Button>
                {isAdmin && (
                  <Button size="sm" variant="destructive" onClick={() => setConfirmPerm({ entity, id: item.id })} className="gap-1.5 text-xs h-8">
                    <Trash2 className="h-3 w-3" /> حذف نهائي
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-destructive/10 rounded-xl"><Trash2 className="h-6 w-6 text-destructive" /></div>
        <div><h1 className="text-2xl font-bold">سلة المحذوفات</h1><p className="text-muted-foreground text-sm">{total} عنصر محذوف</p></div>
      </div>

      {!isAdmin && (
        <div className="flex items-center gap-3 p-4 bg-orange-500/10 text-orange-400 rounded-xl border border-orange-500/20 text-sm">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p>الحذف النهائي متاح للمدير فقط. يمكنك استرجاع العناصر المحذوفة.</p>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : total === 0 ? (
        <EmptyState
          illustration={<Trash2 className="h-20 w-20 text-muted-foreground/30" />}
          title="سلة المحذوفات فارغة"
          description="لا توجد عناصر محذوفة — العناصر المحذوفة تُحفظ هنا لمدة 30 يوماً قبل الحذف التلقائي"
        />
      ) : (
        <div className="space-y-6">
          <Section title="القضايا" icon={Briefcase} entity="cases"
            items={data.cases.map(c => ({ id: c.id, label: c.title, deletedAt: c.deletedAt }))} />
          <Section title="الموكّلون" icon={Users} entity="clients"
            items={data.clients.map(c => ({ id: c.id, label: c.name, deletedAt: c.deletedAt }))} />
          <Section title="الوثائق" icon={FileText} entity="documents"
            items={data.documents.map(d => ({ id: d.id, label: d.name, deletedAt: d.deletedAt }))} />
          <Section title="الفواتير" icon={CreditCard} entity="invoices"
            items={data.invoices.map(i => ({ id: i.id, label: formatCurrency(Number(i.amount)), deletedAt: i.deletedAt }))} />
        </div>
      )}
      <ConfirmDestructive
        open={confirmPerm !== null}
        onClose={() => setConfirmPerm(null)}
        onConfirm={() => permanent(confirmPerm!.entity, confirmPerm!.id)}
        title="حذف نهائي لا رجعة فيه"
        description="سيتم حذف هذا العنصر إلى الأبد. هذا الإجراء لا يمكن التراجع عنه."
        confirmLabel="حذف نهائياً"
      />
    </div>
  );
}

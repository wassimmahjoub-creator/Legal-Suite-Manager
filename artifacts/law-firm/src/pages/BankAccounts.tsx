import { SelectNative } from "@/components/SelectNative";
import { useState, useEffect } from "react";
import { authFetch } from "@/lib/authFetch";
import { Card, CardContent } from "@/components/ui/card";
import { Money } from "@/components/Money";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { EmptyInvoicesIllustration } from "@/components/illustrations/EmptyInvoices";
import { Input } from "@/components/ui/input";
import { Modal, FormField } from "@/components/Modal";
import { Landmark, Plus, Pencil, Trash2, CreditCard } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
interface BankAccount { id: number; name: string; accountNumber: string | null; bankName: string | null; balance: string | null; currency: string | null; notes: string | null; }
const EMPTY = { name: "", accountNumber: "", bankName: "", balance: "0", currency: "TND", notes: "" };
const inputCls = "h-10 bg-muted/50 border-border focus-visible:ring-1 focus-visible:ring-primary rounded-lg w-full";

export default function BankAccounts() {
  const [data, setData] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<BankAccount | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  async function load() { setLoading(true); const r = await authFetch(`${BASE}/api/bank-accounts`); if (r.ok) setData(await r.json()); setLoading(false); }
  useEffect(() => { load(); }, []);

  function openNew() { setEditing(null); setForm(EMPTY); setModal(true); }
  function openEdit(a: BankAccount) { setEditing(a); setForm({ name: a.name, accountNumber: a.accountNumber ?? "", bankName: a.bankName ?? "", balance: a.balance ?? "0", currency: a.currency ?? "TND", notes: a.notes ?? "" }); setModal(true); }

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    const url = editing ? `${BASE}/api/bank-accounts/${editing.id}` : `${BASE}/api/bank-accounts`;
    await authFetch(url, { method: editing ? "PUT" : "POST", body: JSON.stringify(form) });
    await load(); setSaving(false); setModal(false);
  }

  async function remove(id: number) {
    if (!confirm("حذف الحساب البنكي؟")) return;
    await authFetch(`${BASE}/api/bank-accounts/${id}`, { method: "DELETE" }); await load();
  }

  const totalTND = data.filter(a => a.currency === "TND").reduce((s, a) => s + Number(a.balance ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 rounded-xl"><Landmark className="h-6 w-6 text-emerald-400" /></div>
          <div>
            <h1 className="text-2xl font-bold">الحسابات البنكية</h1>
            <p className="text-muted-foreground text-sm">إجمالي TND: <Money amount={totalTND} className="text-primary font-bold" /></p>
          </div>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> حساب جديد</Button>
      </div>
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1,2].map(i => <Skeleton key={i} className="h-36 rounded-2xl" />)}</div>
      ) : data.length === 0 ? (
        <div className="bg-card rounded-xl shadow-sm">
          <EmptyState
            illustration={<EmptyInvoicesIllustration />}
            title="لا توجد حسابات بنكية بعد"
            description="أضف حساباتك وتتبع أرصدتها — ستظهر هنا فور إضافتها بالضغط على الزر أعلاه"
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map(a => (
            <Card key={a.id} className="border-none shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-bold">{a.name}</p>
                    {a.bankName && <p className="text-xs text-muted-foreground mt-0.5">{a.bankName}</p>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(a)} className="p-1.5 hover:bg-muted rounded-lg"><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></button>
                    <button onClick={() => remove(a.id)} className="p-1.5 hover:bg-destructive/10 rounded-lg"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  {a.accountNumber && <p className="text-xs text-muted-foreground flex items-center gap-1"><CreditCard className="h-3 w-3" />{a.accountNumber}</p>}
                  <p className="text-xl font-bold text-primary" dir="ltr"><Money amount={Number(a.balance)} /></p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "تعديل الحساب" : "حساب بنكي جديد"}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="اسم الحساب *" htmlFor="ba-name"><Input id="ba-name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className={inputCls} /></FormField>
            <FormField label="البنك" htmlFor="ba-bank"><Input id="ba-bank" value={form.bankName} onChange={e => setForm({...form, bankName: e.target.value})} className={inputCls} /></FormField>
          </div>
          <FormField label="رقم الحساب" htmlFor="ba-num"><Input id="ba-num" value={form.accountNumber} onChange={e => setForm({...form, accountNumber: e.target.value})} className={inputCls} dir="ltr" /></FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="الرصيد" htmlFor="ba-bal"><Input id="ba-bal" type="number" value={form.balance} onChange={e => setForm({...form, balance: e.target.value})} className={inputCls} dir="ltr" /></FormField>
            <FormField label="العملة" htmlFor="ba-cur">
              <SelectNative id="ba-cur" value={form.currency} onChange={e => setForm({...form, currency: e.target.value})} className={inputCls + " px-3 cursor-pointer"}>
                <option value="TND">TND — دينار تونسي</option>
                <option value="EUR">EUR — يورو</option>
                <option value="USD">USD — دولار</option>
              </SelectNative>
            </FormField>
          </div>
          <div className="flex gap-3 pt-1">
            <Button className="flex-1" onClick={save} disabled={saving || !form.name.trim()}>{saving ? "جارٍ الحفظ..." : "حفظ"}</Button>
            <Button variant="outline" onClick={() => setModal(false)} className="px-5">إلغاء</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

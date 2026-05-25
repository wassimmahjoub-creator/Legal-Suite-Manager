import { useState, useEffect } from "react";
import { authFetch } from "@/lib/authFetch";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal, FormField } from "@/components/Modal";
import { Plus, Pencil, Trash2, Phone, Mail, User, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
interface InsuranceCo { id: number; name: string; phone: string | null; email: string | null; address: string | null; contactPerson: string | null; notes: string | null; }
const EMPTY = { name: "", phone: "", email: "", address: "", contactPerson: "", notes: "" };
const inputCls = "h-10 bg-muted/50 border-border focus-visible:ring-1 focus-visible:ring-primary rounded-lg w-full";

export default function InsuranceCompanies() {
  const [data, setData] = useState<InsuranceCo[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<InsuranceCo | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  async function load() { setLoading(true); const r = await authFetch(`${BASE}/api/insurance-companies`); if (r.ok) setData(await r.json()); setLoading(false); }
  useEffect(() => { load(); }, []);

  function openNew() { setEditing(null); setForm(EMPTY); setModal(true); }
  function openEdit(c: InsuranceCo) { setEditing(c); setForm({ name: c.name, phone: c.phone ?? "", email: c.email ?? "", address: c.address ?? "", contactPerson: c.contactPerson ?? "", notes: c.notes ?? "" }); setModal(true); }

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    const url = editing ? `${BASE}/api/insurance-companies/${editing.id}` : `${BASE}/api/insurance-companies`;
    await authFetch(url, { method: editing ? "PUT" : "POST", body: JSON.stringify(form) });
    await load(); setSaving(false); setModal(false);
  }

  async function remove(id: number) {
    if (!confirm("حذف شركة التأمين؟")) return;
    await authFetch(`${BASE}/api/insurance-companies/${id}`, { method: "DELETE" }); await load();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="شركات التأمين"
        subtitle="دليل شركات التأمين"
        actions={<Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> شركة جديدة</Button>}
      />
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
      ) : data.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground"><ShieldCheck className="h-12 w-12 mx-auto mb-3 opacity-20" /><p>لا توجد شركات تأمين</p></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map(c => (
            <Card key={c.id} className="border-none shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-base">{c.name}</p>
                    {c.contactPerson && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><User className="h-3 w-3" />{c.contactPerson}</p>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(c)} className="p-1.5 hover:bg-muted rounded-lg"><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></button>
                    <button onClick={() => remove(c.id)} className="p-1.5 hover:bg-destructive/10 rounded-lg"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                  </div>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  {c.phone && <p className="flex items-center gap-2"><Phone className="h-3 w-3" />{c.phone}</p>}
                  {c.email && <p className="flex items-center gap-2"><Mail className="h-3 w-3" />{c.email}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "تعديل الشركة" : "شركة تأمين جديدة"}>
        <div className="space-y-4">
          <FormField label="اسم الشركة *" htmlFor="ic-name"><Input id="ic-name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className={inputCls} /></FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="الهاتف" htmlFor="ic-phone"><Input id="ic-phone" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className={inputCls} dir="ltr" /></FormField>
            <FormField label="البريد الإلكتروني" htmlFor="ic-email"><Input id="ic-email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className={inputCls} dir="ltr" /></FormField>
          </div>
          <FormField label="المسؤول" htmlFor="ic-contact"><Input id="ic-contact" value={form.contactPerson} onChange={e => setForm({...form, contactPerson: e.target.value})} className={inputCls} /></FormField>
          <FormField label="العنوان" htmlFor="ic-addr"><Input id="ic-addr" value={form.address} onChange={e => setForm({...form, address: e.target.value})} className={inputCls} /></FormField>
          <div className="flex gap-3 pt-1">
            <Button className="flex-1" onClick={save} disabled={saving || !form.name.trim()}>{saving ? "جارٍ الحفظ..." : "حفظ"}</Button>
            <Button variant="outline" onClick={() => setModal(false)} className="px-5">إلغاء</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

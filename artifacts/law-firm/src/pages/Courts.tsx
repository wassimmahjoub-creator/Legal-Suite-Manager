import { useState, useEffect } from "react";
import { authFetch } from "@/lib/authFetch";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal, FormField } from "@/components/Modal";
import { Building2, Plus, Pencil, Trash2, MapPin, Layers } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
interface Court { id: number; name: string; division: string | null; city: string | null; address: string | null; notes: string | null; }
const EMPTY = { name: "", division: "", city: "", address: "", notes: "" };
const inputCls = "h-10 bg-muted/50 border-border focus-visible:ring-1 focus-visible:ring-primary rounded-lg w-full";

export default function Courts() {
  const [data, setData] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Court | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  async function load() { setLoading(true); const r = await authFetch(`${BASE}/api/courts`); if (r.ok) setData(await r.json()); setLoading(false); }
  useEffect(() => { load(); }, []);

  function openNew() { setEditing(null); setForm(EMPTY); setModal(true); }
  function openEdit(c: Court) { setEditing(c); setForm({ name: c.name, division: c.division ?? "", city: c.city ?? "", address: c.address ?? "", notes: c.notes ?? "" }); setModal(true); }

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    const url = editing ? `${BASE}/api/courts/${editing.id}` : `${BASE}/api/courts`;
    await authFetch(url, { method: editing ? "PUT" : "POST", body: JSON.stringify(form) });
    await load(); setSaving(false); setModal(false);
  }

  async function remove(id: number) {
    if (!confirm("حذف المحكمة؟")) return;
    await authFetch(`${BASE}/api/courts/${id}`, { method: "DELETE" }); await load();
  }

  const filtered = data.filter(c => c.name.includes(search) || (c.city ?? "").includes(search) || (c.division ?? "").includes(search));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 rounded-xl"><Building2 className="h-6 w-6 text-indigo-400" /></div>
          <div><h1 className="text-2xl font-bold">المحاكم</h1><p className="text-muted-foreground text-sm">قاعدة بيانات المحاكم والدوائر</p></div>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> محكمة جديدة</Button>
      </div>
      <Input placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} className="h-10 bg-muted/50 border-border rounded-lg max-w-sm" />
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground"><Building2 className="h-12 w-12 mx-auto mb-3 opacity-20" /><p>لا توجد محاكم</p></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(c => (
            <Card key={c.id} className="border-none shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center"><Building2 className="h-5 w-5" /></div>
                    <div><p className="font-bold">{c.name}</p>{c.division && <p className="text-xs text-muted-foreground flex items-center gap-1"><Layers className="h-3 w-3" />{c.division}</p>}</div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(c)} className="p-1.5 hover:bg-muted rounded-lg"><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></button>
                    <button onClick={() => remove(c.id)} className="p-1.5 hover:bg-destructive/10 rounded-lg"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                  </div>
                </div>
                {(c.city || c.address) && <div className="text-xs text-muted-foreground space-y-1">{c.city && <p className="flex items-center gap-2"><MapPin className="h-3 w-3" />{c.city}</p>}{c.address && <p className="flex items-center gap-2"><MapPin className="h-3 w-3 opacity-0" />{c.address}</p>}</div>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "تعديل المحكمة" : "محكمة جديدة"}>
        <div className="space-y-4">
          <FormField label="اسم المحكمة *" htmlFor="ct-name"><Input id="ct-name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className={inputCls} placeholder="مثال: المحكمة الابتدائية بتونس" /></FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="الدائرة" htmlFor="ct-div"><Input id="ct-div" value={form.division} onChange={e => setForm({...form, division: e.target.value})} className={inputCls} placeholder="الدائرة الأولى" /></FormField>
            <FormField label="المدينة" htmlFor="ct-city"><Input id="ct-city" value={form.city} onChange={e => setForm({...form, city: e.target.value})} className={inputCls} /></FormField>
          </div>
          <FormField label="العنوان" htmlFor="ct-addr"><Input id="ct-addr" value={form.address} onChange={e => setForm({...form, address: e.target.value})} className={inputCls} /></FormField>
          <FormField label="ملاحظات" htmlFor="ct-notes"><textarea id="ct-notes" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className={inputCls + " px-3 py-2 resize-none min-h-[70px]"} /></FormField>
          <div className="flex gap-3 pt-1">
            <Button className="flex-1" onClick={save} disabled={saving || !form.name.trim()}>{saving ? "جارٍ الحفظ..." : "حفظ"}</Button>
            <Button variant="outline" onClick={() => setModal(false)} className="px-5">إلغاء</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

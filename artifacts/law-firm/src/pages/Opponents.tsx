import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { authFetch } from "@/lib/authFetch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal, FormField } from "@/components/Modal";
import { Shield, Plus, Pencil, Trash2, Phone, MapPin, Briefcase, User } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { EmptyClientsIllustration } from "@/components/illustrations/EmptyClients";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonTable } from "@/components/ui/skeletons";
import { SmartTextarea } from "@/components/SmartTextarea";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

interface Opponent {
  id: number; name: string; lawyerName: string | null; phone: string | null;
  address: string | null; notes: string | null; caseId: number | null; caseName: string | null;
}

const EMPTY = { name: "", lawyerName: "", phone: "", address: "", notes: "", caseId: "" };

export default function Opponents() {
  const [, navigate] = useLocation();
  const [data, setData] = useState<Opponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Opponent | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    const r = await authFetch(`${BASE}/api/opponents`);
    if (r.ok) setData(await r.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openNew() { setEditing(null); setForm(EMPTY); setModal(true); }
  function openEdit(o: Opponent) {
    setEditing(o);
    setForm({ name: o.name, lawyerName: o.lawyerName ?? "", phone: o.phone ?? "", address: o.address ?? "", notes: o.notes ?? "", caseId: o.caseId?.toString() ?? "" });
    setModal(true);
  }

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    const url = editing ? `${BASE}/api/opponents/${editing.id}` : `${BASE}/api/opponents`;
    await authFetch(url, { method: editing ? "PUT" : "POST", body: JSON.stringify(form) });
    await load();
    setSaving(false);
    setModal(false);
  }

  async function remove(id: number) {
    if (!confirm("حذف الخصم؟")) return;
    await authFetch(`${BASE}/api/opponents/${id}`, { method: "DELETE" });
    await load();
  }

  const filtered = data.filter(o =>
    o.name.includes(search) || (o.lawyerName ?? "").includes(search) || (o.caseName ?? "").includes(search)
  );

  const inputCls = "h-10 bg-muted/50 border-border focus-visible:ring-1 focus-visible:ring-primary rounded-lg w-full";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-destructive/10 rounded-xl"><Shield className="h-6 w-6 text-destructive" /></div>
          <div>
            <h1 className="text-2xl font-bold">الخصوم</h1>
            <p className="text-muted-foreground text-sm">الأطراف المعارضة في القضايا</p>
          </div>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> خصم جديد</Button>
      </div>

      <Input placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)}
        className="h-10 bg-muted/50 border-border rounded-lg max-w-sm" />

      {loading ? (
        <SkeletonTable rows={6} cols={4} />
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-xl shadow-sm">
          <EmptyState
            illustration={<EmptyClientsIllustration />}
            title="لا خصوم مسجلين"
            description="سيظهر الخصوم تلقائيًا عند إنشاء القضايا، أو يمكنك إضافتهم يدويًا"
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(o => (
            <Card key={o.id} className="border-none shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center font-bold">
                      {o.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold">{o.name}</p>
                      {o.lawyerName && <p className="text-xs text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" />{o.lawyerName}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(o)} className="p-1.5 hover:bg-muted rounded-lg transition-colors"><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></button>
                    <button onClick={() => remove(o.id)} className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  {o.phone && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 shrink-0" />{o.phone}</p>}
                  {o.address && <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 shrink-0" />{o.address}</p>}
                  {o.caseName && (
                    <p className="flex items-center gap-2 cursor-pointer text-primary hover:underline" onClick={() => navigate(`/cases/${o.caseId}`)}>
                      <Briefcase className="h-3.5 w-3.5 shrink-0" />{o.caseName}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "تعديل الخصم" : "خصم جديد"}>
        <div className="space-y-4">
          <FormField label="الاسم *" htmlFor="op-name">
            <Input id="op-name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="اسم الخصم" className={inputCls} />
          </FormField>
          <FormField label="محامي الخصم" htmlFor="op-lawyer">
            <Input id="op-lawyer" value={form.lawyerName} onChange={e => setForm({...form, lawyerName: e.target.value})} placeholder="اسم المحامي" className={inputCls} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="الهاتف" htmlFor="op-phone">
              <Input id="op-phone" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="2X XXX XXX" className={inputCls} dir="ltr" />
            </FormField>
            <FormField label="رقم القضية" htmlFor="op-case">
              <Input id="op-case" value={form.caseId} onChange={e => setForm({...form, caseId: e.target.value})} placeholder="ID القضية" className={inputCls} dir="ltr" type="number" />
            </FormField>
          </div>
          <FormField label="العنوان" htmlFor="op-address">
            <Input id="op-address" value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="العنوان" className={inputCls} />
          </FormField>
          <FormField label="ملاحظات" htmlFor="op-notes">
            <SmartTextarea id="op-notes" value={form.notes} onChange={v => setForm({...form, notes: v})} rows={3} aiContext="ملاحظات خصم" placeholder="ملاحظات حول الخصم..." />
          </FormField>
          <div className="flex gap-3 pt-1">
            <Button className="flex-1" onClick={save} disabled={saving || !form.name.trim()}>{saving ? "جارٍ الحفظ..." : "حفظ"}</Button>
            <Button variant="outline" onClick={() => setModal(false)} className="px-5">إلغاء</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

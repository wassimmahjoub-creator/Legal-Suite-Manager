import { useState, useEffect } from "react";
import { authFetch } from "@/lib/authFetch";
import { formatDateTN } from "@/lib/date";
import { Money } from "@/components/Money";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal, FormField } from "@/components/Modal";
import { SmartTextarea } from "@/components/SmartTextarea";
import { MicButton } from "@/components/MicButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { MessageSquare, Plus, Pencil, Trash2, User, Calendar, CheckCircle2, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonTable } from "@/components/ui/skeletons";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

interface Consultation {
  id: number; clientId: number | null; clientName: string | null;
  subject: string; date: string; amount: string | null; status: string; notes: string | null;
}

const EMPTY = { clientId: "", subject: "", date: new Date().toISOString().slice(0,10), amount: "", status: "pending", notes: "" };

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending:   { label: "بانتظار", color: "text-orange-400 bg-orange-500/10", icon: Clock },
  done:      { label: "مكتملة",  color: "text-green-400 bg-green-500/10",  icon: CheckCircle2 },
  cancelled: { label: "ملغاة",   color: "text-red-400 bg-red-500/10",      icon: Trash2 },
};

export default function Consultations() {
  const [data, setData] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Consultation | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    const r = await authFetch(`${BASE}/api/consultations`);
    if (r.ok) setData(await r.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openNew() { setEditing(null); setForm(EMPTY); setModal(true); }
  function openEdit(c: Consultation) {
    setEditing(c);
    setForm({ clientId: c.clientId?.toString() ?? "", subject: c.subject, date: c.date, amount: c.amount ?? "", status: c.status, notes: c.notes ?? "" });
    setModal(true);
  }

  async function save() {
    if (!form.subject || !form.date) return;
    setSaving(true);
    const url = editing ? `${BASE}/api/consultations/${editing.id}` : `${BASE}/api/consultations`;
    await authFetch(url, { method: editing ? "PUT" : "POST", body: JSON.stringify(form) });
    await load(); setSaving(false); setModal(false);
  }

  async function remove(id: number) {
    if (!confirm("حذف الاستشارة؟")) return;
    await authFetch(`${BASE}/api/consultations/${id}`, { method: "DELETE" });
    await load();
  }

  const filtered = data.filter(c => c.subject.includes(search) || (c.clientName ?? "").includes(search));
  const inputCls = "h-10 bg-muted/50 border-border focus-visible:ring-1 focus-visible:ring-primary rounded-lg w-full";

  const totalRevenue = data.filter(c => c.status === "done").reduce((s, c) => s + Number(c.amount ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 rounded-xl"><MessageSquare className="h-6 w-6 text-blue-400" /></div>
          <div>
            <h1 className="text-2xl font-bold">الاستشارات</h1>
            <p className="text-muted-foreground text-sm">استشارات قانونية • مداخيل: <Money amount={totalRevenue} className="text-primary font-bold" /></p>
          </div>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> استشارة جديدة</Button>
      </div>

      <Input placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)}
        className="h-10 bg-muted/50 border-border rounded-lg max-w-sm" />

      {loading ? (
        <SkeletonTable rows={5} cols={4} />
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-xl shadow-sm">
          <EmptyState
            title="لا توجد استشارات بعد"
            description="سجّل استشاراتك القانونية ومداخيلها — ستظهر هنا فور إضافتها بالضغط على «+ استشارة جديدة» أعلاه"
          />
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => {
            const st = STATUS_MAP[c.status] ?? STATUS_MAP.pending;
            const Icon = st.icon;
            return (
              <Card key={c.id} className="border-none shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`p-2.5 rounded-xl shrink-0 ${st.color.split(" ")[1]}`}>
                    <Icon className={`h-5 w-5 ${st.color.split(" ")[0]}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{c.subject}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                      {c.clientName && <span className="flex items-center gap-1"><User className="h-3 w-3" />{c.clientName}</span>}
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDateTN(c.date)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {c.amount && <Money amount={Number(c.amount)} className="font-bold text-primary text-sm" />}
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${st.color}`}>{st.label}</span>
                    <button onClick={() => openEdit(c)} className="p-1.5 hover:bg-muted rounded-lg transition-colors"><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></button>
                    <button onClick={() => remove(c.id)} className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "تعديل الاستشارة" : "استشارة جديدة"}>
        <div className="space-y-4">
          <FormField label="الموضوع *" htmlFor="cs-subject">
            <div className="flex gap-2">
              <Input id="cs-subject" value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} placeholder="موضوع الاستشارة" className={inputCls + " flex-1"} />
              <MicButton onResult={t => setForm(f => ({ ...f, subject: f.subject ? f.subject + " " + t : t }))} />
            </div>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="التاريخ *" htmlFor="cs-date">
              <Input id="cs-date" type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className={inputCls} dir="ltr" />
            </FormField>
            <FormField label="المبلغ (د.ت)" htmlFor="cs-amount">
              <Input id="cs-amount" type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} placeholder="0.000" className={inputCls} dir="ltr" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="رقم الحريف" htmlFor="cs-client">
              <Input id="cs-client" type="number" value={form.clientId} onChange={e => setForm({...form, clientId: e.target.value})} placeholder="ID الحريف" className={inputCls} dir="ltr" />
            </FormField>
            <FormField label="الحالة" htmlFor="cs-status">
              <select id="cs-status" value={form.status} onChange={e => setForm({...form, status: e.target.value})} className={inputCls + " px-3 cursor-pointer"}>
                <option value="pending">بانتظار</option>
                <option value="done">مكتملة</option>
                <option value="cancelled">ملغاة</option>
              </select>
            </FormField>
          </div>
          <FormField label="ملاحظات" htmlFor="cs-notes">
            <SmartTextarea id="cs-notes" rows={3} placeholder="ملاحظات..."
              aiContext="ملاحظات استشارة قانونية"
              value={form.notes} onChange={v => setForm(f => ({ ...f, notes: v }))} />
          </FormField>
          <div className="flex gap-3 pt-1">
            <Button className="flex-1" onClick={save} disabled={saving || !form.subject || !form.date}>{saving ? "جارٍ الحفظ..." : "حفظ"}</Button>
            <Button variant="outline" onClick={() => setModal(false)} className="px-5">إلغاء</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

import { useState, useEffect } from "react";
import { authFetch } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal, FormField } from "@/components/Modal";
import { PhoneCall, Plus, Pencil, Trash2, Mail, MessageCircle, Users, Video, Phone } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
interface Comm { id: number; caseId: number | null; clientId: number | null; caseName: string | null; clientName: string | null; type: string; date: string; summary: string; createdBy: string | null; }
const EMPTY = { caseId: "", clientId: "", type: "call", date: new Date().toISOString().slice(0,10), summary: "", createdBy: "" };
const inputCls = "h-10 bg-muted/50 border-border focus-visible:ring-1 focus-visible:ring-primary rounded-lg w-full";

const TYPE_MAP: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  call: { label: "مكالمة هاتفية", icon: Phone, color: "bg-green-500/10 text-green-400" },
  meeting: { label: "اجتماع", icon: Users, color: "bg-blue-500/10 text-blue-400" },
  email: { label: "بريد إلكتروني", icon: Mail, color: "bg-orange-500/10 text-orange-400" },
  sms: { label: "رسالة SMS", icon: MessageCircle, color: "bg-purple-500/10 text-purple-400" },
  whatsapp: { label: "واتساب", icon: MessageCircle, color: "bg-green-600/10 text-green-500" },
  video: { label: "مكالمة مرئية", icon: Video, color: "bg-indigo-500/10 text-indigo-400" },
};

export default function Communications() {
  const [data, setData] = useState<Comm[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Comm | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  async function load() { setLoading(true); const r = await authFetch(`${BASE}/api/communications`); if (r.ok) setData(await r.json()); setLoading(false); }
  useEffect(() => { load(); }, []);

  function openNew() { setEditing(null); setForm(EMPTY); setModal(true); }
  function openEdit(c: Comm) { setEditing(c); setForm({ caseId: c.caseId?.toString() ?? "", clientId: c.clientId?.toString() ?? "", type: c.type, date: c.date, summary: c.summary, createdBy: c.createdBy ?? "" }); setModal(true); }

  async function save() {
    if (!form.summary || !form.date) return;
    setSaving(true);
    const url = editing ? `${BASE}/api/communications/${editing.id}` : `${BASE}/api/communications`;
    await authFetch(url, { method: editing ? "PUT" : "POST", body: JSON.stringify(form) });
    await load(); setSaving(false); setModal(false);
  }

  async function remove(id: number) {
    if (!confirm("حذف السجل؟")) return;
    await authFetch(`${BASE}/api/communications/${id}`, { method: "DELETE" }); await load();
  }

  const filtered = data.filter(c =>
    (typeFilter === "all" || c.type === typeFilter) &&
    (c.summary.includes(search) || (c.clientName ?? "").includes(search) || (c.caseName ?? "").includes(search))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-green-500/10 rounded-xl"><PhoneCall className="h-6 w-6 text-green-400" /></div>
          <div><h1 className="text-2xl font-bold">سجل الاتصالات</h1><p className="text-muted-foreground text-sm">{data.length} اتصال مسجل</p></div>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> اتصال جديد</Button>
      </div>
      <div className="flex gap-3 flex-wrap items-center">
        <Input placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} className="h-10 bg-muted/50 border-border rounded-lg w-48" />
        <div className="flex gap-2 flex-wrap">
          {["all", ...Object.keys(TYPE_MAP)].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${typeFilter === t ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`}>
              {t === "all" ? "الكل" : TYPE_MAP[t]?.label}
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground"><PhoneCall className="h-12 w-12 mx-auto mb-3 opacity-20" /><p>لا توجد اتصالات</p></div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => {
            const t = TYPE_MAP[c.type] ?? TYPE_MAP.call;
            const Icon = t.icon;
            return (
              <Card key={c.id} className="border-none shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`p-2.5 rounded-xl shrink-0 ${t.color.split(" ")[0]}`}><Icon className={`h-5 w-5 ${t.color.split(" ")[1]}`} /></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{c.summary}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                      <span>{t.label}</span>
                      <span>{new Date(c.date).toLocaleDateString("ar-TN")}</span>
                      {c.clientName && <span>• {c.clientName}</span>}
                      {c.caseName && <span>• {c.caseName}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(c)} className="p-1.5 hover:bg-muted rounded-lg"><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></button>
                    <button onClick={() => remove(c.id)} className="p-1.5 hover:bg-destructive/10 rounded-lg"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "تعديل الاتصال" : "اتصال جديد"}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="النوع" htmlFor="cm-type">
              <select id="cm-type" value={form.type} onChange={e => setForm({...form, type: e.target.value})} className={inputCls + " px-3 cursor-pointer"}>
                {Object.entries(TYPE_MAP).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </FormField>
            <FormField label="التاريخ *" htmlFor="cm-date"><Input id="cm-date" type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className={inputCls} dir="ltr" /></FormField>
          </div>
          <FormField label="الملخص *" htmlFor="cm-summary"><textarea id="cm-summary" value={form.summary} onChange={e => setForm({...form, summary: e.target.value})} className={inputCls + " px-3 py-2 resize-none min-h-[80px]"} placeholder="ملخص الاتصال أو الاجتماع..." /></FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="رقم القضية" htmlFor="cm-case"><Input id="cm-case" type="number" value={form.caseId} onChange={e => setForm({...form, caseId: e.target.value})} className={inputCls} dir="ltr" placeholder="ID" /></FormField>
            <FormField label="رقم الحريف" htmlFor="cm-client"><Input id="cm-client" type="number" value={form.clientId} onChange={e => setForm({...form, clientId: e.target.value})} className={inputCls} dir="ltr" placeholder="ID" /></FormField>
          </div>
          <div className="flex gap-3 pt-1">
            <Button className="flex-1" onClick={save} disabled={saving || !form.summary || !form.date}>{saving ? "جاري الحفظ..." : "حفظ"}</Button>
            <Button variant="outline" onClick={() => setModal(false)} className="px-5">إلغاء</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

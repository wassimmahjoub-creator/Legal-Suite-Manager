import { SelectNative } from "@/components/SelectNative";
import { useState, useEffect, useRef } from "react";
import { authFetch } from "@/lib/authFetch";
import { formatDateTN } from "@/lib/date";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal, FormField } from "@/components/Modal";
import { SmartTextarea } from "@/components/SmartTextarea";
import { EmptyState } from "@/components/ui/EmptyState";
import { PhoneCall, Plus, Pencil, Trash2, Mail, MessageCircle, Users, Video, Phone, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonTable } from "@/components/ui/skeletons";
import { ConfirmDestructive } from "@/components/ui/ConfirmDestructive";
import { cn } from "@/lib/utils";

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

interface CaseOption { id: number; caseNumber: string | null; title: string; clientId: number | null; }

function CaseCombobox({ cases, value, onChange }: {
  cases: CaseOption[];
  value: string;
  onChange: (caseId: string, clientId: string) => void;
}) {
  const selected = cases.find(c => String(c.id) === value) ?? null;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const filtered = cases.filter(c => {
    const q = query.toLowerCase();
    return !q || (c.caseNumber ?? "").toLowerCase().includes(q) || c.title.toLowerCase().includes(q);
  });

  function select(c: CaseOption) {
    onChange(String(c.id), c.clientId ? String(c.clientId) : "");
    setQuery("");
    setOpen(false);
  }

  function clear() { onChange("", ""); setQuery(""); }

  const inputCls2 = "h-10 bg-muted/50 border border-border focus:outline-none focus:ring-1 focus:ring-primary rounded-lg w-full px-3 text-sm";

  return (
    <div ref={ref} className="relative">
      {selected && !open ? (
        <div className="flex items-center gap-2 h-10 bg-muted/50 border border-border rounded-lg px-3">
          <span className="flex-1 text-sm truncate">
            {selected.caseNumber ? <span className="font-mono text-primary text-xs ml-1">{selected.caseNumber}</span> : null}
            {" "}{selected.title}
          </span>
          <button type="button" onClick={clear} className="text-muted-foreground hover:text-foreground shrink-0">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <input
          className={inputCls2}
          placeholder="ابحث برقم الملف أو الاسم..."
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          dir="rtl"
        />
      )}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">لا توجد نتائج</p>
          ) : (
            filtered.map(c => (
              <button key={c.id} type="button"
                className={cn("w-full text-right px-3 py-2 text-sm hover:bg-muted/60 transition-colors flex items-center gap-2", String(c.id) === value && "bg-primary/10 text-primary")}
                onMouseDown={e => { e.preventDefault(); select(c); }}>
                {c.caseNumber && <span className="font-mono text-xs text-primary shrink-0">{c.caseNumber}</span>}
                <span className="truncate">{c.title}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function Communications() {
  const [data, setData] = useState<Comm[]>([]);
  const [cases, setCases] = useState<CaseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Comm | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [confirmId, setConfirmId] = useState<number | null>(null);

  async function load() { setLoading(true); const r = await authFetch(`${BASE}/api/communications`); if (r.ok) setData(await r.json()); setLoading(false); }
  useEffect(() => {
    load();
    authFetch(`${BASE}/api/cases`).then(r => r.ok ? r.json() : []).then(setCases);
  }, []);

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
    await authFetch(`${BASE}/api/communications/${id}`, { method: "DELETE" });
    setConfirmId(null);
    await load();
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
        <SkeletonTable rows={5} cols={5} />
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-xl shadow-sm">
          <EmptyState
            title="لا توجد اتصالات بعد"
            description="سجّل مكالماتك واجتماعاتك مع الموكّلون — ستظهر هنا فور تسجيلها بالضغط على الزر أعلاه"
          />
        </div>
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
                      <span>{formatDateTN(c.date)}</span>
                      {c.clientName && <span>• {c.clientName}</span>}
                      {c.caseName && <span>• {c.caseName}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(c)} className="p-1.5 hover:bg-muted rounded-lg"><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></button>
                    <button onClick={() => setConfirmId(c.id)} className="p-1.5 hover:bg-destructive/10 rounded-lg"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
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
              <SelectNative id="cm-type" value={form.type} onChange={e => setForm({...form, type: e.target.value})} className={inputCls + " px-3 cursor-pointer"}>
                {Object.entries(TYPE_MAP).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
              </SelectNative>
            </FormField>
            <FormField label="التاريخ *" htmlFor="cm-date"><Input id="cm-date" type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className={inputCls} dir="ltr" /></FormField>
          </div>
          <FormField label="الملخص *" htmlFor="cm-summary">
            <SmartTextarea id="cm-summary" rows={3} placeholder="ملخص الاتصال أو الاجتماع..."
              aiContext="ملخص اتصال قانوني"
              value={form.summary} onChange={v => setForm(f => ({ ...f, summary: v }))} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="رقم الملف" htmlFor="cm-case">
              <CaseCombobox
                cases={cases}
                value={form.caseId}
                onChange={(caseId, clientId) =>
                  setForm(f => ({ ...f, caseId, clientId: clientId || f.clientId }))
                }
              />
            </FormField>
            <FormField label="رقم الموكّل" htmlFor="cm-client"><Input id="cm-client" type="number" value={form.clientId} onChange={e => setForm({...form, clientId: e.target.value})} className={inputCls} dir="ltr" placeholder="ID" /></FormField>
          </div>
          <div className="flex gap-3 pt-1">
            <Button className="flex-1" onClick={save} disabled={saving || !form.summary || !form.date}>{saving ? "جارٍ الحفظ..." : "حفظ"}</Button>
            <Button variant="outline" onClick={() => setModal(false)} className="px-5">إلغاء</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDestructive
        open={confirmId !== null}
        onClose={() => setConfirmId(null)}
        onConfirm={() => remove(confirmId!)}
        title="حذف السجل؟"
        description="سيتم حذف هذا السجل نهائياً ولا يمكن التراجع عن هذا الإجراء."
        confirmLabel="حذف"
      />
    </div>
  );
}

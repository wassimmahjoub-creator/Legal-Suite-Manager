import { SelectNative } from "@/components/SelectNative";
import { useState, useEffect } from "react";
import { authFetch } from "@/lib/authFetch";
import { formatDateTN } from "@/lib/date";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/input";
import { Modal, FormField } from "@/components/Modal";
import { SmartTextarea } from "@/components/SmartTextarea";
import { MicButton } from "@/components/MicButton";
import { Mail, Plus, Pencil, Trash2, FileText, ArrowUpRight, ArrowDownLeft, Send } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

interface Correspondance {
  id: number;
  clientId: number;
  caseId: number | null;
  clientName: string | null;
  caseName: string | null;
  type: string;
  direction: string;
  date: string;
  subject: string;
  content: string | null;
  reference: string | null;
  status: string;
}

const EMPTY = {
  clientId: "", caseId: "", type: "letter", direction: "outgoing",
  date: new Date().toISOString().slice(0, 10),
  subject: "", content: "", reference: "", status: "sent",
};

const inputCls = "h-10 bg-muted/50 border-border focus-visible:ring-1 focus-visible:ring-primary rounded-lg w-full";

const TYPE_MAP: Record<string, { label: string; icon: React.ElementType }> = {
  letter:  { label: "رسالة رسمية",   icon: FileText },
  email:   { label: "بريد إلكتروني", icon: Mail },
  fax:     { label: "فاكس",          icon: Send },
  notice:  { label: "إشعار / إعلام", icon: Send },
  other:   { label: "أخرى",          icon: FileText },
};

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft:        { label: "مسودة",   color: "bg-muted text-muted-foreground" },
  sent:         { label: "مُرسلة",  color: "bg-blue-500/10 text-blue-400" },
  received:     { label: "مُستلمة", color: "bg-green-500/10 text-green-400" },
  acknowledged: { label: "مُؤكدة",  color: "bg-primary/10 text-primary" },
};

const DIR_MAP: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  outgoing: { label: "صادر", icon: ArrowUpRight,   color: "text-orange-400" },
  incoming: { label: "وارد",  icon: ArrowDownLeft, color: "text-cyan-400"   },
};

export default function Correspondances() {
  const [data, setData] = useState<Correspondance[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Correspondance | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dirFilter, setDirFilter] = useState("all");
  const [clients, setClients] = useState<Array<{ id: number; name: string }>>([]);
  const [cases, setCases] = useState<Array<{ id: number; title: string; clientId: number }>>([]);

  async function load() {
    setLoading(true);
    const r = await authFetch(`${BASE}/api/correspondances`);
    if (r.ok) setData(await r.json());
    setLoading(false);
  }

  async function loadRefs() {
    const [rc, rk] = await Promise.all([
      authFetch(`${BASE}/api/clients`),
      authFetch(`${BASE}/api/cases`),
    ]);
    if (rc.ok) setClients(await rc.json());
    if (rk.ok) setCases(await rk.json());
  }

  useEffect(() => { load(); loadRefs(); }, []);

  function openNew() {
    setEditing(null);
    setForm(EMPTY);
    setModal(true);
  }

  function openEdit(c: Correspondance) {
    setEditing(c);
    setForm({
      clientId: c.clientId.toString(),
      caseId: c.caseId?.toString() ?? "",
      type: c.type, direction: c.direction, date: c.date,
      subject: c.subject, content: c.content ?? "",
      reference: c.reference ?? "", status: c.status,
    });
    setModal(true);
  }

  async function save() {
    if (!form.clientId || !form.date || !form.subject.trim()) return;
    setSaving(true);
    const url = editing ? `${BASE}/api/correspondances/${editing.id}` : `${BASE}/api/correspondances`;
    await authFetch(url, { method: editing ? "PUT" : "POST", body: JSON.stringify(form) });
    await load();
    setSaving(false);
    setModal(false);
  }

  async function remove(id: number) {
    if (!confirm("حذف المراسلة؟")) return;
    await authFetch(`${BASE}/api/correspondances/${id}`, { method: "DELETE" });
    await load();
  }

  const clientCases = form.clientId
    ? cases.filter(c => c.clientId === Number(form.clientId))
    : cases;

  const filtered = data.filter(c =>
    (typeFilter === "all" || c.type === typeFilter) &&
    (dirFilter === "all" || c.direction === dirFilter) &&
    (
      c.subject.toLowerCase().includes(search.toLowerCase()) ||
      (c.clientName ?? "").includes(search) ||
      (c.reference ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (c.caseName ?? "").includes(search)
    )
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" /> المراسلات
          </h1>
          <p className="text-muted-foreground text-sm mt-1">المراسلات الرسمية مع الموكّلون ({filtered.length})</p>
        </div>
        <Button onClick={openNew} className="bg-primary hover:bg-primary/90 gap-2 shrink-0">
          <Plus className="h-4 w-4" /> مراسلة جديدة
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="بحث في الموضوع أو الموكّل..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="h-9 w-56 bg-muted/50 border-border rounded-lg text-sm"
        />
        <SelectNative value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="h-9 px-3 bg-muted/50 border border-border rounded-lg text-sm cursor-pointer">
          <option value="all">كل الأنواع</option>
          {Object.entries(TYPE_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </SelectNative>
        <SelectNative value={dirFilter} onChange={e => setDirFilter(e.target.value)}
          className="h-9 px-3 bg-muted/50 border border-border rounded-lg text-sm cursor-pointer">
          <option value="all">صادر وارد</option>
          <option value="outgoing">صادر</option>
          <option value="incoming">وارد</option>
        </SelectNative>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-xl shadow-sm">
          <EmptyState
            title="لا توجد مراسلات بعد"
            description="أضف رسائل، فاكسات أو إنذارات رسمية — ستظهر هنا فور إضافتها بالضغط على الزر أعلاه"
          />
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => {
            const typeInfo = TYPE_MAP[c.type] ?? TYPE_MAP.other;
            const dirInfo  = DIR_MAP[c.direction]  ?? DIR_MAP.outgoing;
            const statusInfo = STATUS_MAP[c.status] ?? STATUS_MAP.sent;
            const TypeIcon = typeInfo.icon;
            const DirIcon  = dirInfo.icon;
            return (
              <Card key={c.id} className="border-border hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <TypeIcon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <DirIcon className={`h-3.5 w-3.5 shrink-0 ${dirInfo.color}`} />
                          <span className="font-semibold truncate">{c.subject}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {typeInfo.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                          {c.clientName && <span>الموكّل: <span className="text-foreground font-medium">{c.clientName}</span></span>}
                          {c.caseName  && <span>القضية: <span className="text-foreground">{c.caseName}</span></span>}
                          {c.reference && <span>المرجع: <span className="font-mono text-primary">{c.reference}</span></span>}
                          <span>{formatDateTN(c.date)}</span>
                        </div>
                        {c.content && <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{c.content}</p>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => remove(c.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <Modal
        open={modal} onClose={() => setModal(false)}
        title={editing ? "تعديل المراسلة" : "مراسلة جديدة"}
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setModal(false)}>إلغاء</Button>
            <Button onClick={save} disabled={saving || !form.clientId || !form.subject.trim()}>
              {saving ? "جارٍ الحفظ..." : "حفظ"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <FormField label="الموكّل *" htmlFor="corr-client">
            <SelectNative id="corr-client" className={inputCls + " px-3 cursor-pointer"}
              value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value, caseId: "" }))}>
              <option value="">اختر موكّلاً...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </SelectNative>
          </FormField>

          <FormField label="القضية المرتبطة" htmlFor="corr-case">
            <SelectNative id="corr-case" className={inputCls + " px-3 cursor-pointer"}
              value={form.caseId} onChange={e => setForm(f => ({ ...f, caseId: e.target.value }))}>
              <option value="">بدون قضية (اختياري)</option>
              {clientCases.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </SelectNative>
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="نوع المراسلة" htmlFor="corr-type">
              <SelectNative id="corr-type" className={inputCls + " px-3 cursor-pointer"}
                value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {Object.entries(TYPE_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </SelectNative>
            </FormField>
            <FormField label="الاتجاه" htmlFor="corr-dir">
              <SelectNative id="corr-dir" className={inputCls + " px-3 cursor-pointer"}
                value={form.direction} onChange={e => setForm(f => ({ ...f, direction: e.target.value }))}>
                <option value="outgoing">صادر (من المكتب)</option>
                <option value="incoming">وارد (من الموكّل)</option>
              </SelectNative>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="التاريخ *" htmlFor="corr-date">
              <Input id="corr-date" type="date" className={inputCls} dir="ltr"
                value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </FormField>
            <FormField label="الحالة" htmlFor="corr-status">
              <SelectNative id="corr-status" className={inputCls + " px-3 cursor-pointer"}
                value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="draft">مسودة</option>
                <option value="sent">مُرسلة</option>
                <option value="received">مُستلمة</option>
                <option value="acknowledged">مُؤكدة</option>
              </SelectNative>
            </FormField>
          </div>

          <FormField label="الموضوع *" htmlFor="corr-subject">
            <div className="flex gap-2">
              <Input id="corr-subject" placeholder="موضوع المراسلة..." className={inputCls + " flex-1"}
                value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
              <MicButton onResult={t => setForm(f => ({ ...f, subject: f.subject ? f.subject + " " + t : t }))} />
            </div>
          </FormField>

          <FormField label="رقم المرجع / الوصل" htmlFor="corr-ref">
            <Input id="corr-ref" placeholder="مثال: مراسلة رقم 045/2026" className={inputCls} dir="ltr"
              value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} />
          </FormField>

          <FormField label="ملاحظات / محتوى" htmlFor="corr-content">
            <SmartTextarea id="corr-content" rows={4}
              placeholder="ملخص أو محتوى المراسلة..."
              aiContext="مراسلة رسمية"
              value={form.content} onChange={v => setForm(f => ({ ...f, content: v }))} />
          </FormField>
        </div>
      </Modal>
    </div>
  );
}

import { SelectNative } from "@/components/SelectNative";
import { useState, useEffect } from "react";
import { authFetch } from "@/lib/authFetch";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal, FormField } from "@/components/Modal";
import { Plus, Pencil, Trash2, Copy, Download, Wand2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { SmartTextarea } from "@/components/SmartTextarea";
import { EmptyState } from "@/components/ui/EmptyState";
import { EmptyDocumentsIllustration } from "@/components/illustrations/EmptyDocuments";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

interface Template { id: number; name: string; type: string; content: string; createdAt: string; }

const TYPES = ["عريضة", "وكالة", "عقد", "إنذار", "مراسلة", "تقرير", "محضر", "أخرى"];
const EMPTY = { name: "", type: "عريضة", content: "" };

const SAMPLE_VARS = [
  { key: "{{اسم_الموكّل}}", label: "اسم الموكّل" },
  { key: "{{رقم_القضية}}", label: "رقم القضية" },
  { key: "{{المحكمة}}", label: "المحكمة" },
  { key: "{{التاريخ}}", label: "تاريخ اليوم" },
  { key: "{{اسم_المحامي}}", label: "اسم المحامي" },
];

export default function Templates() {
  const [data, setData] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"edit" | "preview" | null>(null);
  const [editing, setEditing] = useState<Template | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState<string>("الكل");

  async function load() {
    setLoading(true);
    const r = await authFetch(`${BASE}/api/templates`);
    if (r.ok) setData(await r.json());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openNew() { setEditing(null); setForm(EMPTY); setModal("edit"); }
  function openEdit(t: Template) {
    setEditing(t); setForm({ name: t.name, type: t.type, content: t.content }); setModal("edit");
  }
  function openPreview(t: Template) { setEditing(t); setModal("preview"); }

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    const url = editing ? `${BASE}/api/templates/${editing.id}` : `${BASE}/api/templates`;
    await authFetch(url, { method: editing ? "PUT" : "POST", body: JSON.stringify(form) });
    await load(); setSaving(false); setModal(null);
  }

  async function remove(id: number) {
    if (!confirm("حذف النموذج؟")) return;
    await authFetch(`${BASE}/api/templates/${id}`, { method: "DELETE" });
    await load();
  }

  function insertVar(v: string) {
    setForm(f => ({ ...f, content: f.content + v }));
  }

  function downloadTxt(t: Template) {
    const blob = new Blob([t.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${t.name}.txt`; a.click();
    URL.revokeObjectURL(url);
  }

  function copyContent(t: Template) {
    navigator.clipboard.writeText(t.content);
  }

  const types = ["الكل", ...TYPES];
  const filtered = data.filter(t =>
    (activeType === "الكل" || t.type === activeType) &&
    (t.name.includes(search) || t.type.includes(search))
  );

  const inputCls = "h-10 bg-muted/50 border-border focus-visible:ring-1 focus-visible:ring-primary rounded-lg w-full";
  const TYPE_COLORS: Record<string, string> = {
    "عريضة": "bg-blue-500/10 text-blue-400",
    "وكالة": "bg-purple-500/10 text-purple-400",
    "عقد": "bg-primary/10 text-primary",
    "إنذار": "bg-red-500/10 text-red-400",
    "مراسلة": "bg-green-500/10 text-green-400",
    "تقرير": "bg-orange-500/10 text-orange-400",
    "محضر": "bg-yellow-500/10 text-yellow-500",
    "أخرى": "bg-muted text-muted-foreground",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="نماذج الوثائق"
        subtitle="قوالب قانونية جاهزة للاستخدام"
        actions={<Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> نموذج جديد</Button>}
      />

      <div className="flex gap-3 flex-wrap items-center">
        <Input placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)}
          className="h-10 bg-muted/50 border-border rounded-lg w-48" />
        <div className="flex gap-2 flex-wrap">
          {types.map(t => (
            <button key={t} onClick={() => setActiveType(t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeType === t ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-36 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-xl shadow-sm">
          <EmptyState
            illustration={<EmptyDocumentsIllustration />}
            title="لا توجد نماذج بعد"
            description="أنشئ قوالب عقودك ومراسلاتك — ستظهر هنا فور إنشائها بالضغط على «+ نموذج جديد» أعلاه"
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(t => (
            <Card key={t.id} className="border-none shadow-sm hover:shadow-md transition-shadow group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${TYPE_COLORS[t.type] ?? TYPE_COLORS["أخرى"]}`}>{t.type}</span>
                    <p className="font-bold mt-2">{t.name}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-4 leading-relaxed">{t.content || "النموذج فارغ"}</p>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openPreview(t)} title="معاينة" className="flex-1 p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors flex items-center justify-center gap-1 text-xs">
                    <Wand2 className="h-3.5 w-3.5" /> معاينة
                  </button>
                  <button onClick={() => copyContent(t)} title="نسخ" className="p-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors"><Copy className="h-3.5 w-3.5" /></button>
                  <button onClick={() => downloadTxt(t)} title="تحميل" className="p-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors"><Download className="h-3.5 w-3.5" /></button>
                  <button onClick={() => openEdit(t)} title="تعديل" className="p-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => remove(t.id)} title="حذف" className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Editor Modal */}
      <Modal open={modal === "edit"} onClose={() => setModal(null)} title={editing ? "تعديل النموذج" : "نموذج جديد"} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="اسم النموذج *" htmlFor="tpl-name">
              <Input id="tpl-name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="مثال: عريضة استئناف" className={inputCls} />
            </FormField>
            <FormField label="النوع" htmlFor="tpl-type">
              <SelectNative id="tpl-type" value={form.type} onChange={e => setForm({...form, type: e.target.value})} className={inputCls + " px-3 cursor-pointer"}>
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </SelectNative>
            </FormField>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">المحتوى</label>
              <div className="flex gap-1 flex-wrap justify-end">
                {SAMPLE_VARS.map(v => (
                  <button key={v.key} onClick={() => insertVar(v.key)}
                    className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors">
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
            <SmartTextarea
              value={form.content} onChange={v => setForm({...form, content: v})}
              rows={9} aiContext="نموذج قانوني"
              placeholder="اكتب محتوى النموذج هنا... استخدم {{اسم_الموكّل}} للمتغيرات"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <Button className="flex-1" onClick={save} disabled={saving || !form.name.trim()}>{saving ? "جارٍ الحفظ..." : "حفظ النموذج"}</Button>
            <Button variant="outline" onClick={() => setModal(null)} className="px-5">إلغاء</Button>
          </div>
        </div>
      </Modal>

      {/* Preview Modal */}
      <Modal open={modal === "preview"} onClose={() => setModal(null)} title={`معاينة: ${editing?.name ?? ""}`} size="lg">
        <div className="space-y-4">
          <div className="bg-muted/30 rounded-xl p-5 min-h-[200px] whitespace-pre-wrap text-sm leading-loose font-sans" dir="rtl">
            {editing?.content || "النموذج فارغ"}
          </div>
          <div className="flex gap-3">
            <Button className="flex-1 gap-2" onClick={() => editing && copyContent(editing)}><Copy className="h-4 w-4" /> نسخ</Button>
            <Button variant="outline" className="flex-1 gap-2" onClick={() => editing && downloadTxt(editing)}><Download className="h-4 w-4" /> تحميل .txt</Button>
            <Button variant="outline" onClick={() => { setModal(null); if (editing) openEdit(editing); }} className="gap-1 px-4"><Pencil className="h-4 w-4" /></Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

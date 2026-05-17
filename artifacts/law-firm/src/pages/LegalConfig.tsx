import { SelectNative } from "@/components/SelectNative";
import { useState, useEffect } from "react";
import { authFetch } from "@/lib/authFetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal, FormField } from "@/components/Modal";
import { Settings2, Plus, Pencil, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
interface ConfigItem { id: number; category: string; value: string; label: string; sortOrder: number | null; }

const CATEGORIES: Record<string, string> = {
  case_types: "أنواع القضايا",
  judgment_types: "أنواع الأحكام",
  session_types: "أنواع الجلسات",
  fee_types: "أنواع الأتعاب",
  expense_types: "أنواع المصاريف",
  procedure_types: "أنواع الإجراءات",
};

const EMPTY = { category: "case_types", value: "", label: "" };
const inputCls = "h-10 bg-muted/50 border-border focus-visible:ring-1 focus-visible:ring-primary rounded-lg w-full";

export default function LegalConfig() {
  const [data, setData] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("case_types");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<ConfigItem | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  async function load() { setLoading(true); const r = await authFetch(`${BASE}/api/legal-config`); if (r.ok) setData(await r.json()); setLoading(false); }
  useEffect(() => { load(); }, []);

  function openNew() { setEditing(null); setForm({ ...EMPTY, category: activeCategory }); setModal(true); }
  function openEdit(item: ConfigItem) { setEditing(item); setForm({ category: item.category, value: item.value, label: item.label }); setModal(true); }

  async function save() {
    if (!form.label.trim() || !form.value.trim()) return;
    setSaving(true);
    if (editing) {
      await authFetch(`${BASE}/api/legal-config/${editing.id}`, { method: "PUT", body: JSON.stringify({ label: form.label }) });
    } else {
      await authFetch(`${BASE}/api/legal-config`, { method: "POST", body: JSON.stringify(form) });
    }
    await load(); setSaving(false); setModal(false);
  }

  async function remove(id: number) {
    if (!confirm("حذف هذا العنصر؟")) return;
    await authFetch(`${BASE}/api/legal-config/${id}`, { method: "DELETE" }); await load();
  }

  const categoryItems = data.filter(d => d.category === activeCategory);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl"><Settings2 className="h-6 w-6 text-primary" /></div>
          <div><h1 className="text-2xl font-bold">الإعدادات القانونية</h1><p className="text-muted-foreground text-sm">قوائم قابلة للتخصيص</p></div>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> إضافة</Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-56 space-y-1 shrink-0">
          {Object.entries(CATEGORIES).map(([key, label]) => (
            <button key={key} onClick={() => setActiveCategory(key)}
              className={`w-full text-right px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${activeCategory === key ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}>
              {label}
              <span className="float-left text-xs opacity-60">{data.filter(d => d.category === key).length}</span>
            </button>
          ))}
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">{CATEGORIES[activeCategory]}</h2>
          </div>
          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
          ) : categoryItems.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground border border-dashed border-border rounded-2xl px-4">
              <p className="font-medium text-foreground/70 mb-1">لا توجد عناصر في هذه الفئة</p>
              <p className="text-sm mb-3">ستظهر هنا فور إضافتها بالضغط على الزر أدناه</p>
              <Button variant="outline" size="sm" onClick={openNew} className="gap-1"><Plus className="h-3.5 w-3.5" />أضف عنصراً</Button>
            </div>
          ) : (
            <div className="space-y-2">
              {categoryItems.sort((a,b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)).map(item => (
                <div key={item.id} className="flex items-center justify-between p-3.5 bg-card rounded-xl border border-border hover:border-primary/30 transition-colors group">
                  <div>
                    <p className="font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground" dir="ltr">{item.value}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(item)} className="p-1.5 hover:bg-muted rounded-lg"><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></button>
                    <button onClick={() => remove(item.id)} className="p-1.5 hover:bg-destructive/10 rounded-lg"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "تعديل العنصر" : "عنصر جديد"}>
        <div className="space-y-4">
          {!editing && (
            <FormField label="الفئة" htmlFor="lc-cat">
              <SelectNative id="lc-cat" value={form.category} onChange={e => setForm({...form, category: e.target.value})} className={inputCls + " px-3 cursor-pointer"}>
                {Object.entries(CATEGORIES).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
              </SelectNative>
            </FormField>
          )}
          {!editing && (
            <FormField label="المفتاح (value)" htmlFor="lc-val">
              <Input id="lc-val" value={form.value} onChange={e => setForm({...form, value: e.target.value})} className={inputCls} dir="ltr" placeholder="civil" />
            </FormField>
          )}
          <FormField label="التسمية العربية *" htmlFor="lc-label">
            <Input id="lc-label" value={form.label} onChange={e => setForm({...form, label: e.target.value})} className={inputCls} placeholder="مدني" />
          </FormField>
          <div className="flex gap-3 pt-1">
            <Button className="flex-1" onClick={save} disabled={saving || !form.label.trim()}>{saving ? "جارٍ الحفظ..." : "حفظ"}</Button>
            <Button variant="outline" onClick={() => setModal(false)} className="px-5">إلغاء</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

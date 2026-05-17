import { useState, useEffect, useRef } from "react";
import { authFetch } from "@/lib/authFetch";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal, FormField } from "@/components/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { EmptyDocumentsIllustration } from "@/components/illustrations/EmptyDocuments";
import {
  Building2, Plus, Pencil, Trash2, MapPin, Search,
  Filter, Upload, Download, ChevronDown, DatabaseZap,
  Phone, Globe, Layers,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonTable } from "@/components/ui/skeletons";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

type CourtType =
  | "cassation" | "appel" | "premiere_instance" | "cantonal"
  | "administratif" | "immobilier" | "prudhommes" | "autre";

interface Court {
  id: number;
  name: string;
  nameAr: string | null;
  nameFr: string | null;
  type: CourtType | null;
  governorate: string | null;
  division: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  notes: string | null;
}

const TYPE_LABELS: Record<CourtType, string> = {
  cassation: "محكمة تعقيب",
  appel: "محكمة استئناف",
  premiere_instance: "محكمة ابتدائية",
  cantonal: "محكمة كانتونية",
  administratif: "محكمة إدارية",
  immobilier: "محكمة عقارية",
  prudhommes: "مجلس العمل",
  autre: "أخرى",
};

const TYPE_COLORS: Record<CourtType, string> = {
  cassation: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  appel: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  premiere_instance: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  cantonal: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  administratif: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  immobilier: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  prudhommes: "bg-teal-500/15 text-teal-400 border-teal-500/30",
  autre: "bg-muted text-muted-foreground border-border",
};

const EMPTY_FORM = {
  nameAr: "", nameFr: "", type: "premiere_instance" as CourtType,
  governorate: "", city: "", address: "", phone: "", notes: "", division: "",
};

const inputCls = "h-10 bg-muted/50 border-border focus-visible:ring-1 focus-visible:ring-primary rounded-lg w-full";

export default function Courts() {
  const [data, setData] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Court | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [govFilter, setGovFilter] = useState("all");
  const [seeding, setSeeding] = useState(false);
  const [csvModal, setCsvModal] = useState(false);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const r = await authFetch(`${BASE}/api/courts`);
    if (r.ok) setData(await r.json());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const governorates = [...new Set(data.map(c => c.governorate).filter(Boolean))].sort();

  const filtered = data.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || (c.nameAr ?? c.name).toLowerCase().includes(q)
      || (c.nameFr ?? "").toLowerCase().includes(q)
      || (c.governorate ?? "").toLowerCase().includes(q)
      || (c.city ?? "").toLowerCase().includes(q);
    const matchType = typeFilter === "all" || c.type === typeFilter;
    const matchGov = govFilter === "all" || c.governorate === govFilter;
    return matchSearch && matchType && matchGov;
  });

  function openNew() { setEditing(null); setForm(EMPTY_FORM); setModal(true); }
  function openEdit(c: Court) {
    setEditing(c);
    setForm({
      nameAr: c.nameAr ?? c.name,
      nameFr: c.nameFr ?? "",
      type: c.type ?? "premiere_instance",
      governorate: c.governorate ?? "",
      city: c.city ?? "",
      address: c.address ?? "",
      phone: c.phone ?? "",
      notes: c.notes ?? "",
      division: c.division ?? "",
    });
    setModal(true);
  }

  async function save() {
    if (!form.nameAr.trim()) return;
    setSaving(true);
    const url = editing ? `${BASE}/api/courts/${editing.id}` : `${BASE}/api/courts`;
    await authFetch(url, {
      method: editing ? "PUT" : "POST",
      body: JSON.stringify({ ...form, name: form.nameAr }),
    });
    await load(); setSaving(false); setModal(false);
  }

  async function remove(id: number) {
    if (!confirm("حذف هذه المحكمة؟")) return;
    await authFetch(`${BASE}/api/courts/${id}`, { method: "DELETE" });
    await load();
  }

  async function runSeed() {
    if (!confirm("إضافة كل المحاكم التونسية الافتراضية (31 محكمة)؟ العملية غير قابلة للتراجع.")) return;
    setSeeding(true);
    const r = await authFetch(`${BASE}/api/courts/seed`, { method: "POST" });
    const body = await r.json();
    alert(body.message ?? "تم السيد");
    await load();
    setSeeding(false);
  }

  function handleCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter(Boolean);
      if (lines.length < 2) return;
      const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ""));
      const rows = lines.slice(1).map(line => {
        const vals = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => { obj[h] = vals[i] ?? ""; });
        return obj;
      }).filter(r => Object.values(r).some(Boolean));
      setCsvRows(rows);
      setCsvModal(true);
    };
    reader.readAsText(file, "utf-8");
    e.target.value = "";
  }

  async function importCsv() {
    setImporting(true);
    const r = await authFetch(`${BASE}/api/courts/import-csv`, {
      method: "POST",
      body: JSON.stringify(csvRows),
    });
    const body = await r.json();
    alert(`تم الاستيراد: ${body.imported} من أصل ${body.total}`);
    await load(); setImporting(false); setCsvModal(false); setCsvRows([]);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 rounded-xl">
            <Building2 className="h-6 w-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">المحاكم</h1>
            <p className="text-muted-foreground text-sm">
              {loading ? "..." : `${data.length} محكمة مسجلة`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={runSeed} disabled={seeding} className="gap-2 text-xs">
            <DatabaseZap className="h-3.5 w-3.5" />
            {seeding ? "جارٍ التهيئة..." : "تهيئة المحاكم الافتراضية"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-2 text-xs">
            <Upload className="h-3.5 w-3.5" /> استيراد CSV
          </Button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCsvFile} />
          <Button onClick={openNew} size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> محكمة جديدة
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="بحث بالاسم أو الولاية..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-10 bg-muted/50 border-border rounded-lg pr-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-10 w-48 bg-muted/50 border-border rounded-lg">
                <Filter className="h-3.5 w-3.5 ml-1 text-muted-foreground" />
                <SelectValue placeholder="نوع المحكمة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأنواع</SelectItem>
                {(Object.keys(TYPE_LABELS) as CourtType[]).map(t => (
                  <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={govFilter} onValueChange={setGovFilter}>
              <SelectTrigger className="h-10 w-44 bg-muted/50 border-border rounded-lg">
                <MapPin className="h-3.5 w-3.5 ml-1 text-muted-foreground" />
                <SelectValue placeholder="الولاية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الولايات</SelectItem>
                {governorates.map(g => (
                  <SelectItem key={g!} value={g!}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filtered.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {filtered.length} نتيجة
            </p>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <SkeletonTable rows={8} cols={4} />
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-xl shadow-sm">
          <EmptyState
            illustration={<EmptyDocumentsIllustration />}
            title="قائمة المحاكم فارغة"
            description={data.length === 0
              ? "استعمل زر «تهيئة المحاكم الافتراضية» لإضافة جميع المحاكم التونسية دفعة واحدة"
              : "لا توجد محاكم مطابقة للبحث"}
          />
        </div>
      ) : (
        <Card className="border-none shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-right py-3 font-semibold">اسم المحكمة</TableHead>
                <TableHead className="text-right py-3 font-semibold hidden sm:table-cell">النوع</TableHead>
                <TableHead className="text-right py-3 font-semibold hidden md:table-cell">الولاية</TableHead>
                <TableHead className="text-right py-3 font-semibold hidden lg:table-cell">العنوان</TableHead>
                <TableHead className="text-right py-3 font-semibold hidden lg:table-cell">الهاتف</TableHead>
                <TableHead className="py-3 w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(c => (
                <TableRow key={c.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell className="py-3">
                    <div>
                      <p className="font-medium text-sm">{c.nameAr ?? c.name}</p>
                      {c.nameFr && (
                        <p className="text-xs text-muted-foreground">{c.nameFr}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-3 hidden sm:table-cell">
                    {c.type ? (
                      <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${TYPE_COLORS[c.type]}`}>
                        {TYPE_LABELS[c.type]}
                      </span>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="py-3 text-muted-foreground text-sm hidden md:table-cell">
                    {c.governorate ?? "—"}
                  </TableCell>
                  <TableCell className="py-3 text-muted-foreground text-xs hidden lg:table-cell max-w-48 truncate">
                    {c.address
                      ? <span className="flex items-center gap-1"><MapPin className="h-3 w-3 shrink-0" />{c.address}</span>
                      : "—"}
                  </TableCell>
                  <TableCell className="py-3 text-muted-foreground text-xs hidden lg:table-cell">
                    {c.phone
                      ? <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>
                      : "—"}
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => openEdit(c)}
                        className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                        title="تعديل"
                      >
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => remove(c.id)}
                        className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors"
                        title="حذف"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? "تعديل المحكمة" : "محكمة جديدة"}
      >
        <div className="space-y-4">
          <FormField label="الاسم بالعربية *" htmlFor="ct-name-ar">
            <Input
              id="ct-name-ar"
              value={form.nameAr}
              onChange={e => setForm({ ...form, nameAr: e.target.value })}
              className={inputCls}
              placeholder="المحكمة الابتدائية بتونس"
            />
          </FormField>

          <FormField label="الاسم بالفرنسية" htmlFor="ct-name-fr">
            <Input
              id="ct-name-fr"
              value={form.nameFr}
              onChange={e => setForm({ ...form, nameFr: e.target.value })}
              className={inputCls}
              placeholder="Tribunal de première instance de Tunis"
              dir="ltr"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="النوع" htmlFor="ct-type">
              <select
                id="ct-type"
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value as CourtType })}
                className={inputCls + " px-3 cursor-pointer"}
              >
                {(Object.keys(TYPE_LABELS) as CourtType[]).map(t => (
                  <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                ))}
              </select>
            </FormField>
            <FormField label="الولاية" htmlFor="ct-gov">
              <Input
                id="ct-gov"
                value={form.governorate}
                onChange={e => setForm({ ...form, governorate: e.target.value })}
                className={inputCls}
                placeholder="تونس"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="المدينة" htmlFor="ct-city">
              <Input
                id="ct-city"
                value={form.city}
                onChange={e => setForm({ ...form, city: e.target.value })}
                className={inputCls}
              />
            </FormField>
            <FormField label="الهاتف" htmlFor="ct-phone">
              <Input
                id="ct-phone"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                className={inputCls}
                dir="ltr"
                placeholder="+216 71 000 000"
              />
            </FormField>
          </div>

          <FormField label="العنوان" htmlFor="ct-addr">
            <Input
              id="ct-addr"
              value={form.address}
              onChange={e => setForm({ ...form, address: e.target.value })}
              className={inputCls}
            />
          </FormField>

          <FormField label="الدائرة" htmlFor="ct-div">
            <Input
              id="ct-div"
              value={form.division}
              onChange={e => setForm({ ...form, division: e.target.value })}
              className={inputCls}
              placeholder="الدائرة الأولى"
            />
          </FormField>

          <div className="flex gap-3 pt-1">
            <Button
              className="flex-1"
              onClick={save}
              disabled={saving || !form.nameAr.trim()}
            >
              {saving ? "جارٍ الحفظ..." : "حفظ"}
            </Button>
            <Button variant="outline" onClick={() => setModal(false)} className="px-5">
              إلغاء
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={csvModal} onClose={() => setCsvModal(false)} title="معاينة CSV">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {csvRows.length} صف جاهز للاستيراد. تأكد من أن الأعمدة تحتوي على:
            <code className="mx-1 text-xs bg-muted px-1 py-0.5 rounded">name_ar, name_fr, type, governorate, city, address, phone</code>
          </p>
          <div className="max-h-60 overflow-y-auto rounded-lg border border-border text-xs">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  {csvRows[0] && Object.keys(csvRows[0]).map(h => (
                    <th key={h} className="px-3 py-2 text-right font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csvRows.slice(0, 10).map((row, i) => (
                  <tr key={i} className="border-t border-border">
                    {Object.values(row).map((v, j) => (
                      <td key={j} className="px-3 py-1.5 text-muted-foreground max-w-32 truncate">{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {csvRows.length > 10 && (
              <p className="px-3 py-2 text-muted-foreground text-center">... و {csvRows.length - 10} صف آخر</p>
            )}
          </div>
          <div className="flex gap-3">
            <Button className="flex-1" onClick={importCsv} disabled={importing}>
              {importing ? "جارٍ الاستيراد..." : `استيراد ${csvRows.length} محكمة`}
            </Button>
            <Button variant="outline" onClick={() => setCsvModal(false)} className="px-5">إلغاء</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

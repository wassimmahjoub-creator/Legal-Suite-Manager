import { useEffect, useState, useRef } from "react";
import { Download, Archive, User, Briefcase, RefreshCw, CheckCircle, Clock, XCircle, AlertCircle, Shield, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/Modal";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { authFetch } from "@/lib/authFetch";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
const API = `${BASE}/api`;

type ExportStatus = "pending" | "processing" | "completed" | "failed";

interface DataExport {
  id: number;
  exportType: string;
  scopeId: number | null;
  status: ExportStatus;
  startedAt: string | null;
  completedAt: string | null;
  fileSizeBytes: number | null;
  downloadToken: string | null;
  downloadExpiresAt: string | null;
  downloadCount: number;
  errorMessage: string | null;
  createdAt: string;
}

interface Client { id: number; name: string; }
interface Case { id: number; title: string; caseNumber: string | null; }

const EXPORT_TYPE_LABELS: Record<string, string> = {
  full_cabinet: "تصدير كامل للمكتب",
  single_client: "تصدير موكّل",
  single_case: "تصدير ملف",
};

const STATUS_CONFIG: Record<ExportStatus, { label: string; icon: React.ReactNode; color: string }> = {
  pending: { label: "في الانتظار", icon: <Clock className="h-4 w-4" />, color: "text-yellow-400" },
  processing: { label: "جارٍ المعالجة...", icon: <RefreshCw className="h-4 w-4 animate-spin" />, color: "text-blue-400" },
  completed: { label: "مكتمل", icon: <CheckCircle className="h-4 w-4" />, color: "text-green-400" },
  failed: { label: "فشل", icon: <XCircle className="h-4 w-4" />, color: "text-destructive" },
};

function fmtBytes(b: number | null): string {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}

function fmtDate(s: string | null): string {
  if (!s) return "—";
  return new Date(s).toLocaleString("ar-TN");
}

function isActive(status: ExportStatus) {
  return status === "pending" || status === "processing";
}

export default function DataPrivacy() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";

  const [exports, setExports] = useState<DataExport[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);

  /* modal states */
  const [fullModal, setFullModal] = useState(false);
  const [clientModal, setClientModal] = useState(false);
  const [caseModal, setCaseModal] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [creating, setCreating] = useState(false);

  /* ── polling ── */
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchExports() {
    const r = await authFetch(`${API}/data-exports`);
    if (r.ok) setExports(await r.json());
  }

  useEffect(() => {
    Promise.all([
      authFetch(`${API}/data-exports`).then(r => r.ok ? r.json() : []),
      authFetch(`${API}/clients?limit=500`).then(r => r.ok ? r.json() : []),
      authFetch(`${API}/cases?limit=500`).then(r => r.ok ? r.json() : []),
    ]).then(([exps, cls, css]) => {
      setExports(exps);
      setClients(Array.isArray(cls) ? cls : cls.data ?? []);
      setCases(Array.isArray(css) ? css : css.data ?? []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (exports.some(e => isActive(e.status))) {
      if (!pollRef.current) {
        pollRef.current = setInterval(fetchExports, 4000);
      }
    } else {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [exports]);

  /* ── create helpers ── */
  async function createExport(exportType: string, scopeId?: number) {
    setCreating(true);
    try {
      const r = await authFetch(`${API}/data-exports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exportType, scopeId }),
      });
      if (r.status === 429) {
        toast({ title: "تصدير واحد فقط كل 24 ساعة", variant: "destructive" });
        return;
      }
      if (!r.ok) {
        const err = await r.json();
        toast({ title: err.error ?? "فشل إنشاء التصدير", variant: "destructive" });
        return;
      }
      const exp: DataExport = await r.json();
      setExports(prev => [exp, ...prev]);
      toast({ title: "بدأت عملية التصدير", description: "ستُحدَّث الحالة تلقائياً عند الانتهاء" });
      setFullModal(false); setClientModal(false); setCaseModal(false);
    } finally {
      setCreating(false);
    }
  }

  async function handleDownload(exp: DataExport) {
    try {
      const token = exp.downloadToken ? `?token=${encodeURIComponent(exp.downloadToken)}` : "";
      const r = await authFetch(`${API}/data-exports/${exp.id}/download${token}`);
      if (!r.ok) {
        toast({ title: "فشل التنزيل", variant: "destructive" });
        return;
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `export-${exp.id}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      // refresh to update download count
      fetchExports();
    } catch {
      toast({ title: "فشل التنزيل", variant: "destructive" });
    }
  }

  /* ── UI ── */
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">البيانات والخصوصية</h1>
          <p className="text-muted-foreground text-sm mt-0.5">تصدير بيانات المكتب وفق التشريع التونسي</p>
        </div>
      </div>

      {/* Section 1 — Full cabinet (admin only) */}
      {isAdmin && (
        <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <Archive className="h-5 w-5 text-primary" />
            تصدير كامل لبيانات المكتب
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            احصل على نسخة كاملة من جميع بيانات مكتبك: الملفات، الموكّلون، الفواتير، الوثائق، سجل الاتصالات، والمراسلات.
            يُنتج ملف ZIP منظّماً مع بصمة SHA-256 لكل ملف.
            <strong className="text-foreground"> تصدير واحد مسموح كل 24 ساعة.</strong>
          </p>
          <Button onClick={() => setFullModal(true)} className="gap-2 mt-2">
            <Download className="h-4 w-4" />
            بدء التصدير الكامل
          </Button>
        </div>
      )}

      {/* Section 2 — Export by client */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <User className="h-5 w-5 text-primary" />
          تصدير بيانات موكّل محدد
        </div>
        <p className="text-muted-foreground text-sm leading-relaxed">
          استخرج جميع البيانات المتعلقة بموكّل واحد (ملفاته، فواتيره، تواريخ الآجال) — مطابق لحق الاطلاع بموجب التشريع التونسي.
        </p>
        <Button variant="outline" onClick={() => setClientModal(true)} className="gap-2 mt-2">
          <FileDown className="h-4 w-4" />
          تصدير بيانات موكّل
        </Button>
      </div>

      {/* Section 3 — Export by case */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <Briefcase className="h-5 w-5 text-primary" />
          تصدير ملف قضائي محدد
        </div>
        <p className="text-muted-foreground text-sm leading-relaxed">
          استخرج الملف الكامل لقضية محددة: الخصوم، الفريق، المراحل الإجرائية، الآجال، والفواتير.
        </p>
        <Button variant="outline" onClick={() => setCaseModal(true)} className="gap-2 mt-2">
          <FileDown className="h-4 w-4" />
          تصدير ملف قضائي
        </Button>
      </div>

      {/* Section 4 — Export history */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2 font-semibold">
            <Download className="h-5 w-5 text-primary" />
            سجل الصادرات
          </div>
          <Button variant="ghost" size="sm" onClick={fetchExports} className="gap-1.5 text-xs">
            <RefreshCw className="h-3.5 w-3.5" />
            تحديث
          </Button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <RefreshCw className="h-5 w-5 animate-spin me-2" />
            جارٍ التحميل...
          </div>
        ) : exports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
            <Archive className="h-10 w-10 opacity-20" />
            <p className="text-sm">لا توجد صادرات بعد</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {/* table head */}
            <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_80px] gap-4 px-6 py-3 bg-muted/40 text-xs font-semibold text-muted-foreground">
              <span>التاريخ</span>
              <span>النوع</span>
              <span>الحالة</span>
              <span>الحجم</span>
              <span>التنزيلات</span>
              <span>تنزيل</span>
            </div>
            {exports.map(exp => {
              const st = STATUS_CONFIG[exp.status] ?? STATUS_CONFIG.failed;
              const expired = exp.downloadExpiresAt ? new Date(exp.downloadExpiresAt) < new Date() : false;
              return (
                <div key={exp.id} className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_80px] gap-4 px-6 py-4 items-center text-sm hover:bg-muted/30 transition-colors">
                  <span className="font-mono text-xs text-muted-foreground">{fmtDate(exp.createdAt)}</span>
                  <span className="font-medium">{EXPORT_TYPE_LABELS[exp.exportType] ?? exp.exportType}</span>
                  <div className={`flex items-center gap-1.5 ${st.color}`}>
                    {st.icon}
                    <span className="text-xs">{st.label}</span>
                  </div>
                  <span className="text-muted-foreground">{fmtBytes(exp.fileSizeBytes)}</span>
                  <span className="text-muted-foreground">{exp.downloadCount ?? 0}</span>
                  <div>
                    {exp.status === "completed" && !expired ? (
                      <button
                        onClick={() => handleDownload(exp)}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                      >
                        <Download className="h-3.5 w-3.5" />
                        تنزيل
                      </button>
                    ) : exp.status === "completed" && expired ? (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5" />
                        منتهي
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modals ── */}

      {/* Full cabinet modal */}
      <Modal open={fullModal} onClose={() => setFullModal(false)} title="تصدير كامل لبيانات المكتب" size="md">
        <div className="space-y-4 text-sm text-muted-foreground">
          <p>سيتم تصدير <strong className="text-foreground">جميع بيانات المكتب</strong> في ملف ZIP منظّم يتضمن:</p>
          <ul className="space-y-1.5 list-none">
            {["إعدادات المكتب وقائمة المستخدمين", "جميع الموكّلين وبياناتهم المالية", "جميع الملفات القضائية مع المراحل والآجال", "الفواتير والمصاريف", "سجل التعديلات (آخر 5000 سطر)", "بصمة SHA-256 لكل ملف"].map(item => (
              <li key={item} className="flex items-center gap-2">
                <CheckCircle className="h-3.5 w-3.5 text-green-400 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3 text-yellow-300 text-xs">
            ⚠️ هذا الملف يحتوي على بيانات سرية. احتفظ به في مكان آمن.
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setFullModal(false)}>إلغاء</Button>
          <Button onClick={() => createExport("full_cabinet")} disabled={creating} className="gap-2">
            <Download className="h-4 w-4" />
            {creating ? "جارٍ إنشاء طلب التصدير..." : "تأكيد وبدء التصدير"}
          </Button>
        </div>
      </Modal>

      {/* Client export modal */}
      <Modal open={clientModal} onClose={() => setClientModal(false)} title="تصدير بيانات موكّل" size="md">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">اختر الموكّل المراد تصدير بياناته:</p>
          <select
            value={selectedClientId}
            onChange={e => setSelectedClientId(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            dir="rtl"
          >
            <option value="">— اختر موكّلاً —</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setClientModal(false)}>إلغاء</Button>
          <Button
            onClick={() => selectedClientId && createExport("single_client", Number(selectedClientId))}
            disabled={creating || !selectedClientId}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {creating ? "جارٍ الإنشاء..." : "تصدير"}
          </Button>
        </div>
      </Modal>

      {/* Case export modal */}
      <Modal open={caseModal} onClose={() => setCaseModal(false)} title="تصدير ملف قضائي" size="md">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">اختر الملف القضائي المراد تصديره:</p>
          <select
            value={selectedCaseId}
            onChange={e => setSelectedCaseId(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            dir="rtl"
          >
            <option value="">— اختر ملفاً —</option>
            {cases.map(c => (
              <option key={c.id} value={c.id}>
                {c.caseNumber ? `${c.caseNumber} — ` : ""}{c.title}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setCaseModal(false)}>إلغاء</Button>
          <Button
            onClick={() => selectedCaseId && createExport("single_case", Number(selectedCaseId))}
            disabled={creating || !selectedCaseId}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {creating ? "جارٍ الإنشاء..." : "تصدير"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

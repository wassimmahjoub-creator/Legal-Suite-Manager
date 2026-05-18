import { useState } from "react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/lib/authFetch";
import { useToast } from "@/hooks/use-toast";
import { Archive, Loader2, Info, AlertTriangle } from "lucide-react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

interface Props {
  caseId: number;
  caseNumber?: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CaseZipModal({ caseId, caseNumber, isOpen, onClose }: Props) {
  const [includeInternal, setIncludeInternal] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handleExport() {
    setLoading(true);
    try {
      const r = await authFetch(`${BASE}/api/exports/cases/${caseId}/zip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ includeInternal }),
      });

      if (!r.ok) {
        toast({ title: "فشل إنشاء الأرشيف", variant: "destructive" });
        return;
      }

      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const label = caseNumber?.replace(/[^a-zA-Z0-9\u0600-\u06FF-]/g, "-") ?? `case-${caseId}`;
      a.download = `ملف-${label}-${today}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast({ title: "✓ تم تصدير الملف بنجاح" });
      onClose();
    } catch {
      toast({ title: "فشل التصدير", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <Modal
      title="تصدير الملف مع المرفقات"
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            إلغاء
          </Button>
          <Button onClick={handleExport} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
            بدء التصدير
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground leading-relaxed">
          سيتم تصدير الملف الكامل مع جميع المرفقات في أرشيف ZIP منظم حسب طبيعة الوثائق.
        </p>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold">خيارات</h4>

          <label className="flex items-start gap-3 cursor-pointer group rounded-xl border border-border p-3 hover:bg-muted/40 transition-colors">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-primary rounded cursor-pointer"
              checked={includeInternal}
              onChange={e => setIncludeInternal(e.target.checked)}
            />
            <div className="space-y-1">
              <span className="text-sm font-medium block">
                تضمين الوثائق الداخلية (الملاحظات السرية، المسودات)
              </span>
              <span className="text-xs text-amber-500 flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                هذه الوثائق مخصصة للاستعمال الداخلي للمكتب فقط ولا ينبغي مشاركتها مع الموكّل
              </span>
            </div>
          </label>
        </div>

        <div className="flex items-start gap-2 rounded-xl bg-muted/50 border border-border p-3">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            يتضمن الأرشيف: بيانات القضية، الفواتير، الآجال، الإجراءات، فريق الملف، الخصوم، وقائمة الوثائق.
          </p>
        </div>
      </div>
    </Modal>
  );
}

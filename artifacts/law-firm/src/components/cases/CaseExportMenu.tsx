import { useState, useRef } from "react";
import { pdf } from "@react-pdf/renderer";
import { formatDateTN } from "@/lib/date";
import { useLocale } from "@/context/LocaleContext";
import { authFetch } from "@/lib/authFetch";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { CaseDocument, type CasePdfProps } from "@/components/CasePdf";
import { CaseZipModal } from "./CaseZipModal";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Download, FileText, FileSpreadsheet, Archive, Loader2, ChevronDown,
} from "lucide-react";
import { toast as sonnerToast } from "sonner";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

interface Props {
  caseId: number;
  caseTitle?: string;
  caseNumber?: string | null;
}

type Busy = "pdf" | "xlsx" | "csv" | null;

export function CaseExportMenu({ caseId, caseTitle, caseNumber }: Props) {
  const locale = useLocale();
  const { toast } = useToast();
  const [busy, setBusy] = useState<Busy>(null);
  const [showZip, setShowZip] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── PDF ──────────────────────────────────────────────────────────────── */
  async function handlePdf() {
    if (busy) return;
    setBusy("pdf");

    timerRef.current = setTimeout(() => {
      sonnerToast.loading(locale === "ar" ? "جارٍ تحضير الـ PDF…" : "PDF en préparation…", { id: "case-pdf" });
    }, 1800);

    try {
      const r = await authFetch(`${BASE}/api/cases/${caseId}/pdf-data`);
      if (!r.ok) throw new Error("fetch failed");
      const data = await r.json() as Omit<CasePdfProps, "lang" | "generatedAt">;
      const generatedAt = formatDateTN(new Date());

      const blob = await pdf(
        <CaseDocument {...data} lang={locale as "ar" | "fr"} generatedAt={generatedAt} />
      ).toBlob();

      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      sonnerToast.dismiss("case-pdf");

      const url = URL.createObjectURL(blob);
      const label = (caseNumber ?? `case-${caseId}`).replace(/[^a-zA-Z0-9\u0600-\u06FF-]/g, "-");
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const a = document.createElement("a");
      a.href = url;
      a.download = `ملف-${label}-${today}.pdf`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);

      sonnerToast.success(locale === "ar" ? "✓ PDF جاهز" : "✓ PDF prêt", { duration: 4000 });

      /* Archive record (non-blocking) */
      authFetch(`${BASE}/api/documents`, {
        method: "POST",
        body: JSON.stringify({
          caseId,
          name: `بطاقة القضية — ${caseNumber ?? caseTitle ?? `#${caseId}`} — ${formatDateTN(new Date())}`,
          fileType: "pdf",
          url: null,
        }),
      }).catch(() => {});
    } catch {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      sonnerToast.dismiss("case-pdf");
      sonnerToast.error(locale === "ar" ? "خطأ في إنشاء الـ PDF" : "Erreur PDF");
    } finally {
      setBusy(null);
    }
  }

  /* ── XLSX / CSV ───────────────────────────────────────────────────────── */
  async function handleSpreadsheet(format: "xlsx" | "csv") {
    if (busy) return;
    setBusy(format === "xlsx" ? "xlsx" : "csv");
    try {
      const r = await authFetch(`${BASE}/api/exports/cases/${caseId}?format=${format}`);
      if (!r.ok) { toast({ title: "فشل التصدير", variant: "destructive" }); return; }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const label = (caseNumber ?? `case-${caseId}`).replace(/[^a-zA-Z0-9\u0600-\u06FF-]/g, "-");
      const today = new Date().toISOString().slice(0, 10);
      a.download = `ملف-${label}-${today}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "فشل التصدير", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  const isLoading = busy !== null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" className="gap-1.5 text-xs" disabled={isLoading}>
            {isLoading
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Download className="h-3.5 w-3.5" />}
            تصدير
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="min-w-[220px]">
          {/* Option 1 — Full PDF */}
          <DropdownMenuItem
            className="gap-2.5 cursor-pointer"
            disabled={isLoading}
            onSelect={handlePdf}
          >
            <FileText className="h-4 w-4 text-red-400 shrink-0" />
            <div>
              <div className="text-sm font-medium">تصدير الملف كاملاً (PDF)</div>
              <div className="text-xs text-muted-foreground">بطاقة قضية شاملة — تحميل مباشر</div>
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Excel */}
          <DropdownMenuItem
            className="gap-2.5 cursor-pointer"
            disabled={isLoading}
            onSelect={() => handleSpreadsheet("xlsx")}
          >
            <FileSpreadsheet className="h-4 w-4 text-green-400 shrink-0" />
            <span className="text-sm">تصدير Excel (.xlsx)</span>
          </DropdownMenuItem>

          {/* CSV */}
          <DropdownMenuItem
            className="gap-2.5 cursor-pointer"
            disabled={isLoading}
            onSelect={() => handleSpreadsheet("csv")}
          >
            <FileText className="h-4 w-4 text-blue-400 shrink-0" />
            <span className="text-sm">تصدير CSV (.csv)</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Option 2 — ZIP with attachments */}
          <DropdownMenuItem
            className="gap-2.5 cursor-pointer"
            disabled={isLoading}
            onSelect={() => setShowZip(true)}
          >
            <Archive className="h-4 w-4 text-amber-400 shrink-0" />
            <div>
              <div className="text-sm font-medium">تصدير الملف مع المرفقات (ZIP)</div>
              <div className="text-xs text-muted-foreground">أرشيف منظم حسب طبيعة الوثائق</div>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CaseZipModal
        caseId={caseId}
        caseNumber={caseNumber}
        isOpen={showZip}
        onClose={() => setShowZip(false)}
      />
    </>
  );
}

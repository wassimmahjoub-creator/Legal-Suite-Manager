import { useState, useRef } from "react";
import { pdf } from "@react-pdf/renderer";
import { formatDateTN } from "@/lib/date";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CaseDocument, type CasePdfProps } from "./CasePdf";
import { authFetch } from "@/lib/authFetch";
import { useLocale } from "@/context/LocaleContext";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

interface Props {
  caseId: number | string;
  caseTitle?: string;
  caseNumber?: string | null;
}

export function CasePdfButton({ caseId, caseTitle, caseNumber }: Props) {
  const locale = useLocale();
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function handlePrint() {
    if (loading) return;
    setLoading(true);

    timerRef.current = setTimeout(() => {
      toast.loading(locale === "ar" ? "جارٍ تحضير الـ PDF…" : "PDF en préparation…", { id: "case-pdf" });
    }, 2000);

    try {
      const r = await authFetch(`${BASE}/api/cases/${caseId}/pdf-data`);
      if (!r.ok) throw new Error("fetch failed");
      const data = await r.json() as Omit<CasePdfProps, "lang" | "generatedAt">;

      const generatedAt = formatDateTN(new Date());

      const blob = await pdf(
        <CaseDocument
          {...data}
          lang={locale as "ar" | "fr"}
          generatedAt={generatedAt}
        />
      ).toBlob();

      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
        toast.dismiss("case-pdf");
      }

      const url = URL.createObjectURL(blob);
      const label = caseNumber ?? `case-${caseId}`;
      const filename = `fiche-${label}-${new Date().toISOString().slice(0, 10)}.pdf`;

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);

      toast.success(
        locale === "ar" ? "✓ الـ PDF جاهز — تم التحميل" : "✓ PDF prêt — Téléchargement lancé",
        { duration: 5000 }
      );

      await archiveDocument(caseId, caseTitle, caseNumber, blob);

    } catch {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      toast.dismiss("case-pdf");
      toast.error(locale === "ar" ? "خطأ في إنشاء الـ PDF" : "Erreur lors de la génération du PDF");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handlePrint}
      disabled={loading}
      className="gap-1.5 text-xs"
    >
      {loading
        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
        : <FileText className="h-3.5 w-3.5" />}
      {loading
        ? (locale === "ar" ? "جارٍ…" : "Génération…")
        : "طباعة"}
    </Button>
  );
}

async function archiveDocument(
  caseId: number | string,
  caseTitle?: string,
  caseNumber?: string | null,
  _blob?: Blob
) {
  try {
    const label = caseNumber ?? caseTitle ?? `case-${caseId}`;
    const name = `فيشة القضية — ${label} — ${formatDateTN(new Date())}`;
    await authFetch(`${BASE}/api/documents`, {
      method: "POST",
      body: JSON.stringify({ caseId: Number(caseId), name, fileType: "pdf", url: null }),
    });
  } catch {
    // archive failure is non-blocking
  }
}

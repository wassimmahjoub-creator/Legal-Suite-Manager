import { useState, useRef } from "react";
import { authFetch } from "@/lib/authFetch";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { CaseZipModal } from "./CaseZipModal";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Download, FileSpreadsheet, FileText, Archive, Loader2, ChevronDown,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

interface Props {
  caseId: number;
  caseTitle?: string;
  caseNumber?: string | null;
}

type Busy = "xlsx" | "csv" | null;

export function CaseExportMenu({ caseId, caseNumber }: Props) {
  const { toast } = useToast();
  const [busy, setBusy] = useState<Busy>(null);
  const [showZip, setShowZip] = useState(false);

  /* ── XLSX / CSV ───────────────────────────────────────────────────────── */
  async function handleSpreadsheet(format: "xlsx" | "csv") {
    if (busy) return;
    setBusy(format);
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
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="min-w-[220px]">
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

          {/* ZIP */}
          <DropdownMenuItem
            className="gap-2.5 cursor-pointer"
            disabled={isLoading}
            onSelect={() => setShowZip(true)}
          >
            <Archive className="h-4 w-4 text-amber-400 shrink-0" />
            <div>
              <div className="text-sm font-medium">تصدير مع المرفقات (ZIP)</div>
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

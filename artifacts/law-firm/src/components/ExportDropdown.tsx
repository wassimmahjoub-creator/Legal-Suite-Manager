import { useState, useRef, useEffect } from "react";
import { Download, FileSpreadsheet, FileText, ChevronDown, Loader2 } from "lucide-react";
import { authFetch } from "@/lib/authFetch";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

export type ExportEndpoint = "clients" | "cases" | "invoices";

interface ExportDropdownProps {
  endpoint: ExportEndpoint;
  params?: Record<string, string | boolean | undefined>;
  label?: string;
}

export function ExportDropdown({ endpoint, params = {}, label = "تصدير" }: ExportDropdownProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  async function download(format: "xlsx" | "csv") {
    setLoading(format);
    setOpen(false);
    try {
      const qs = new URLSearchParams({ format });
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== "" && v !== false) {
          qs.set(k, String(v));
        }
      });
      const r = await authFetch(`${BASE}/api/exports/${endpoint}?${qs.toString()}`);
      if (!r.ok) {
        toast({ title: "فشل التصدير", variant: "destructive" });
        return;
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = format === "xlsx" ? "xlsx" : "csv";
      const today = new Date().toISOString().slice(0, 10);
      a.download = `${endpoint}-${today}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "فشل التصدير", variant: "destructive" });
    } finally {
      setLoading(null);
    }
  }

  const busy = loading !== null;

  return (
    <div className="relative" ref={ref}>
      <Button
        size="sm"
        className="gap-1.5 text-xs"
        disabled={busy}
        onClick={() => setOpen(o => !o)}
      >
        {busy
          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
          : <Download className="h-3.5 w-3.5" />}
        {label}
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </Button>

      {open && (
        <div className="absolute start-0 top-full mt-1 z-50 min-w-[160px] rounded-xl border border-border bg-card shadow-lg overflow-hidden">
          <button
            onClick={() => download("xlsx")}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-muted/60 transition-colors text-start"
          >
            <FileSpreadsheet className="h-4 w-4 text-green-400 shrink-0" />
            <span>Excel (.xlsx)</span>
          </button>
          <button
            onClick={() => download("csv")}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-muted/60 transition-colors text-start"
          >
            <FileText className="h-4 w-4 text-blue-400 shrink-0" />
            <span>CSV (.csv)</span>
          </button>
        </div>
      )}
    </div>
  );
}

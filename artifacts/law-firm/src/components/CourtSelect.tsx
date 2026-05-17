/**
 * <CourtSelect />
 *
 * Autocomplete réutilisable branché sur GET /api/courts.
 *
 * Props:
 *   value      — string  : nom actuel (nameAr) de la juridiction sélectionnée
 *   onChange   — (v: string) => void : appelé à chaque changement
 *   placeholder — string (défaut : "اختر المحكمة...")
 *   className  — string : classes CSS supplémentaires sur le wrapper
 *   disabled   — boolean
 *
 * Usage:
 *   <CourtSelect value={form.court} onChange={v => setForm({...form, court: v})} />
 */
import { useState, useEffect, useRef } from "react";
import { authFetch } from "@/lib/authFetch";
import { Building2, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

export type CourtOption = {
  id: number;
  name: string;
  nameAr: string | null;
  nameFr: string | null;
  type: string | null;
  governorate: string | null;
  city: string | null;
};

const TYPE_LABELS: Record<string, string> = {
  cassation: "محكمة تعقيب",
  appel: "محكمة استئناف",
  premiere_instance: "محكمة ابتدائية",
  cantonal: "محكمة كانتونية",
  administratif: "محكمة إدارية",
  immobilier: "محكمة عقارية",
  prudhommes: "محكمة شغل",
  autre: "أخرى",
};

interface CourtSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function CourtSelect({ value, onChange, placeholder = "اختر المحكمة...", className, disabled }: CourtSelectProps) {
  const [courts, setCourts] = useState<CourtOption[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    authFetch(`${BASE}/api/courts`)
      .then(r => r.ok ? r.json() : [])
      .then(setCourts)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const displayName = (c: CourtOption) => c.nameAr ?? c.name;

  const filtered = courts.filter(c => {
    const q = query.toLowerCase();
    return !q
      || displayName(c).toLowerCase().includes(q)
      || (c.nameFr ?? "").toLowerCase().includes(q)
      || (c.governorate ?? "").toLowerCase().includes(q);
  });

  const selected = courts.find(c => displayName(c) === value || c.name === value);

  function handleSelect(c: CourtOption) {
    onChange(displayName(c));
    setQuery("");
    setOpen(false);
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange("");
    setQuery("");
  }

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => { setOpen(o => !o); setQuery(""); }}
        className={cn(
          "h-10 w-full flex items-center justify-between gap-2 px-3",
          "bg-muted/50 border border-border rounded-lg text-sm",
          "focus:outline-none focus:ring-1 focus:ring-primary transition-colors",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          !value && "text-muted-foreground"
        )}
      >
        <div className="flex items-center gap-2 truncate">
          <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{selected ? displayName(selected) : placeholder}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {value && (
            <span onClick={handleClear} className="p-0.5 hover:text-destructive cursor-pointer">
              <X className="h-3 w-3" />
            </span>
          )}
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </div>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-border">
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="بحث..."
              className="w-full h-8 px-3 text-sm bg-muted/60 rounded-lg border-0 outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <ul className="max-h-64 overflow-y-auto">
            {loading && (
              <li className="px-4 py-3 text-sm text-muted-foreground text-center">جارٍ التحميل...</li>
            )}
            {!loading && filtered.length === 0 && (
              <li className="px-4 py-3 text-sm text-muted-foreground text-center">لا توجد نتائج</li>
            )}
            {filtered.map(c => (
              <li
                key={c.id}
                onClick={() => handleSelect(c)}
                className={cn(
                  "px-4 py-2.5 cursor-pointer hover:bg-muted/60 flex items-start gap-3 transition-colors",
                  selected?.id === c.id && "bg-primary/10"
                )}
              >
                <Building2 className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{displayName(c)}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {c.nameFr && <span className="ml-1">{c.nameFr}</span>}
                    {c.type && <span className="text-primary/70 ml-1"> • {TYPE_LABELS[c.type] ?? c.type}</span>}
                    {c.governorate && <span className="ml-1"> • {c.governorate}</span>}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

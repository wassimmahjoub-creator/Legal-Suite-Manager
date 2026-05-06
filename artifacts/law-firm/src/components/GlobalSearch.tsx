import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { authFetch } from "@/context/AuthContext";
import { Search, Briefcase, Users, Calendar, MessageSquare, X } from "lucide-react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

interface SearchResults {
  cases: { id: number; title: string; status: string; court: string | null }[];
  clients: { id: number; name: string; phone: string | null; email: string | null }[];
  events: { id: number; title: string; date: string; caseId: number | null }[];
  consultations: { id: number; subject: string; date: string }[];
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [, navigate] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const dq = useDebounce(q, 300);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); setOpen(o => !o); }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 50); }, [open]);

  useEffect(() => {
    if (dq.length < 2) { setResults(null); return; }
    setLoading(true);
    authFetch(`${BASE}/api/search?q=${encodeURIComponent(dq)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setResults(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [dq]);

  function go(path: string) { navigate(path); setOpen(false); setQ(""); setResults(null); }

  const hasResults = results && (results.cases.length + results.clients.length + results.events.length + results.consultations.length) > 0;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 h-9 bg-muted/50 hover:bg-muted rounded-lg text-sm text-muted-foreground transition-colors border border-border/50"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:block">بحث...</span>
        <kbd className="hidden sm:block text-xs bg-background px-1.5 py-0.5 rounded border border-border font-mono">⌘K</kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4" dir="rtl">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-card rounded-2xl shadow-2xl border border-border w-full max-w-lg overflow-hidden">
            <div className="flex items-center gap-3 p-4 border-b border-border">
              <Search className="h-5 w-5 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="ابحث عن قضية، حريف، جلسة..."
                className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground text-base"
              />
              {q && <button onClick={() => { setQ(""); setResults(null); }} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>}
              <kbd className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border font-mono hidden sm:block">Esc</kbd>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {loading && (
                <div className="p-6 text-center text-sm text-muted-foreground">جاري البحث...</div>
              )}

              {!loading && q.length >= 2 && !hasResults && (
                <div className="p-6 text-center text-sm text-muted-foreground">لا توجد نتائج لـ "{q}"</div>
              )}

              {!loading && !q && (
                <div className="p-4 text-center text-sm text-muted-foreground">اكتب للبحث عبر القضايا، الحرفاء، الجلسات...</div>
              )}

              {hasResults && (
                <div className="divide-y divide-border/50">
                  {results!.cases.length > 0 && (
                    <div className="p-3">
                      <p className="text-xs text-muted-foreground font-medium mb-2 px-2">القضايا</p>
                      {results!.cases.map(c => (
                        <button key={c.id} onClick={() => go(`/cases/${c.id}`)}
                          className="w-full flex items-center gap-3 p-2.5 hover:bg-muted rounded-xl transition-colors text-right">
                          <Briefcase className="h-4 w-4 text-primary shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{c.title}</p>
                            {c.court && <p className="text-xs text-muted-foreground">{c.court}</p>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {results!.clients.length > 0 && (
                    <div className="p-3">
                      <p className="text-xs text-muted-foreground font-medium mb-2 px-2">الحرفاء</p>
                      {results!.clients.map(c => (
                        <button key={c.id} onClick={() => go(`/clients`)}
                          className="w-full flex items-center gap-3 p-2.5 hover:bg-muted rounded-xl transition-colors text-right">
                          <Users className="h-4 w-4 text-green-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{c.name}</p>
                            {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {results!.events.length > 0 && (
                    <div className="p-3">
                      <p className="text-xs text-muted-foreground font-medium mb-2 px-2">الجلسات</p>
                      {results!.events.map(e => (
                        <button key={e.id} onClick={() => go("/calendar")}
                          className="w-full flex items-center gap-3 p-2.5 hover:bg-muted rounded-xl transition-colors text-right">
                          <Calendar className="h-4 w-4 text-orange-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{e.title}</p>
                            <p className="text-xs text-muted-foreground">{new Date(e.date).toLocaleDateString("ar-TN")}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {results!.consultations.length > 0 && (
                    <div className="p-3">
                      <p className="text-xs text-muted-foreground font-medium mb-2 px-2">الاستشارات</p>
                      {results!.consultations.map(c => (
                        <button key={c.id} onClick={() => go("/consultations")}
                          className="w-full flex items-center gap-3 p-2.5 hover:bg-muted rounded-xl transition-colors text-right">
                          <MessageSquare className="h-4 w-4 text-blue-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{c.subject}</p>
                            <p className="text-xs text-muted-foreground">{new Date(c.date).toLocaleDateString("ar-TN")}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

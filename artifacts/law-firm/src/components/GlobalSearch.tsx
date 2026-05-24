import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Command } from "cmdk";
import { authFetch } from "@/lib/authFetch";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, Briefcase, Users, CreditCard, FileText,
  Building2, UserX, Calendar, Clock, X,
  LayoutDashboard, Settings, Plus,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
const RECENT_KEY = "cmd.recent";
const MAX_RECENT = 5;

type ResultType = "case" | "client" | "invoice" | "document" | "court" | "opponent" | "event";

interface SearchResult {
  type: ResultType;
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

const TYPE_CONFIG: Record<ResultType, { label: string; Icon: React.ElementType; color: string }> = {
  case:     { label: "القضايا",    Icon: Briefcase,  color: "text-primary" },
  client:   { label: "الموكّلون",   Icon: Users,      color: "text-green-400" },
  invoice:  { label: "الفواتير",  Icon: CreditCard, color: "text-yellow-400" },
  document: { label: "الوثائق",   Icon: FileText,   color: "text-blue-400" },
  court:    { label: "المحاكم",   Icon: Building2,  color: "text-purple-400" },
  opponent: { label: "الخصوم",    Icon: UserX,      color: "text-red-400" },
  event:    { label: "الجلسات",   Icon: Calendar,   color: "text-orange-400" },
};

const ACTIONS = [
  { label: "+ ملف جديد",    href: "/cases",        Icon: Briefcase,      color: "text-primary" },
  { label: "+ موكّل جديد",     href: "/clients",      Icon: Users,          color: "text-green-400" },
  { label: "+ فاتورة جديدة",  href: "/billing",      Icon: CreditCard,     color: "text-yellow-400" },
  { label: "+ موعد جديد",     href: "/calendar",     Icon: Calendar,       color: "text-orange-400" },
  { label: "لوحة القيادة",   href: "/",             Icon: LayoutDashboard, color: "text-muted-foreground" },
  { label: "الإعدادات",       href: "/settings",     Icon: Settings,       color: "text-muted-foreground" },
];

function useDebounce<T>(value: T, delay: number): T {
  const [deb, setDeb] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDeb(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return deb;
}

function getRecent(): SearchResult[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]"); }
  catch { return []; }
}

function addRecent(item: SearchResult) {
  const list = getRecent().filter(r => !(r.type === item.type && r.id === item.id));
  list.unshift(item);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const lower = text.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <strong className="text-primary font-semibold">{text.slice(idx, idx + query.length)}</strong>
      {text.slice(idx + query.length)}
    </>
  );
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [, navigate] = useLocation();
  const dq = useDebounce(q, 200);

  const close = useCallback(() => {
    setOpen(false);
    setQ("");
    setResults([]);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen(o => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (dq.length < 2) { setResults([]); setLoading(false); return; }
    setLoading(true);
    authFetch(`${BASE}/api/search?q=${encodeURIComponent(dq)}`)
      .then(r => r.ok ? r.json() : { results: [] })
      .then(d => { setResults(d.results ?? []); setLoading(false); })
      .catch(() => { setResults([]); setLoading(false); });
  }, [dq]);

  function go(item: SearchResult) {
    addRecent(item);
    navigate(item.href);
    close();
  }

  function goHref(href: string) {
    navigate(href);
    close();
  }

  const recent = open ? getRecent() : [];

  const grouped = (Object.keys(TYPE_CONFIG) as ResultType[])
    .map(type => ({ type, items: results.filter(r => r.type === type) }))
    .filter(g => g.items.length > 0);

  const hasResults = results.length > 0;
  const showRecent = !q && recent.length > 0;
  const filteredActions = q
    ? ACTIONS.filter(a => a.label.includes(q))
    : ACTIONS;

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
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4" dir="rtl">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={close}
          />

          <Command
            shouldFilter={false}
            onKeyDown={e => { if (e.key === "Escape") close(); }}
            className="relative bg-card rounded-2xl shadow-2xl border border-border w-full max-w-[640px] flex flex-col overflow-hidden"
            style={{ maxHeight: "72vh" }}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
              <Search className="h-5 w-5 text-muted-foreground shrink-0" />
              <Command.Input
                value={q}
                onValueChange={setQ}
                placeholder="ابحث عن ملف، موكّل، فاتورة، وثيقة..."
                autoFocus
                className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground text-base min-w-0"
              />
              {q && (
                <button
                  onClick={() => { setQ(""); setResults([]); }}
                  className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <kbd className="text-xs text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border font-mono shrink-0">Esc</kbd>
            </div>

            <Command.List className="overflow-y-auto flex-1 p-3 space-y-1">

              {loading && (
                <div className="space-y-2 py-1">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                      <Skeleton className="h-4 w-4 rounded-full shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3.5 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!loading && q.length >= 2 && !hasResults && (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  <p>لا توجد نتائج لـ "<span className="text-foreground">{q}</span>"</p>
                  <p className="text-xs mt-1 opacity-70">جرّب بحثًا آخر</p>
                </div>
              )}

              {!loading && !q && !showRecent && (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  اكتب للبحث عبر القضايا، الموكّلون، الفواتير، الوثائق...
                </div>
              )}

              {!loading && showRecent && (
                <Command.Group
                  heading="الأخير"
                  className="[&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1.5"
                >
                  {recent.map(item => {
                    const cfg = TYPE_CONFIG[item.type];
                    if (!cfg) return null;
                    return (
                      <Command.Item
                        key={`recent-${item.type}-${item.id}`}
                        value={`recent-${item.type}-${item.id}`}
                        onSelect={() => go(item)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-start
                          data-[selected=true]:bg-muted transition-colors"
                      >
                        <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm truncate">{item.title}</p>
                          {item.subtitle && (
                            <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                          )}
                        </div>
                        <span className={cn("text-xs shrink-0", cfg.color)}>{cfg.label}</span>
                      </Command.Item>
                    );
                  })}
                </Command.Group>
              )}

              {!loading && hasResults && grouped.map(({ type, items }) => {
                const cfg = TYPE_CONFIG[type];
                if (!cfg) return null;
                const { label, Icon, color } = cfg;
                return (
                  <Command.Group
                    key={type}
                    heading={`${label} (${items.length})`}
                    className="[&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:pt-2"
                  >
                    {items.map(item => (
                      <Command.Item
                        key={`${type}-${item.id}`}
                        value={`${type}-${item.id}`}
                        onSelect={() => go(item)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-start
                          data-[selected=true]:bg-muted transition-colors"
                      >
                        <Icon className={cn("h-4 w-4 shrink-0", color)} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            <Highlight text={item.title} query={q} />
                          </p>
                          {item.subtitle && (
                            <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                          )}
                        </div>
                      </Command.Item>
                    ))}
                  </Command.Group>
                );
              })}

              {!loading && filteredActions.length > 0 && (
                <Command.Group
                  heading="إجراءات"
                  className="[&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:pt-2 border-t border-border/50 mt-1 pt-1"
                >
                  <div className="grid grid-cols-2 gap-1">
                    {filteredActions.map(action => {
                      const { Icon, color } = action;
                      return (
                        <Command.Item
                          key={action.label}
                          value={action.label}
                          onSelect={() => goHref(action.href)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer text-start text-sm
                            text-muted-foreground data-[selected=true]:bg-muted data-[selected=true]:text-foreground transition-colors"
                        >
                          <Icon className={cn("h-4 w-4 shrink-0", color)} />
                          {action.label}
                        </Command.Item>
                      );
                    })}
                  </div>
                </Command.Group>
              )}
            </Command.List>

            <div className="flex items-center gap-4 px-4 py-2 border-t border-border/50 bg-muted/20 text-xs text-muted-foreground/60 shrink-0">
              <span className="flex items-center gap-1.5">
                <kbd className="font-mono bg-muted px-1 py-0.5 rounded border border-border">↑↓</kbd>
                التنقل
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="font-mono bg-muted px-1 py-0.5 rounded border border-border">⏎</kbd>
                فتح
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="font-mono bg-muted px-1 py-0.5 rounded border border-border">Esc</kbd>
                إغلاق
              </span>
              <span className="flex items-center gap-1.5 ms-auto">
                <kbd className="font-mono bg-muted px-1 py-0.5 rounded border border-border">⌘K</kbd>
                بحث سريع
              </span>
            </div>
          </Command>
        </div>
      )}
    </>
  );
}

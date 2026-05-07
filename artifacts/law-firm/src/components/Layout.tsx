import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import {
  Briefcase, Calendar as CalendarIcon, Users, FileText,
  Settings as SettingsIcon, CreditCard, LayoutDashboard, Scale,
  Timer, BarChart3, TrendingDown, Mic, Shield, MessageSquare,
  FilePen, LogOut, Building2, PhoneCall, ShieldCheck, Landmark,
  Settings2, ClipboardList, Trash2, MailOpen, Sun, Moon,
  Plus, Star, ChevronDown, ChevronLeft, ChevronRight,
  MoreHorizontal, X, Search,
} from "lucide-react";
import { NumericKeypad, MobileNumericKeypad } from "@/components/NumericKeypad";
import { GlobalSearch } from "@/components/GlobalSearch";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

/* ─────────────────────── navigation data ─────────────────────── */

const NAV_PRIMARY = [
  { href: "/",               label: "لوحة القيادة",      icon: LayoutDashboard },
  { href: "/cases",          label: "القضايا",            icon: Briefcase       },
  { href: "/calendar",       label: "الرزنامة",           icon: CalendarIcon    },
  { href: "/clients",        label: "الحرفاء",            icon: Users           },
  { href: "/documents",      label: "الوثائق",            icon: FileText        },
  { href: "/billing",        label: "الفواتير",           icon: CreditCard      },
];

const NAV_SECONDARY = [
  { href: "/opponents",           label: "الخصوم",             icon: Shield       },
  { href: "/consultations",       label: "الاستشارات",         icon: MessageSquare},
  { href: "/communications",      label: "الاتصالات",          icon: PhoneCall    },
  { href: "/correspondances",     label: "المراسلات",          icon: MailOpen     },
  { href: "/time-tracking",       label: "تتبع الوقت",         icon: Timer        },
  { href: "/reports",             label: "التقارير",           icon: BarChart3    },
  { href: "/courts",              label: "المحاكم",            icon: Building2    },
  { href: "/insurance-companies", label: "شركات التأمين",      icon: ShieldCheck  },
  { href: "/templates",           label: "النماذج",            icon: FilePen      },
  { href: "/expenses",            label: "المصاريف",           icon: TrendingDown },
];

const NAV_ADMIN = [
  { href: "/users",         label: "إدارة المستخدمين",    icon: Users        },
  { href: "/subscription",  label: "الاشتراك",            icon: CreditCard   },
  { href: "/bank-accounts", label: "الحسابات البنكية",    icon: Landmark     },
  { href: "/legal-config",  label: "الإعدادات القانونية", icon: Settings2    },
  { href: "/audit-logs",    label: "سجل التعديلات",       icon: ClipboardList},
  { href: "/trash",         label: "سلة المحذوفات",       icon: Trash2       },
  { href: "/voice-dictation", label: "الإملاء الصوتي",   icon: Mic          },
  { href: "/settings",      label: "الإعدادات",           icon: SettingsIcon },
];

const NAV_MOBILE_BOTTOM = [
  { href: "/",         label: "الرئيسية", icon: LayoutDashboard },
  { href: "/cases",    label: "القضايا",  icon: Briefcase       },
  { href: "/calendar", label: "الرزنامة", icon: CalendarIcon    },
  { href: "/clients",  label: "الحرفاء",  icon: Users           },
];

const QUICK_ACTIONS = [
  { label: "قضية جديدة",  href: "/cases",    icon: Briefcase    },
  { label: "حريف جديد",   href: "/clients",  icon: Users        },
  { label: "فاتورة جديدة", href: "/billing", icon: CreditCard   },
  { label: "موعد جديد",   href: "/calendar", icon: CalendarIcon },
];

const ALL_ITEMS = [...NAV_PRIMARY, ...NAV_SECONDARY, ...NAV_ADMIN];

const ROLE_COLORS: Record<string, string> = {
  admin:      "bg-primary/15 text-primary",
  lawyer:     "bg-blue-500/15 text-blue-400",
  secretary:  "bg-emerald-500/15 text-emerald-400",
  trainee:    "bg-amber-500/15 text-amber-400",
  accountant: "bg-violet-500/15 text-violet-400",
};

const ROLE_LABELS: Record<string, string> = {
  admin:      "مدير",
  lawyer:     "محامٍ",
  secretary:  "سكرتيرة",
  trainee:    "متربص",
  accountant: "محاسب",
};

/* ─────────────────────── sub-components ─────────────────────── */

type NavItemProps = {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
  collapsed?: boolean;
  favorited?: boolean;
  onToggleFav?: (href: string) => void;
  onNavigate?: () => void;
};

function NavItem({
  href, label, icon: Icon, active, collapsed, favorited, onToggleFav, onNavigate,
}: NavItemProps) {
  const [hovering, setHovering] = useState(false);

  return (
    <div
      className="relative group"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <Link
        href={href}
        onClick={onNavigate}
        data-nav-active={active ? "true" : undefined}
        className={cn(
          "flex items-center gap-2.5 rounded-lg text-sm transition-all duration-150 relative",
          collapsed ? "justify-center px-0 py-2.5 w-10 mx-auto" : "px-2.5 py-2 pr-3",
          active
            ? "bg-primary/10 text-primary font-semibold"
            : "text-muted-foreground/75 hover:text-foreground hover:bg-muted/60 font-normal"
        )}
      >
        {active && !collapsed && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] bg-primary rounded-full" />
        )}
        <Icon className={cn("shrink-0 transition-colors", collapsed ? "h-[18px] w-[18px]" : "h-[16px] w-[16px]")} />
        {!collapsed && <span className="truncate leading-snug">{label}</span>}
        {collapsed && hovering && (
          <span className="absolute right-full mr-2.5 px-2.5 py-1.5 bg-popover text-popover-foreground text-xs rounded-lg shadow-xl whitespace-nowrap border border-border z-50 font-normal pointer-events-none">
            {label}
          </span>
        )}
      </Link>

      {/* Favorite pin — only in expanded mode */}
      {!collapsed && hovering && onToggleFav && (
        <button
          onClick={e => { e.preventDefault(); onToggleFav(href); }}
          className={cn(
            "absolute left-7 top-1/2 -translate-y-1/2 p-0.5 rounded transition-all",
            favorited
              ? "text-primary opacity-100"
              : "text-muted-foreground/40 hover:text-muted-foreground opacity-100"
          )}
          title={favorited ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
        >
          <Star className="h-3 w-3" fill={favorited ? "currentColor" : "none"} />
        </button>
      )}
    </div>
  );
}

/* ─────────────────────── section header ─────────────────────── */

function SectionHeader({ label, collapsed }: { label: string; collapsed?: boolean }) {
  if (collapsed) return <div className="my-1.5 h-px bg-border/60 mx-1" />;
  return (
    <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/40 px-2.5 pt-3 pb-1 select-none">
      {label}
    </p>
  );
}

/* ─────────────────────── expandable section ─────────────────────── */

function ExpandableSection({
  label, icon: Icon, children, open, onToggle, collapsed, hasActive,
}: {
  label: string;
  icon: React.ElementType;
  children: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  collapsed?: boolean;
  hasActive?: boolean;
}) {
  if (collapsed) {
    return <div className="space-y-0.5">{children}</div>;
  }
  return (
    <div>
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-all duration-150 group",
          hasActive && !open
            ? "text-primary/80 font-medium"
            : "text-muted-foreground/60 hover:text-foreground hover:bg-muted/40 font-normal"
        )}
      >
        <Icon className="h-[15px] w-[15px] shrink-0" />
        <span className="flex-1 text-right truncate">{label}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", open && "rotate-180")} />
      </button>
      {open && (
        <div className="mt-0.5 mr-2 border-r border-border/50 pr-1.5 space-y-0.5">
          {children}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────── main layout ─────────────────────── */

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const [collapsed, setCollapsed] = useState(() =>
    localStorage.getItem("sidebar_collapsed") === "true"
  );
  const [secondaryOpen, setSecondaryOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("nav_favorites") || "[]"); }
    catch { return []; }
  });
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains("dark")
  );

  const quickRef = useRef<HTMLDivElement>(null);

  const isActive = (href: string) =>
    href === "/" ? location === "/" : location.startsWith(href);

  const inSecondary = NAV_SECONDARY.some(i => isActive(i.href));
  const inAdmin = NAV_ADMIN.some(i => isActive(i.href));

  /* Auto-expand section if active route is inside it */
  useEffect(() => {
    if (inSecondary) setSecondaryOpen(true);
    if (inAdmin) setAdminOpen(true);
  }, [location]);

  /* Persist collapse state */
  useEffect(() => {
    localStorage.setItem("sidebar_collapsed", String(collapsed));
  }, [collapsed]);

  /* Persist favorites */
  useEffect(() => {
    localStorage.setItem("nav_favorites", JSON.stringify(favorites));
  }, [favorites]);

  /* Scroll active item into view */
  useEffect(() => {
    const t = setTimeout(() => {
      document.querySelector<HTMLElement>("[data-nav-active='true']")
        ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, 60);
    return () => clearTimeout(t);
  }, [location]);

  /* Close quick actions on outside click */
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (quickRef.current && !quickRef.current.contains(e.target as Node)) {
        setQuickOpen(false);
      }
    }
    if (quickOpen) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [quickOpen]);

  function toggleFavorite(href: string) {
    setFavorites(prev =>
      prev.includes(href) ? prev.filter(f => f !== href) : [...prev, href]
    );
  }

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  const currentLabel = ALL_ITEMS.find(i => isActive(i.href))?.label ?? "لوحة القيادة";
  const favItems = ALL_ITEMS.filter(i => favorites.includes(i.href));

  /* ── Sidebar inner content ── */
  const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Logo */}
      <div className={cn(
        "flex items-center gap-2.5 border-b border-border shrink-0 transition-all",
        collapsed ? "justify-center px-2 py-3.5" : "px-4 py-3.5"
      )}>
        <div className="bg-primary/10 p-1.5 rounded-lg shrink-0">
          <Scale className="h-[18px] w-[18px] text-primary" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-bold text-primary leading-tight">محامي بلوس</p>
            <p className="text-[10px] text-muted-foreground/60 leading-tight">إدارة المكتب القانوني</p>
          </div>
        )}
      </div>

      {/* Nav scroll area */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent" dir="rtl">

        {/* Favorites */}
        {favItems.length > 0 && !collapsed && (
          <div className="mb-1">
            <SectionHeader label="المفضلة" />
            <div className="space-y-0.5">
              {favItems.map(item => (
                <NavItem
                  key={item.href}
                  {...item}
                  active={isActive(item.href)}
                  favorited
                  onToggleFav={toggleFavorite}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        )}

        {/* Primary */}
        <SectionHeader label="العمل اليومي" collapsed={collapsed} />
        <div className="space-y-0.5">
          {NAV_PRIMARY.map(item => (
            <NavItem
              key={item.href}
              {...item}
              active={isActive(item.href)}
              collapsed={collapsed}
              favorited={favorites.includes(item.href)}
              onToggleFav={toggleFavorite}
              onNavigate={onNavigate}
            />
          ))}
        </div>

        {/* Secondary */}
        <div className="mt-1">
          <SectionHeader label="الخدمات" collapsed={collapsed} />
          <ExpandableSection
            label="المزيد"
            icon={MoreHorizontal}
            open={secondaryOpen}
            onToggle={() => setSecondaryOpen(o => !o)}
            collapsed={collapsed}
            hasActive={inSecondary}
          >
            {NAV_SECONDARY.map(item => (
              <NavItem
                key={item.href}
                {...item}
                active={isActive(item.href)}
                collapsed={collapsed}
                favorited={favorites.includes(item.href)}
                onToggleFav={!collapsed ? toggleFavorite : undefined}
                onNavigate={onNavigate}
              />
            ))}
          </ExpandableSection>
        </div>

        {/* Admin */}
        <div className="mt-1">
          <SectionHeader label="الإدارة" collapsed={collapsed} />
          <ExpandableSection
            label="إدارة النظام"
            icon={Settings2}
            open={adminOpen}
            onToggle={() => setAdminOpen(o => !o)}
            collapsed={collapsed}
            hasActive={inAdmin}
          >
            {NAV_ADMIN.map(item => (
              <NavItem
                key={item.href}
                {...item}
                active={isActive(item.href)}
                collapsed={collapsed}
                favorited={favorites.includes(item.href)}
                onToggleFav={!collapsed ? toggleFavorite : undefined}
                onNavigate={onNavigate}
              />
            ))}
          </ExpandableSection>
        </div>
      </nav>

      {/* Theme toggle */}
      <div className={cn("shrink-0 px-2 pb-2", collapsed && "flex justify-center")}>
        <button
          onClick={toggleTheme}
          title={isDark ? "الوضع الفاتح" : "الوضع الداكن"}
          className={cn(
            "flex items-center gap-2 rounded-lg text-xs text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 transition-colors",
            collapsed ? "p-2" : "w-full px-2.5 py-2"
          )}
        >
          {isDark
            ? <Sun className="h-[15px] w-[15px] shrink-0" />
            : <Moon className="h-[15px] w-[15px] shrink-0" />}
          {!collapsed && <span>{isDark ? "الوضع الفاتح" : "الوضع الداكن"}</span>}
        </button>
      </div>

      {/* User section */}
      <div className={cn("shrink-0 border-t border-border p-2", collapsed && "px-1")}>
        <div className={cn("relative", collapsed && "flex justify-center")}>
          <button
            onClick={() => setUserMenuOpen(o => !o)}
            className={cn(
              "flex items-center gap-2 rounded-lg hover:bg-muted/60 transition-colors",
              collapsed ? "justify-center p-2" : "w-full px-2.5 py-2"
            )}
          >
            <div className="h-7 w-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold shrink-0">
              {user?.name?.charAt(0) ?? "م"}
            </div>
            {!collapsed && (
              <>
                <div className="flex-1 text-right min-w-0">
                  <p className="text-xs font-semibold truncate leading-snug">{user?.name}</p>
                  <p className={cn("text-[10px] leading-snug", ROLE_COLORS[user?.role ?? "lawyer"] ?? "text-muted-foreground")}>
                    {ROLE_LABELS[user?.role ?? "lawyer"] ?? user?.roleLabel}
                  </p>
                </div>
                <ChevronDown className="h-3 w-3 text-muted-foreground/50 shrink-0" />
              </>
            )}
          </button>

          {userMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
              <div className="absolute bottom-full mb-1.5 right-0 w-52 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="px-3.5 py-2.5 border-b border-border bg-muted/20">
                  <p className="font-semibold text-sm">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => { logout(); setUserMenuOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" /> تسجيل الخروج
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  /* ─────────── render ─────────── */
  return (
    <div className="min-h-screen bg-background text-foreground font-sans" dir="rtl">
      <div className="flex min-h-screen">

        {/* ── Desktop Sidebar ── */}
        <aside className={cn(
          "hidden lg:flex flex-col fixed top-0 right-0 h-full bg-card/98 border-l border-border z-30 transition-all duration-300 ease-in-out",
          collapsed ? "w-[60px]" : "w-[220px]"
        )}>
          <SidebarContent />

          {/* Collapse toggle button */}
          <button
            onClick={() => setCollapsed(c => !c)}
            className="absolute -left-3 top-[72px] h-6 w-6 bg-card border border-border rounded-full flex items-center justify-center shadow-md hover:bg-muted transition-colors z-10"
            title={collapsed ? "توسيع القائمة" : "طي القائمة"}
          >
            <ChevronLeft className={cn(
              "h-3 w-3 text-muted-foreground transition-transform duration-200",
              collapsed && "rotate-180"
            )} />
          </button>
        </aside>

        {/* ── Mobile full-screen sheet (المزيد) ── */}
        {mobileSheetOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileSheetOpen(false)}
            />
            <div className="absolute inset-x-0 bottom-0 max-h-[88vh] bg-card rounded-t-2xl shadow-2xl border-t border-border overflow-hidden flex flex-col">
              {/* Handle */}
              <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-border shrink-0">
                <button
                  onClick={() => setMobileSheetOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
                <p className="text-sm font-semibold">القائمة الكاملة</p>
                <div className="w-7" />
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-4" dir="rtl">
                {/* Secondary */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40 px-2 mb-2">الخدمات</p>
                  <div className="grid grid-cols-3 gap-2">
                    {NAV_SECONDARY.map(item => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileSheetOpen(false)}
                          className={cn(
                            "flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs transition-all",
                            active
                              ? "bg-primary/12 text-primary font-semibold"
                              : "bg-muted/50 text-muted-foreground hover:bg-muted"
                          )}
                        >
                          <Icon className="h-5 w-5" />
                          <span className="text-center leading-tight">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* Admin */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40 px-2 mb-2">الإدارة</p>
                  <div className="grid grid-cols-3 gap-2">
                    {NAV_ADMIN.map(item => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileSheetOpen(false)}
                          className={cn(
                            "flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs transition-all",
                            active
                              ? "bg-primary/12 text-primary font-semibold"
                              : "bg-muted/50 text-muted-foreground hover:bg-muted"
                          )}
                        >
                          <Icon className="h-5 w-5" />
                          <span className="text-center leading-tight">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* Quick actions in sheet */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40 px-2 mb-2">إجراءات سريعة</p>
                  <div className="grid grid-cols-2 gap-2">
                    {QUICK_ACTIONS.map(a => {
                      const Icon = a.icon;
                      return (
                        <Link
                          key={a.href}
                          href={a.href}
                          onClick={() => setMobileSheetOpen(false)}
                          className="flex items-center gap-2.5 p-3 rounded-xl bg-primary/8 text-primary text-sm font-medium hover:bg-primary/15 transition-colors"
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span>{a.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Main area ── */}
        <div className={cn(
          "flex-1 flex flex-col min-h-screen transition-all duration-300",
          collapsed ? "lg:mr-[60px]" : "lg:mr-[220px]"
        )}>

          {/* Top bar */}
          <header className="sticky top-0 z-20 bg-card/95 backdrop-blur border-b border-border">
            <div className="flex items-center h-13 px-4 gap-3" style={{ height: "52px" }}>
              {/* Mobile: logo */}
              <Link href="/" className="flex items-center gap-2 lg:hidden">
                <div className="bg-primary/10 p-1 rounded-md">
                  <Scale className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-bold text-primary">محامي بلوس</span>
              </Link>

              {/* Desktop: breadcrumb */}
              <div className="hidden lg:flex items-center gap-1.5 text-sm text-muted-foreground/60">
                <ChevronLeft className="h-3.5 w-3.5" />
                <span className="font-medium text-foreground/80">{currentLabel}</span>
              </div>

              <div className="flex-1" />

              {/* Search */}
              <GlobalSearch />
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 p-4 sm:p-6 pb-24 lg:pb-6">
            <div className="max-w-6xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* ── Mobile Bottom Navigation ── */}
      <nav className="fixed bottom-0 inset-x-0 z-30 lg:hidden bg-card/98 backdrop-blur border-t border-border" dir="rtl">
        <div className="flex items-stretch h-[60px]">
          {NAV_MOBILE_BOTTOM.map(item => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-1 text-[10px] transition-colors",
                  active ? "text-primary font-semibold" : "text-muted-foreground/60"
                )}
              >
                <Icon className={cn("h-5 w-5 transition-transform", active && "scale-110")} />
                <span>{item.label}</span>
              </Link>
            );
          })}
          {/* المزيد button */}
          <button
            onClick={() => setMobileSheetOpen(true)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 text-[10px] transition-colors",
              (inSecondary || inAdmin) ? "text-primary font-semibold" : "text-muted-foreground/60"
            )}
          >
            <MoreHorizontal className={cn(
              "h-5 w-5 transition-transform",
              (inSecondary || inAdmin) && "scale-110"
            )} />
            <span>المزيد</span>
          </button>
        </div>
      </nav>

      {/* ── Quick Actions Button (desktop) ── */}
      <div ref={quickRef} className="fixed bottom-6 left-6 z-40 hidden lg:block">
        {quickOpen && (
          <div className="absolute bottom-12 left-0 bg-card border border-border rounded-xl shadow-2xl overflow-hidden w-44 mb-1">
            {QUICK_ACTIONS.map(a => {
              const Icon = a.icon;
              return (
                <Link
                  key={a.href}
                  href={a.href}
                  onClick={() => setQuickOpen(false)}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm hover:bg-muted/60 transition-colors"
                  dir="rtl"
                >
                  <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>{a.label}</span>
                </Link>
              );
            })}
          </div>
        )}
        <button
          onClick={() => setQuickOpen(o => !o)}
          title="إجراءات سريعة"
          className={cn(
            "h-10 w-10 rounded-full flex items-center justify-center shadow-lg transition-all duration-200",
            quickOpen
              ? "bg-primary/90 text-primary-foreground rotate-45"
              : "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105"
          )}
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      <NumericKeypad />
      <MobileNumericKeypad />
    </div>
  );
}

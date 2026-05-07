import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import {
  Briefcase, Calendar as CalendarIcon, Users, FileText,
  Settings as SettingsIcon, CreditCard, LayoutDashboard, Scale,
  Timer, BarChart3, TrendingDown, Mic, Shield, MessageSquare,
  FilePen, LogOut, Building2, PhoneCall, ShieldCheck, Landmark,
  Settings2, ClipboardList, Trash2, MailOpen, Sun, Moon,
  Plus, Star, ChevronDown, ChevronLeft,
  MoreHorizontal, X,
} from "lucide-react";
import { NumericKeypad, MobileNumericKeypad } from "@/components/NumericKeypad";
import { GlobalSearch } from "@/components/GlobalSearch";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

/* ─────────────────────── nav data ─────────────────────── */

const NAV_PRIMARY = [
  { href: "/",           label: "لوحة القيادة", icon: LayoutDashboard },
  { href: "/cases",      label: "القضايا",       icon: Briefcase       },
  { href: "/calendar",   label: "الرزنامة",      icon: CalendarIcon    },
  { href: "/clients",    label: "الحرفاء",        icon: Users           },
  { href: "/documents",  label: "الوثائق",        icon: FileText        },
  { href: "/billing",    label: "الفواتير",       icon: CreditCard      },
];

const NAV_SECONDARY = [
  { href: "/opponents",           label: "الخصوم",        icon: Shield       },
  { href: "/consultations",       label: "الاستشارات",    icon: MessageSquare},
  { href: "/communications",      label: "الاتصالات",     icon: PhoneCall    },
  { href: "/correspondances",     label: "المراسلات",     icon: MailOpen     },
  { href: "/time-tracking",       label: "تتبع الوقت",    icon: Timer        },
  { href: "/reports",             label: "التقارير",      icon: BarChart3    },
  { href: "/courts",              label: "المحاكم",       icon: Building2    },
  { href: "/insurance-companies", label: "شركات التأمين", icon: ShieldCheck  },
  { href: "/templates",           label: "النماذج",       icon: FilePen      },
  { href: "/expenses",            label: "المصاريف",      icon: TrendingDown },
];

/* Visible admin items — high frequency */
const NAV_ADMIN = [
  { href: "/users",           label: "إدارة المستخدمين", icon: Users        },
  { href: "/subscription",    label: "الاشتراك",          icon: CreditCard   },
  { href: "/settings",        label: "الإعدادات",         icon: SettingsIcon },
  { href: "/voice-dictation", label: "الإملاء الصوتي",   icon: Mic          },
];

/* Deep system items — low frequency, nested deeper */
const NAV_SYSTEM = [
  { href: "/bank-accounts", label: "الحسابات البنكية",    icon: Landmark     },
  { href: "/legal-config",  label: "الإعدادات القانونية", icon: Settings2    },
  { href: "/audit-logs",    label: "سجل التعديلات",       icon: ClipboardList},
  { href: "/trash",         label: "سلة المحذوفات",       icon: Trash2       },
];

const NAV_MOBILE_BOTTOM = [
  { href: "/",         label: "الرئيسية", icon: LayoutDashboard },
  { href: "/cases",    label: "القضايا",  icon: Briefcase       },
  { href: "/calendar", label: "الرزنامة", icon: CalendarIcon    },
  { href: "/clients",  label: "الحرفاء",  icon: Users           },
];

const QUICK_ACTIONS = [
  { label: "قضية جديدة",   href: "/cases",    icon: Briefcase    },
  { label: "حريف جديد",    href: "/clients",  icon: Users        },
  { label: "فاتورة جديدة", href: "/billing",  icon: CreditCard   },
  { label: "موعد جديد",    href: "/calendar", icon: CalendarIcon },
];

const ALL_ITEMS = [...NAV_PRIMARY, ...NAV_SECONDARY, ...NAV_ADMIN, ...NAV_SYSTEM];

const ROLE_LABELS: Record<string, string> = {
  admin:      "مدير",
  lawyer:     "محامٍ",
  secretary:  "سكرتيرة",
  trainee:    "متربص",
  accountant: "محاسب",
};

/* ─────────────────────── NavItem ─────────────────────── */

type NavItemProps = {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
  collapsed?: boolean;
  favorited?: boolean;
  onToggleFav?: (href: string) => void;
  onNavigate?: () => void;
  indent?: boolean;
};

function NavItem({ href, label, icon: Icon, active, collapsed, favorited, onToggleFav, onNavigate, indent }: NavItemProps) {
  const [hov, setHov] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <Link
        href={href}
        onClick={onNavigate}
        data-nav-active={active ? "true" : undefined}
        className={cn(
          "flex items-center gap-2 rounded-md text-[13px] transition-all duration-150 relative select-none",
          collapsed
            ? "justify-center py-2 w-9 mx-auto"
            : indent
              ? "px-2 py-[5px] mr-1"
              : "px-2.5 py-[5px]",
          active
            ? "text-primary font-medium"
            : "text-muted-foreground/70 hover:text-foreground/90 hover:bg-muted/50 font-normal"
        )}
        style={active ? { backgroundColor: "color-mix(in oklch, var(--primary) 8%, transparent)" } : undefined}
      >
        {/* Right-side accent for active */}
        {active && !collapsed && (
          <span className="absolute right-0 top-1/2 -translate-y-1/2 h-[18px] w-[2.5px] bg-primary rounded-l-full" />
        )}
        <Icon className={cn(
          "shrink-0 transition-colors duration-150",
          collapsed ? "h-[17px] w-[17px]" : "h-[15px] w-[15px]",
          active ? "text-primary" : "text-muted-foreground/50"
        )} />
        {!collapsed && (
          <span className="truncate leading-[1.4]">{label}</span>
        )}
        {/* Collapsed tooltip */}
        {collapsed && hov && (
          <span className="absolute right-full mr-3 px-2.5 py-1.5 bg-popover/95 text-popover-foreground text-xs rounded-lg shadow-xl whitespace-nowrap border border-border z-50 pointer-events-none backdrop-blur-sm">
            {label}
          </span>
        )}
      </Link>

      {/* Favorite pin */}
      {!collapsed && hov && onToggleFav && (
        <button
          onClick={e => { e.preventDefault(); onToggleFav(href); }}
          className={cn(
            "absolute left-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded transition-all duration-100",
            favorited ? "text-primary" : "text-muted-foreground/30 hover:text-muted-foreground/60"
          )}
          title={favorited ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
        >
          <Star className="h-2.5 w-2.5" fill={favorited ? "currentColor" : "none"} />
        </button>
      )}
    </div>
  );
}

/* ─────────────────────── SectionHeader ─────────────────────── */

function SectionHeader({ label, collapsed }: { label: string; collapsed?: boolean }) {
  if (collapsed) return <div className="my-2 mx-2 h-px bg-border/40" />;
  return (
    <div className="flex items-center gap-2 px-2.5 pt-4 pb-1" dir="rtl">
      <span className="text-[10px] font-medium text-muted-foreground/35 shrink-0 leading-none">{label}</span>
      <div className="flex-1 h-px bg-border/30" />
    </div>
  );
}

/* ─────────────────────── ExpandableSection ─────────────────────── */

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
    return <div className="space-y-px">{children}</div>;
  }
  return (
    <div>
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center gap-2 px-2.5 py-[5px] rounded-md text-[13px] transition-all duration-150",
          hasActive && !open
            ? "text-primary/70 font-medium"
            : "text-muted-foreground/55 hover:text-foreground/80 hover:bg-muted/40 font-normal"
        )}
      >
        <Icon className="h-[15px] w-[15px] shrink-0 text-muted-foreground/40" />
        <span className="flex-1 text-right truncate leading-[1.4]">{label}</span>
        <ChevronDown className={cn(
          "h-3 w-3 shrink-0 text-muted-foreground/40 transition-transform duration-200",
          open && "rotate-180"
        )} />
      </button>
      {open && (
        <div className="mt-px mr-3 border-r border-border/30 pr-1 space-y-px">
          {children}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────── Layout ─────────────────────── */

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const [collapsed, setCollapsed] = useState(() =>
    localStorage.getItem("sidebar_collapsed") === "true"
  );
  const [secondaryOpen, setSecondaryOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [systemOpen, setSystemOpen] = useState(false);
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
  const inSystem = NAV_SYSTEM.some(i => isActive(i.href));

  useEffect(() => {
    if (inSecondary) setSecondaryOpen(true);
    if (inAdmin) setAdminOpen(true);
    if (inSystem) { setAdminOpen(true); setSystemOpen(true); }
  }, [location]);

  useEffect(() => {
    localStorage.setItem("sidebar_collapsed", String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    localStorage.setItem("nav_favorites", JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    const t = setTimeout(() => {
      document.querySelector<HTMLElement>("[data-nav-active='true']")
        ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, 60);
    return () => clearTimeout(t);
  }, [location]);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (quickRef.current && !quickRef.current.contains(e.target as Node))
        setQuickOpen(false);
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

  /* ── Sidebar content ── */
  const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Logo — sticky */}
      <div className={cn(
        "flex items-center shrink-0 border-b border-border/60 transition-all duration-300",
        collapsed ? "justify-center px-2 py-3" : "gap-2 px-3.5 py-3"
      )}>
        <div className="bg-primary/10 p-1.5 rounded-md shrink-0">
          <Scale className="h-4 w-4 text-primary" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-primary leading-tight tracking-tight">محامي بلوس</p>
            <p className="text-[10px] text-muted-foreground/50 leading-tight">إدارة المكتب القانوني</p>
          </div>
        )}
      </div>

      {/* Scrollable nav */}
      <nav
        className="flex-1 overflow-y-auto overflow-x-hidden py-1 px-1.5 space-y-px scrollbar-thin scrollbar-thumb-border/50 scrollbar-track-transparent"
        dir="rtl"
      >
        {/* Favorites */}
        {favItems.length > 0 && !collapsed && (
          <>
            <SectionHeader label="المفضلة" />
            <div className="space-y-px">
              {favItems.map(item => (
                <NavItem key={item.href} {...item}
                  active={isActive(item.href)} favorited
                  onToggleFav={toggleFavorite} onNavigate={onNavigate}
                />
              ))}
            </div>
          </>
        )}

        {/* Daily work */}
        <SectionHeader label="العمل اليومي" collapsed={collapsed} />
        <div className="space-y-px">
          {NAV_PRIMARY.map(item => (
            <NavItem key={item.href} {...item}
              active={isActive(item.href)} collapsed={collapsed}
              favorited={favorites.includes(item.href)}
              onToggleFav={toggleFavorite} onNavigate={onNavigate}
            />
          ))}
        </div>

        {/* Services */}
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
            <NavItem key={item.href} {...item}
              active={isActive(item.href)} collapsed={collapsed}
              favorited={favorites.includes(item.href)}
              onToggleFav={!collapsed ? toggleFavorite : undefined}
              onNavigate={onNavigate} indent
            />
          ))}
        </ExpandableSection>

        {/* Admin */}
        <SectionHeader label="الإدارة" collapsed={collapsed} />
        <ExpandableSection
          label="إدارة الفريق"
          icon={Users}
          open={adminOpen}
          onToggle={() => setAdminOpen(o => !o)}
          collapsed={collapsed}
          hasActive={inAdmin}
        >
          {NAV_ADMIN.map(item => (
            <NavItem key={item.href} {...item}
              active={isActive(item.href)} collapsed={collapsed}
              favorited={favorites.includes(item.href)}
              onToggleFav={!collapsed ? toggleFavorite : undefined}
              onNavigate={onNavigate} indent
            />
          ))}
        </ExpandableSection>

        {/* Deep system */}
        <ExpandableSection
          label="النظام"
          icon={Settings2}
          open={systemOpen}
          onToggle={() => setSystemOpen(o => !o)}
          collapsed={collapsed}
          hasActive={inSystem}
        >
          {NAV_SYSTEM.map(item => (
            <NavItem key={item.href} {...item}
              active={isActive(item.href)} collapsed={collapsed}
              favorited={favorites.includes(item.href)}
              onToggleFav={!collapsed ? toggleFavorite : undefined}
              onNavigate={onNavigate} indent
            />
          ))}
        </ExpandableSection>
      </nav>

      {/* Theme toggle — sticky */}
      <div className={cn("shrink-0 px-1.5 pb-1", collapsed && "flex justify-center px-0")}>
        <button
          onClick={toggleTheme}
          title={isDark ? "الوضع الفاتح" : "الوضع الداكن"}
          className={cn(
            "flex items-center gap-2 rounded-md text-[12px] text-muted-foreground/45 hover:text-muted-foreground hover:bg-muted/50 transition-all duration-150",
            collapsed ? "p-2 w-9 justify-center mx-auto" : "w-full px-2.5 py-1.5"
          )}
        >
          {isDark
            ? <Sun className="h-[14px] w-[14px] shrink-0" />
            : <Moon className="h-[14px] w-[14px] shrink-0" />}
          {!collapsed && <span>{isDark ? "الوضع الفاتح" : "الوضع الداكن"}</span>}
        </button>
      </div>

      {/* User section — sticky */}
      <div className={cn("shrink-0 border-t border-border/60 px-1.5 py-1.5", collapsed && "px-0 flex justify-center")}>
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(o => !o)}
            className={cn(
              "flex items-center gap-2 rounded-md hover:bg-muted/50 transition-all duration-150",
              collapsed ? "justify-center p-1.5 w-9 mx-auto" : "w-full px-2 py-1.5"
            )}
          >
            <div className="h-6 w-6 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[11px] font-bold shrink-0">
              {user?.name?.charAt(0) ?? "م"}
            </div>
            {!collapsed && (
              <>
                <div className="flex-1 text-right min-w-0">
                  <p className="text-[12px] font-medium truncate leading-tight text-foreground/80">{user?.name}</p>
                  <p className="text-[10px] text-muted-foreground/50 leading-tight">
                    {ROLE_LABELS[user?.role ?? "lawyer"] ?? user?.roleLabel}
                  </p>
                </div>
                <ChevronDown className="h-3 w-3 text-muted-foreground/30 shrink-0" />
              </>
            )}
          </button>

          {userMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
              <div className="absolute bottom-full mb-1.5 right-0 w-52 bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="px-3.5 py-2.5 border-b border-border/60">
                  <p className="font-semibold text-[13px] leading-tight">{user?.name}</p>
                  <p className="text-[11px] text-muted-foreground/60 mt-0.5">{user?.email}</p>
                </div>
                <div className="py-1">
                  <Link href="/settings" onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2 text-[13px] hover:bg-muted/50 transition-colors">
                    <SettingsIcon className="h-3.5 w-3.5 text-muted-foreground/50" /> الإعدادات
                  </Link>
                  <div className="my-1 h-px bg-border/40 mx-2" />
                  <button
                    onClick={() => { logout(); setUserMenuOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-destructive hover:bg-destructive/10 transition-colors"
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

        {/* Desktop Sidebar */}
        <aside className={cn(
          "hidden lg:flex flex-col fixed top-0 right-0 h-full bg-card border-l border-border/60 z-30 transition-all duration-300 ease-in-out",
          collapsed ? "w-[52px]" : "w-[212px]"
        )}>
          <SidebarContent />

          {/* Collapse button */}
          <button
            onClick={() => setCollapsed(c => !c)}
            className="absolute -left-[11px] top-[68px] h-[22px] w-[22px] bg-card border border-border/80 rounded-full flex items-center justify-center shadow-md hover:bg-muted transition-colors z-10"
            title={collapsed ? "توسيع القائمة" : "طي القائمة"}
          >
            <ChevronLeft className={cn(
              "h-[11px] w-[11px] text-muted-foreground/60 transition-transform duration-200",
              collapsed && "rotate-180"
            )} />
          </button>
        </aside>

        {/* Mobile slide-up sheet */}
        {mobileSheetOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setMobileSheetOpen(false)}
            />
            <div className="absolute inset-x-0 bottom-0 max-h-[86vh] bg-card rounded-t-2xl shadow-2xl border-t border-border/60 flex flex-col">
              {/* Drag handle */}
              <div className="shrink-0 flex justify-center pt-2.5 pb-1">
                <div className="h-1 w-8 bg-border/60 rounded-full" />
              </div>
              <div className="flex items-center justify-between px-4 pb-2.5 shrink-0">
                <button onClick={() => setMobileSheetOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors text-muted-foreground/60">
                  <X className="h-4 w-4" />
                </button>
                <p className="text-[13px] font-semibold">القائمة الكاملة</p>
                <div className="w-7" />
              </div>

              <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-5" dir="rtl">
                {/* Services */}
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground/35 px-1 mb-2">الخدمات</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {NAV_SECONDARY.map(item => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      return (
                        <Link key={item.href} href={item.href}
                          onClick={() => setMobileSheetOpen(false)}
                          className={cn(
                            "flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl text-[11px] transition-all",
                            active
                              ? "text-primary font-medium"
                              : "bg-muted/40 text-muted-foreground/70 hover:bg-muted/60"
                          )}
                          style={active ? { backgroundColor: "color-mix(in oklch, var(--primary) 8%, transparent)" } : undefined}
                        >
                          <Icon className={cn("h-5 w-5", active ? "text-primary" : "text-muted-foreground/50")} />
                          <span className="text-center leading-tight">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* Admin */}
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground/35 px-1 mb-2">الإدارة</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[...NAV_ADMIN, ...NAV_SYSTEM].map(item => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      return (
                        <Link key={item.href} href={item.href}
                          onClick={() => setMobileSheetOpen(false)}
                          className={cn(
                            "flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl text-[11px] transition-all",
                            active
                              ? "text-primary font-medium"
                              : "bg-muted/40 text-muted-foreground/70 hover:bg-muted/60"
                          )}
                          style={active ? { backgroundColor: "color-mix(in oklch, var(--primary) 8%, transparent)" } : undefined}
                        >
                          <Icon className={cn("h-5 w-5", active ? "text-primary" : "text-muted-foreground/50")} />
                          <span className="text-center leading-tight">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* Quick actions */}
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground/35 px-1 mb-2">إجراءات سريعة</p>
                  <div className="grid grid-cols-2 gap-2">
                    {QUICK_ACTIONS.map(a => {
                      const Icon = a.icon;
                      return (
                        <Link key={a.href} href={a.href}
                          onClick={() => setMobileSheetOpen(false)}
                          className="flex items-center gap-2 p-3 rounded-xl text-[13px] font-medium transition-all"
                          style={{ backgroundColor: "color-mix(in oklch, var(--primary) 8%, transparent)", color: "var(--primary)" }}
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

        {/* Main area */}
        <div className={cn(
          "flex-1 flex flex-col min-h-screen transition-all duration-300",
          collapsed ? "lg:mr-[52px]" : "lg:mr-[212px]"
        )}>

          {/* Topbar */}
          <header className="sticky top-0 z-20 bg-card/90 backdrop-blur-md border-b border-border/50">
            <div className="flex items-center h-[50px] px-4 gap-3">
              {/* Mobile logo */}
              <Link href="/" className="flex items-center gap-2 lg:hidden">
                <div className="bg-primary/10 p-1 rounded-md">
                  <Scale className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-[13px] font-bold text-primary">محامي بلوس</span>
              </Link>

              {/* Desktop breadcrumb */}
              <div className="hidden lg:flex items-center gap-1.5 text-[12px] text-muted-foreground/50">
                <ChevronLeft className="h-3 w-3" />
                <span className="font-medium text-foreground/70">{currentLabel}</span>
              </div>

              <div className="flex-1" />
              <GlobalSearch />
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 p-4 sm:p-6 pb-24 lg:pb-6">
            <div className="max-w-6xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav
        className="fixed bottom-0 inset-x-0 z-30 lg:hidden border-t border-border/50 bg-card/95 backdrop-blur-md"
        dir="rtl"
      >
        <div className="flex h-[56px]">
          {NAV_MOBILE_BOTTOM.map(item => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-[3px] text-[9px] transition-all duration-150",
                  active ? "text-primary font-medium" : "text-muted-foreground/50"
                )}
              >
                <Icon className={cn("h-[18px] w-[18px] transition-transform duration-150", active && "scale-110")} />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setMobileSheetOpen(true)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-[3px] text-[9px] transition-all duration-150",
              (inSecondary || inAdmin || inSystem) ? "text-primary font-medium" : "text-muted-foreground/50"
            )}
          >
            <MoreHorizontal className={cn(
              "h-[18px] w-[18px] transition-transform duration-150",
              (inSecondary || inAdmin || inSystem) && "scale-110"
            )} />
            <span>المزيد</span>
          </button>
        </div>
      </nav>

      {/* Quick Actions FAB — desktop */}
      <div ref={quickRef} className="fixed bottom-5 left-5 z-40 hidden lg:block">
        {quickOpen && (
          <div className="absolute bottom-11 left-0 mb-1 bg-card/95 backdrop-blur-md border border-border/60 rounded-xl shadow-2xl overflow-hidden w-40">
            {QUICK_ACTIONS.map(a => {
              const Icon = a.icon;
              return (
                <Link key={a.href} href={a.href}
                  onClick={() => setQuickOpen(false)}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] hover:bg-muted/50 transition-colors"
                  dir="rtl"
                >
                  <Icon className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
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
            "h-9 w-9 rounded-full flex items-center justify-center shadow-lg transition-all duration-200",
            quickOpen
              ? "bg-primary/80 text-primary-foreground rotate-45 scale-95"
              : "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-xl hover:scale-105"
          )}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <NumericKeypad />
      <MobileNumericKeypad />
    </div>
  );
}

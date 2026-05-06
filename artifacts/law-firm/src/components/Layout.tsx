import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Menu, X, Briefcase, Calendar as CalendarIcon,
  Users, FileText, Settings as SettingsIcon, CreditCard,
  LayoutDashboard, Scale, Timer, BarChart3, TrendingDown, Mic,
  Shield, MessageSquare, FilePen, LogOut, ChevronDown,
  Building2, PhoneCall, ShieldCheck, Landmark, Settings2,
  ClipboardList, Trash2, ChevronLeft,
} from "lucide-react";
import { NumericKeypad, MobileNumericKeypad } from "@/components/NumericKeypad";
import { GlobalSearch } from "@/components/GlobalSearch";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const navGroups = [
  {
    label: "الرئيسية",
    items: [
      { href: "/", label: "لوحة القيادة", icon: LayoutDashboard },
      { href: "/cases", label: "القضايا", icon: Briefcase },
      { href: "/clients", label: "الحرفاء", icon: Users },
      { href: "/calendar", label: "الرزنامة", icon: CalendarIcon },
      { href: "/opponents", label: "الخصوم", icon: Shield },
      { href: "/consultations", label: "الاستشارات", icon: MessageSquare },
      { href: "/communications", label: "الاتصالات", icon: PhoneCall },
    ],
  },
  {
    label: "المالية",
    items: [
      { href: "/billing", label: "الفوترة", icon: CreditCard },
      { href: "/bank-accounts", label: "الحسابات البنكية", icon: Landmark },
      { href: "/expenses", label: "المصاريف", icon: TrendingDown },
      { href: "/time-tracking", label: "تتبع الوقت", icon: Timer },
      { href: "/reports", label: "التقارير", icon: BarChart3 },
    ],
  },
  {
    label: "المراجع",
    items: [
      { href: "/courts", label: "المحاكم", icon: Building2 },
      { href: "/insurance-companies", label: "شركات التأمين", icon: ShieldCheck },
      { href: "/templates", label: "النماذج", icon: FilePen },
      { href: "/documents", label: "الوثائق", icon: FileText },
    ],
  },
  {
    label: "النظام",
    items: [
      { href: "/voice-dictation", label: "الإملاء الصوتي", icon: Mic },
      { href: "/legal-config", label: "الإعدادات القانونية", icon: Settings2 },
      { href: "/audit-logs", label: "سجل التعديلات", icon: ClipboardList },
      { href: "/trash", label: "سلة المحذوفات", icon: Trash2 },
      { href: "/settings", label: "الإعدادات", icon: SettingsIcon },
    ],
  },
];

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-primary/20 text-primary",
  lawyer: "bg-blue-500/20 text-blue-400",
  secretary: "bg-green-500/20 text-green-400",
  trainee: "bg-orange-500/20 text-orange-400",
  accountant: "bg-purple-500/20 text-purple-400",
};

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  const isActive = (href: string) =>
    href === "/" ? location === "/" : location.startsWith(href);

  /* ── Sidebar content (shared between desktop + mobile) ── */
  const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn(
        "flex items-center gap-2.5 px-4 py-4 border-b border-border shrink-0",
        collapsed && "justify-center px-2"
      )}>
        <div className="bg-primary/10 p-2 rounded-xl shrink-0">
          <Scale className="h-5 w-5 text-primary" />
        </div>
        {!collapsed && (
          <div>
            <p className="text-sm font-bold text-primary leading-tight">محامي بلوس</p>
            <p className="text-[10px] text-muted-foreground">إدارة المكتب القانوني</p>
          </div>
        )}
      </div>

      {/* Navigation groups */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {navGroups.map(group => (
          <div key={group.label}>
            {!collapsed && (
              <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest px-3 mb-1.5">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(item => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-150 group relative",
                      collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {/* Tooltip on collapsed */}
                    {collapsed && (
                      <span className="absolute right-full mr-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-lg shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-border z-50">
                        {item.label}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User section */}
      <div className={cn("shrink-0 border-t border-border p-3", collapsed && "px-2")}>
        <div className={cn("relative", collapsed && "flex justify-center")}>
          <button
            onClick={() => setUserMenuOpen(o => !o)}
            className={cn(
              "flex items-center gap-2.5 rounded-xl hover:bg-muted/70 transition-colors w-full",
              collapsed ? "justify-center p-2" : "px-3 py-2.5"
            )}
          >
            <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold shrink-0">
              {user?.name?.charAt(0) ?? "م"}
            </div>
            {!collapsed && (
              <>
                <div className="flex-1 text-right min-w-0">
                  <p className="text-xs font-semibold truncate">{user?.name}</p>
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full", ROLE_COLORS[user?.role ?? "lawyer"] ?? ROLE_COLORS.lawyer)}>
                    {user?.roleLabel}
                  </span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </>
            )}
          </button>

          {userMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
              <div className="absolute bottom-full mb-2 right-0 w-52 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="p-3 border-b border-border">
                  <p className="font-semibold text-sm">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <Link href="/settings" onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted transition-colors">
                  <SettingsIcon className="h-4 w-4 text-muted-foreground" /> الإعدادات
                </Link>
                <Link href="/audit-logs" onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted transition-colors">
                  <ClipboardList className="h-4 w-4 text-muted-foreground" /> سجل التعديلات
                </Link>
                <button
                  onClick={() => { logout(); setUserMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" /> تسجيل الخروج
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground font-sans" dir="rtl">
      <div className="flex min-h-screen">

        {/* ── Desktop Sidebar (RIGHT side in RTL = natural start) ── */}
        <aside className={cn(
          "hidden lg:flex flex-col fixed top-0 right-0 h-full bg-card border-l border-border z-30 transition-all duration-300",
          collapsed ? "w-[60px]" : "w-[220px]"
        )}>
          <SidebarContent />

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(c => !c)}
            className="absolute -left-3 top-20 h-6 w-6 bg-card border border-border rounded-full flex items-center justify-center shadow-sm hover:bg-muted transition-colors z-10"
            title={collapsed ? "توسيع القائمة" : "طي القائمة"}
          >
            <ChevronLeft className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", collapsed && "rotate-180")} />
          </button>
        </aside>

        {/* ── Mobile Drawer (slides from right) ── */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
            <div className="absolute top-0 right-0 h-full w-72 bg-card border-l border-border shadow-2xl">
              <button
                className="absolute top-3 left-3 p-2 rounded-xl hover:bg-muted transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        )}

        {/* ── Main area ── */}
        <div className={cn(
          "flex-1 flex flex-col min-h-screen transition-all duration-300",
          collapsed ? "lg:mr-[60px]" : "lg:mr-[220px]"
        )}>

          {/* Top bar (mobile + search) */}
          <header className="sticky top-0 z-20 bg-card/95 backdrop-blur border-b border-border">
            <div className="flex items-center h-14 px-4 gap-3">
              {/* Mobile: logo + hamburger */}
              <button
                className="p-2 rounded-xl text-muted-foreground hover:bg-muted/60 transition-colors lg:hidden"
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>
              <Link href="/" className="flex items-center gap-2 lg:hidden">
                <Scale className="h-4 w-4 text-primary" />
                <span className="text-sm font-bold text-primary">محامي بلوس</span>
              </Link>

              {/* Desktop: current section breadcrumb */}
              <div className="hidden lg:block text-sm text-muted-foreground">
                {navGroups.flatMap(g => g.items).find(i => isActive(i.href))?.label ?? "لوحة القيادة"}
              </div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Search */}
              <GlobalSearch />
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 p-4 sm:p-6">
            <div className="max-w-6xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>

      <NumericKeypad />
      <MobileNumericKeypad />
    </div>
  );
}

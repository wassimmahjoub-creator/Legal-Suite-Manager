import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Menu, X, Briefcase, Calendar as CalendarIcon,
  Users, FileText, Settings as SettingsIcon, CreditCard,
  LayoutDashboard, Scale, Timer, BarChart3, TrendingDown, Mic,
  Shield, MessageSquare, FilePen, LogOut, ChevronDown
} from "lucide-react";
import { NumericKeypad, MobileNumericKeypad } from "@/components/NumericKeypad";
import { GlobalSearch } from "@/components/GlobalSearch";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const navGroups = [
  {
    label: "الرئيسية",
    items: [
      { href: "/", label: "القيادة", icon: LayoutDashboard },
      { href: "/cases", label: "القضايا", icon: Briefcase },
      { href: "/clients", label: "الحرفاء", icon: Users },
      { href: "/calendar", label: "الرزنامة", icon: CalendarIcon },
      { href: "/opponents", label: "الخصوم", icon: Shield },
      { href: "/consultations", label: "الاستشارات", icon: MessageSquare },
    ],
  },
  {
    label: "المالية",
    items: [
      { href: "/billing", label: "الفوترة", icon: CreditCard },
      { href: "/expenses", label: "المصاريف", icon: TrendingDown },
      { href: "/time-tracking", label: "الوقت", icon: Timer },
      { href: "/reports", label: "التقارير", icon: BarChart3 },
    ],
  },
  {
    label: "أخرى",
    items: [
      { href: "/voice-dictation", label: "الإملاء", icon: Mic },
      { href: "/templates", label: "النماذج", icon: FilePen },
      { href: "/documents", label: "الوثائق", icon: FileText },
      { href: "/settings", label: "الإعدادات", icon: SettingsIcon },
    ],
  },
];

const allNavItems = navGroups.flatMap(g => g.items);

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  const isActive = (href: string) =>
    href === "/" ? location === "/" : location.startsWith(href);

  const ROLE_COLORS: Record<string, string> = {
    admin: "bg-primary/20 text-primary",
    lawyer: "bg-blue-500/20 text-blue-400",
    secretary: "bg-green-500/20 text-green-400",
    trainee: "bg-orange-500/20 text-orange-400",
    accountant: "bg-purple-500/20 text-purple-400",
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="flex h-14 items-center px-4 gap-3">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0 ml-2">
            <div className="bg-primary/10 p-1.5 rounded-lg">
              <Scale className="h-4 w-4 text-primary" />
            </div>
            <span className="text-base font-bold text-primary hidden sm:block">محامي بلوس</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-0.5 flex-1 overflow-x-auto">
            {allNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex items-center gap-1.5 text-xs px-2.5 py-2 rounded-lg transition-all duration-150 whitespace-nowrap shrink-0",
                    active
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right side: Search + User */}
          <div className="flex items-center gap-2 mr-auto lg:mr-0 shrink-0">
            <GlobalSearch />

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(o => !o)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-muted/60 transition-colors"
              >
                <div className="h-7 w-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                  {user?.name?.charAt(0) ?? "م"}
                </div>
                <div className="hidden sm:block text-right leading-tight">
                  <p className="text-xs font-semibold truncate max-w-[90px]">{user?.name}</p>
                  <p className={`text-[10px] px-1.5 rounded-full ${ROLE_COLORS[user?.role ?? "lawyer"] ?? ROLE_COLORS.lawyer}`}>{user?.roleLabel}</p>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute top-full left-0 mt-1 w-48 bg-card border border-border rounded-xl shadow-lg z-20 overflow-hidden">
                    <div className="p-3 border-b border-border">
                      <p className="font-semibold text-sm">{user?.name}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                    <Link href="/settings" onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted transition-colors">
                      <SettingsIcon className="h-4 w-4 text-muted-foreground" /> الإعدادات
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

            {/* Mobile menu button */}
            <button
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="absolute top-0 right-0 h-full w-72 bg-card border-l border-border shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-primary" />
                <span className="text-base font-bold text-primary">محامي بلوس</span>
              </div>
              <button className="p-2 rounded-lg hover:bg-muted transition-colors" onClick={() => setMobileOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3 space-y-4">
              {navGroups.map(group => (
                <div key={group.label}>
                  <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider px-3 mb-1">
                    {group.label}
                  </p>
                  <div className="space-y-0.5">
                    {group.items.map(item => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                            active
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
            <div className="p-4 border-t border-border">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-9 w-9 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
                  {user?.name?.charAt(0) ?? "م"}
                </div>
                <div>
                  <p className="text-sm font-semibold">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.roleLabel}</p>
                </div>
              </div>
              <button onClick={logout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                <LogOut className="h-4 w-4" /> تسجيل الخروج
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 px-4 py-6 max-w-7xl mx-auto w-full">
        {children}
      </main>

      <NumericKeypad />
      <MobileNumericKeypad />
    </div>
  );
}

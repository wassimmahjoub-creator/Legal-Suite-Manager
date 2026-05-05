import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Menu, X, Briefcase, Calendar as CalendarIcon,
  Users, FileText, Settings as SettingsIcon, CreditCard,
  LayoutDashboard, Scale, Timer, BarChart3, TrendingDown, Mic
} from "lucide-react";
import { NumericKeypad, MobileNumericKeypad } from "@/components/NumericKeypad";
import { cn } from "@/lib/utils";

const navGroups = [
  {
    label: "الرئيسية",
    items: [
      { href: "/", label: "القيادة", icon: LayoutDashboard },
      { href: "/cases", label: "القضايا", icon: Briefcase },
      { href: "/clients", label: "الحرفاء", icon: Users },
      { href: "/calendar", label: "الرزنامة", icon: CalendarIcon },
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
      { href: "/documents", label: "الوثائق", icon: FileText },
      { href: "/settings", label: "الإعدادات", icon: SettingsIcon },
    ],
  },
];

const allNavItems = navGroups.flatMap(g => g.items);

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? location === "/" : location.startsWith(href);

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

          {/* Mobile menu button */}
          <div className="flex-1 flex justify-end lg:hidden">
            <button
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
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
            <div className="p-4 border-t border-border text-xs text-muted-foreground text-center">
              محامي بلوس © 2026
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

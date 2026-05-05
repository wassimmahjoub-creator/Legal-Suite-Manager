import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Search, Menu, X, Briefcase, Calendar as CalendarIcon,
  Users, FileText, Settings as SettingsIcon, CreditCard,
  LayoutDashboard, Scale
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { NumericKeypad, MobileNumericKeypad } from "@/components/NumericKeypad";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "لوحة القيادة", icon: LayoutDashboard },
  { href: "/cases", label: "القضايا", icon: Briefcase },
  { href: "/calendar", label: "الرزنامة", icon: CalendarIcon },
  { href: "/clients", label: "الحرفاء", icon: Users },
  { href: "/billing", label: "الفوترة", icon: CreditCard },
  { href: "/documents", label: "الوثائق", icon: FileText },
  { href: "/settings", label: "الإعدادات", icon: SettingsIcon },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="flex h-16 items-center justify-between px-4 gap-4">

          {/* Right: Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="bg-primary/10 p-1.5 rounded-lg">
              <Scale className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xl font-bold text-primary hidden sm:block">محامي بلوس</span>
          </Link>

          {/* Center: Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-0.5 flex-1 justify-center">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg transition-all duration-150",
                    isActive
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Left: Search + Mobile menu */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden md:flex relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="search"
                placeholder="بحث..."
                className="w-44 bg-muted/50 border-none pr-9 pl-3 rounded-lg h-9 text-sm focus-visible:ring-1 focus-visible:ring-primary focus-visible:w-64 transition-all"
              />
            </div>
            <button
              className="lg:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
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
                <span className="text-lg font-bold text-primary">محامي بلوس</span>
              </div>
              <button
                className="p-2 rounded-lg hover:bg-muted transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 p-4 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
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

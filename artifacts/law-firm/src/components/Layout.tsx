import { Link, useLocation } from "wouter";
import { Search, Menu, Briefcase, Calendar as CalendarIcon, Users, FileText, Settings as SettingsIcon, CreditCard, LayoutDashboard } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans" dir="rtl">
      <header className="sticky top-0 z-40 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-16 items-center justify-between px-4 w-full max-w-full">
          
          {/* Right Side (Start in RTL) - Navigation */}
          <div className="flex items-center gap-6">
            <div className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className={cn(
                        "text-sm gap-2 transition-all duration-200 rounded-full px-4",
                        isActive ? "bg-primary/10 text-primary hover:bg-primary/20 font-semibold" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </div>
            
            {/* Mobile Menu */}
            <div className="lg:hidden flex items-center">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Center - Search */}
          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="بحث عن قضية، حريف..."
                className="w-full bg-muted/50 border-none pl-4 pr-10 rounded-full focus-visible:ring-1 focus-visible:ring-primary h-10"
              />
            </div>
          </div>

          {/* Left Side (End in RTL) - Logo */}
          <div className="flex items-center">
            <Link href="/">
              <span className="text-2xl font-bold text-primary cursor-pointer tracking-tight">
                محامي بلوس
              </span>
            </Link>
          </div>
          
        </div>
      </header>

      <main className="flex-1 container py-8 px-4 w-full max-w-full mx-auto">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      <NumericKeypad />
      <MobileNumericKeypad />
    </div>
  );
}
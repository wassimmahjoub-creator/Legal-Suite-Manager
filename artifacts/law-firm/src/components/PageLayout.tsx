import { cn } from "@/lib/utils";

interface PageLayoutProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function PageLayout({
  title,
  subtitle,
  actions,
  children,
  className,
  noPadding = false,
}: PageLayoutProps) {
  return (
    <div className={cn("space-y-5", className)}>
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-0.5 min-w-0">
          <h1 className="text-xl font-semibold leading-tight text-foreground truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-border" />

      {/* Content */}
      <div className={noPadding ? "" : ""}>{children}</div>
    </div>
  );
}

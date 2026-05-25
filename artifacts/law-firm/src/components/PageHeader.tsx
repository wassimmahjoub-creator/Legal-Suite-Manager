import { ArrowRight } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  back?: boolean;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, back = false, actions }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        {back && (
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-1 transition-colors"
          >
            <ArrowRight className="h-3.5 w-3.5" /> رجوع
          </button>
        )}
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && (
          <p className="text-muted-foreground text-sm mt-0.5">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0 pt-1">{actions}</div>
      )}
    </div>
  );
}

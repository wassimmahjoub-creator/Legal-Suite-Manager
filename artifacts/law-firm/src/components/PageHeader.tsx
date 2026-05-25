import { ArrowRight } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  back?: boolean;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, back = false, actions }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-2">
        {back && (
          <button
            onClick={() => window.history.back()}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
        )}
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle && (
            <p className="text-muted-foreground text-sm mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0 pt-1">{actions}</div>
      )}
    </div>
  );
}

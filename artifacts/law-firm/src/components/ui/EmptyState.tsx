import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  illustration?: ReactNode;
  title: string;
  description: string;
  primaryAction?: { label: string; onClick: () => void; icon?: ReactNode };
  secondaryAction?: { label: string; onClick: () => void; icon?: ReactNode };
  helpLink?: { label: string; href: string };
  className?: string;
}

export function EmptyState({
  illustration,
  title,
  description,
  primaryAction,
  secondaryAction,
  helpLink,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center py-16 px-6 gap-5",
      className
    )}>
      {illustration && (
        <div className="w-40 h-40 flex items-center justify-center opacity-80">
          {illustration}
        </div>
      )}

      <div className="space-y-2 max-w-sm">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>

      {(primaryAction || secondaryAction) && (
        <div className="flex items-center gap-3 flex-wrap justify-center">
          {primaryAction && (
            <button
              onClick={primaryAction.onClick}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              {primaryAction.icon}
              {primaryAction.label}
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg border border-border bg-card text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              {secondaryAction.icon}
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}

      {helpLink && (
        <a
          href={helpLink.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
        >
          {helpLink.label}
        </a>
      )}
    </div>
  );
}

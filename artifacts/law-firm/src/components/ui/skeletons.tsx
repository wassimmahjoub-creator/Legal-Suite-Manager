import { cn } from "@/lib/utils"
import { Skeleton } from "./skeleton"

/* ── SkeletonRow ───────────────────────────────────────────── */
interface SkeletonRowProps {
  cols?: number
  className?: string
}
export function SkeletonRow({ cols = 4, className }: SkeletonRowProps) {
  const WIDTHS = ["w-24", "w-full", "w-32", "w-20", "w-16", "w-28", "w-40"]
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className={cn("h-4", WIDTHS[i % WIDTHS.length])} />
      ))}
    </div>
  )
}

/* ── SkeletonCard ──────────────────────────────────────────── */
interface SkeletonCardProps {
  withButton?: boolean
  className?: string
}
export function SkeletonCard({ withButton = true, className }: SkeletonCardProps) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-5 space-y-4", className)}>
      <div className="flex items-start gap-3">
        <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3.5 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-3.5 w-full" />
      <Skeleton className="h-3.5 w-4/5" />
      {withButton && (
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-16 rounded-lg" />
        </div>
      )}
    </div>
  )
}

/* ── SkeletonTable ─────────────────────────────────────────── */
interface SkeletonTableProps {
  rows?: number
  cols?: number
  className?: string
}
export function SkeletonTable({ rows = 5, cols = 4, className }: SkeletonTableProps) {
  const HEADER_WIDTHS = ["w-24", "w-full", "w-32", "w-28", "w-20", "w-24", "w-16", "w-20"]
  const ROW_WIDTHS    = ["w-20", "w-full", "w-28", "w-24", "w-16", "w-20", "w-12", "w-16"]
  return (
    <div className={cn("rounded-2xl border border-border bg-card overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-3 bg-muted/40 border-b border-border">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className={cn("h-4 shrink-0", HEADER_WIDTHS[i % HEADER_WIDTHS.length])} />
        ))}
      </div>
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="flex items-center gap-4 px-4 py-3.5 border-b border-border/40 last:border-0"
        >
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton
              key={c}
              className={cn("h-4 shrink-0", ROW_WIDTHS[(c + r * 2) % ROW_WIDTHS.length])}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

/* ── SkeletonForm ──────────────────────────────────────────── */
interface SkeletonFormProps {
  fields?: number
  className?: string
}
export function SkeletonForm({ fields = 4, className }: SkeletonFormProps) {
  return (
    <div className={cn("space-y-5 p-6", className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ))}
      <div className="flex gap-2 pt-3">
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="h-9 w-20 rounded-lg" />
      </div>
    </div>
  )
}

/* ── SkeletonClientPage ─────────────────────────────────────
   Pour CaseDetail / ClientPage — header + onglets + contenu
   ──────────────────────────────────────────────────────── */
interface SkeletonClientPageProps {
  tabs?: number
  className?: string
}
export function SkeletonClientPage({ tabs = 6, className }: SkeletonClientPageProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Header card */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start gap-4">
          <Skeleton className="h-14 w-14 rounded-2xl shrink-0" />
          <div className="flex-1 space-y-2.5">
            <Skeleton className="h-6 w-2/5" />
            <Skeleton className="h-4 w-1/3" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Skeleton className="h-8 w-20 rounded-lg" />
            <Skeleton className="h-8 w-16 rounded-lg" />
          </div>
        </div>
      </div>
      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {Array.from({ length: tabs }).map((_, i) => (
          <Skeleton key={i} className={cn("h-9 rounded-xl shrink-0", i === 0 ? "w-28" : "w-20")} />
        ))}
      </div>
      {/* Content panel */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-3 border-b border-border/40 last:border-0">
            <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}

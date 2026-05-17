import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/context/LocaleContext";

/**
 * Directional icons whose semantic meaning flips between LTR and RTL.
 *
 * Example: ChevronRight means "next" in LTR but "previous" in RTL.
 * Wrap these icons with <DirectionalIcon /> to auto-mirror them.
 *
 * Usage:
 *   <DirectionalIcon icon={ChevronRight} className="h-4 w-4" />
 *
 * The icon is horizontally flipped in RTL via `scale-x-[-1]`.
 */
interface DirectionalIconProps {
  icon: LucideIcon;
  className?: string;
  /** If true, the icon is NOT flipped — useful when an icon already
   *  has RTL semantics (e.g., a custom Arabic arrow). */
  noFlip?: boolean;
}

export function DirectionalIcon({ icon: Icon, className, noFlip }: DirectionalIconProps) {
  const locale = useLocale();
  const shouldFlip = !noFlip && locale === "ar";

  return (
    <Icon
      className={cn(
        "transition-transform duration-200",
        shouldFlip && "scale-x-[-1]",
        className,
      )}
    />
  );
}

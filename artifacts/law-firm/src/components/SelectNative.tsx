import React from "react";
import { cn } from "@/lib/utils";

interface SelectNativeProps {
  value: string;
  onChange: (e: { target: { value: string } }) => void;
  children: React.ReactNode;
  className?: string;
  id?: string;
  dir?: string;
}

export function SelectNative({ value, onChange, children, className, id, dir }: SelectNativeProps) {
  return (
    <select
      id={id}
      dir={dir}
      value={value}
      onChange={e => onChange({ target: { value: e.target.value } })}
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm",
        "focus:outline-none focus:ring-1 focus:ring-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "cursor-pointer appearance-none",
        "[&>option]:bg-popover [&>option]:text-popover-foreground",
        className
      )}
    >
      {children}
    </select>
  );
}

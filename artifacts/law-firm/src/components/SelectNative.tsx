import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const EMPTY = "__empty__";

interface OptionData { value: string; label: string; }

function extractOptions(children: React.ReactNode): OptionData[] {
  const opts: OptionData[] = [];
  React.Children.forEach(children, child => {
    if (React.isValidElement(child) && child.type === "option") {
      const p = child.props as { value?: string; children?: React.ReactNode };
      opts.push({ value: p.value ?? "", label: String(p.children ?? "") });
    }
  });
  return opts;
}

interface SelectNativeProps {
  value: string;
  onChange: (e: { target: { value: string } }) => void;
  children: React.ReactNode;
  className?: string;
  id?: string;
  dir?: string;
}

export function SelectNative({ value, onChange, children, className, id }: SelectNativeProps) {
  const options = extractOptions(children);
  const internal = value === "" ? EMPTY : value;

  return (
    <Select
      value={internal}
      onValueChange={v => onChange({ target: { value: v === EMPTY ? "" : v } })}
    >
      <SelectTrigger id={id} className={cn("cursor-pointer", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="z-[10000]">
        {options.map(opt => (
          <SelectItem
            key={opt.value === "" ? EMPTY : opt.value}
            value={opt.value === "" ? EMPTY : opt.value}
          >
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

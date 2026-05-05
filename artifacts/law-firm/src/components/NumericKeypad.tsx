import { useKeypad } from "../context/KeypadContext";
import { Button } from "@/components/ui/button";
import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";

export function NumericKeypad() {
  const { focusedInputId, handleKeypadPress } = useKeypad();

  if (!focusedInputId) return null;

  const keys = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    [".", "0", "backspace"]
  ];

  return (
    <div 
      className="numeric-keypad fixed right-0 top-1/2 -translate-y-1/2 mr-6 z-50 bg-card border border-border shadow-xl rounded-xl p-4 w-64 md:block hidden animate-in slide-in-from-right fade-in"
      data-testid="numeric-keypad"
      dir="ltr"
    >
      <div className="grid grid-cols-3 gap-2">
        {keys.flat().map((key) => (
          <Button
            key={key}
            variant="secondary"
            size="lg"
            className={cn(
              "h-14 text-xl font-medium bg-muted/50 hover:bg-primary/20 hover:text-primary transition-colors",
              key === "backspace" && "text-destructive hover:text-destructive hover:bg-destructive/20"
            )}
            onClick={(e) => {
              e.preventDefault();
              handleKeypadPress(key);
            }}
            data-testid={`keypad-${key}`}
          >
            {key === "backspace" ? <Delete className="h-6 w-6" /> : key}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function MobileNumericKeypad() {
  const { focusedInputId, handleKeypadPress } = useKeypad();

  if (!focusedInputId) return null;

  const keys = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    [".", "0", "backspace"]
  ];

  return (
    <div 
      className="numeric-keypad fixed inset-x-0 bottom-0 z-50 bg-card border-t border-border shadow-2xl p-4 pb-8 md:hidden animate-in slide-in-from-bottom fade-in"
      data-testid="mobile-numeric-keypad"
      dir="ltr"
    >
      <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto">
        {keys.flat().map((key) => (
          <Button
            key={key}
            variant="secondary"
            size="lg"
            className={cn(
              "h-16 text-2xl font-medium bg-muted/50 hover:bg-primary/20 hover:text-primary transition-colors rounded-xl",
              key === "backspace" && "text-destructive hover:text-destructive hover:bg-destructive/20"
            )}
            onClick={(e) => {
              e.preventDefault();
              handleKeypadPress(key);
            }}
            onPointerDown={(e) => e.preventDefault()}
          >
            {key === "backspace" ? <Delete className="h-6 w-6" /> : key}
          </Button>
        ))}
      </div>
    </div>
  );
}
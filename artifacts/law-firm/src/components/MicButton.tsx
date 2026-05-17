import { useCallback } from "react";
import { Mic, MicOff } from "lucide-react";
import { useSpeechInput } from "@/hooks/useSpeechInput";
import { cn } from "@/lib/utils";
import { FEATURE_DICTATION } from "@/config/features";

interface MicButtonProps {
  onResult: (text: string) => void;
  className?: string;
}

export function MicButton({ onResult, className }: MicButtonProps) {
  const appendResult = useCallback(
    (text: string) => onResult(text),
    [onResult]
  );
  const { listening, supported, toggle } = useSpeechInput({ onResult: appendResult });

  if (!FEATURE_DICTATION) return null;
  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      title={listening ? "إيقاف الإملاء" : "إملاء صوتي"}
      className={cn(
        "shrink-0 h-9 w-9 rounded-lg flex items-center justify-center transition-all",
        listening
          ? "bg-red-500/20 text-red-400 ring-1 ring-red-500/40 animate-pulse"
          : "bg-muted/60 text-muted-foreground hover:bg-primary/10 hover:text-primary",
        className
      )}
    >
      {listening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
    </button>
  );
}

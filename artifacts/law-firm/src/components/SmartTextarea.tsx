import { useState, useCallback } from "react";
import { Mic, MicOff, Sparkles, RotateCcw } from "lucide-react";
import { useSpeechInput } from "@/hooks/useSpeechInput";
import { authFetch } from "@/lib/authFetch";
import { cn } from "@/lib/utils";
import { FEATURE_DICTATION } from "@/config/features";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

interface SmartTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  id?: string;
  aiContext?: string;
}

export function SmartTextarea({
  value, onChange, placeholder, rows = 3,
  className, id, aiContext,
}: SmartTextareaProps) {
  const [enhancing, setEnhancing] = useState(false);
  const [original, setOriginal] = useState<string | null>(null);
  const [enhanced, setEnhanced] = useState(false);
  const [interimText, setInterimText] = useState("");

  const appendResult = useCallback(
    (text: string) => onChange(value ? value + " " + text : text),
    [value, onChange]
  );

  const { listening, supported, toggle } = useSpeechInput({
    onResult: appendResult,
    onInterim: setInterimText,
  });

  async function enhance() {
    if (!value.trim() || enhancing) return;
    setEnhancing(true);
    setOriginal(value);
    setEnhanced(false);
    try {
      const r = await authFetch(`${BASE}/api/voice-dictation/enhance`, {
        method: "POST",
        body: JSON.stringify({ text: value, documentType: aiContext ?? "ملاحظات" }),
      });
      if (r.ok) {
        const data = await r.json();
        if (data.enhanced) { onChange(data.enhanced); setEnhanced(true); }
      }
    } finally {
      setEnhancing(false);
    }
  }

  function revert() {
    if (original !== null) { onChange(original); setOriginal(null); setEnhanced(false); }
  }

  const showAI = !!aiContext && value.trim().length >= 15;

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <textarea
          id={id}
          rows={rows}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          className={cn(
            "w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm",
            "focus:outline-none focus:ring-1 focus:ring-primary resize-none",
            listening ? "ring-1 ring-red-400/60" : "",
            FEATURE_DICTATION && supported ? "pl-10" : "",
            className
          )}
        />
        {FEATURE_DICTATION && supported && (
          <button
            type="button"
            onClick={toggle}
            title={listening ? "إيقاف الإملاء" : "إملاء صوتي"}
            className={cn(
              "absolute top-2 left-2 h-6 w-6 rounded-md flex items-center justify-center transition-all",
              listening
                ? "bg-red-500/20 text-red-400 animate-pulse"
                : "text-muted-foreground/50 hover:bg-primary/10 hover:text-primary"
            )}
          >
            {listening
              ? <MicOff className="h-3.5 w-3.5" />
              : <Mic className="h-3.5 w-3.5" />
            }
          </button>
        )}
      </div>

      {/* Interim text — real-time transcription preview */}
      {listening && interimText && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-500/5 border border-red-400/20 text-sm text-muted-foreground">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse shrink-0" />
          <span className="italic opacity-75">{interimText}</span>
        </div>
      )}

      {(showAI || enhanced) && (
        <div className="flex items-center gap-2">
          {showAI && !enhanced && (
            <button
              type="button"
              onClick={enhance}
              disabled={enhancing}
              className={cn(
                "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md transition-all",
                enhancing
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-primary/10 text-primary hover:bg-primary/20"
              )}
            >
              <Sparkles className={cn("h-3 w-3", enhancing && "animate-pulse")} />
              {enhancing ? "جاري التحسين..." : "تحسين بالذكاء الاصطناعي"}
            </button>
          )}
          {enhanced && (
            <>
              <span className="text-xs text-primary flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> تم التحسين
              </span>
              <button
                type="button"
                onClick={revert}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-0.5 rounded-md hover:bg-muted"
              >
                <RotateCcw className="h-3 w-3" /> تراجع
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

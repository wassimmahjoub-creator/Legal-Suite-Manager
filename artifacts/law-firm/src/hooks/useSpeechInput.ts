import { useState, useRef, useCallback } from "react";

interface Options {
  onResult: (text: string) => void;
  onInterim?: (text: string) => void;
  lang?: string;
}

export function useSpeechInput({ onResult, onInterim, lang = "ar-SA" }: Options) {
  const [listening, setListening] = useState(false);
  const [supported] = useState(() =>
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
  );
  const recRef = useRef<any>(null);

  const start = useCallback(() => {
    if (!supported) return;
    const SR =
      (window as any).SpeechRecognition ??
      (window as any).webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (e: any) => {
      const last = e.results[e.results.length - 1];
      if (last.isFinal) {
        onResult(last[0].transcript.trim());
        onInterim?.("");
      } else {
        onInterim?.(last[0].transcript.trim());
      }
    };
    rec.onerror = () => { setListening(false); onInterim?.(""); };
    rec.onend   = () => { setListening(false); onInterim?.(""); };

    recRef.current = rec;
    rec.start();
    setListening(true);
  }, [supported, lang, onResult, onInterim]);

  const stop = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
    onInterim?.("");
  }, [onInterim]);

  const toggle = useCallback(() => {
    if (listening) stop(); else start();
  }, [listening, start, stop]);

  return { listening, supported, start, stop, toggle };
}

import { useState, useRef, useCallback } from "react";

interface Options {
  onResult: (text: string) => void;
  lang?: string;
}

export function useSpeechInput({ onResult, lang = "ar" }: Options) {
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
    rec.interimResults = false;

    rec.onresult = (e: any) => {
      const last = e.results[e.results.length - 1];
      if (last.isFinal) onResult(last[0].transcript.trim());
    };
    rec.onerror = () => { setListening(false); };
    rec.onend   = () => { setListening(false); };

    recRef.current = rec;
    rec.start();
    setListening(true);
  }, [supported, lang, onResult]);

  const stop = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
  }, []);

  const toggle = useCallback(() => {
    if (listening) stop(); else start();
  }, [listening, start, stop]);

  return { listening, supported, start, stop, toggle };
}

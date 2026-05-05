import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal, FormField } from "@/components/Modal";
import {
  Mic, MicOff, Sparkles, Copy, Download, Trash2,
  FileText, ChevronDown, AlertCircle, CheckCircle2, Clock
} from "lucide-react";
import { cn } from "@/lib/utils";

const DOC_TYPES = [
  { value: "مذكرة دفاع", label: "مذكرة دفاع", desc: "Mémoire de défense" },
  { value: "عريضة دعوى", label: "عريضة دعوى", desc: "Requête introductive" },
  { value: "مراسلة رسمية", label: "مراسلة رسمية", desc: "Correspondance officielle" },
  { value: "تقرير قانوني", label: "تقرير قانوني", desc: "Rapport juridique" },
  { value: "مذكرة استئناف", label: "مذكرة استئناف", desc: "Mémoire d'appel" },
  { value: "عقد", label: "عقد", desc: "Contrat" },
  { value: "محضر اجتماع", label: "محضر اجتماع", desc: "Procès-verbal de réunion" },
  { value: "مطالبة قضائية", label: "مطالبة قضائية", desc: "Mise en demeure" },
];

type Stage = "idle" | "recording" | "processing" | "transcribed" | "enhancing" | "done" | "error";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

export default function VoiceDictation() {
  const [stage, setStage] = useState<Stage>("idle");
  const [transcript, setTranscript] = useState("");
  const [enhanced, setEnhanced] = useState("");
  const [docType, setDocType] = useState(DOC_TYPES[0].value);
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [showDocModal, setShowDocModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  const startRecording = useCallback(async () => {
    try {
      setError("");
      setTranscript("");
      setEnhanced("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/ogg";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.start(250);
      mediaRef.current = recorder;
      setStage("recording");
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } catch {
      setError("لم يتم السماح بالوصول إلى الميكروفون. تأكد من السماح في إعدادات المتصفح.");
      setStage("error");
    }
  }, []);

  const stopRecording = useCallback(() => {
    clearInterval(timerRef.current);
    const recorder = mediaRef.current;
    if (!recorder) return;
    recorder.onstop = async () => {
      recorder.stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
      await transcribeAudio(blob);
    };
    recorder.stop();
    setStage("processing");
  }, []);

  const transcribeAudio = async (blob: Blob) => {
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const res = await fetch(`${BASE_URL}/api/voice-dictation/transcribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audio: base64, mimeType: blob.type }),
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setTranscript(data.transcript ?? "");
        setStage("transcribed");
      };
      reader.readAsDataURL(blob);
    } catch (e) {
      setError("فشل في تحويل الصوت. حاول مرة أخرى.");
      setStage("error");
    }
  };

  const enhance = async () => {
    if (!transcript.trim()) return;
    setStage("enhancing");
    try {
      const res = await fetch(`${BASE_URL}/api/voice-dictation/enhance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: transcript, documentType: docType }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setEnhanced(data.enhanced ?? "");
      setStage("done");
    } catch {
      setError("فشل في تحسين النص بالذكاء الاصطناعي. حاول مرة أخرى.");
      setStage("error");
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadTxt = (text: string, filename: string) => {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setStage("idle");
    setTranscript("");
    setEnhanced("");
    setError("");
    setElapsed(0);
  };

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mic className="h-6 w-6 text-primary" /> الإملاء الصوتي
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            أملِ نصك بالصوت وحوّله بالذكاء الاصطناعي إلى وثيقة قانونية مهيكلة
          </p>
        </div>
        {(stage === "transcribed" || stage === "done" || stage === "error") && (
          <Button variant="outline" size="sm" onClick={reset} className="gap-2">
            <Trash2 className="h-4 w-4" /> بداية جديدة
          </Button>
        )}
      </div>

      {/* Doc type selector */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-muted-foreground shrink-0">نوع الوثيقة:</span>
            <div className="flex flex-wrap gap-2">
              {DOC_TYPES.map(dt => (
                <button
                  key={dt.value}
                  onClick={() => setDocType(dt.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                    docType === dt.value
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {dt.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recording Card */}
      <Card className="border-none shadow-md">
        <CardContent className="p-8 flex flex-col items-center gap-6">
          {/* Mic button */}
          <div className="relative">
            {stage === "recording" && (
              <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping scale-150" />
            )}
            <button
              onClick={stage === "recording" ? stopRecording : stage === "idle" ? startRecording : undefined}
              disabled={stage === "processing" || stage === "enhancing"}
              className={cn(
                "relative w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg",
                stage === "recording"
                  ? "bg-red-500 hover:bg-red-600 scale-110"
                  : stage === "processing" || stage === "enhancing"
                    ? "bg-muted cursor-not-allowed"
                    : "bg-primary hover:bg-primary/90 hover:scale-105"
              )}
            >
              {stage === "recording"
                ? <MicOff className="h-10 w-10 text-white" />
                : stage === "processing" || stage === "enhancing"
                  ? <div className="h-8 w-8 rounded-full border-4 border-muted-foreground/30 border-t-primary animate-spin" />
                  : <Mic className="h-10 w-10 text-primary-foreground" />
              }
            </button>
          </div>

          {/* Status message */}
          <div className="text-center space-y-1">
            {stage === "idle" && (
              <>
                <p className="font-semibold text-lg">اضغط للبدء في التسجيل</p>
                <p className="text-sm text-muted-foreground">تأكد من السماح بالوصول إلى الميكروفون</p>
              </>
            )}
            {stage === "recording" && (
              <>
                <div className="flex items-center justify-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
                  <p className="font-semibold text-lg text-red-500">تسجيل جارٍ...</p>
                </div>
                <p className="text-3xl font-mono text-primary" dir="ltr">{fmt(elapsed)}</p>
                <p className="text-sm text-muted-foreground">اضغط على الزر مجدداً لإيقاف التسجيل</p>
              </>
            )}
            {stage === "processing" && (
              <>
                <p className="font-semibold text-lg">جارٍ تحويل الصوت إلى نص...</p>
                <p className="text-sm text-muted-foreground">قد يستغرق بضع ثوانٍ</p>
              </>
            )}
            {stage === "transcribed" && (
              <>
                <CheckCircle2 className="h-8 w-8 text-green-400 mx-auto mb-1" />
                <p className="font-semibold text-lg text-green-400">تم تحويل الصوت بنجاح!</p>
                <p className="text-sm text-muted-foreground">راجع النص وانقر على "تحسين بالذكاء الاصطناعي"</p>
              </>
            )}
            {stage === "enhancing" && (
              <>
                <p className="font-semibold text-lg flex items-center justify-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary animate-pulse" /> الذكاء الاصطناعي يصوغ الوثيقة...
                </p>
                <p className="text-sm text-muted-foreground">يستغرق عادةً 5-15 ثانية</p>
              </>
            )}
            {stage === "done" && (
              <>
                <CheckCircle2 className="h-8 w-8 text-green-400 mx-auto mb-1" />
                <p className="font-semibold text-lg text-green-400">الوثيقة جاهزة!</p>
              </>
            )}
            {stage === "error" && (
              <div className="flex items-start gap-2 bg-destructive/10 text-destructive rounded-xl px-4 py-3 max-w-sm">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <p className="text-sm text-right">{error}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transcript section */}
      {(stage === "transcribed" || stage === "enhancing" || stage === "done") && (
        <Card className="border-none shadow-md">
          <CardHeader className="border-b pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" /> النص المُملى (النسخة الأولية)
              </CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => copyText(transcript)} className="h-8 gap-1.5">
                  <Copy className="h-3.5 w-3.5" /> نسخ
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            <textarea
              className="w-full bg-muted/30 rounded-xl p-4 text-sm min-h-[120px] resize-none focus:outline-none focus:ring-1 focus:ring-primary border border-border"
              value={transcript}
              onChange={e => setTranscript(e.target.value)}
              dir="rtl"
              placeholder="النص سيظهر هنا بعد التسجيل..."
            />
            {stage === "transcribed" && (
              <div className="flex gap-3 mt-4">
                <Button onClick={enhance} className="flex-1 gap-2">
                  <Sparkles className="h-4 w-4" /> تحسين وصياغة بالذكاء الاصطناعي
                </Button>
                <Button variant="outline" onClick={() => setShowDocModal(true)} className="gap-2">
                  <ChevronDown className="h-4 w-4" /> {docType}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Enhanced document section */}
      {stage === "done" && enhanced && (
        <Card className="border-none shadow-md ring-1 ring-primary/30">
          <CardHeader className="border-b pb-4 bg-primary/5 rounded-t-xl">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                {docType} — المُصاغة بالذكاء الاصطناعي
              </CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => copyText(enhanced)} className="h-8 gap-1.5">
                  <Copy className="h-3.5 w-3.5" />
                  {copied ? "تم النسخ!" : "نسخ"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => downloadTxt(enhanced, `${docType}.txt`)} className="h-8 gap-1.5">
                  <Download className="h-3.5 w-3.5" /> تحميل
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            <textarea
              className="w-full bg-transparent rounded-xl p-2 text-sm min-h-[300px] resize-none focus:outline-none leading-relaxed"
              value={enhanced}
              onChange={e => setEnhanced(e.target.value)}
              dir="rtl"
            />
            <div className="flex gap-3 mt-4 flex-wrap">
              <Button variant="outline" className="gap-2" onClick={() => setShowDocModal(true)}>
                <FileText className="h-4 w-4" /> حفظ في الوثائق
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => downloadTxt(enhanced, `${docType}.txt`)}>
                <Download className="h-4 w-4" /> تحميل .txt
              </Button>
              <Button variant="ghost" className="gap-2 text-muted-foreground" onClick={reset}>
                <Mic className="h-4 w-4" /> تسجيل جديد
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tips */}
      {stage === "idle" && (
        <Card className="border-none shadow-sm bg-muted/30">
          <CardContent className="p-5">
            <p className="text-sm font-semibold mb-3 text-primary">نصائح للحصول على أفضل نتيجة:</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {[
                "تكلم بوضوح وبطء نسبي — لا حاجة للإملاء حرفاً بحرف",
                "اذكر الأسماء والتواريخ والأرقام بوضوح",
                "يمكنك الإملاء بالعربية أو الفرنسية أو مزيج من الاثنين",
                "بعد التحويل، يمكنك تعديل النص قبل تحسينه بالذكاء الاصطناعي",
                "الذكاء الاصطناعي سيضيف الصياغات القانونية المناسبة تلقائياً",
              ].map((tip, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-primary mt-0.5 shrink-0">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Doc type modal */}
      <Modal open={showDocModal} onClose={() => setShowDocModal(false)} title="اختر نوع الوثيقة">
        <div className="space-y-2">
          {DOC_TYPES.map(dt => (
            <button
              key={dt.value}
              onClick={() => { setDocType(dt.value); setShowDocModal(false); }}
              className={cn(
                "w-full text-right px-4 py-3 rounded-xl transition-all flex justify-between items-center",
                docType === dt.value ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              )}
            >
              <span className="font-medium">{dt.label}</span>
              <span className={cn("text-xs", docType === dt.value ? "text-primary-foreground/70" : "text-muted-foreground")}>
                {dt.desc}
              </span>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}

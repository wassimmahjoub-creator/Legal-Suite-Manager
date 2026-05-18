import { useState, useEffect } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/lib/authFetch";
import { cn } from "@/lib/utils";
import type { CaseStageData } from "./CaseStageStepper";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

const STAGE_LABELS: Record<string, string> = {
  first_instance: "ابتدائي",
  appeal:         "استئنافي",
  cassation:      "تعقيبي",
  execution:      "تنفيذي",
};

const OUTCOME_OPTS = [
  { value: "favorable",   label: "لصالح الموكل", cls: "border-green-500 bg-green-500/10 text-green-400" },
  { value: "unfavorable", label: "ضد الموكل",    cls: "border-red-500 bg-red-500/10 text-red-400"     },
  { value: "mixed",       label: "مختلط",         cls: "border-amber-500 bg-amber-500/10 text-amber-400" },
];

type NextStageOption = { value: string; label: string };

function getNextStageOptions(currentStage: string, outcome: string): NextStageOption[] {
  if (currentStage === "cassation") return [{ value: "execution", label: "تنفيذي" }];
  if (currentStage === "first_instance") {
    if (outcome === "favorable") return [
      { value: "execution", label: "تنفيذي" },
      { value: "appeal",    label: "استئنافي" },
    ];
    return [
      { value: "appeal",    label: "استئنافي" },
      { value: "execution", label: "تنفيذي"   },
    ];
  }
  if (currentStage === "appeal") {
    if (outcome === "favorable") return [
      { value: "execution", label: "تنفيذي"  },
      { value: "cassation", label: "تعقيبي"  },
    ];
    return [
      { value: "cassation", label: "تعقيبي"  },
      { value: "execution", label: "تنفيذي"  },
    ];
  }
  return [];
}

function defaultDeadlines(nextStage: string, decisionDate: string) {
  if (nextStage === "appeal" && decisionDate) return [{
    nameAr: "أجل الاستئناف", deadlineType: "appeal_filing",
    startDate: decisionDate, durationDays: 30, reminderDaysBefore: 7,
  }];
  if (nextStage === "cassation" && decisionDate) return [{
    nameAr: "أجل التعقيب", deadlineType: "cassation_filing",
    startDate: decisionDate, durationDays: 60, reminderDaysBefore: 7,
  }];
  return [];
}

interface DeadlineRow {
  nameAr: string;
  deadlineType: string;
  startDate: string;
  durationDays: number | string;
  reminderDaysBefore: number | string;
}

function calcEndDate(startDate: string, durationDays: number | string): string {
  const days = Number(durationDays);
  if (!startDate || isNaN(days) || days <= 0) return "";
  const d = new Date(startDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

interface Court { id: number; name: string; nameAr?: string | null }

interface Props {
  open: boolean;
  stage: CaseStageData;
  caseId: number;
  onClose: () => void;
  onDone: () => void;
}

export function StageTransitionModal({ open, stage, caseId, onClose, onDone }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [decisionDate, setDecisionDate]   = useState(today);
  const [outcome, setOutcome]             = useState("favorable");
  const [decisionSummary, setSummary]     = useState("");
  const [nextStage, setNextStage]         = useState("");
  const [nextCourtId, setNextCourtId]     = useState("");
  const [nextCourtNum, setNextCourtNum]   = useState("");
  const [executionNotes, setExecNotes]    = useState("");
  const [deadlines, setDeadlines]         = useState<DeadlineRow[]>([]);
  const [courts, setCourts]               = useState<Court[]>([]);
  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState("");
  const [confirmClose, setConfirmClose]   = useState(false);

  const isDirty = decisionSummary !== "" || nextCourtId !== "" || nextCourtNum !== "" || executionNotes !== "";

  function handleClose() {
    if (isDirty) { setConfirmClose(true); } else { onClose(); }
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, isDirty]);

  const nextOpts = getNextStageOptions(stage.stage, outcome);

  useEffect(() => {
    if (!open) return;
    setDecisionDate(today);
    setOutcome("favorable");
    setSummary("");
    setError("");
    setNextCourtId("");
    setNextCourtNum("");
    setExecNotes("");
  }, [open]);

  useEffect(() => {
    const opts = getNextStageOptions(stage.stage, outcome);
    setNextStage(opts[0]?.value ?? "");
  }, [stage.stage, outcome]);

  useEffect(() => {
    setDeadlines(defaultDeadlines(nextStage, decisionDate));
  }, [nextStage, decisionDate]);

  useEffect(() => {
    authFetch(`${BASE}/api/courts`).then(r => r.json()).then(setCourts).catch(() => {});
  }, []);

  if (!open) return null;

  function addDeadline() {
    setDeadlines(prev => [...prev, {
      nameAr: "", deadlineType: "custom", startDate: decisionDate, durationDays: 30, reminderDaysBefore: 7,
    }]);
  }

  function removeDeadline(i: number) {
    setDeadlines(prev => prev.filter((_, idx) => idx !== i));
  }

  function updateDeadline(i: number, field: keyof DeadlineRow, val: string | number) {
    setDeadlines(prev => prev.map((d, idx) => idx === i ? { ...d, [field]: val } : d));
  }

  async function handleConfirm() {
    if (!decisionDate) { setError("يرجى تحديد تاريخ الحكم"); return; }
    if (!outcome)      { setError("يرجى تحديد نتيجة الحكم"); return; }
    if (!nextStage)    { setError("يرجى تحديد الطور القادم"); return; }
    if (nextStage !== "execution" && !nextCourtId) { setError("يرجى تحديد المحكمة للطور القادم"); return; }
    for (const dl of deadlines) {
      if (!dl.nameAr || !dl.startDate || Number(dl.durationDays) <= 0) {
        setError("يرجى إكمال بيانات الآجال"); return;
      }
    }
    setSaving(true);
    setError("");
    try {
      const res = await authFetch(`${BASE}/api/cases/${caseId}/stages/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentStageId: stage.id,
          decisionDate,
          decisionOutcome: outcome,
          decisionSummary: decisionSummary || undefined,
          nextStage,
          nextCourtId: nextCourtId ? Number(nextCourtId) : undefined,
          nextCourtCaseNumber: nextCourtNum || undefined,
          executionNotes: executionNotes || undefined,
          deadlines: deadlines.map(d => ({
            nameAr: d.nameAr,
            deadlineType: d.deadlineType,
            startDate: d.startDate,
            durationDays: Number(d.durationDays),
            reminderDaysBefore: Number(d.reminderDaysBefore),
          })),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        setError(body.error ?? "خطأ في الخادم");
        setSaving(false);
        return;
      }
      onDone();
    } catch {
      setError("تعذّر الاتصال بالخادم");
      setSaving(false);
    }
  }

  const inputCls = "w-full text-sm rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40";
  const sectionTitle = "text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Confirm-close overlay */}
        {confirmClose && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 rounded-2xl">
            <div className="bg-card border border-border rounded-xl p-5 max-w-xs w-full mx-4 space-y-4 text-center">
              <p className="font-semibold">هل تريد تجاهل التعديلات؟</p>
              <p className="text-sm text-muted-foreground">ستفقد كل البيانات التي أدخلتها.</p>
              <div className="flex gap-2 justify-center">
                <Button size="sm" variant="outline" onClick={() => setConfirmClose(false)}>إلغاء</Button>
                <Button size="sm" variant="destructive" onClick={onClose}>تجاهل وإغلاق</Button>
              </div>
            </div>
          </div>
        )}
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <h2 className="font-bold text-lg">
            الانتقال من الطور{" "}
            <span className="text-primary">{STAGE_LABELS[stage.stage] ?? stage.stage}</span>
            {" "}إلى الطور التالي
          </h2>
          <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Section 1: current stage decision */}
          <div>
            <p className={sectionTitle}>١ — نتيجة الطور الحالي ({STAGE_LABELS[stage.stage] ?? stage.stage})</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">تاريخ الحكم *</label>
                <input type="date" value={decisionDate} onChange={e => setDecisionDate(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">نتيجة الحكم *</label>
                <div className="flex gap-2 flex-wrap">
                  {OUTCOME_OPTS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setOutcome(opt.value)}
                      className={cn(
                        "px-4 py-2 text-sm rounded-xl border-2 transition-all",
                        outcome === opt.value ? opt.cls : "border-border bg-muted/30 text-muted-foreground"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">ملخص الحكم</label>
                <textarea
                  value={decisionSummary}
                  onChange={e => setSummary(e.target.value)}
                  rows={3}
                  placeholder="أدخل ملخص الحكم القضائي..."
                  className={cn(inputCls, "resize-none")}
                />
              </div>
            </div>
          </div>

          {/* Section 2: next stage */}
          <div>
            <p className={sectionTitle}>٢ — الطور القادم</p>
            <div className="space-y-3">
              {nextOpts.length > 1 && (
                <div>
                  <label className="text-xs text-muted-foreground mb-2 block">اختر الطور القادم *</label>
                  <div className="flex gap-2">
                    {nextOpts.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setNextStage(opt.value)}
                        className={cn(
                          "px-4 py-2 text-sm rounded-xl border-2 transition-all",
                          nextStage === opt.value
                            ? "border-primary bg-primary/10 text-primary font-semibold"
                            : "border-border bg-muted/30 text-muted-foreground"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {nextStage !== "execution" ? (
                <>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">المحكمة للطور القادم *</label>
                    <select value={nextCourtId} onChange={e => setNextCourtId(e.target.value)} className={inputCls}>
                      <option value="">— اختر المحكمة —</option>
                      {courts.map(c => (
                        <option key={c.id} value={c.id}>{c.nameAr ?? c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">عدد القضية في الطور القادم</label>
                    <input
                      type="text"
                      value={nextCourtNum}
                      onChange={e => setNextCourtNum(e.target.value)}
                      placeholder="اختياري"
                      className={inputCls}
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">ملاحظات بدء التنفيذ</label>
                  <textarea
                    value={executionNotes}
                    onChange={e => setExecNotes(e.target.value)}
                    rows={2}
                    placeholder="اختياري..."
                    className={cn(inputCls, "resize-none")}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Section 3: legal deadlines */}
          <div>
            <p className={sectionTitle}>٣ — الآجال القانونية الناتجة</p>
            <div className="space-y-2">
              {deadlines.map((dl, i) => (
                <div key={i} className="bg-muted/30 border border-border rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={dl.nameAr}
                      onChange={e => updateDeadline(i, "nameAr", e.target.value)}
                      placeholder="اسم الأجل"
                      className={cn(inputCls, "flex-1")}
                    />
                    <button onClick={() => removeDeadline(i)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-0.5 block">تاريخ البداية</label>
                      <input
                        type="date"
                        value={dl.startDate}
                        onChange={e => updateDeadline(i, "startDate", e.target.value)}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-0.5 block">المدة (يوم)</label>
                      <input
                        type="number"
                        value={dl.durationDays}
                        onChange={e => updateDeadline(i, "durationDays", e.target.value)}
                        min={1}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-0.5 block">تاريخ الانتهاء</label>
                      <input
                        type="text"
                        readOnly
                        value={calcEndDate(dl.startDate, dl.durationDays)}
                        className={cn(inputCls, "bg-muted/50 cursor-default")}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-0.5 block">تنبيه قبل (يوم)</label>
                    <input
                      type="number"
                      value={dl.reminderDaysBefore}
                      onChange={e => updateDeadline(i, "reminderDaysBefore", e.target.value)}
                      min={1}
                      className={cn(inputCls, "w-24")}
                    />
                  </div>
                </div>
              ))}
              <button
                onClick={addDeadline}
                className="flex items-center gap-1.5 text-sm text-primary hover:underline mt-1"
              >
                <Plus className="h-3.5 w-3.5" />
                إضافة أجل قانوني
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-5 border-t border-border shrink-0">
          <Button variant="outline" onClick={handleClose}>إلغاء</Button>
          <Button onClick={handleConfirm} disabled={saving}>
            {saving ? "جارٍ الانتقال..." : "تأكيد الانتقال"}
          </Button>
        </div>
      </div>
    </div>
  );
}

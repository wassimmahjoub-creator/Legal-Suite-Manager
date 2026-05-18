import { useState, useEffect } from "react";
import { X, ChevronLeft, Clock, CheckCircle2, XCircle, AlertCircle, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/lib/authFetch";
import { formatDateTN } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { CaseStageData } from "./CaseStageStepper";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

const OUTCOME_ICONS: Record<string, { icon: typeof CheckCircle2; cls: string; label: string }> = {
  favorable:   { icon: CheckCircle2, cls: "text-green-400",  label: "لصالح الموكل" },
  unfavorable: { icon: XCircle,      cls: "text-red-400",    label: "ضد الموكل"    },
  mixed:       { icon: AlertCircle,  cls: "text-amber-400",  label: "مختلط"        },
};

const EXEC_STATUS_LABELS: Record<string, string> = {
  not_started: "لم يبدأ التنفيذ",
  in_progress: "التنفيذ جارٍ",
  completed:   "اكتمل التنفيذ",
};

const STAGE_LABELS: Record<string, string> = {
  first_instance: "ابتدائي",
  appeal:         "استئنافي",
  cassation:      "تعقيبي",
  execution:      "تنفيذي",
};

interface LegalDeadline {
  id: number;
  nameAr: string;
  startDate: string;
  endDate: string | null;
  durationDays: number;
  isCompleted: boolean;
}

interface StageDetailPanelProps {
  stage: CaseStageData | null;
  mode: "readonly" | "active";
  caseId: number;
  onClose: () => void;
  onTransition: () => void;
  onSaved?: () => void;
}

export function StageDetailPanel({ stage, mode, caseId, onClose, onTransition, onSaved }: StageDetailPanelProps) {
  const [notes, setNotes]                 = useState("");
  const [executionStatus, setExecStatus]  = useState("not_started");
  const [executionNotes, setExecNotes]    = useState("");
  const [saving, setSaving]               = useState(false);
  const [deadlines, setDeadlines]         = useState<LegalDeadline[]>([]);

  useEffect(() => {
    if (!stage) return;
    setNotes(stage.notes ?? "");
    setExecStatus(stage.executionStatus ?? "not_started");
    setExecNotes(stage.executionNotes ?? "");
  }, [stage]);

  useEffect(() => {
    if (!stage) return;
    authFetch(`${BASE}/api/cases/${caseId}/legal-deadlines`)
      .then(r => r.json())
      .then((all: LegalDeadline[]) => setDeadlines(all))
      .catch(() => {});
  }, [stage, caseId]);

  if (!stage) return null;

  const outcomeInfo = stage.decisionOutcome ? OUTCOME_ICONS[stage.decisionOutcome] : null;
  const isDone      = !!stage.exitedAt;
  const today       = new Date().toISOString().slice(0, 10);

  async function handleSave() {
    if (!stage) return;
    setSaving(true);
    await authFetch(`${BASE}/api/case-stages/${stage.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes, executionStatus, executionNotes }),
    });
    setSaving(false);
    onSaved?.();
  }

  async function toggleDeadline(dl: LegalDeadline) {
    await authFetch(`${BASE}/api/legal-deadlines/${dl.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isCompleted: !dl.isCompleted }),
    });
    setDeadlines(prev => prev.map(d => d.id === dl.id ? { ...d, isCompleted: !d.isCompleted } : d));
  }

  const inputCls = "w-full text-sm rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center",
              isDone ? "bg-green-500/15" : "bg-primary/15"
            )}>
              <Scale className={cn("h-4 w-4", isDone ? "text-green-400" : "text-primary")} />
            </div>
            <div>
              <p className="font-semibold leading-none">{STAGE_LABELS[stage.stage] ?? stage.stage}</p>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDateTN(stage.enteredAt.slice(0, 10))}
                {stage.exitedAt && <> ← {formatDateTN(stage.exitedAt.slice(0, 10))}</>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full font-medium",
              isDone ? "bg-green-500/10 text-green-400 border border-green-500/20"
                     : "bg-primary/10 text-primary border border-primary/20"
            )}>
              {isDone ? "منتهٍ" : "نشط"}
            </span>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Judgment result (readonly, done stages) */}
          {isDone && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">نتيجة الطور</p>
              <div className="bg-muted/40 rounded-xl p-4 space-y-2.5">
                {stage.decisionDate && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">تاريخ الحكم:</span>
                    <span className="font-medium">{formatDateTN(stage.decisionDate)}</span>
                  </div>
                )}
                {outcomeInfo && (() => {
                  const Icon = outcomeInfo.icon;
                  return (
                    <div className={cn("flex items-center gap-2 text-sm font-semibold", outcomeInfo.cls)}>
                      <Icon className="h-4 w-4" />{outcomeInfo.label}
                    </div>
                  );
                })()}
                {stage.decisionSummary && (
                  <p className="text-sm text-foreground/80 leading-relaxed border-t border-border/40 pt-2.5 mt-1">
                    {stage.decisionSummary}
                  </p>
                )}
                {!stage.decisionDate && !stage.decisionOutcome && !stage.decisionSummary && (
                  <p className="text-sm text-muted-foreground italic">لم تُسجَّل تفاصيل الحكم</p>
                )}
              </div>
            </div>
          )}

          {/* Execution tracking (only for execution stage) */}
          {stage.stage === "execution" && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">التنفيذ</p>
              {mode === "active" ? (
                <div className="space-y-2">
                  <select
                    value={executionStatus}
                    onChange={e => setExecStatus(e.target.value)}
                    className={inputCls}
                  >
                    <option value="not_started">لم يبدأ التنفيذ</option>
                    <option value="in_progress">التنفيذ جارٍ</option>
                    <option value="completed">اكتمل التنفيذ</option>
                  </select>
                  <textarea
                    value={executionNotes}
                    onChange={e => setExecNotes(e.target.value)}
                    rows={2}
                    placeholder="ملاحظات التنفيذ..."
                    className={inputCls}
                  />
                </div>
              ) : (
                <div className="bg-muted/40 rounded-xl p-3 space-y-1">
                  <span className="text-sm font-medium">{EXEC_STATUS_LABELS[stage.executionStatus ?? "not_started"]}</span>
                  {stage.executionNotes && <p className="text-xs text-muted-foreground">{stage.executionNotes}</p>}
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">الملاحظات</p>
            {mode === "active" ? (
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder="ملاحظات حول هذا الطور..."
                className={inputCls}
              />
            ) : (
              <div className="bg-muted/40 rounded-xl p-3 min-h-[4rem] flex items-center">
                <p className="text-sm text-muted-foreground">
                  {stage.notes || <span className="italic opacity-50">لا توجد ملاحظات</span>}
                </p>
              </div>
            )}
          </div>

          {/* Deadlines */}
          {deadlines.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">الآجال القانونية</p>
              <div className="space-y-1.5">
                {deadlines.map(dl => {
                  const isOverdue = !dl.isCompleted && dl.endDate && dl.endDate < today;
                  return (
                    <div key={dl.id} className={cn(
                      "flex items-center gap-3 p-2.5 rounded-xl border text-sm transition-colors",
                      dl.isCompleted
                        ? "opacity-50 bg-muted/20 border-border/30"
                        : isOverdue
                          ? "bg-red-500/5 border-red-500/20"
                          : "bg-muted/30 border-border/50 hover:border-border"
                    )}>
                      <button onClick={() => toggleDeadline(dl)} className="shrink-0">
                        <div className={cn(
                          "w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
                          dl.isCompleted
                            ? "bg-green-600 border-green-600"
                            : "border-muted-foreground hover:border-primary"
                        )}>
                          {dl.isCompleted && <CheckCircle2 className="h-2.5 w-2.5 text-white" />}
                        </div>
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={cn("truncate font-medium", dl.isCompleted && "line-through")}>{dl.nameAr}</p>
                        {dl.endDate && (
                          <p className={cn("text-xs", isOverdue ? "text-red-400 font-semibold" : "text-muted-foreground")}>
                            {formatDateTN(dl.endDate)}{isOverdue && " — متأخر"}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {mode === "active" && (
          <div className={cn(
            "px-5 py-4 border-t border-border shrink-0 flex gap-2",
            stage.stage !== "execution" ? "justify-between" : "justify-end"
          )}>
            {stage.stage !== "execution" && (
              <Button onClick={onTransition} size="sm" className="gap-2">
                <ChevronLeft className="h-4 w-4" />
                الانتقال للطور التالي
              </Button>
            )}
            <Button onClick={handleSave} disabled={saving} variant="outline" size="sm">
              {saving ? "جارٍ الحفظ..." : "حفظ الملاحظات"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

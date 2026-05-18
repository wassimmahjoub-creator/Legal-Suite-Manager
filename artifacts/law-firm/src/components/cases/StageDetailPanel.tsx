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
  const [notes, setNotes] = useState("");
  const [executionStatus, setExecutionStatus] = useState("");
  const [executionNotes, setExecutionNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [deadlines, setDeadlines] = useState<LegalDeadline[]>([]);

  useEffect(() => {
    if (!stage) return;
    setNotes(stage.notes ?? "");
    setExecutionStatus(stage.executionStatus ?? "not_started");
    setExecutionNotes(stage.executionNotes ?? "");
  }, [stage]);

  useEffect(() => {
    if (!stage) return;
    authFetch(`${BASE}/api/cases/${caseId}/legal-deadlines`)
      .then(r => r.json())
      .then((all: LegalDeadline[]) => setDeadlines(all.filter(d => {
        return true;
      })))
      .catch(() => {});
  }, [stage, caseId]);

  if (!stage) return null;

  const outcomeInfo = stage.decisionOutcome ? OUTCOME_ICONS[stage.decisionOutcome] : null;
  const isDone = !!stage.exitedAt;

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

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="fixed inset-0 z-50 flex" dir="rtl">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-sm bg-card border-r border-border shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-primary" />
            <span className="font-semibold">{STAGE_LABELS[stage.stage] ?? stage.stage}</span>
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full",
              isDone ? "bg-green-500/10 text-green-400" : "bg-primary/10 text-primary"
            )}>
              {isDone ? "منتهٍ" : "نشط"}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Entry date */}
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Clock className="h-3.5 w-3.5" />
            تاريخ الدخول: {formatDateTN(stage.enteredAt.slice(0, 10))}
            {stage.exitedAt && <> — الخروج: {formatDateTN(stage.exitedAt.slice(0, 10))}</>}
          </div>

          {/* Decision section (if exited) */}
          {isDone && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">الحكم</p>
              <div className="bg-muted/40 rounded-xl p-3 space-y-2">
                {stage.decisionDate && (
                  <div className="text-sm"><span className="text-muted-foreground">تاريخ الحكم:</span> {formatDateTN(stage.decisionDate)}</div>
                )}
                {outcomeInfo && (() => {
                  const Icon = outcomeInfo.icon;
                  return (
                    <div className={cn("flex items-center gap-2 text-sm font-medium", outcomeInfo.cls)}>
                      <Icon className="h-4 w-4" />{outcomeInfo.label}
                    </div>
                  );
                })()}
                {stage.decisionSummary && (
                  <p className="text-sm text-foreground/80 mt-1 leading-relaxed">{stage.decisionSummary}</p>
                )}
              </div>
            </div>
          )}

          {/* Execution tracking */}
          {stage.stage === "execution" && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">التنفيذ</p>
              {mode === "active" ? (
                <div className="space-y-2">
                  <select
                    value={executionStatus}
                    onChange={e => setExecutionStatus(e.target.value)}
                    className="w-full text-sm rounded-lg border border-border bg-background px-3 py-2"
                  >
                    <option value="not_started">لم يبدأ التنفيذ</option>
                    <option value="in_progress">التنفيذ جارٍ</option>
                    <option value="completed">اكتمل التنفيذ</option>
                  </select>
                  <textarea
                    value={executionNotes}
                    onChange={e => setExecutionNotes(e.target.value)}
                    rows={2}
                    placeholder="ملاحظات التنفيذ..."
                    className="w-full text-sm rounded-lg border border-border bg-background px-3 py-2 resize-none"
                  />
                </div>
              ) : (
                <div className="bg-muted/40 rounded-xl p-3 space-y-1">
                  <span className="text-sm">{EXEC_STATUS_LABELS[stage.executionStatus ?? "not_started"] ?? stage.executionStatus}</span>
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
                className="w-full text-sm rounded-lg border border-border bg-background px-3 py-2 resize-none"
              />
            ) : (
              <p className="text-sm text-muted-foreground bg-muted/40 rounded-xl p-3 min-h-[3rem]">
                {stage.notes || <span className="italic opacity-50">لا توجد ملاحظات</span>}
              </p>
            )}
          </div>

          {/* Legal deadlines linked to this stage */}
          {deadlines.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">الآجال القانونية</p>
              <div className="space-y-1.5">
                {deadlines.map(dl => {
                  const isOverdue = !dl.isCompleted && dl.endDate && dl.endDate < today;
                  return (
                    <div key={dl.id} className={cn(
                      "flex items-center gap-2 p-2 rounded-lg border text-sm",
                      dl.isCompleted ? "opacity-50 bg-muted/20 border-border/40" : isOverdue ? "bg-red-500/5 border-red-500/20" : "bg-muted/30 border-border/50"
                    )}>
                      <button onClick={() => toggleDeadline(dl)} className="shrink-0">
                        <div className={cn(
                          "w-4 h-4 rounded border-2 flex items-center justify-center",
                          dl.isCompleted ? "bg-green-600 border-green-600" : "border-muted-foreground"
                        )}>
                          {dl.isCompleted && <CheckCircle2 className="h-3 w-3 text-white" />}
                        </div>
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={cn("truncate", dl.isCompleted && "line-through")}>{dl.nameAr}</p>
                        {dl.endDate && (
                          <p className={cn("text-xs", isOverdue ? "text-red-400" : "text-muted-foreground")}>
                            {formatDateTN(dl.endDate)}
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
        <div className="p-4 border-t border-border space-y-2">
          {mode === "active" && (
            <Button onClick={handleSave} disabled={saving} variant="outline" size="sm" className="w-full">
              {saving ? "جارٍ الحفظ..." : "حفظ التعديلات"}
            </Button>
          )}
          {mode === "active" && stage.stage !== "execution" && (
            <Button onClick={onTransition} size="sm" className="w-full gap-2">
              <ChevronLeft className="h-4 w-4" />
              الانتقال للطور التالي
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

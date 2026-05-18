import { useState, useEffect, useCallback } from "react";
import { CheckCircle2, XCircle, AlertCircle, Clock, ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/lib/authFetch";
import { formatDateTN } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { CaseStageData } from "./CaseStageStepper";
import { StageDetailPanel } from "./StageDetailPanel";
import { StageTransitionModal } from "./StageTransitionModal";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

const STAGE_LABELS: Record<string, string> = {
  first_instance: "ابتدائي",
  appeal:         "استئنافي",
  cassation:      "تعقيبي",
  execution:      "تنفيذي",
};

const OUTCOME_ICONS: Record<string, { icon: typeof CheckCircle2; cls: string; label: string }> = {
  favorable:   { icon: CheckCircle2, cls: "text-green-400",  label: "لصالح الموكل" },
  unfavorable: { icon: XCircle,      cls: "text-red-400",    label: "ضد الموكل"    },
  mixed:       { icon: AlertCircle,  cls: "text-amber-400",  label: "مختلط"        },
};

interface LegalDeadline {
  id: number;
  caseId: number;
  caseStageId: number | null;
  deadlineType: string;
  nameAr: string;
  startDate: string;
  durationDays: number;
  endDate: string | null;
  reminderDaysBefore: number;
  isCompleted: boolean;
  completedAt: string | null;
}

interface CaseJudgmentTabProps {
  caseId: number;
  onStagesChanged?: () => void;
}

export function CaseJudgmentTab({ caseId, onStagesChanged }: CaseJudgmentTabProps) {
  const [stages, setStages]             = useState<CaseStageData[]>([]);
  const [deadlines, setDeadlines]       = useState<LegalDeadline[]>([]);
  const [panelStage, setPanelStage]     = useState<CaseStageData | null>(null);
  const [panelMode, setPanelMode]       = useState<"readonly" | "active">("readonly");
  const [showTransition, setShowTransition] = useState(false);
  const [loading, setLoading]           = useState(true);
  const today = new Date().toISOString().slice(0, 10);

  const load = useCallback(async () => {
    setLoading(true);
    const [s, d] = await Promise.all([
      authFetch(`${BASE}/api/cases/${caseId}/stages`).then(r => r.json()),
      authFetch(`${BASE}/api/cases/${caseId}/legal-deadlines`).then(r => r.json()),
    ]);
    setStages(s);
    setDeadlines(d);
    setLoading(false);
  }, [caseId]);

  useEffect(() => { load(); }, [load]);

  const activeStage = stages.find(s => !s.exitedAt);
  const doneStages  = stages.filter(s => s.exitedAt);

  async function toggleDeadline(dl: LegalDeadline) {
    await authFetch(`${BASE}/api/legal-deadlines/${dl.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isCompleted: !dl.isCompleted }),
    });
    setDeadlines(prev => prev.map(d => d.id === dl.id ? { ...d, isCompleted: !d.isCompleted } : d));
  }

  function handleTransitionDone() {
    setShowTransition(false);
    setPanelStage(null);
    load();
    onStagesChanged?.();
  }

  if (loading) return (
    <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
      <Clock className="h-4 w-4 animate-spin ml-2" />جارٍ التحميل...
    </div>
  );

  const pendingDeadlines   = deadlines.filter(d => !d.isCompleted).sort((a, b) => (a.endDate ?? "").localeCompare(b.endDate ?? ""));
  const completedDeadlines = deadlines.filter(d => d.isCompleted);

  return (
    <div className="space-y-5" dir="rtl">
      {/* Active stage CTA */}
      {activeStage && activeStage.stage !== "execution" && (
        <div className="flex items-center justify-between gap-3 p-4 bg-primary/5 border border-primary/20 rounded-xl">
          <button
            onClick={() => { setPanelStage(activeStage); setPanelMode("active"); }}
            className="flex-1 text-right group"
          >
            <p className="text-sm font-semibold">الطور الحالي: <span className="text-primary">{STAGE_LABELS[activeStage.stage] ?? activeStage.stage}</span></p>
            <p className="text-xs text-muted-foreground mt-0.5 group-hover:text-foreground/70 transition-colors">انقر للاطلاع على التفاصيل والملاحظات</p>
          </button>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
            onClick={() => { setPanelStage(activeStage); setPanelMode("active"); setShowTransition(true); }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            الانتقال للطور التالي
          </Button>
        </div>
      )}

      {/* Stages history */}
      {doneStages.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">سجل الأطوار والأحكام</h4>
          <div className="space-y-2">
            {doneStages.map(s => {
              const outInfo = s.decisionOutcome ? OUTCOME_ICONS[s.decisionOutcome] : null;
              const OutIcon = outInfo?.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => { setPanelStage(s); setPanelMode("readonly"); }}
                  className="w-full text-right p-3 bg-muted/30 border border-border rounded-xl hover:border-primary/40 transition-colors group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{STAGE_LABELS[s.stage] ?? s.stage}</span>
                      {outInfo && OutIcon && (
                        <span className={cn("flex items-center gap-1 text-xs", outInfo.cls)}>
                          <OutIcon className="h-3.5 w-3.5" />{outInfo.label}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {s.decisionDate ? formatDateTN(s.decisionDate) : formatDateTN(s.exitedAt!.slice(0, 10))}
                    </span>
                  </div>
                  {s.decisionSummary && (
                    <p className="text-xs text-muted-foreground mt-1 text-right line-clamp-2">{s.decisionSummary}</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Active execution tracking */}
      {activeStage?.stage === "execution" && (
        <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-xl space-y-2">
          <p className="text-sm font-semibold text-indigo-400">مرحلة التنفيذ جارية</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">الحالة:</span>
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full",
              activeStage.executionStatus === "completed"   ? "bg-green-500/10 text-green-400"  :
              activeStage.executionStatus === "in_progress" ? "bg-primary/10 text-primary"      : "bg-muted text-muted-foreground"
            )}>
              {activeStage.executionStatus === "completed"   ? "اكتمل التنفيذ"   :
               activeStage.executionStatus === "in_progress" ? "التنفيذ جارٍ"    : "لم يبدأ التنفيذ"}
            </span>
          </div>
          <Button
            size="sm" variant="outline"
            onClick={() => { setPanelStage(activeStage); setPanelMode("active"); }}
          >
            تعديل حالة التنفيذ
          </Button>
        </div>
      )}

      {/* Legal deadlines */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            الآجال القانونية {pendingDeadlines.length > 0 && <span className="text-primary">({pendingDeadlines.length})</span>}
          </h4>
        </div>
        {pendingDeadlines.length === 0 && completedDeadlines.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6 bg-muted/20 rounded-xl border border-dashed border-border">
            لا توجد آجال قانونية مسجلة — ستُضاف تلقائياً عند الانتقال للطور التالي
          </p>
        )}
        {pendingDeadlines.length > 0 && (
          <div className="space-y-1.5">
            {pendingDeadlines.map(dl => {
              const isOverdue = !dl.isCompleted && dl.endDate && dl.endDate < today;
              return (
                <div key={dl.id} className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border transition-colors",
                  isOverdue ? "bg-red-500/5 border-red-500/20" : "bg-muted/30 border-border/60"
                )}>
                  <button onClick={() => toggleDeadline(dl)} className="shrink-0">
                    <div className="w-5 h-5 rounded border-2 border-muted-foreground flex items-center justify-center hover:border-primary transition-colors" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{dl.nameAr}</p>
                    <p className={cn("text-xs", isOverdue ? "text-red-400 font-semibold" : "text-muted-foreground")}>
                      {dl.endDate ? formatDateTN(dl.endDate) : "—"}
                      {isOverdue && " ← متأخر"}
                      {" · "}{dl.durationDays} يوم
                    </p>
                  </div>
                  {dl.caseStageId && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground shrink-0">
                      {STAGE_LABELS[stages.find(s => s.id === dl.caseStageId)?.stage ?? ""] ?? ""}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {completedDeadlines.length > 0 && (
          <div className="space-y-1 opacity-50">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">منجزة</p>
            {completedDeadlines.map(dl => (
              <div key={dl.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-border/40 bg-muted/10">
                <button onClick={() => toggleDeadline(dl)} className="shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </button>
                <span className="text-sm line-through text-muted-foreground truncate">{dl.nameAr}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stage detail panel */}
      {panelStage && !showTransition && (
        <StageDetailPanel
          stage={panelStage}
          mode={panelMode}
          caseId={caseId}
          onClose={() => setPanelStage(null)}
          onTransition={() => setShowTransition(true)}
          onSaved={load}
        />
      )}

      {/* Transition modal */}
      {showTransition && panelStage && (
        <StageTransitionModal
          open={showTransition}
          stage={panelStage}
          caseId={caseId}
          onClose={() => { setShowTransition(false); setPanelStage(null); }}
          onDone={handleTransitionDone}
        />
      )}
    </div>
  );
}

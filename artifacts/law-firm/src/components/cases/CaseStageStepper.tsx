import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { authFetch } from "@/lib/authFetch";
import { formatDateTN } from "@/lib/date";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

export type StageValue = "first_instance" | "appeal" | "cassation" | "execution";

const STAGES: { value: StageValue; label: string }[] = [
  { value: "first_instance", label: "ابتدائي"   },
  { value: "appeal",         label: "استئنافي"  },
  { value: "cassation",      label: "تعقيبي"    },
  { value: "execution",      label: "تنفيذي"    },
];

export interface CaseStageData {
  id: number;
  caseId: number;
  stage: string;
  enteredAt: string;
  exitedAt: string | null;
  courtId: number | null;
  courtCaseNumber: string | null;
  decisionDate: string | null;
  decisionSummary: string | null;
  decisionOutcome: string | null;
  executionStatus: string | null;
  executionNotes: string | null;
  notes: string | null;
}

interface CaseStageStepperProps {
  caseId: number;
  onStageClick?: (stage: CaseStageData, mode: "readonly" | "active") => void;
  refreshKey?: number;
}

export function CaseStageStepper({ caseId, onStageClick, refreshKey }: CaseStageStepperProps) {
  const [stages, setStages] = useState<CaseStageData[]>([]);

  useEffect(() => {
    authFetch(`${BASE}/api/cases/${caseId}/stages`)
      .then(r => r.json())
      .then(setStages)
      .catch(() => {});
  }, [caseId, refreshKey]);

  const stageMap = new Map<string, CaseStageData>();
  for (const s of stages) stageMap.set(s.stage, s);

  return (
    <div className="flex items-center justify-center gap-0 py-2 sm:py-3 px-2 sm:px-4 bg-card/50 border-b border-border/40 overflow-x-auto">
      {STAGES.map((slot, idx) => {
        const data = stageMap.get(slot.value);
        const isDone   = !!data && !!data.exitedAt;
        const isActive = !!data && !data.exitedAt;
        const isReached = isDone || isActive;

        const circleClass = isDone
          ? "bg-green-600 border-green-600 text-white"
          : isActive
            ? "bg-primary border-primary text-primary-foreground ring-4 ring-primary/25"
            : "bg-muted border-border text-muted-foreground";

        const labelClass = isActive
          ? "text-primary font-semibold"
          : isDone
            ? "text-green-400 font-medium"
            : "text-muted-foreground";

        const lineClass = isDone
          ? "bg-green-600"
          : isActive
            ? "bg-primary/40"
            : "bg-border";

        const tooltip = isDone && data?.decisionSummary
          ? data.decisionSummary.slice(0, 100) + (data.decisionSummary.length > 100 ? "…" : "")
          : !isReached
            ? "لم يتم بلوغ هذا الطور بعد"
            : undefined;

        const handleClick = () => {
          if (!data) return;
          if (onStageClick) onStageClick(data, isDone ? "readonly" : "active");
        };

        return (
          <div key={slot.value} className="flex items-center shrink-0">
            <div className="flex flex-col items-center gap-0.5 group relative">
              <button
                title={tooltip}
                disabled={!isReached}
                onClick={handleClick}
                className={cn(
                  "w-7 h-7 sm:w-10 sm:h-10 rounded-full border-2 flex items-center justify-center transition-all duration-200 font-bold text-xs sm:text-sm shrink-0",
                  circleClass,
                  isReached && "cursor-pointer hover:scale-110",
                  !isReached && "cursor-not-allowed opacity-50"
                )}
              >
                {isDone ? <Check className="h-3 w-3 sm:h-4 sm:w-4 text-white" /> : idx + 1}
              </button>
              <span className={cn("text-[9px] sm:text-xs transition-colors text-center leading-tight", labelClass)}>
                {slot.label}
              </span>
              <span className={cn("text-[9px] text-muted-foreground leading-tight hidden sm:block", !isReached && "invisible")}>
                {isReached && data ? formatDateTN(data.enteredAt.slice(0, 10)) : "–"}
              </span>
            </div>
            {idx < STAGES.length - 1 && (
              <div className={cn("h-0.5 w-5 sm:w-12 md:w-20 mx-1 mt-[-14px] sm:mt-[-20px] transition-colors shrink-0", lineClass)} />
            )}
          </div>
        );
      })}
    </div>
  );
}

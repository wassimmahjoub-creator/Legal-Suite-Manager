import { useState } from "react";
import { AlertTriangle, ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

export interface ConflictData {
  id: number;
  caseId: number;
  conflictType: string;
  conflictingEntityType: string;
  conflictingEntityId: number;
  conflictingEntityName: string | null;
  matchedOn: string;
  matchScore: string | null;
  otherCaseId: number | null;
  otherCaseName: string | null;
  detectedAt: string;
  resolved: boolean;
}

interface Props {
  open: boolean;
  conflicts: ConflictData[];
  saving?: boolean;
  onConfirm: (justification: string) => Promise<void> | void;
  onCancel: () => void;
}

const CONFLICT_TYPE_LABELS: Record<string, string> = {
  opponent_is_client: "الخصم هو حريف في مكتبك",
  client_is_opponent_elsewhere: "الحريف خصمٌ في دوسية أخرى",
  shared_party: "طرف مشترك",
};

const MATCH_LABELS: Record<string, string> = {
  tax_id_exact: "تطابق معرف جبائي",
  name_exact: "تطابق تام في الاسم",
  name_fuzzy: "تشابه في الاسم",
};

export function ConflictWarningModal({ open, conflicts, saving, onConfirm, onCancel }: Props) {
  const [justification, setJustification] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [, navigate] = useLocation();

  if (!open) return null;

  async function handleConfirm() {
    setConfirming(true);
    await onConfirm(justification);
    setConfirming(false);
  }

  const isLoading = saving || confirming;
  const canConfirm = justification.trim().length >= 30;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
      <div className="relative z-10 bg-card border border-destructive/30 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-start gap-3 p-5 border-b border-border">
          <div className="p-2.5 bg-destructive/10 rounded-xl shrink-0">
            <ShieldAlert className="h-6 w-6 text-destructive" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-destructive">تنبيه: تعارض محتمل في المصالح</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              تم رصد {conflicts.length} تعارض{conflicts.length > 1 ? "ات" : ""} تستوجب مراجعتك
            </p>
          </div>
          <button onClick={onCancel} className="p-1.5 hover:bg-muted/50 rounded-lg transition-colors shrink-0">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Conflicts list */}
        <div className="overflow-y-auto flex-1 p-5 space-y-3">
          {conflicts.map((c, i) => (
            <div key={c.id ?? i} className="border border-destructive/20 rounded-xl p-4 bg-destructive/5 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                <span className="text-sm font-semibold text-destructive">
                  {CONFLICT_TYPE_LABELS[c.conflictType] ?? c.conflictType}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">الطرف المتعارض:</span>
                  <div className="font-semibold mt-0.5">
                    {c.conflictingEntityType === "client" ? (
                      <button
                        className="text-primary hover:underline"
                        onClick={() => navigate(`${BASE}/clients/${c.conflictingEntityId}`)}
                      >
                        {c.conflictingEntityName ?? `#${c.conflictingEntityId}`}
                      </button>
                    ) : (
                      <span>{c.conflictingEntityName ?? `#${c.conflictingEntityId}`}</span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">طريقة الرصد:</span>
                  <div className="font-semibold mt-0.5">
                    {MATCH_LABELS[c.matchedOn] ?? c.matchedOn}
                    {c.matchScore && (
                      <span className="text-muted-foreground font-normal"> ({Math.round(parseFloat(c.matchScore) * 100)}%)</span>
                    )}
                  </div>
                </div>
                {c.otherCaseName && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">الدوسية المرتبطة:</span>
                    <div className="font-semibold mt-0.5">
                      <button
                        className="text-primary hover:underline"
                        onClick={() => c.otherCaseId && navigate(`${BASE}/cases/${c.otherCaseId}`)}
                      >
                        {c.otherCaseName}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Justification */}
          <div className="space-y-2 pt-1">
            <label className="text-sm font-semibold" htmlFor="conflict-justification">
              التبرير <span className="text-destructive">*</span>
            </label>
            <textarea
              id="conflict-justification"
              rows={4}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="اشرح كيف يمكن المضي قدماً رغم هذا التعارض..."
              className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="flex items-center justify-between text-xs">
              <p className="text-muted-foreground">هذا التبرير سيُسجَّل في سجل الملف ولن يُعرض للحريف</p>
              <span className={justification.trim().length >= 30 ? "text-green-400" : "text-muted-foreground"}>
                {justification.trim().length}/30
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-border">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1"
          >
            إلغاء الإجراء
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm || isLoading}
            className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            {isLoading ? "جارٍ الحفظ..." : "تأكيد المضي قدماً"}
          </Button>
        </div>
      </div>
    </div>
  );
}

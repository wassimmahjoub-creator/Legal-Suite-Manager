import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle } from "lucide-react";

export interface ConfirmDestructiveProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  description: string;
  confirmationText?: string;
  confirmLabel?: string;
  consequenceList?: string[];
}

export function ConfirmDestructive({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmationText,
  confirmLabel = "حذف نهائي",
  consequenceList,
}: ConfirmDestructiveProps) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const canConfirm = !confirmationText || input === confirmationText;

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
      setInput("");
    }
    onClose();
  }

  function handleClose() {
    if (loading) return;
    setInput("");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader className="-mx-6 -mt-6 mb-4 px-6 py-4 bg-red-500/10 border-b border-red-500/20 rounded-t-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/15 rounded-lg shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <DialogTitle className="text-red-400 text-base font-bold leading-snug">
              {title}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>

          {consequenceList && consequenceList.length > 0 && (
            <ul className="space-y-2 text-sm bg-muted/30 rounded-lg p-3 border border-border">
              {consequenceList.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-muted-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          )}

          {confirmationText && (
            <div className="space-y-2 pt-1">
              <p className="text-sm text-muted-foreground">
                للتأكيد، اكتب:{" "}
                <strong className="font-mono text-foreground bg-muted px-1.5 py-0.5 rounded text-xs">
                  {confirmationText}
                </strong>
              </p>
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={confirmationText}
                className="font-mono h-10 bg-muted/50 border-border"
                onPaste={e => e.preventDefault()}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              إلغاء
            </Button>
            <Button
              variant="destructive"
              disabled={!canConfirm || loading}
              onClick={handleConfirm}
            >
              {loading ? "جارٍ الحذف…" : confirmLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

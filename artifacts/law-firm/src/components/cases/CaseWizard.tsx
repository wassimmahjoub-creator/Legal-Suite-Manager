import React, { useState, useEffect, useCallback } from "react";
import { X, Check, Plus, Trash2, UserCircle } from "lucide-react";
import { authFetch } from "@/lib/authFetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/SelectNative";
import { CourtSelect } from "@/components/CourtSelect";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

// ── Constants ──────────────────────────────────────────────────────────

const CASE_TYPES = [
  { value: "civil", label: "مدني" },
  { value: "commercial", label: "تجاري" },
  { value: "real_estate", label: "عقاري" },
  { value: "labor", label: "شغل" },
  { value: "criminal", label: "جزائي" },
  { value: "administrative", label: "إداري" },
  { value: "tax", label: "جبائي" },
  { value: "family", label: "أحوال شخصية" },
];

const LITIGATION_DEGREES = [
  { value: "first_instance", label: "ابتدائي" },
  { value: "appeal", label: "استئناف" },
  { value: "cassation", label: "تعقيب" },
];

const PROCEDURE_TYPES = [
  { value: "main_action", label: "دعوى أصلية" },
  { value: "urgent_request", label: "مطلب استعجالي" },
  { value: "petition_order", label: "إذن على عريضة" },
  { value: "opposition", label: "اعتراض" },
  { value: "appeal", label: "استئناف" },
  { value: "cassation", label: "تعقيب" },
  { value: "execution", label: "تنفيذ" },
];

const CASE_PRIORITIES = [
  { value: "normal", label: "عادية" },
  { value: "important", label: "مهمة" },
  { value: "urgent", label: "عاجلة" },
];

const CLIENT_SOURCES = [
  { value: "referral", label: "توصية" },
  { value: "returning_client", label: "عميل سابق" },
  { value: "facebook", label: "Facebook" },
  { value: "google", label: "Google" },
  { value: "partner", label: "شريك" },
  { value: "other", label: "آخر" },
];

const FEE_METHODS = [
  { value: "fixed", label: "مبلغ قار" },
  { value: "per_hearing", label: "بالجلسة" },
  { value: "percentage", label: "بالنسبة" },
  { value: "hourly", label: "بالساعة" },
];

const CONFIDENTIALITY_LEVELS = [
  { value: "normal", label: "عادي" },
  { value: "confidential", label: "سري" },
  { value: "sensitive", label: "حساس" },
];

const CAPACITY_SUGGESTIONS = ["مدعى عليه", "مدعي", "متدخل", "ضامن"];

const STEPS = [
  { id: 1, label: "معلومات الملف" },
  { id: 2, label: "المحكمة والإجراء" },
  { id: 3, label: "الأطراف" },
  { id: 4, label: "المالية" },
];

// ── Types ──────────────────────────────────────────────────────────────

interface OpponentBlock {
  tempId: string;
  name: string;
  capacity: string;
  lawyerName: string;
  lawyerPhone: string;
  notes: string;
}

interface WizardForm {
  title: string;
  clientId: string;
  caseType: string;
  openedAt: string;
  clientSource: string;
  casePriority: string;
  description: string;
  clientFileRef: string;
  litigationDegree: string;
  procedureType: string;
  court: string;
  division: string;
  judgeName: string;
  courtCaseNumber: string;
  firstHearingDate: string;
  opponents: OpponentBlock[];
  responsibleUserId: string;
  assignedUserId: string;
  collaboratorIds: string[];
  feeMethod: string;
  agreedFees: string;
  hourlyRate: string;
  percentage: string;
  percentageBasis: string;
  disputeValue: string;
  confidentialityLevel: string;
  internalNotes: string;
}

type Client = { id: number; name: string };
type User = { id: number; name: string; email: string; role: string };

const mkOpp = (): OpponentBlock => ({
  tempId: Math.random().toString(36).slice(2),
  name: "", capacity: "", lawyerName: "", lawyerPhone: "", notes: "",
});

const defaultForm = (): WizardForm => ({
  title: "", clientId: "", caseType: "",
  openedAt: new Date().toISOString().slice(0, 10),
  clientSource: "", casePriority: "normal",
  description: "", clientFileRef: "",
  litigationDegree: "", procedureType: "",
  court: "", division: "", judgeName: "",
  courtCaseNumber: "", firstHearingDate: "",
  opponents: [mkOpp()],
  responsibleUserId: "", assignedUserId: "", collaboratorIds: [],
  feeMethod: "", agreedFees: "", hourlyRate: "",
  percentage: "", percentageBasis: "", disputeValue: "",
  confidentialityLevel: "normal", internalNotes: "",
});

// ── Validation ──────────────────────────────────────────────────────────

function isStepValid(step: number, f: WizardForm) {
  if (step === 1) return f.title.trim() !== "" && f.clientId !== "" && f.caseType !== "" && f.openedAt !== "";
  if (step === 2) return f.litigationDegree !== "" && f.procedureType !== "";
  if (step === 3) return f.opponents.some(o => o.name.trim() !== "") && f.responsibleUserId !== "";
  if (step === 4) {
    if (!f.feeMethod || !f.confidentialityLevel) return false;
    if (f.feeMethod === "fixed" || f.feeMethod === "per_hearing") return f.agreedFees !== "";
    if (f.feeMethod === "hourly") return f.hourlyRate !== "";
    if (f.feeMethod === "percentage") return f.percentage !== "";
    return true;
  }
  return false;
}

// ── Shared styles ───────────────────────────────────────────────────────

const cls = "h-10 bg-muted/50 border-border focus-visible:ring-1 focus-visible:ring-primary rounded-lg w-full";
const txcls = "w-full bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary";

// ── Step subcomponents ──────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-medium mb-1.5">{children}</label>;
}

function Req() { return <span className="text-destructive me-0.5">*</span>; }

function RadioGroup({ options, value, onChange }: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-3">
      {options.map(o => (
        <button key={o.value} type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 py-2.5 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
            value === o.value
              ? "border-primary bg-primary/10 text-primary"
              : "border-border hover:border-muted-foreground text-muted-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Step1({ form, upd, clients }: { form: WizardForm; upd: (u: Partial<WizardForm>) => void; clients: Client[] }) {
  return (
    <div className="space-y-4">
      <div>
        <Label>عنوان الملف <Req /></Label>
        <Input placeholder="مثال: قضية ميراث عائلة بن علي" className={cls}
          value={form.title} onChange={e => upd({ title: e.target.value })} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>الحريف <Req /></Label>
          <SelectNative value={form.clientId} onChange={e => upd({ clientId: e.target.value })} className={cls + " px-3"}>
            <option value="">اختر حريفاً...</option>
            {clients.map(cl => <option key={cl.id} value={cl.id}>{cl.name}</option>)}
          </SelectNative>
        </div>
        <div>
          <Label>نوع الملف <Req /></Label>
          <SelectNative value={form.caseType} onChange={e => upd({ caseType: e.target.value })} className={cls + " px-3"}>
            <option value="">اختر النوع...</option>
            {CASE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </SelectNative>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>تاريخ فتح الملف <Req /></Label>
          <Input type="date" className={cls} dir="ltr"
            value={form.openedAt} onChange={e => upd({ openedAt: e.target.value })} />
        </div>
        <div>
          <Label>أولوية الملف</Label>
          <SelectNative value={form.casePriority} onChange={e => upd({ casePriority: e.target.value })} className={cls + " px-3"}>
            {CASE_PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </SelectNative>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>مصدر الحريف</Label>
          <SelectNative value={form.clientSource} onChange={e => upd({ clientSource: e.target.value })} className={cls + " px-3"}>
            <option value="">—</option>
            {CLIENT_SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </SelectNative>
        </div>
        <div>
          <Label>مرجع الحريف</Label>
          <Input placeholder="رقم الملف لدى الحريف" className={cls}
            value={form.clientFileRef} onChange={e => upd({ clientFileRef: e.target.value })} />
        </div>
      </div>

      <div>
        <Label>وصف الملف</Label>
        <textarea rows={3} className={txcls} placeholder="ملخص وقائع القضية..."
          value={form.description} onChange={e => upd({ description: e.target.value })} />
      </div>
    </div>
  );
}

function Step2({ form, upd }: { form: WizardForm; upd: (u: Partial<WizardForm>) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <Label>درجة التقاضي <Req /></Label>
        <RadioGroup options={LITIGATION_DEGREES} value={form.litigationDegree} onChange={v => upd({ litigationDegree: v })} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>نوع الإجراء <Req /></Label>
          <SelectNative value={form.procedureType} onChange={e => upd({ procedureType: e.target.value })} className={cls + " px-3"}>
            <option value="">اختر الإجراء...</option>
            {PROCEDURE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </SelectNative>
        </div>
        <div>
          <Label>المحكمة</Label>
          <CourtSelect value={form.court} onChange={v => upd({ court: v })} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>الدائرة القضائية</Label>
          <Input placeholder="الدائرة المدنية الأولى..." className={cls}
            value={form.division} onChange={e => upd({ division: e.target.value })} />
        </div>
        <div>
          <Label>القاضي المتعهد</Label>
          <Input placeholder="اسم القاضي" className={cls}
            value={form.judgeName} onChange={e => upd({ judgeName: e.target.value })} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>عدد القضية بالمحكمة</Label>
          <Input placeholder="12345/2026" className={cls} dir="ltr"
            value={form.courtCaseNumber} onChange={e => upd({ courtCaseNumber: e.target.value })} />
        </div>
        <div>
          <Label>تاريخ أول جلسة</Label>
          <Input type="date" className={cls} dir="ltr"
            value={form.firstHearingDate} onChange={e => upd({ firstHearingDate: e.target.value })} />
        </div>
      </div>
    </div>
  );
}

function Step3({ form, upd, users }: { form: WizardForm; upd: (u: Partial<WizardForm>) => void; users: User[] }) {
  function updateOpp(i: number, patch: Partial<OpponentBlock>) {
    upd({ opponents: form.opponents.map((o, idx) => idx === i ? { ...o, ...patch } : o) });
  }

  function toggleCollab(uid: string) {
    const ids = form.collaboratorIds.includes(uid)
      ? form.collaboratorIds.filter(x => x !== uid)
      : [...form.collaboratorIds, uid];
    upd({ collaboratorIds: ids });
  }

  return (
    <div className="space-y-5">
      {/* Opponents */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">الخصوم</h3>
          <button type="button" onClick={() => upd({ opponents: [...form.opponents, mkOpp()] })}
            className="flex items-center gap-1 text-xs text-primary hover:underline">
            <Plus className="h-3.5 w-3.5" /> إضافة خصم
          </button>
        </div>
        <div className="space-y-3">
          {form.opponents.map((opp, i) => (
            <div key={opp.tempId} className="p-3 border border-border rounded-xl bg-muted/20 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">خصم {i + 1}</span>
                {i > 0 && (
                  <button type="button"
                    onClick={() => upd({ opponents: form.opponents.filter((_, j) => j !== i) })}
                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">اسم الخصم <span className="text-destructive">*</span></label>
                  <Input placeholder="الاسم الكامل" className={cls + " h-9 text-sm"}
                    value={opp.name} onChange={e => updateOpp(i, { name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">الصفة</label>
                  <Input placeholder="مدعى عليه، مدعي..." className={cls + " h-9 text-sm"}
                    list={`cap-${opp.tempId}`}
                    value={opp.capacity} onChange={e => updateOpp(i, { capacity: e.target.value })} />
                  <datalist id={`cap-${opp.tempId}`}>
                    {CAPACITY_SUGGESTIONS.map(s => <option key={s} value={s} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">محامي الخصم</label>
                  <Input placeholder="اسم المحامي" className={cls + " h-9 text-sm"}
                    value={opp.lawyerName} onChange={e => updateOpp(i, { lawyerName: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">هاتف المحامي</label>
                  <Input placeholder="+216 XX XXX XXX" className={cls + " h-9 text-sm"} dir="ltr"
                    value={opp.lawyerPhone} onChange={e => updateOpp(i, { lawyerPhone: e.target.value })} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Internal team */}
      <div>
        <h3 className="text-sm font-semibold mb-3">الفريق الداخلي</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>المحامي المسؤول <Req /></Label>
              <SelectNative value={form.responsibleUserId} onChange={e => upd({ responsibleUserId: e.target.value })} className={cls + " px-3"}>
                <option value="">اختر...</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
              </SelectNative>
            </div>
            <div>
              <Label>المكلف بالملف</Label>
              <SelectNative value={form.assignedUserId} onChange={e => upd({ assignedUserId: e.target.value })} className={cls + " px-3"}>
                <option value="">اختياري...</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
              </SelectNative>
            </div>
          </div>

          {users.length > 0 && (
            <div>
              <Label>الفريق المتابع</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {users.map(u => {
                  const sel = form.collaboratorIds.includes(String(u.id));
                  return (
                    <button key={u.id} type="button" onClick={() => toggleCollab(String(u.id))}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        sel ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-muted-foreground"
                      }`}>
                      <UserCircle className="h-3.5 w-3.5" />
                      {u.name || u.email}
                      {sel && <Check className="h-3 w-3" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Step4({ form, upd }: { form: WizardForm; upd: (u: Partial<WizardForm>) => void }) {
  return (
    <div className="space-y-5">
      {/* Fees */}
      <div>
        <h3 className="text-sm font-semibold mb-3">الأتعاب</h3>
        <div className="space-y-3">
          <div>
            <Label>طريقة احتساب الأتعاب <Req /></Label>
            <SelectNative value={form.feeMethod} onChange={e => upd({ feeMethod: e.target.value })} className={cls + " px-3"}>
              <option value="">اختر الطريقة...</option>
              {FEE_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </SelectNative>
          </div>

          {(form.feeMethod === "fixed" || form.feeMethod === "per_hearing") && (
            <div>
              <Label>الأتعاب المتفق عليها (د.ت) <Req /></Label>
              <Input type="number" min="0" step="0.001" placeholder="0.000" className={cls} dir="ltr"
                value={form.agreedFees} onChange={e => upd({ agreedFees: e.target.value })} />
            </div>
          )}

          {form.feeMethod === "hourly" && (
            <div>
              <Label>التعرفة بالساعة (د.ت) <Req /></Label>
              <Input type="number" min="0" step="0.001" placeholder="0.000" className={cls} dir="ltr"
                value={form.hourlyRate} onChange={e => upd({ hourlyRate: e.target.value })} />
            </div>
          )}

          {form.feeMethod === "percentage" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>النسبة % <Req /></Label>
                <Input type="number" min="0" max="100" step="0.1" placeholder="10" className={cls} dir="ltr"
                  value={form.percentage} onChange={e => upd({ percentage: e.target.value })} />
              </div>
              <div>
                <Label>أساس الاحتساب</Label>
                <Input placeholder="المبلغ المحكوم به..." className={cls}
                  value={form.percentageBasis} onChange={e => upd({ percentageBasis: e.target.value })} />
              </div>
            </div>
          )}

          <div>
            <Label>قيمة النزاع (د.ت)</Label>
            <Input type="number" min="0" step="0.001" placeholder="اختياري" className={cls} dir="ltr"
              value={form.disputeValue} onChange={e => upd({ disputeValue: e.target.value })} />
          </div>
        </div>
      </div>

      {/* Confidentiality */}
      <div>
        <h3 className="text-sm font-semibold mb-3">السرية والملاحظات</h3>
        <div className="space-y-3">
          <div>
            <Label>درجة الحساسية <Req /></Label>
            <RadioGroup options={CONFIDENTIALITY_LEVELS} value={form.confidentialityLevel} onChange={v => upd({ confidentialityLevel: v })} />
          </div>
          <div>
            <Label>ملاحظات داخلية</Label>
            <textarea rows={3} className={txcls} placeholder="ملاحظات للاستخدام الداخلي فقط..."
              value={form.internalNotes} onChange={e => upd({ internalNotes: e.target.value })} />
            <p className="text-xs text-muted-foreground mt-1">⚠️ هذه الملاحظات لا تظهر للحريف في بوابة العميل</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main CaseWizard ─────────────────────────────────────────────────────

interface CaseWizardProps {
  open: boolean;
  onClose: () => void;
  onCreated: (caseId: number) => void;
}

export function CaseWizard({ open, onClose, onCreated }: CaseWizardProps) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<WizardForm>(defaultForm());
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [saving, setSaving] = useState(false);

  const upd = useCallback((u: Partial<WizardForm>) => setForm(f => ({ ...f, ...u })), []);

  useEffect(() => {
    if (!open) return;
    setForm(defaultForm());
    setStep(1);
    authFetch(`${BASE}/api/clients`).then(r => r.ok ? r.json() : []).then(setClients);
    authFetch(`${BASE}/api/auth/users`).then(r => r.ok ? r.json() : []).then(setUsers);
  }, [open]);

  if (!open) return null;

  async function handleSubmit() {
    setSaving(true);
    try {
      const stageMap: Record<string, string> = {
        first_instance: "ابتدائي", appeal: "استئناف", cassation: "تعقيب",
      };
      const responsibleUser = users.find(u => u.id === Number(form.responsibleUserId));

      const payload = {
        title: form.title,
        clientId: Number(form.clientId),
        status: "active",
        procedureStage: stageMap[form.litigationDegree] || "ابتدائي",
        lawyer: responsibleUser?.name || responsibleUser?.email || null,
        court: form.court || null,
        division: form.division || null,
        description: form.description || null,
        clientFileRef: form.clientFileRef || null,
        courtCaseNumber: form.courtCaseNumber || null,
        // Wizard fields
        caseType: form.caseType || null,
        litigationDegree: form.litigationDegree || null,
        procedureType: form.procedureType || null,
        casePriority: form.casePriority || "normal",
        feeMethod: form.feeMethod || null,
        agreedFees: form.agreedFees || null,
        hourlyRate: form.hourlyRate || null,
        percentage: form.percentage || null,
        percentageBasis: form.percentageBasis || null,
        disputeValue: form.disputeValue || null,
        clientSource: form.clientSource || null,
        judgeName: form.judgeName || null,
        firstHearingDate: form.firstHearingDate || null,
        openedAt: form.openedAt || null,
        confidentialityLevel: form.confidentialityLevel || "normal",
        internalNotes: form.internalNotes || null,
      };

      const r = await authFetch(`${BASE}/api/cases`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!r.ok) { setSaving(false); return; }
      const created = await r.json();
      const caseId = created.id as number;

      // Create opponents
      for (const opp of form.opponents) {
        if (!opp.name.trim()) continue;
        await authFetch(`${BASE}/api/opponents`, {
          method: "POST",
          body: JSON.stringify({
            name: opp.name,
            lawyerName: opp.lawyerName || null,
            opponentLawyerPhone: opp.lawyerPhone || null,
            capacity: opp.capacity || null,
            notes: opp.notes || null,
            caseId,
          }),
        });
      }

      // Create case team
      const teamRows = [
        form.responsibleUserId ? { userId: Number(form.responsibleUserId), role: "المحامي المسؤول" } : null,
        form.assignedUserId ? { userId: Number(form.assignedUserId), role: "المكلف بالملف" } : null,
        ...form.collaboratorIds.map(id => ({ userId: Number(id), role: "متابع" })),
      ].filter(Boolean) as Array<{ userId: number; role: string }>;

      for (const t of teamRows) {
        await authFetch(`${BASE}/api/cases/${caseId}/team`, {
          method: "POST",
          body: JSON.stringify(t),
        });
      }

      setSaving(false);
      onCreated(caseId);
    } catch {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col" dir="rtl">

        {/* Header + stepper */}
        <div className="p-5 border-b border-border shrink-0">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold">ملف قضائي جديد</h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors">
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          {/* Stepper */}
          <div className="flex items-center">
            {STEPS.map((s, i) => (
              <React.Fragment key={s.id}>
                <button type="button"
                  disabled={s.id >= step}
                  onClick={() => s.id < step && setStep(s.id)}
                  className="flex items-center gap-1.5 text-xs font-medium shrink-0 disabled:cursor-default">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    s.id < step ? "bg-primary text-primary-foreground" :
                    s.id === step ? "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-1 ring-offset-card" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {s.id < step ? <Check className="h-3 w-3" /> : s.id}
                  </span>
                  <span className={`hidden sm:inline ${s.id === step ? "text-foreground" : s.id < step ? "text-primary" : "text-muted-foreground"}`}>
                    {s.label}
                  </span>
                </button>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-px mx-2 transition-colors ${i < step - 1 ? "bg-primary" : "bg-border"}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {step === 1 && <Step1 form={form} upd={upd} clients={clients} />}
          {step === 2 && <Step2 form={form} upd={upd} />}
          {step === 3 && <Step3 form={form} upd={upd} users={users} />}
          {step === 4 && <Step4 form={form} upd={upd} />}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-border shrink-0">
          <div className="flex items-center gap-3">
            {step > 1
              ? <Button variant="outline" onClick={() => setStep(s => s - 1)} className="px-5">السابق</Button>
              : <Button variant="outline" onClick={onClose} className="px-5">إلغاء</Button>
            }
            <div className="flex-1" />
            <span className="text-xs text-muted-foreground">{step} / 4</span>
            {step < 4
              ? <Button onClick={() => setStep(s => s + 1)} disabled={!isStepValid(step, form)} className="px-5">التالي</Button>
              : <Button onClick={handleSubmit} disabled={!isStepValid(4, form) || saving} className="px-6">
                  {saving ? "جارٍ الإنشاء..." : "إنشاء الملف"}
                </Button>
            }
          </div>
        </div>
      </div>
    </div>
  );
}

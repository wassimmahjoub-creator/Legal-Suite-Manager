import React, { useState, useEffect, useCallback } from "react";
import { z } from "zod";
import { X, Check, Plus, Trash2, UserCircle, Scale, MessageSquare, FileText, Building2, Banknote, Bell, Gavel, Home, Briefcase, Calculator, ClipboardList, Users2, FolderOpen } from "lucide-react";
import { authFetch } from "@/lib/authFetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/SelectNative";
import { CourtSelect } from "@/components/CourtSelect";
import { useToast } from "@/hooks/use-toast";
import { ConflictWarningModal } from "@/components/ConflictWarningModal";
import type { ConflictData } from "@/components/ConflictWarningModal";

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
  { value: "facebook", label: "فيسبوك" },
  { value: "google", label: "جوجل" },
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

const CONTENTIEUX_TYPES = ["lawsuit", "real_estate_file", "labor_file", "tax_file", "judgment_execution"];
const SIMPLE_TYPES = ["legal_notice", "administrative", "mediation", "other"];

const SERVICE_TYPES_INFO = [
  { value: "lawsuit",            label: "قضية",          icon: Scale,         desc: "دعوى قضائية أمام المحاكم",            color: "text-destructive",    bg: "bg-destructive/10 border-destructive/20" },
  { value: "consultation",       label: "استشارة",       icon: MessageSquare, desc: "استشارة قانونية للموكّل",             color: "text-info",           bg: "bg-info/10 border-info/20" },
  { value: "contract",           label: "عقد",           icon: FileText,      desc: "تحرير أو مراجعة عقد",                color: "text-success",        bg: "bg-success/10 border-success/20" },
  { value: "company_creation",   label: "تأسيس شركة",   icon: Building2,     desc: "إجراءات تأسيس شركة",                 color: "text-primary",        bg: "bg-primary/10 border-primary/20" },
  { value: "debt_recovery",      label: "تحصيل ديون",   icon: Banknote,      desc: "متابعة واسترجاع الديون",             color: "text-warning",        bg: "bg-warning/10 border-warning/20" },
  { value: "legal_notice",       label: "إنذار",         icon: Bell,          desc: "تحرير وإرسال إنذار قانوني",          color: "text-warning",        bg: "bg-warning/10 border-warning/20" },
  { value: "judgment_execution", label: "تنفيذ حكم",     icon: Gavel,         desc: "تنفيذ حكم قضائي صادر",              color: "text-info",           bg: "bg-info/10 border-info/20" },
  { value: "real_estate_file",   label: "ملف عقاري",    icon: Home,          desc: "نزاعات أو معاملات عقارية",           color: "text-muted-foreground", bg: "bg-muted border-border" },
  { value: "labor_file",         label: "ملف شغل",      icon: Briefcase,     desc: "نزاعات عمالية وقانون الشغل",         color: "text-muted-foreground", bg: "bg-muted border-border" },
  { value: "tax_file",           label: "ملف جبائي",    icon: Calculator,    desc: "منازعات ومسائل جبائية",              color: "text-muted-foreground", bg: "bg-muted border-border" },
  { value: "administrative",     label: "إداري",         icon: ClipboardList, desc: "طعون وإجراءات أمام الإدارة",         color: "text-muted-foreground", bg: "bg-muted border-border" },
  { value: "mediation",          label: "وساطة",         icon: Users2,        desc: "وساطة وحل نزاعات بديل عن القضاء",   color: "text-muted-foreground", bg: "bg-muted border-border" },
  { value: "other",              label: "أخرى",          icon: FolderOpen,    desc: "نوع آخر من الملفات القانونية",       color: "text-muted-foreground", bg: "bg-muted border-border" },
];

function getSteps(serviceType: string) {
  if (CONTENTIEUX_TYPES.includes(serviceType)) {
    return [
      { id: 1, label: "معلومات الملف" },
      { id: 2, label: "المحكمة والإجراء" },
      { id: 3, label: "الأطراف" },
      { id: 4, label: "المالية" },
    ];
  }
  if (serviceType === "consultation") {
    return [
      { id: 1, label: "معلومات الملف" },
      { id: 2, label: "تفاصيل الاستشارة" },
      { id: 3, label: "المالية" },
    ];
  }
  if (serviceType === "contract") {
    return [
      { id: 1, label: "معلومات الملف" },
      { id: 2, label: "تفاصيل العقد" },
      { id: 3, label: "المالية" },
    ];
  }
  if (serviceType === "company_creation") {
    return [
      { id: 1, label: "معلومات الملف" },
      { id: 2, label: "تفاصيل الشركة" },
      { id: 3, label: "المالية" },
    ];
  }
  if (serviceType === "debt_recovery") {
    return [
      { id: 1, label: "معلومات الملف" },
      { id: 2, label: "المدين والدين" },
      { id: 3, label: "المالية" },
    ];
  }
  return [
    { id: 1, label: "معلومات الملف" },
    { id: 2, label: "تفاصيل إضافية" },
    { id: 3, label: "المالية" },
  ];
}

// STEPS est maintenant dynamique via getSteps(serviceType) — voir plus bas

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
  // Type de service
  serviceType: string;
  // Données spécifiques au type
  typeSpecificData: Record<string, unknown>;
  // Données contrat (Session 3b)
  contractData: {
    contractType: string; partyOneName: string; partyOneTaxId: string;
    partyTwoName: string; partyTwoTaxId: string; contractValue: string;
    startDate: string; endDate: string; signingDate: string; status: string; notes: string;
  };
  // Données dette (Session 3b)
  debtData: {
    debtorName: string; debtorTaxId: string; debtorPhone: string; debtorAddress: string;
    debtAmount: string; debtReason: string; dueDate: string; currentStage: string; notes: string;
  };
  // Données société (Session 3c)
  companyData: {
    companyType: string; proposedName: string; capital: string;
    activity: string; taxId: string; rneNumber: string; notes: string;
    partners: Array<{ name: string; taxId: string; shares: string; position: string }>;
  };
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
  serviceType: "",
  typeSpecificData: {},
  contractData: { contractType: "", partyOneName: "", partyOneTaxId: "", partyTwoName: "", partyTwoTaxId: "", contractValue: "", startDate: "", endDate: "", signingDate: "", status: "draft", notes: "" },
  debtData: { debtorName: "", debtorTaxId: "", debtorPhone: "", debtorAddress: "", debtAmount: "", debtReason: "", dueDate: "", currentStage: "notice", notes: "" },
  companyData: { companyType: "sarl", proposedName: "", capital: "", activity: "", taxId: "", rneNumber: "", notes: "", partners: [{ name: "", taxId: "", shares: "", position: "" }] },
});

// ── Validation ──────────────────────────────────────────────────────────

function isStepValid(step: number, f: WizardForm, editMode = false) {
  if (step === 1) return f.title.trim() !== "" && f.clientId !== "";
  if (editMode) return true;
  // Step final (financier) — même logique pour tous les types
  const steps = getSteps(f.serviceType);
  if (step === steps.length) {
    if (!f.feeMethod || !f.confidentialityLevel) return false;
    if (f.feeMethod === "fixed" || f.feeMethod === "per_hearing") return f.agreedFees !== "";
    if (f.feeMethod === "hourly") return f.hourlyRate !== "";
    if (f.feeMethod === "percentage") return f.percentage !== "";
    return true;
  }
  // Step 2 contentieux
  if (step === 2 && CONTENTIEUX_TYPES.includes(f.serviceType)) {
    return f.litigationDegree !== "" && f.procedureType !== "";
  }
  // Step 3 contentieux (parties)
  if (step === 3 && CONTENTIEUX_TYPES.includes(f.serviceType)) {
    return f.opponents.some(o => o.name.trim() !== "") && f.responsibleUserId !== "";
  }
  // Step 2 autres types — optionnel, toujours valide
  return true;
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

function Step1({ form, upd, clients, onAddClient, stepErrors }: { form: WizardForm; upd: (u: Partial<WizardForm>) => void; clients: Client[]; onAddClient: () => void; stepErrors: Record<string, string> }) {
  return (
    <div className="space-y-4">
      <div>
        <Label>عنوان الملف <Req /></Label>
        <Input placeholder="مثال: قضية ميراث عائلة بن علي" className={cls}
          value={form.title} onChange={e => upd({ title: e.target.value })} />
        {stepErrors.title && <p className="text-xs text-destructive mt-1">{stepErrors.title}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>الموكّل <Req /></Label>
          <div className="flex gap-2">
            <SelectNative value={form.clientId} onChange={e => upd({ clientId: e.target.value })} className={cls + " px-3 flex-1"}>
              <option value="">اختر موكّلاً...</option>
              {clients.map(cl => <option key={cl.id} value={cl.id}>{cl.name}</option>)}
            </SelectNative>
            <button type="button" onClick={onAddClient} title="موكّل جديد"
              className="h-10 px-2.5 rounded-lg border border-border bg-muted/50 hover:bg-primary/10 hover:border-primary text-muted-foreground hover:text-primary transition-all shrink-0">
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {stepErrors.clientId && <p className="text-xs text-destructive mt-1">{stepErrors.clientId}</p>}
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
          <Label>مصدر الموكّل</Label>
          <SelectNative value={form.clientSource} onChange={e => upd({ clientSource: e.target.value })} className={cls + " px-3"}>
            <option value="">—</option>
            {CLIENT_SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </SelectNative>
        </div>
        <div>
          <Label>مرجع الموكّل</Label>
          <Input placeholder="رقم الملف لدى الموكّل" className={cls}
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

function Step2({ form, upd, stepErrors }: { form: WizardForm; upd: (u: Partial<WizardForm>) => void; stepErrors: Record<string, string> }) {
  return (
    <div className="space-y-4">
      <div>
        <Label>درجة التقاضي <Req /></Label>
        <RadioGroup options={LITIGATION_DEGREES} value={form.litigationDegree} onChange={v => upd({ litigationDegree: v })} />
        {stepErrors.litigationDegree && <p className="text-xs text-destructive mt-1">{stepErrors.litigationDegree}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>نوع الإجراء <Req /></Label>
          <SelectNative value={form.procedureType} onChange={e => upd({ procedureType: e.target.value })} className={cls + " px-3"}>
            <option value="">اختر الإجراء...</option>
            {PROCEDURE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </SelectNative>
          {stepErrors.procedureType && <p className="text-xs text-destructive mt-1">{stepErrors.procedureType}</p>}
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

function Step3({ form, upd, users, stepErrors }: { form: WizardForm; upd: (u: Partial<WizardForm>) => void; users: User[]; stepErrors: Record<string, string> }) {
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
              {stepErrors.responsibleUserId && <p className="text-xs text-destructive mt-1">{stepErrors.responsibleUserId}</p>}
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
            <div className="animate-in slide-in-from-top-2 fade-in duration-200">
              <Label>الأتعاب المتفق عليها (د.ت) <Req /></Label>
              <Input autoFocus type="number" min="0" step="0.001" placeholder="0.000" className={cls} dir="ltr"
                value={form.agreedFees} onChange={e => upd({ agreedFees: e.target.value })} />
            </div>
          )}

          {form.feeMethod === "hourly" && (
            <div className="animate-in slide-in-from-top-2 fade-in duration-200">
              <Label>التعرفة بالساعة (د.ت) <Req /></Label>
              <Input autoFocus type="number" min="0" step="0.001" placeholder="0.000" className={cls} dir="ltr"
                value={form.hourlyRate} onChange={e => upd({ hourlyRate: e.target.value })} />
            </div>
          )}

          {form.feeMethod === "percentage" && (
            <div className="animate-in slide-in-from-top-2 fade-in duration-200 grid grid-cols-2 gap-4">
              <div>
                <Label>النسبة % <Req /></Label>
                <Input autoFocus type="number" min="0" max="100" step="0.1" placeholder="10" className={cls} dir="ltr"
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
            <p className="text-xs text-muted-foreground mt-1">⚠️ هذه الملاحظات لا تظهر للموكّل في بوابة العميل</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Step Consultation ───────────────────────────────────────────────────
function StepConsultation({ form, upd }: { form: WizardForm; upd: (u: Partial<WizardForm>) => void }) {
  const tsd = form.typeSpecificData as Record<string, string>;
  const set = (k: string, v: string) => upd({ typeSpecificData: { ...tsd, [k]: v } });
  return (
    <div className="space-y-4">
      <div>
        <Label>موضوع الاستشارة</Label>
        <Input placeholder="موضوع الاستشارة القانونية..." className={cls}
          value={(tsd.subject as string) ?? ""}
          onChange={e => set("subject", e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>طريقة الاستشارة</Label>
          <SelectNative value={(tsd.method as string) ?? ""} onChange={e => set("method", e.target.value)} className={cls + " px-3"}>
            <option value="">—</option>
            {[{v:"in_person",l:"حضورية"},{v:"remote",l:"عن بعد"},{v:"written",l:"مكتوبة"},{v:"phone",l:"هاتفية"}].map(o =>
              <option key={o.v} value={o.v}>{o.l}</option>
            )}
          </SelectNative>
        </div>
        <div>
          <Label>تاريخ الاستشارة</Label>
          <Input type="date" className={cls} dir="ltr"
            value={(tsd.consultationDate as string) ?? form.openedAt}
            onChange={e => set("consultationDate", e.target.value)} />
        </div>
      </div>
      <div>
        <Label>ملخص الاستشارة والنتائج</Label>
        <textarea rows={4} className={txcls} placeholder="ملخص ما تمت مناقشته والتوصيات..."
          value={(tsd.result as string) ?? ""}
          onChange={e => set("result", e.target.value)} />
      </div>
    </div>
  );
}

// ── Step Contract ────────────────────────────────────────────────────────
const CONTRACT_TYPES = [
  { value: "sale", label: "بيع" }, { value: "rental", label: "كراء" },
  { value: "service", label: "خدمات" }, { value: "employment", label: "عمل" },
  { value: "partnership", label: "شراكة" }, { value: "loan", label: "قرض" },
  { value: "guarantee", label: "ضمان" }, { value: "other", label: "أخرى" },
];
const CONTRACT_STATUSES = [
  { value: "draft", label: "مسودة" }, { value: "under_review", label: "قيد المراجعة" },
  { value: "ready_to_sign", label: "جاهز للإمضاء" }, { value: "signed", label: "ممضى" },
];

function StepContract({ form, upd }: { form: WizardForm; upd: (u: Partial<WizardForm>) => void }) {
  const cd = form.contractData;
  const set = (k: keyof typeof cd, v: string) => upd({ contractData: { ...cd, [k]: v } });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>نوع العقد <Req /></Label>
          <SelectNative value={cd.contractType} onChange={e => set("contractType", e.target.value)} className={cls + " px-3"}>
            <option value="">اختر...</option>
            {CONTRACT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </SelectNative>
        </div>
        <div>
          <Label>حالة العقد</Label>
          <SelectNative value={cd.status} onChange={e => set("status", e.target.value)} className={cls + " px-3"}>
            {CONTRACT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </SelectNative>
        </div>
      </div>
      <div className="p-3 border border-border rounded-xl bg-muted/20 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground">الطرف الأول</p>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>الاسم <Req /></Label>
            <Input className={cls} value={cd.partyOneName} onChange={e => set("partyOneName", e.target.value)} /></div>
          <div><Label>المعرف الجبائي</Label>
            <Input className={cls} dir="ltr" value={cd.partyOneTaxId} onChange={e => set("partyOneTaxId", e.target.value)} /></div>
        </div>
      </div>
      <div className="p-3 border border-border rounded-xl bg-muted/20 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground">الطرف الثاني</p>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>الاسم <Req /></Label>
            <Input className={cls} value={cd.partyTwoName} onChange={e => set("partyTwoName", e.target.value)} /></div>
          <div><Label>المعرف الجبائي</Label>
            <Input className={cls} dir="ltr" value={cd.partyTwoTaxId} onChange={e => set("partyTwoTaxId", e.target.value)} /></div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>قيمة العقد (د.ت)</Label>
          <Input type="number" min="0" step="0.001" className={cls} dir="ltr"
            value={cd.contractValue} onChange={e => set("contractValue", e.target.value)} /></div>
        <div><Label>تاريخ الإمضاء</Label>
          <Input type="date" className={cls} dir="ltr"
            value={cd.signingDate} onChange={e => set("signingDate", e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>تاريخ البداية</Label>
          <Input type="date" className={cls} dir="ltr"
            value={cd.startDate} onChange={e => set("startDate", e.target.value)} /></div>
        <div><Label>تاريخ النهاية</Label>
          <Input type="date" className={cls} dir="ltr"
            value={cd.endDate} onChange={e => set("endDate", e.target.value)} /></div>
      </div>
    </div>
  );
}

// ── Step Debt Recovery ───────────────────────────────────────────────────
const DEBT_STAGES = [
  { value: "notice", label: "إنذار" }, { value: "negotiation", label: "تفاوض" },
  { value: "lawsuit", label: "قضية" }, { value: "execution", label: "تنفيذ" },
  { value: "completed", label: "منتهي" },
];

function StepDebt({ form, upd }: { form: WizardForm; upd: (u: Partial<WizardForm>) => void }) {
  const dd = form.debtData;
  const set = (k: keyof typeof dd, v: string) => upd({ debtData: { ...dd, [k]: v } });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><Label>اسم المدين <Req /></Label>
          <Input className={cls} value={dd.debtorName} onChange={e => set("debtorName", e.target.value)} /></div>
        <div><Label>المعرف الجبائي للمدين</Label>
          <Input className={cls} dir="ltr" value={dd.debtorTaxId} onChange={e => set("debtorTaxId", e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>هاتف المدين</Label>
          <Input className={cls} dir="ltr" placeholder="+216..." value={dd.debtorPhone} onChange={e => set("debtorPhone", e.target.value)} /></div>
        <div><Label>عنوان المدين</Label>
          <Input className={cls} value={dd.debtorAddress} onChange={e => set("debtorAddress", e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><Label>مبلغ الدين (د.ت) <Req /></Label>
          <Input type="number" min="0" step="0.001" className={cls} dir="ltr"
            value={dd.debtAmount} onChange={e => set("debtAmount", e.target.value)} /></div>
        <div><Label>تاريخ الاستحقاق</Label>
          <Input type="date" className={cls} dir="ltr"
            value={dd.dueDate} onChange={e => set("dueDate", e.target.value)} /></div>
      </div>
      <div><Label>سبب الدين</Label>
        <Input className={cls} value={dd.debtReason} onChange={e => set("debtReason", e.target.value)} /></div>
      <div><Label>المرحلة الحالية</Label>
        <SelectNative value={dd.currentStage} onChange={e => set("currentStage", e.target.value)} className={cls + " px-3"}>
          {DEBT_STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </SelectNative>
      </div>
    </div>
  );
}

// ── Main CaseWizard ─────────────────────────────────────────────────────

interface CaseWizardProps {
  open: boolean;
  onClose: () => void;
  onCreated: (caseId: number) => void;
  /** When provided, wizard runs in edit mode */
  caseId?: number;
  initialData?: Partial<WizardForm>;
}

const Step1Schema = z.object({
  title:    z.string().min(2, "عنوان القضية مطلوب (حرفان على الأقل)"),
  clientId: z.string().min(1, "يجب اختيار موكّل"),
});

const Step2Schema = z.object({
  litigationDegree: z.string().min(1, "درجة التقاضي مطلوبة"),
  procedureType:    z.string().min(1, "نوع الإجراء مطلوب"),
});

const Step3Schema = z.object({
  responsibleUserId: z.string().min(1, "يجب تعيين محامٍ مسؤول"),
});

export function CaseWizard({ open, onClose, onCreated, caseId, initialData }: CaseWizardProps) {
  const editMode = !!caseId;
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<WizardForm>(defaultForm());
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [step4Err, setStep4Err] = useState(false);
  const { toast } = useToast();
  const [quickClientOpen, setQuickClientOpen] = useState(false);
  const [quickClientForm, setQuickClientForm] = useState({ name: "", clientType: "individual", phone: "", email: "" });
  const [pendingConflicts, setPendingConflicts] = useState<ConflictData[]>([]);
  const [pendingCaseId, setPendingCaseId] = useState<number | null>(null);
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<"type-select" | "form">("type-select");

  const upd = useCallback((u: Partial<WizardForm>) => setForm(f => ({ ...f, ...u })), []);

  const df = defaultForm();
  const isDirty = form.title !== df.title || form.clientId !== df.clientId ||
    form.description !== df.description || form.litigationDegree !== df.litigationDegree ||
    form.court !== df.court || form.agreedFees !== df.agreedFees;

  async function createQuickClient() {
    if (!quickClientForm.name.trim()) return;
    const r = await authFetch(`${BASE}/api/clients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: quickClientForm.name,
        clientType: quickClientForm.clientType,
        phone: quickClientForm.phone || null,
        email: quickClientForm.email || null,
      }),
    });
    if (r.ok) {
      const nc = await r.json() as { id: number; name: string };
      setClients(prev => [...prev, { id: nc.id, name: nc.name }]);
      upd({ clientId: String(nc.id) });
      setQuickClientOpen(false);
      setQuickClientForm({ name: "", clientType: "individual", phone: "", email: "" });
      toast({ title: "تم إنشاء الموكّل بنجاح" });
    }
  }

  function handleClose() {
    if (isDirty) { setConfirmClose(true); } else { onClose(); }
  }

  useEffect(() => {
    if (!open) return;
    setForm(editMode && initialData ? { ...defaultForm(), ...initialData } : defaultForm());
    setStep(1);
    setPhase(editMode ? "form" : "type-select");
    setConfirmClose(false);
    authFetch(`${BASE}/api/clients`).then(r => r.ok ? r.json() : []).then(setClients);
    authFetch(`${BASE}/api/auth/users`).then(r => r.ok ? r.json() : []).then(setUsers);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, isDirty]);

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
        ...(editMode ? {} : { status: "active" }),
        procedureStage: form.litigationDegree ? (stageMap[form.litigationDegree] || "ابتدائي") : undefined,
        lawyer: responsibleUser ? (responsibleUser.name || responsibleUser.email || null) : undefined,
        court: form.court || null,
        division: form.division || null,
        description: form.description || null,
        clientFileRef: form.clientFileRef || null,
        courtCaseNumber: form.courtCaseNumber || null,
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
        serviceType: form.serviceType || "lawsuit",
        typeSpecificData: form.typeSpecificData || {},
      };

      if (editMode && caseId) {
        const r = await authFetch(`${BASE}/api/cases/${caseId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setSaving(false);
        if (r.ok) { toast({ title: "تم حفظ التعديلات" }); onCreated(caseId); }
        return;
      }

      const r = await authFetch(`${BASE}/api/cases`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!r.ok) { setSaving(false); return; }
      const created = await r.json();
      const createdId = created.id as number;

      for (const opp of form.opponents) {
        if (!opp.name.trim()) continue;
        await authFetch(`${BASE}/api/opponents`, {
          method: "POST",
          body: JSON.stringify({
            name: opp.name, lawyerName: opp.lawyerName || null,
            opponentLawyerPhone: opp.lawyerPhone || null,
            capacity: opp.capacity || null, notes: opp.notes || null, caseId: createdId,
          }),
        });
      }

      const teamRows = [
        form.responsibleUserId ? { userId: Number(form.responsibleUserId), role: "المحامي المسؤول" } : null,
        form.assignedUserId ? { userId: Number(form.assignedUserId), role: "المكلف بالملف" } : null,
        ...form.collaboratorIds.map(id => ({ userId: Number(id), role: "متابع" })),
      ].filter(Boolean) as Array<{ userId: number; role: string }>;

      for (const t of teamRows) {
        await authFetch(`${BASE}/api/cases/${createdId}/team`, { method: "POST", body: JSON.stringify(t) });
      }

      // Créer les données spécifiques au type après la création du case
      if (form.serviceType === "contract" && form.contractData.partyOneName) {
        await authFetch(`${BASE}/api/contracts`, {
          method: "POST",
          body: JSON.stringify({
            caseId: createdId,
            contractType: form.contractData.contractType || "other",
            partyOneName: form.contractData.partyOneName,
            partyOneTaxId: form.contractData.partyOneTaxId || null,
            partyTwoName: form.contractData.partyTwoName,
            partyTwoTaxId: form.contractData.partyTwoTaxId || null,
            contractValue: form.contractData.contractValue ? parseFloat(form.contractData.contractValue) : null,
            startDate: form.contractData.startDate || null,
            endDate: form.contractData.endDate || null,
            signingDate: form.contractData.signingDate || null,
            status: form.contractData.status || "draft",
          }),
        });
      }
      if (form.serviceType === "debt_recovery" && form.debtData.debtorName) {
        await authFetch(`${BASE}/api/debt-recovery-files`, {
          method: "POST",
          body: JSON.stringify({
            caseId: createdId,
            debtorName: form.debtData.debtorName,
            debtorTaxId: form.debtData.debtorTaxId || null,
            debtorPhone: form.debtData.debtorPhone || null,
            debtorAddress: form.debtData.debtorAddress || null,
            debtAmount: parseFloat(form.debtData.debtAmount) || 0,
            debtReason: form.debtData.debtReason || null,
            dueDate: form.debtData.dueDate || null,
            currentStage: form.debtData.currentStage || "notice",
          }),
        });
      }

      // Conflict detection
      try {
        const detectRes = await authFetch(`${BASE}/api/conflict-checks/detect/${createdId}`, { method: "POST" });
        if (detectRes.ok) {
          const { conflicts } = await detectRes.json() as { conflicts: ConflictData[] };
          if (conflicts.length > 0) {
            setSaving(false);
            setPendingConflicts(conflicts);
            setPendingCaseId(createdId);
            return;
          }
        }
      } catch { /* non-blocking */ }

      setSaving(false);
      toast({ title: "تم إنشاء الملف بنجاح" });
      onCreated(createdId);
    } catch {
      setSaving(false);
    }
  }

  async function confirmConflicts(justification: string) {
    if (!pendingCaseId) return;
    setSaving(true);
    await authFetch(`${BASE}/api/conflict-checks/resolve-case/${pendingCaseId}`, {
      method: "PATCH",
      body: JSON.stringify({ justification }),
    });
    setSaving(false);
    const id = pendingCaseId;
    setPendingConflicts([]);
    setPendingCaseId(null);
    toast({ title: "تم إنشاء الملف — التعارض مُبرَّر ومُسجَّل" });
    onCreated(id);
  }

  async function cancelConflicts() {
    if (!pendingCaseId) return;
    await authFetch(`${BASE}/api/cases/${pendingCaseId}`, { method: "DELETE" });
    setPendingConflicts([]);
    setPendingCaseId(null);
    toast({ title: "تم إلغاء إنشاء الملف بسبب تعارض المصالح", variant: "destructive" });
  }

  return (
    <>
    <ConflictWarningModal
      open={pendingConflicts.length > 0}
      conflicts={pendingConflicts}
      saving={saving}
      onConfirm={confirmConflicts}
      onCancel={cancelConflicts}
    />
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative z-10 bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col" dir="rtl">

        {/* Confirm-close overlay */}
        {confirmClose && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 rounded-2xl">
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

        {quickClientOpen && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 rounded-2xl">
            <div className="bg-card border border-border rounded-xl p-5 max-w-sm w-full mx-4 space-y-4" dir="rtl">
              <h3 className="font-semibold">موكّل جديد</h3>
              <div>
                <label className="block text-sm font-medium mb-1.5">نوع الموكّل</label>
                <div className="flex gap-3">
                  {([{v:"individual",l:"شخص طبيعي"},{v:"company",l:"شخص معنوي"}] as {v:string;l:string}[]).map(o => (
                    <button key={o.v} type="button" onClick={() => setQuickClientForm(f => ({ ...f, clientType: o.v }))}
                      className={`flex-1 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${quickClientForm.clientType === o.v ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                      {o.l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">الاسم الكامل *</label>
                <Input autoFocus value={quickClientForm.name} onChange={e => setQuickClientForm(f => ({ ...f, name: e.target.value }))} className={cls} placeholder="الاسم كاملاً..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">الهاتف</label>
                  <Input value={quickClientForm.phone} onChange={e => setQuickClientForm(f => ({ ...f, phone: e.target.value }))} className={cls} dir="ltr" placeholder="+216..." />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">البريد الإلكتروني</label>
                  <Input type="email" value={quickClientForm.email} onChange={e => setQuickClientForm(f => ({ ...f, email: e.target.value }))} className={cls} dir="ltr" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setQuickClientOpen(false)} className="px-4">إلغاء</Button>
                <Button size="sm" className="flex-1" onClick={createQuickClient} disabled={!quickClientForm.name.trim()}>إنشاء الموكّل</Button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="p-5 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">
              {editMode ? "تعديل الملف القضائي" : phase === "type-select" ? "نوع الملف" : "ملف جديد"}
            </h2>
            <button onClick={handleClose} className="p-2 rounded-full hover:bg-muted transition-colors">
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          {/* Stepper — visible seulement en phase form */}
          {phase === "form" && (() => {
            const steps = getSteps(form.serviceType);
            return (
              <div className="flex items-center mt-5">
                {steps.map((s, i) => (
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
                    {i < steps.length - 1 && (
                      <div className={`flex-1 h-px mx-2 transition-colors ${i < step - 1 ? "bg-primary" : "bg-border"}`} />
                    )}
                  </React.Fragment>
                ))}
              </div>
            );
          })()}
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* ── Phase 0 : sélection du type ── */}
          {phase === "type-select" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">اختر نوع الملف القضائي الجديد</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {SERVICE_TYPES_INFO.map(t => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => { upd({ serviceType: t.value }); setPhase("form"); setStep(1); }}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-center transition-all hover:scale-[1.02] hover:shadow-md ${t.bg}`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${t.bg}`}>
                        <Icon className={`h-5 w-5 ${t.color}`} />
                      </div>
                      <span className={`text-sm font-semibold ${t.color}`}>{t.label}</span>
                      <span className="text-[10px] text-muted-foreground leading-tight">{t.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Phase form : étapes ── */}
          {phase === "form" && (() => {
            const steps = getSteps(form.serviceType);
            const isLastStep = step === steps.length;
            return (
              <>
                {step === 1 && <Step1 form={form} upd={upd} clients={clients} onAddClient={() => setQuickClientOpen(true)} stepErrors={stepErrors} />}
                {step === 2 && !isLastStep && CONTENTIEUX_TYPES.includes(form.serviceType) && <Step2 form={form} upd={upd} stepErrors={stepErrors} />}
                {step === 3 && !isLastStep && CONTENTIEUX_TYPES.includes(form.serviceType) && <Step3 form={form} upd={upd} users={users} stepErrors={stepErrors} />}
                {step === 2 && !isLastStep && !CONTENTIEUX_TYPES.includes(form.serviceType) && (
                  form.serviceType === "consultation" ? <StepConsultation form={form} upd={upd} /> :
                  form.serviceType === "contract"     ? <StepContract form={form} upd={upd} /> :
                  form.serviceType === "debt_recovery"? <StepDebt form={form} upd={upd} /> :
                  <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">⚙️ قريباً</div>
                )}
                {isLastStep && <Step4 form={form} upd={upd} />}
              </>
            );
          })()}
        </div>

        {/* Footer */}
        {phase === "form" && (() => {
          const steps = getSteps(form.serviceType);
          const isLastStep = step === steps.length;
          return (
            <div className="p-5 border-t border-border shrink-0">
              {isLastStep && step4Err && !isStepValid(step, form, editMode) && (
                <p className="text-xs text-destructive text-center mb-3">
                  يرجى إتمام جميع الحقول المطلوبة قبل الحفظ
                </p>
              )}
              <div className="flex gap-3">
                <Button type="button" variant="outline" className="flex-1"
                  onClick={() => {
                    if (step === 1) { setPhase("type-select"); }
                    else { setStep(s => s - 1); }
                  }}>
                  رجوع
                </Button>
                {!isLastStep ? (
                  <Button type="button" className="flex-1"
                    disabled={!isStepValid(step, form, editMode)}
                    onClick={() => {
                      const res = step === 1 ? Step1Schema.safeParse(form) :
                                  (step === 2 && CONTENTIEUX_TYPES.includes(form.serviceType)) ? Step2Schema.safeParse(form) :
                                  (step === 3 && CONTENTIEUX_TYPES.includes(form.serviceType)) ? Step3Schema.safeParse(form) :
                                  { success: true };
                      if (!res.success && 'error' in res) {
                        const errs: Record<string, string> = {};
                        res.error.issues.forEach((i: { path: (string | number)[]; message: string }) => { errs[String(i.path[0])] = i.message; });
                        setStepErrors(errs);
                      } else {
                        setStepErrors({});
                        setStep(s => s + 1);
                      }
                    }}>
                    التالي
                  </Button>
                ) : (
                  <Button type="button" className="flex-1" disabled={saving}
                    onClick={() => {
                      if (!isStepValid(step, form, editMode)) { setStep4Err(true); return; }
                      handleSubmit();
                    }}>
                    {saving ? "جارٍ الحفظ..." : editMode ? "حفظ التعديلات" : "إنشاء الملف"}
                  </Button>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
    </>
  );
}

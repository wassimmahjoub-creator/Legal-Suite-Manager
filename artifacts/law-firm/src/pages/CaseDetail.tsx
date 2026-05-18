import { SelectNative } from "@/components/SelectNative";
import { CaseWizard } from "@/components/cases/CaseWizard";
import { CaseStageStepper } from "@/components/cases/CaseStageStepper";
import { CaseJudgmentTab } from "@/components/cases/CaseJudgmentTab";
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useGetCase } from "@workspace/api-client-react";
import { formatDateTN } from "@/lib/date";
import { authFetch } from "@/lib/authFetch";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useLocale } from "@/context/LocaleContext";
import { StatusBadge } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Modal, FormField } from "@/components/Modal";
import { SmartTextarea } from "@/components/SmartTextarea";
import { CourtSelect } from "@/components/CourtSelect";
import { Money } from "@/components/Money";
import {
  Plus, MapPin, User, Calendar, FileText, CheckCircle2,
  Clock, Briefcase, ArrowRight, Trash2,
  StickyNote, CircleCheck, Circle,
  Users, AlertTriangle, Lock, Link2, GitBranch,
  Archive, Hash, Layers, Shield, Pencil, DollarSign,
  BarChart2, Timer, FolderOpen, Receipt, ArrowUpRight,
  ExternalLink, Scale, Upload, Banknote, TrendingDown,
  Play, Pause, Square, TrendingUp, Download,
} from "lucide-react";
import { SkeletonClientPage } from "@/components/ui/skeletons";
import { CasePdfButton } from "@/components/CasePdfButton";
import { CaseTimeline } from "@/components/cases/CaseTimeline";
import { ConfirmDestructive } from "@/components/ui/ConfirmDestructive";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
const inputCls = "h-10 bg-muted/50 border-border focus-visible:ring-1 focus-visible:ring-primary rounded-lg w-full";

// ── Translation maps (English DB values → Arabic display) ──────────────
const TR_CASE_TYPE: Record<string, string> = {
  civil: "مدني", commercial: "تجاري", real_estate: "عقاري",
  labor: "شغل", criminal: "جزائي", administrative: "إداري",
  tax: "جبائي", family: "أحوال شخصية",
};
const TR_LITIGATION_DEGREE: Record<string, string> = {
  first_instance: "ابتدائي", appeal: "استئناف", cassation: "تعقيب",
};
const TR_PROCEDURE_TYPE: Record<string, string> = {
  main_action: "دعوى أصلية", urgent_request: "مطلب استعجالي",
  petition_order: "إذن على عريضة", opposition: "اعتراض",
  appeal: "استئناف", cassation: "تعقيب", execution: "تنفيذ",
};
const TR_PRIORITY: Record<string, string> = {
  normal: "عادية", important: "مهمة", urgent: "عاجلة",
};
const TR_CLIENT_SOURCE: Record<string, string> = {
  referral: "توصية", returning_client: "عميل سابق",
  facebook: "فيسبوك", google: "جوجل", partner: "شريك", other: "آخر",
};
const TR_FEE_METHOD: Record<string, string> = {
  fixed: "مبلغ قار", per_hearing: "بالجلسة",
  percentage: "بالنسبة", hourly: "بالساعة",
};
const TR_CONFIDENTIALITY: Record<string, string> = {
  normal: "عادي", confidential: "سري", sensitive: "حساس",
};
function tr(map: Record<string, string>, val: string | null | undefined): string | null {
  if (!val) return null;
  return map[val] ?? val;
}

const DEADLINE_TYPES = [
  { value: "appeal",    label: "أجل الاستئناف (30 يوم)" },
  { value: "cassation", label: "أجل التعقيب (60 يوم)" },
  { value: "execution", label: "أجل التنفيذ (15 يوم)" },
  { value: "response",  label: "أجل الرد (20 يوم)" },
  { value: "custom",    label: "أجل مخصص" },
];

const EXPENSE_TYPES = [
  { value: "court_fees",  ar: "حقوق الكتابة",          fr: "Droits de greffe"       },
  { value: "expert_fees", ar: "رسوم الخبير",            fr: "Frais d'expertise"      },
  { value: "bailiff",     ar: "رسوم الأعوان القضائيين", fr: "Frais d'huissier"       },
  { value: "travel",      ar: "مصاريف السفر والتنقل",   fr: "Frais de déplacement"   },
  { value: "stamps",      ar: "طوابع فسكالية",          fr: "Timbres fiscaux"        },
  { value: "postage",     ar: "مصاريف المراسلة",        fr: "Frais de courrier"      },
  { value: "process",     ar: "رسوم المحضر",            fr: "Frais de signification" },
  { value: "translation", ar: "رسوم الترجمة",           fr: "Frais de traduction"    },
  { value: "corr_lawyer", ar: "أتعاب محامي مراسل",     fr: "Honoraires confrère"    },
  { value: "other",       ar: "أخرى",                   fr: "Autres"                 },
];
type ExpenseItem = { id: number; date: string; typeValue: string; description: string; amount: number; reimbursable: boolean; };
type TimeEntry   = { id: number; date: string; description: string; hours: number; rate: number; billable: boolean; };

function fmtTime(secs: number) {
  const h = Math.floor(secs / 3600).toString().padStart(2, "0");
  const m = Math.floor((secs % 3600) / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}
const URGENCY_COLORS: Record<string, string> = {
  critical: "bg-red-500/10 text-red-400 border-red-500/20",
  high:     "bg-primary/10 text-primary border-primary/20",
  normal:   "bg-muted text-muted-foreground border-border",
};

// ─── Tab config ───────────────────────────────────────────────
const TAB_IDS = ["overview","timeline","hearings","judgment","documents","invoicing","expenses","time","notes"] as const;
type TabId = typeof TAB_IDS[number];

// ─── Types ────────────────────────────────────────────────────
type Procedure  = { id: number; stage: string; status: string; notes: string | null; startedAt: string | null; endedAt: string | null; };
type Deadline   = { id: number; title: string; type: string; dueDate: string; urgency: string; notes: string | null; completedAt: string | null; };
type TeamMember = { id: number; userId: number; role: string; userName: string | null; };
type ConfNote   = { id: number; content: string; createdBy: string | null; createdAt: string; };
type Relation   = { id: number; relatedCaseId: number; relationType: string; relatedTitle: string | null; };
type UserItem   = { id: number; name: string; email: string; role: string; };
type Opponent   = { id: number; name: string; lawyerName: string | null; phone: string | null; address: string | null; notes: string | null; caseId: number | null; capacity?: string | null; opponentLawyerPhone?: string | null; };
type DocItem    = { id: number; name: string; type: string | null; url: string | null; caseId: number | null; createdAt: string; deletedAt?: string | null; };
type Invoice    = { id: number; invoiceNumber: string | null; netToPay: number; amountPaid: number | null; status: string; issueDate: string | null; dueDate: string | null; caseId: number | null; clientId: number | null; description: string | null; deletedAt: string | null; };
type AuditLog   = { id: number; entityType: string; entityId: number | null; action: string; userName: string | null; createdAt: string; details: string | null; };
type HearingEvent = { id: number; title: string; date: string; time: string | null; type: string; legalStatus: string | null; court: string | null; division: string | null; location: string | null; objective: string | null; result: string | null; };

const HEARING_TYPES = [
  { value: "hearing", label: "جلسة" }, { value: "meeting", label: "اجتماع" },
  { value: "deadline", label: "أجل قانوني" }, { value: "notification", label: "إعلام" },
  { value: "expertise", label: "خبرة" }, { value: "execution", label: "تنفيذ" },
  { value: "appeal", label: "استئناف" }, { value: "cassation", label: "تعقيب" },
  { value: "judgment", label: "حكم" }, { value: "other", label: "أخرى" },
];
const HEARING_STATUSES = [
  { value: "scheduled", label: "مبرمجة" }, { value: "completed", label: "منجزة" },
  { value: "postponed", label: "مؤجلة" }, { value: "cancelled", label: "ملغاة" },
];

// ─── Helpers ──────────────────────────────────────────────────
function daysFromNow(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}
function kpiCard(label: string, value: string | number, sub?: string, onClick?: () => void, accent?: string) {
  return (
    <div
      className={cn("p-4 rounded-xl border border-border bg-muted/20 flex flex-col gap-1", onClick && "cursor-pointer hover:bg-muted/40 transition-colors")}
      onClick={onClick}
    >
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={cn("text-2xl font-bold", accent ?? "text-foreground")}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      {onClick && <ArrowUpRight className="h-3 w-3 text-primary self-end mt-auto" />}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────
export default function CaseDetail() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: caseData, isLoading, refetch } = useGetCase(Number(id), { query: { enabled: !!id } });

  // URL tab sync
  const TAB_ALIASES: Record<string, TabId> = {
    billing: "invoicing", facturation: "invoicing", invoices: "invoicing",
    procedures: "timeline", lifecycle: "timeline",
    audiences: "hearings", sessions: "hearings",
    jugement: "judgment", verdict: "judgment",
    docs: "documents", fichiers: "documents",
  };
  const getTabFromURL = (): TabId => {
    const p = new URLSearchParams(window.location.search).get("tab") ?? "";
    if ((TAB_IDS as readonly string[]).includes(p)) return p as TabId;
    if (p in TAB_ALIASES) return TAB_ALIASES[p];
    return "overview";
  };
  const [activeTab, setActiveTab] = useState<TabId>(getTabFromURL);
  const changeTab = useCallback((t: TabId) => {
    setActiveTab(t);
    window.history.replaceState(null, "", `?tab=${t}`);
  }, []);

  const locale = useLocale();

  // Data state
  const [procedures,  setProcedures]  = useState<Procedure[]>([]);
  const [deadlines,   setDeadlines]   = useState<Deadline[]>([]);
  const [team,        setTeam]        = useState<TeamMember[]>([]);
  const [confNotes,   setConfNotes]   = useState<ConfNote[]>([]);
  const [relations,   setRelations]   = useState<Relation[]>([]);
  const [opponents,   setOpponents]   = useState<Opponent[]>([]);
  const [docs,        setDocs]        = useState<DocItem[]>([]);
  const [invoices,    setInvoices]    = useState<Invoice[]>([]);
  const [auditLogs,   setAuditLogs]   = useState<AuditLog[]>([]);
  const [allCases,    setAllCases]    = useState<Array<{ id: number; title: string }>>([]);
  const [allUsers,    setAllUsers]    = useState<UserItem[]>([]);
  const [expenses,    setExpenses]    = useState<ExpenseItem[]>([]);
  const [showExpModal, setShowExpModal] = useState(false);
  const [expForm, setExpForm] = useState({ date: new Date().toISOString().slice(0, 10), typeValue: EXPENSE_TYPES[0].value, description: "", amount: "", reimbursable: true });

  // Time tracking state
  const [timeEntries,   setTimeEntries]   = useState<TimeEntry[]>([]);
  const [timeRunning,   setTimeRunning]   = useState(false);
  const [timeElapsed,   setTimeElapsed]   = useState(0);
  const [timerDesc,     setTimerDesc]     = useState("");
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [timeForm, setTimeForm] = useState({ date: new Date().toISOString().slice(0, 10), description: "", hours: "", rate: "150", billable: true });
  const timeInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Forms
  const [oppForm,  setOppForm]  = useState({ name: "", lawyerName: "", phone: "", address: "", notes: "", capacity: "", opponentLawyerPhone: "" });
  const [procForm, setProcForm] = useState({ stage: "ابتدائي", status: "جارية", notes: "", startedAt: "", endedAt: "" });
  const [dlForm,   setDlForm]   = useState({ title: "", type: "custom", dueDate: "", urgency: "normal", notes: "" });
  const [dlEditId, setDlEditId] = useState<number | null>(null);
  const [confForm, setConfForm] = useState({ content: "" });
  const [relForm,  setRelForm]  = useState({ relatedCaseId: "", relationType: "مرتبطة" });
  const [teamForm, setTeamForm] = useState({ userId: "", role: "مساعد" });
  const [teamEditId, setTeamEditId] = useState<number | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [stageRefreshKey, setStageRefreshKey] = useState(0);
  const [editForm, setEditForm] = useState({
    title: "", clientId: "", court: "", division: "", lawyer: "", status: "active",
    nextHearing: "", description: "", procedureStage: "ابتدائي", courtCaseNumber: "",
    clientFileRef: "", opponentName: "", opponentLawyer: "", judgmentText: "",
  });
  const [docForm,   setDocForm]   = useState({ name: "", fileType: "عقد", url: "" });
  const [docEditId, setDocEditId] = useState<number | null>(null);
  const [noteText,  setNoteText]  = useState("");
  const [noteModal, setNoteModal] = useState(false);
  const [hearingEvents, setHearingEvents] = useState<HearingEvent[]>([]);
  const [hForm, setHForm] = useState({ title: "", date: new Date().toISOString().slice(0,10), time: "", type: "hearing", legalStatus: "scheduled", court: "", division: "", location: "", objective: "", duration: "60" });
  const [hEditId,   setHEditId]   = useState<number | null>(null);
  const [oppEditId, setOppEditId] = useState<number | null>(null);
  const [expEditId, setExpEditId] = useState<number | null>(null);
  const [timeEditId, setTimeEditId] = useState<number | null>(null);
  const [modal,     setModal]     = useState<string | null>(null);
  const [saving,    setSaving]    = useState(false);
  const [dlFilter,  setDlFilter]  = useState<"all" | "upcoming" | "past">("all");
  const [docSearch, setDocSearch] = useState("");

  // Confirm dialogs
  const [confirmOppId,      setConfirmOppId]      = useState<number | null>(null);
  const [confirmCaseDelete, setConfirmCaseDelete] = useState(false);
  const [confirmArchive,    setConfirmArchive]    = useState(false);
  const [confirmProcId,     setConfirmProcId]     = useState<number | null>(null);
  const [confirmDeadlineId, setConfirmDeadlineId] = useState<number | null>(null);
  const [confirmDocId,      setConfirmDocId]      = useState<number | null>(null);
  const [confirmTeamId,     setConfirmTeamId]     = useState<number | null>(null);
  const [confirmConfNoteId, setConfirmConfNoteId] = useState<number | null>(null);
  const [confirmRelationId, setConfirmRelationId] = useState<number | null>(null);

  // Loaders
  const load = {
    procedures: async () => { const r = await authFetch(`${BASE}/api/cases/${id}/procedures`); if (r.ok) setProcedures(await r.json()); },
    deadlines:  async () => { const r = await authFetch(`${BASE}/api/cases/${id}/deadlines`);  if (r.ok) setDeadlines(await r.json()); },
    team:       async () => { const r = await authFetch(`${BASE}/api/cases/${id}/team`);       if (r.ok) setTeam(await r.json()); },
    confNotes:  async () => { const r = await authFetch(`${BASE}/api/cases/${id}/confidential-notes`); if (r.ok) setConfNotes(await r.json()); },
    relations:  async () => { const r = await authFetch(`${BASE}/api/cases/${id}/relations`);  if (r.ok) setRelations(await r.json()); },
    opponents:  async () => { const r = await authFetch(`${BASE}/api/opponents?caseId=${id}`); if (r.ok) setOpponents(await r.json()); },
    docs:       async () => { const r = await authFetch(`${BASE}/api/documents?caseId=${id}`); if (r.ok) setDocs(await r.json()); },
    invoices:   async () => { const r = await authFetch(`${BASE}/api/invoices`); if (r.ok) { const all: Invoice[] = await r.json(); setInvoices(all.filter(inv => inv.caseId === Number(id) && !inv.deletedAt)); } },
    auditLogs:  async () => { const r = await authFetch(`${BASE}/api/audit-logs`); if (r.ok) setAuditLogs(await r.json()); },
    hearings:   async () => { const r = await authFetch(`${BASE}/api/events?caseId=${id}`, { cache: "no-store" }); if (r.ok) setHearingEvents(await r.json()); },
    expenses:   async () => { const r = await authFetch(`${BASE}/api/expenses?caseId=${id}`); if (r.ok) setExpenses(await r.json()); },
  };

  useEffect(() => {
    if (!id) return;
    Object.values(load).forEach(fn => fn());
    authFetch(`${BASE}/api/cases`).then(r => { if (r.ok) r.json().then(setAllCases); });
    authFetch(`${BASE}/api/auth/users`).then(r => { if (r.ok) r.json().then(setAllUsers); });
  }, [id]);

  useEffect(() => {
    if (timeRunning) {
      timeInterval.current = setInterval(() => setTimeElapsed(e => e + 1), 1000);
    } else {
      if (timeInterval.current) clearInterval(timeInterval.current);
    }
    return () => { if (timeInterval.current) clearInterval(timeInterval.current); };
  }, [timeRunning]);

  async function withSave(fn: () => Promise<void>, reloader: () => Promise<void>) {
    setSaving(true); await fn(); await reloader(); setSaving(false); setModal(null);
  }

  async function openEdit() {
    const cx = caseData as typeof caseData & { caseNumber?: string; courtCaseNumber?: string; clientFileRef?: string; division?: string; procedureStage?: string; opponentName?: string | null; opponentLawyer?: string | null; judgmentText?: string | null; };
    setEditForm({
      title: caseData.title ?? "",
      clientId: String(caseData.clientId ?? ""),
      court: caseData.court ?? "",
      division: cx.division ?? "",
      lawyer: caseData.lawyer ?? "",
      status: caseData.status ?? "active",
      nextHearing: caseData.nextHearing ? caseData.nextHearing.slice(0, 10) : "",
      description: caseData.description ?? "",
      procedureStage: cx.procedureStage ?? "ابتدائي",
      courtCaseNumber: cx.courtCaseNumber ?? "",
      clientFileRef: cx.clientFileRef ?? "",
      opponentName: cx.opponentName ?? "",
      opponentLawyer: cx.opponentLawyer ?? "",
      judgmentText: cx.judgmentText ?? "",
    });
    setModal("edit");
  }

  async function saveEdit() {
    if (!editForm.title) return;
    setSaving(true);
    const r = await authFetch(`${BASE}/api/cases/${id}`, {
      method: "PUT",
      body: JSON.stringify({ ...editForm, clientId: Number(editForm.clientId), nextHearing: editForm.nextHearing || undefined }),
    });
    if (r.ok) { refetch(); setModal(null); }
    setSaving(false);
  }

  if (isLoading) return <SkeletonClientPage tabs={6} />;
  if (!caseData) return <div className="text-center py-20 text-muted-foreground">القضية غير موجودة</div>;

  const c = caseData as typeof caseData & {
    caseNumber?: string; courtCaseNumber?: string; clientFileRef?: string; division?: string;
    procedureStage?: string; archivedAt?: string | null;
    opponentName?: string | null; opponentLawyer?: string | null; judgmentText?: string | null;
    caseType?: string | null; litigationDegree?: string | null; procedureType?: string | null;
    casePriority?: string | null; feeMethod?: string | null; agreedFees?: number | null;
    hourlyRate?: number | null; percentage?: number | null; percentageBasis?: string | null;
    disputeValue?: number | null; clientSource?: string | null; judgeName?: string | null;
    firstHearingDate?: string | null; openedAt?: string | null;
    confidentialityLevel?: string | null; internalNotes?: string | null;
  };

  const today = new Date().toISOString().slice(0, 10);
  const in30   = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const overdueCount  = deadlines.filter(d => !d.completedAt && d.dueDate < today).length;
  const upcomingCount = deadlines.filter(d => !d.completedAt && d.dueDate >= today && d.dueDate <= in30).length;
  const nextDeadline  = deadlines.filter(d => !d.completedAt && d.dueDate >= today).sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  const activeDocs    = docs.filter(d => !d.deletedAt);

  // Invoice KPIs
  const totalInvoiced = invoices.reduce((s, i) => s + Number(i.netToPay ?? 0), 0);
  const totalPaid     = invoices.reduce((s, i) => s + Number(i.amountPaid ?? 0), 0);
  const totalDue      = totalInvoiced - totalPaid;
  const hasOverdueInv = invoices.some(i => i.status !== "paid" && i.dueDate && i.dueDate < today);

  // Filtered deadlines
  const filteredDeadlines = deadlines.filter(d => {
    if (dlFilter === "upcoming") return !d.completedAt && d.dueDate >= today;
    if (dlFilter === "past")     return d.completedAt || d.dueDate < today;
    return true;
  }).sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  // Tab definitions
  const tabs: Array<{ id: TabId; label: string; icon: React.ReactNode; badge?: number; badgeColor?: string; badgeIcon?: React.ReactNode }> = [
    { id: "overview",   label: "نظرة عامة",          icon: <BarChart2 className="h-4 w-4" /> },
    { id: "timeline",   label: "التسلسل الإجرائي",   icon: <GitBranch className="h-4 w-4" /> },
    { id: "hearings",   label: "الجلسات والآجال",     icon: <Clock className="h-4 w-4" />,
      badge: upcomingCount > 0 ? upcomingCount : 0 },
    { id: "judgment",   label: "الحكم والتنفيذ",      icon: <Scale className="h-4 w-4" /> },
    { id: "documents",  label: "المؤيدات والوثائق",   icon: <FolderOpen className="h-4 w-4" />,
      badge: activeDocs.length > 0 ? activeDocs.length : 0 },
    { id: "invoicing",  label: "الأتعاب والفواتير",   icon: <Receipt className="h-4 w-4" />,
      badge: hasOverdueInv ? 1 : 0 },
    { id: "expenses",   label: "المصاريف",             icon: <DollarSign className="h-4 w-4" /> },
    { id: "time",       label: "الوقت",                icon: <Timer className="h-4 w-4" /> },
    { id: "notes",      label: "الملاحظات والسجل",    icon: <StickyNote className="h-4 w-4" />,
      badgeIcon: c.confidentialityLevel && c.confidentialityLevel !== "عادي" ? <Lock className="h-3 w-3 text-primary" /> : undefined },
  ];

  // ─────────────────────────────────────────────────────────────
  // TAB CONTENT RENDERERS
  // ─────────────────────────────────────────────────────────────

  function renderOverview() {
    return (
      <div className="space-y-5">
        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {kpiCard("الرصيد المستحق", totalDue > 0 ? `${totalDue.toLocaleString()} د.ت` : "—", totalDue > 0 ? "مستحق" : "لا توجد ديون", () => changeTab("invoicing"), totalDue > 0 ? "text-primary" : undefined)}
          {kpiCard("ساعات العمل", "—", "قيد التطوير", () => changeTab("time"))}
          {kpiCard("الموعد القادم", nextDeadline ? formatDateTN(nextDeadline.dueDate) : "—", nextDeadline ? nextDeadline.title : "لا توجد آجال قادمة", nextDeadline ? () => changeTab("hearings") : undefined)}
          {kpiCard("عدد الوثائق", activeDocs.length, "وثيقة مرفوعة", () => changeTab("documents"))}
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          {/* ملخص الملف */}
          <Card className="border-none shadow-sm">
            <CardContent className="p-5 space-y-3">
              <h3 className="font-semibold text-sm border-b border-border pb-2">ملخص الملف</h3>
              {[
                ["نوع الملف",       tr(TR_CASE_TYPE,         c.caseType)],
                ["درجة التقاضي",    tr(TR_LITIGATION_DEGREE, c.litigationDegree)],
                ["نوع الإجراء",     tr(TR_PROCEDURE_TYPE,    c.procedureType)],
                ["الأولوية",        tr(TR_PRIORITY,          c.casePriority)],
                ["قيمة النزاع",     c.disputeValue ? `${Number(c.disputeValue).toLocaleString()} د.ت` : null],
                ["مصدر الموكّل",    tr(TR_CLIENT_SOURCE, c.clientSource)],
                ["اسم القاضي",     c.judgeName],
                ["تاريخ فتح الملف", c.openedAt ? formatDateTN(c.openedAt) : null],
                ["أول جلسة",       c.firstHearingDate ? formatDateTN(c.firstHearingDate) : null],
                ["الجلسة القادمة",  caseData.nextHearing ? formatDateTN(caseData.nextHearing) : null],
              ].filter(([, v]) => v).map(([label, value]) => (
                <div key={label as string} className="flex items-start justify-between gap-2 text-sm">
                  <span className="text-muted-foreground shrink-0">{label as string}</span>
                  <span className="font-medium text-left">{value as string}</span>
                </div>
              ))}
              {!c.caseType && !c.litigationDegree && !c.procedureType && (
                <p className="text-xs text-muted-foreground py-2">لم تُحدَّد تفاصيل الملف بعد</p>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            {/* الأطراف */}
            <Card className="border-none shadow-sm">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <h3 className="font-semibold text-sm">الأطراف</h3>
                  <Button size="sm" onClick={() => { setOppForm({ name: "", lawyerName: "", phone: "", address: "", notes: "", capacity: "", opponentLawyerPhone: "" }); setModal("opponent"); }} className="gap-1 text-xs h-7"><Plus className="h-3 w-3" />خصم</Button>
                </div>
                {/* Client */}
                {caseData.clientName && (
                  <div onClick={() => (caseData as { clientId?: number }).clientId && navigate(`/clients/${(caseData as { clientId?: number }).clientId}`)} className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-xl cursor-pointer hover:border-primary/40 transition-colors">
                    <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm shrink-0">{caseData.clientName.charAt(0)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{caseData.clientName}</p>
                      <p className="text-[10px] text-muted-foreground">الموكّل</p>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                )}
                {/* Opponents */}
                {opponents.map(o => (
                  <div key={o.id} onClick={() => { setOppEditId(o.id); setOppForm({ name: o.name ?? "", lawyerName: o.lawyerName ?? "", phone: o.phone ?? "", address: o.address ?? "", notes: o.notes ?? "", capacity: o.capacity ?? "", opponentLawyerPhone: o.opponentLawyerPhone ?? "" }); setModal("opponent"); }} className="flex items-center gap-2 p-3 bg-destructive/5 border border-destructive/20 rounded-xl cursor-pointer hover:border-destructive/40 transition-colors">
                    <div className="h-8 w-8 rounded-full bg-destructive/10 text-destructive flex items-center justify-center font-bold text-sm shrink-0">{o.name.charAt(0)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{o.name}</p>
                        {o.capacity && <span className="text-[10px] px-1.5 py-0.5 bg-muted text-muted-foreground rounded-full">{o.capacity}</span>}
                      </div>
                      {o.lawyerName && <p className="text-[10px] text-muted-foreground">ذ. {o.lawyerName}{o.opponentLawyerPhone ? ` — ${o.opponentLawyerPhone}` : ""}</p>}
                    </div>
                    <button onClick={e => { e.stopPropagation(); setConfirmOppId(o.id); }} className="p-1 hover:bg-destructive/10 rounded-lg shrink-0"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                  </div>
                ))}
                {opponents.length === 0 && !caseData.clientName && <p className="text-xs text-muted-foreground py-1">لا خصوم مسجلين</p>}
              </CardContent>
            </Card>

            {/* الفريق */}
            <Card className="border-none shadow-sm">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <h3 className="font-semibold text-sm">الفريق الداخلي</h3>
                  <Button size="sm" onClick={() => { setTeamForm({ userId: "", role: "مساعد" }); setModal("team"); }} className="gap-1 text-xs h-7"><Plus className="h-3 w-3" />عضو</Button>
                </div>
                {caseData.lawyer && (
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm shrink-0">{caseData.lawyer.charAt(0)}</div>
                    <div>
                      <p className="font-semibold text-sm">{caseData.lawyer}</p>
                      <p className="text-[10px] text-muted-foreground">المحامي المسؤول</p>
                    </div>
                  </div>
                )}
                {team.map(m => (
                  <div key={m.id} onClick={() => { setTeamEditId(m.id); setTeamForm({ userId: String(m.userId), role: m.role ?? "مساعد" }); setModal("team"); }} className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20 cursor-pointer hover:border-primary/40 hover:bg-muted/40 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm shrink-0">{(m.userName ?? "م").charAt(0)}</div>
                      <div>
                        <p className="font-semibold text-sm">{m.userName ?? "مستخدم"}</p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400">{m.role}</span>
                      </div>
                    </div>
                    <button onClick={e => { e.stopPropagation(); setConfirmTeamId(m.id); }} className="p-1.5 hover:bg-destructive/10 rounded-lg"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                  </div>
                ))}
                {team.length === 0 && !caseData.lawyer && <p className="text-xs text-muted-foreground py-1">لا يوجد فريق مسجل</p>}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  function renderTimeline() {
    return (
      <Card className="border-none shadow-sm">
        <CardContent className="p-5">
          <CaseTimeline caseId={Number(id)} />
        </CardContent>
      </Card>
    );
  }

  function renderHearings() {
    const htLabel = (t: string) => HEARING_TYPES.find(x => x.value === t)?.label ?? t;
    const hsLabel = (s: string | null) => HEARING_STATUSES.find(x => x.value === s)?.label ?? s ?? "";
    const sortedHearings = [...hearingEvents].sort((a, b) => a.date.localeCompare(b.date));
    return (
      <Card className="border-none shadow-sm"><CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-semibold">الجلسات والآجال</h3>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => { setHForm({ title: "", date: new Date().toISOString().slice(0,10), time: "", type: "hearing", legalStatus: "scheduled", court: "", division: "", location: "", objective: "", duration: "60" }); setModal("hearing"); }} className="gap-1.5 text-xs"><Plus className="h-3.5 w-3.5" />جلسة جديدة</Button>
            <Button size="sm" onClick={() => { setDlForm({ title: "", type: "custom", dueDate: "", urgency: "normal", notes: "" }); setModal("deadline"); }} className="gap-1.5 text-xs"><Plus className="h-3.5 w-3.5" />أجل قانوني</Button>
          </div>
        </div>

        {/* Hearing events (calendar) */}
        {sortedHearings.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">الجلسات المبرمجة</p>
            {sortedHearings.map(h => {
              const isPast = h.date < new Date().toISOString().slice(0, 10);
              return (
                <div key={h.id} onClick={() => {
                    setHEditId(h.id);
                    setHForm({ title: h.title ?? "", date: h.date ?? new Date().toISOString().slice(0,10), time: h.time ?? "", type: h.type ?? "hearing", legalStatus: h.legalStatus ?? "scheduled", court: h.court ?? "", division: h.division ?? "", location: h.location ?? "", objective: h.objective ?? "", duration: "60" });
                    setModal("hearing");
                  }} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer hover:border-primary/40 transition-colors ${isPast ? "border-border bg-muted/10 opacity-60" : "border-primary/20 bg-primary/5"}`}>
                  <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{h.title}</span>
                      <span className="text-xs px-1.5 py-0.5 bg-muted rounded-full text-muted-foreground">{htLabel(h.type)}</span>
                      {h.legalStatus && <span className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded-full">{hsLabel(h.legalStatus)}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                      <span>{formatDateTN(h.date)}{h.time ? ` — ${h.time}` : ""}</span>
                      {h.court && <span>{h.court}{h.division ? ` / ${h.division}` : ""}</span>}
                    </div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); if (!confirm("حذف هذه الجلسة؟")) return; authFetch(`${BASE}/api/events/${h.id}`, { method: "DELETE" }).then(() => load.hearings()); }} className="p-1.5 hover:bg-destructive/10 rounded-lg shrink-0">
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">الآجال القانونية</p>
          {overdueCount > 0 && <span className="text-xs px-3 py-1.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{overdueCount} متأخر</span>}
        </div>

        {filteredDeadlines.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground border border-dashed border-border rounded-xl"><Clock className="h-8 w-8 mx-auto mb-2 opacity-20" /><p>لا توجد آجال</p></div>
        ) : (
          <div className="space-y-3">
            {filteredDeadlines.map(d => {
              const isOver = !d.completedAt && d.dueDate < today;
              const days   = daysFromNow(d.dueDate);
              return (
                <div key={d.id} onClick={() => {
                    setDlEditId(d.id);
                    setDlForm({ title: d.title, type: d.type, dueDate: d.dueDate ?? "", urgency: d.urgency, notes: d.notes ?? "" });
                    setModal("deadline");
                  }} className={`p-4 rounded-xl border cursor-pointer hover:border-primary/40 transition-colors ${d.completedAt ? "opacity-50 border-border bg-muted/20" : URGENCY_COLORS[d.urgency]}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <button onClick={e => { e.stopPropagation(); if (d.completedAt) return; authFetch(`${BASE}/api/deadlines/${d.id}/complete`, { method: "PATCH" }).then(() => load.deadlines()); }} className={d.completedAt ? "text-green-400" : "text-muted-foreground hover:text-green-400 transition-colors"}>
                        {d.completedAt ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                      </button>
                      <div>
                        <p className={`font-semibold text-sm ${d.completedAt ? "line-through" : ""}`}>{d.title}</p>
                        <div className="flex items-center gap-3 text-xs mt-0.5 flex-wrap">
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDateTN(d.dueDate)}</span>
                          {isOver && <span className="text-red-400 font-bold animate-pulse">متأخر!</span>}
                          {!isOver && !d.completedAt && days <= 30 && <span className="inline-flex items-center text-[10px] bg-primary text-white rounded-full px-1.5 py-0.5 font-bold">{days} يوم</span>}
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] bg-primary text-white font-bold">{d.urgency === "critical" ? "حرج" : d.urgency === "high" ? "عالٍ" : "عادي"}</span>
                        </div>
                      </div>
                    </div>
                    <button onClick={e => { e.stopPropagation(); setConfirmDeadlineId(d.id); }} className="p-1 hover:bg-destructive/10 rounded-lg shrink-0"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent></Card>
    );
  }

  function renderJudgment() {
    return (
      <Card className="border-none shadow-sm"><CardContent className="p-5 space-y-4">
        <h3 className="font-semibold">الحكم والتنفيذ</h3>
        {c.judgmentText && (
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
            <p className="text-xs text-muted-foreground mb-1">نص الحكم</p>
            <p className="text-sm font-medium leading-relaxed">{c.judgmentText}</p>
          </div>
        )}
        <div className="flex items-center gap-4 p-5 bg-indigo-500/5 border border-indigo-500/20 rounded-xl">
          <Scale className="h-8 w-8 text-indigo-400/50 shrink-0" />
          <div>
            <p className="text-sm font-medium">سيتم تفعيل هذا القسم قريباً</p>
            <p className="text-xs text-muted-foreground mt-0.5">تتبع مراحل الحكم والتنفيذ سيُضاف مع نظام إدارة المراحل الإجرائية</p>
          </div>
        </div>
      </CardContent></Card>
    );
  }

  function renderDocuments() {
    const filtered = activeDocs.filter(d => !docSearch || d.name.toLowerCase().includes(docSearch.toLowerCase()));
    return (
      <Card className="border-none shadow-sm"><CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-semibold">المؤيدات والوثائق</h3>
          <Button size="sm" className="gap-1.5 text-xs" onClick={() => setModal("upload-doc")}><Plus className="h-3.5 w-3.5" />رفع وثيقة</Button>
        </div>
        <Input value={docSearch} onChange={e => setDocSearch(e.target.value)} placeholder="بحث بالاسم..." className={inputCls} />
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground border border-dashed border-border rounded-xl"><FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-20" /><p>{docSearch ? "لا نتائج" : "لا توجد وثائق لهذا الملف"}</p></div>
        ) : (
          <div className="space-y-2">
            {filtered.map(doc => (
              <div key={doc.id} onClick={() => {
                  setDocEditId(doc.id);
                  setDocForm({ name: doc.name ?? "", fileType: doc.fileType ?? "عقد", url: doc.url ?? "" });
                  setModal("upload-doc");
                }} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border border-border cursor-pointer hover:border-primary/40 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><FileText className="h-4 w-4" /></div>
                  <div>
                    <p className="font-medium text-sm">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTN(doc.createdAt)}{doc.fileType ? ` · ${doc.fileType}` : ""}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  {doc.url && <a href={doc.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="p-1.5 hover:bg-muted rounded-lg"><ExternalLink className="h-3.5 w-3.5 text-muted-foreground" /></a>}
                  <button onClick={e => { e.stopPropagation(); setConfirmDocId(doc.id); }} className="p-1.5 hover:bg-destructive/10 rounded-lg"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent></Card>
    );
  }

  function renderInvoicing() {
    return (
      <div className="space-y-4">
        {/* Fee method */}
        {c.feeMethod && (
          <Card className="border-none shadow-sm"><CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">الأتعاب المتفق عليها</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div><p className="text-[10px] text-muted-foreground mb-0.5">طريقة الاحتساب</p><p className="text-sm font-medium">{tr(TR_FEE_METHOD, c.feeMethod) ?? c.feeMethod}</p></div>
              {(c.feeMethod === "fixed" || c.feeMethod === "per_hearing") && c.agreedFees && <div><p className="text-[10px] text-muted-foreground mb-0.5">الأتعاب المتفق عليها</p><p className="text-sm font-semibold text-primary">{Number(c.agreedFees).toLocaleString()} د.ت</p></div>}
              {c.feeMethod === "hourly" && c.hourlyRate && <div><p className="text-[10px] text-muted-foreground mb-0.5">التعرفة بالساعة</p><p className="text-sm font-semibold text-primary">{Number(c.hourlyRate).toLocaleString()} د.ت/ساعة</p></div>}
              {c.feeMethod === "percentage" && c.percentage && <div><p className="text-[10px] text-muted-foreground mb-0.5">النسبة</p><p className="text-sm font-semibold text-primary">{c.percentage}%{c.percentageBasis ? ` من ${c.percentageBasis}` : ""}</p></div>}
              {c.disputeValue && <div><p className="text-[10px] text-muted-foreground mb-0.5">قيمة النزاع</p><p className="text-sm font-medium">{Number(c.disputeValue).toLocaleString()} د.ت</p></div>}
            </div>
          </CardContent></Card>
        )}

        {/* Invoice KPIs */}
        <div className="grid grid-cols-3 gap-3">
          {kpiCard("المفوتر",  totalInvoiced > 0 ? `${totalInvoiced.toLocaleString()} د.ت` : "—")}
          {kpiCard("المقبوض",  totalPaid     > 0 ? `${totalPaid.toLocaleString()} د.ت`     : "—", undefined, undefined, "text-green-400")}
          {kpiCard("الرصيد المستحق", totalDue > 0 ? `${totalDue.toLocaleString()} د.ت` : "—", undefined, undefined, totalDue > 0 ? "text-primary" : undefined)}
        </div>

        {/* Invoices list */}
        <Card className="border-none shadow-sm"><CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">الفواتير</h3>
            <Button size="sm" onClick={() => {
  const p = new URLSearchParams({ caseId: String(id) });
  if (caseData?.clientId) p.set("clientId", String(caseData.clientId));
  if (caseData?.title)    p.set("desc",     encodeURIComponent(`أتعاب قانونية — ${caseData.title}`));
  if (c.feeMethod === "fixed" && c.agreedFees) p.set("amount", String(c.agreedFees));
  navigate(`/billing/new?${p.toString()}`);
}} className="gap-1.5 text-xs"><Plus className="h-3.5 w-3.5" />فاتورة جديدة</Button>
          </div>
          {invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-xl"><Receipt className="h-7 w-7 mx-auto mb-2 opacity-20" /><p className="text-sm">لا توجد فواتير لهذا الملف</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="text-right py-2 px-2">الرقم</th>
                  <th className="text-right py-2 px-2">التاريخ</th>
                  <th className="text-right py-2 px-2">المبلغ</th>
                  <th className="text-right py-2 px-2">المقبوض</th>
                  <th className="text-right py-2 px-2">الحالة</th>
                </tr></thead>
                <tbody>
                  {invoices.map(inv => {
                    const isOverdue = inv.status !== "paid" && inv.dueDate && inv.dueDate < today;
                    return (
                      <tr key={inv.id} onClick={() => navigate(`/billing/${inv.id}`)} className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer">
                        <td className="py-2.5 px-2 text-xs font-mono">{inv.invoiceNumber ?? `#${inv.id}`}</td>
                        <td className="py-2.5 px-2 text-xs text-muted-foreground">{inv.issueDate ? formatDateTN(inv.issueDate) : "—"}</td>
                        <td className="py-2.5 px-2 text-xs font-mono font-semibold text-right">{Number(inv.netToPay).toFixed(3)} د.ت</td>
                        <td className="py-2.5 px-2 text-xs font-mono text-green-400 text-right">{inv.amountPaid ? `${Number(inv.amountPaid).toFixed(3)} د.ت` : "—"}</td>
                        <td className="py-2.5 px-2">
                          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full", inv.status === "paid" ? "bg-green-500/10 text-green-400" : isOverdue ? "bg-red-500/10 text-red-400" : "bg-muted text-muted-foreground")}>
                            {inv.status === "paid" ? "مدفوعة" : isOverdue ? "متأخرة" : "قيد الانتظار"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent></Card>
      </div>
    );
  }

  function renderExpenses() {
    const total        = expenses.reduce((s, e) => s + e.amount, 0);
    const reimbursable = expenses.filter(e => e.reimbursable).reduce((s, e) => s + e.amount, 0);
    const office       = total - reimbursable;
    const getLabel = (v: string) => { const t = EXPENSE_TYPES.find(x => x.value === v); return t ? (locale === "ar" ? t.ar : t.fr) : v; };
    return (
      <div className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-none shadow-sm"><CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 bg-red-500/10 rounded-xl"><TrendingDown className="h-4 w-4 text-red-400" /></div>
            <div><p className="text-[11px] text-muted-foreground">إجمالي المصاريف</p><Money amount={total} className="text-lg font-bold" /></div>
          </CardContent></Card>
          <Card className="border-none shadow-sm"><CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 bg-green-500/10 rounded-xl"><Banknote className="h-4 w-4 text-green-500" /></div>
            <div><p className="text-[11px] text-muted-foreground">قابلة للاسترجاع</p><Money amount={reimbursable} className="text-lg font-bold" /></div>
          </CardContent></Card>
          <Card className="border-none shadow-sm"><CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl"><Scale className="h-4 w-4 text-primary" /></div>
            <div><p className="text-[11px] text-muted-foreground">مصاريف المكتب</p><Money amount={office} className="text-lg font-bold" /></div>
          </CardContent></Card>
        </div>

        {/* List */}
        <Card className="border-none shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <h3 className="font-semibold text-sm">قائمة المصاريف</h3>
              <Button size="sm" onClick={() => { setExpForm({ date: new Date().toISOString().slice(0, 10), typeValue: EXPENSE_TYPES[0].value, description: "", amount: "", reimbursable: true }); setShowExpModal(true); }} className="gap-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" /> إضافة مصروف
              </Button>
            </div>
            {expenses.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Receipt className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">لا توجد مصاريف مسجلة لهذا الملف</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="text-right py-2 px-4 font-medium">التاريخ</th>
                    <th className="text-right py-2 px-4 font-medium">النوع</th>
                    <th className="text-right py-2 px-4 font-medium hidden md:table-cell">الوصف</th>
                    <th className="text-right py-2 px-4 font-medium">المبلغ</th>
                    <th className="text-center py-2 px-4 font-medium">استرجاع</th>
                    <th className="py-2 px-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {expenses.map(e => (
                    <tr key={e.id} onClick={() => { setExpEditId(e.id); setExpForm({ date: e.date, typeValue: e.typeValue, description: e.description, amount: String(e.amount), reimbursable: e.reimbursable }); setShowExpModal(true); }} className="hover:bg-muted/20 transition-colors cursor-pointer">
                      <td className="py-2.5 px-4 text-muted-foreground whitespace-nowrap">{formatDateTN(e.date)}</td>
                      <td className="py-2.5 px-4"><span className="bg-muted/60 px-2 py-0.5 rounded text-xs">{getLabel(e.typeValue)}</span></td>
                      <td className="py-2.5 px-4 text-muted-foreground hidden md:table-cell">{e.description}</td>
                      <td className="py-2.5 px-4 font-semibold" dir="ltr"><Money amount={e.amount} /></td>
                      <td className="py-2.5 px-4 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${e.reimbursable ? "bg-green-500/10 text-green-400" : "bg-muted text-muted-foreground"}`}>{e.reimbursable ? "نعم" : "لا"}</span>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <button onClick={async ev => { ev.stopPropagation(); const r = await authFetch(`${BASE}/api/expenses/${e.id}`, { method: "DELETE" }); if (r.ok) setExpenses(es => es.filter(x => x.id !== e.id)); }} className="p-1 rounded hover:bg-destructive/10 transition-colors">
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {expenses.length > 0 && (
                  <tfoot className="bg-muted/20 border-t border-border">
                    <tr>
                      <td colSpan={3} className="py-2.5 px-4 font-semibold text-muted-foreground text-xs">المجموع</td>
                      <td className="py-2.5 px-4 font-bold text-primary" dir="ltr"><Money amount={total} /></td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderTime() {
    const totalHours   = timeEntries.reduce((s, e) => s + e.hours, 0);
    const billableHrs  = timeEntries.filter(e => e.billable).reduce((s, e) => s + e.hours, 0);
    const totalAmount  = timeEntries.filter(e => e.billable).reduce((s, e) => s + e.hours * e.rate, 0);
    const stopTimer = () => {
      setTimeRunning(false);
      if (timeElapsed > 60) {
        const hours = parseFloat((timeElapsed / 3600).toFixed(2));
        setTimeEntries(es => [{ id: Date.now(), date: new Date().toISOString().slice(0, 10), description: timerDesc || "وقت مسجّل بالكرونومتر", hours, rate: 150, billable: true }, ...es]);
      }
      setTimeElapsed(0);
      setTimerDesc("");
    };
    return (
      <div className="space-y-4">
        {/* Stopwatch */}
        <Card className="border-none shadow-sm bg-gradient-to-l from-primary/5 to-card">
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row items-center gap-5">
              <div className="text-center shrink-0">
                <div className="text-4xl font-mono font-bold tracking-wider text-primary" dir="ltr">{fmtTime(timeElapsed)}</div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1"><Timer className="h-3 w-3" />الكرونومتر</p>
              </div>
              <div className="flex-1 w-full">
                <Input placeholder="وصف النشاط (اختياري)..." className={inputCls} value={timerDesc} onChange={e => setTimerDesc(e.target.value)} />
              </div>
              <div className="flex gap-3 shrink-0">
                <button onClick={() => setTimeRunning(r => !r)} className={`p-3.5 rounded-full transition-all shadow-md ${timeRunning ? "bg-primary/70 hover:bg-primary/60" : "bg-primary hover:bg-primary/90"} text-primary-foreground`}>
                  {timeRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </button>
                {(timeRunning || timeElapsed > 0) && (
                  <button onClick={stopTimer} className="p-3.5 rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground transition-all shadow-md">
                    <Square className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-none shadow-sm"><CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 rounded-xl"><Clock className="h-4 w-4 text-blue-400" /></div>
            <div><p className="text-[11px] text-muted-foreground">إجمالي الساعات</p><p className="font-bold">{totalHours.toFixed(1)} س</p></div>
          </CardContent></Card>
          <Card className="border-none shadow-sm"><CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl"><Timer className="h-4 w-4 text-primary" /></div>
            <div><p className="text-[11px] text-muted-foreground">ساعات قابلة للفوترة</p><p className="font-bold">{billableHrs.toFixed(1)} س</p></div>
          </CardContent></Card>
          <Card className="border-none shadow-sm"><CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 bg-green-500/10 rounded-xl"><TrendingUp className="h-4 w-4 text-green-400" /></div>
            <div><p className="text-[11px] text-muted-foreground">المبلغ القابل للفوترة</p><Money amount={totalAmount} className="font-bold" /></div>
          </CardContent></Card>
        </div>

        {/* Entries list */}
        <Card className="border-none shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <h3 className="font-semibold text-sm">سجل الوقت</h3>
              <div className="flex gap-2">
                {timeEntries.length > 0 && (
                  <Button size="sm" variant="outline" onClick={() => navigate(`/billing/new?caseId=${id}`)} className="gap-1.5 text-xs h-7">
                    <Receipt className="h-3.5 w-3.5" />تحويل إلى فاتورة
                  </Button>
                )}
                <Button size="sm" onClick={() => { setTimeForm({ date: new Date().toISOString().slice(0, 10), description: "", hours: "", rate: "150", billable: true }); setShowTimeModal(true); }} className="gap-1.5 text-xs">
                  <Plus className="h-3.5 w-3.5" />إدخال يدوي
                </Button>
              </div>
            </div>
            {timeEntries.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Timer className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">لا توجد إدخالات وقت — ابدأ الكرونومتر أو أضف يدوياً</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="text-right py-2 px-4 font-medium">التاريخ</th>
                    <th className="text-right py-2 px-4 font-medium">الوصف</th>
                    <th className="text-right py-2 px-4 font-medium">الساعات</th>
                    <th className="text-right py-2 px-4 font-medium">المعدل</th>
                    <th className="text-right py-2 px-4 font-medium">المبلغ</th>
                    <th className="text-center py-2 px-4 font-medium">فوترة</th>
                    <th className="py-2 px-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {timeEntries.map(e => (
                    <tr key={e.id} onClick={() => { setTimeEditId(e.id); setTimeForm({ date: e.date, description: e.description, hours: String(e.hours), rate: String(e.rate), billable: e.billable }); setShowTimeModal(true); }} className="hover:bg-muted/20 transition-colors cursor-pointer">
                      <td className="py-2.5 px-4 text-muted-foreground whitespace-nowrap">{formatDateTN(e.date)}</td>
                      <td className="py-2.5 px-4">{e.description}</td>
                      <td className="py-2.5 px-4 font-mono" dir="ltr">{e.hours.toFixed(2)}</td>
                      <td className="py-2.5 px-4 text-muted-foreground" dir="ltr"><Money amount={e.rate} />/س</td>
                      <td className="py-2.5 px-4 font-semibold" dir="ltr"><Money amount={e.hours * e.rate} /></td>
                      <td className="py-2.5 px-4 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${e.billable ? "bg-green-500/10 text-green-400" : "bg-muted text-muted-foreground"}`}>{e.billable ? "نعم" : "لا"}</span>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <button onClick={ev => { ev.stopPropagation(); setTimeEntries(es => es.filter(x => x.id !== e.id)); }} className="p-1 rounded hover:bg-destructive/10 transition-colors">
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {timeEntries.length > 0 && (
                  <tfoot className="bg-muted/20 border-t border-border">
                    <tr>
                      <td colSpan={2} className="py-2.5 px-4 text-xs text-muted-foreground font-semibold">المجموع</td>
                      <td className="py-2.5 px-4 font-mono font-bold" dir="ltr">{totalHours.toFixed(2)}</td>
                      <td></td>
                      <td className="py-2.5 px-4 font-bold text-primary" dir="ltr"><Money amount={totalAmount} /></td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderPlaceholder(icon: React.ReactNode, title: string, subtitle: string) {
    return (
      <Card className="border-none shadow-sm"><CardContent className="p-10 flex flex-col items-center justify-center text-center gap-3">
        <div className="h-16 w-16 rounded-2xl bg-muted/30 flex items-center justify-center text-muted-foreground/40">{icon}</div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground max-w-xs">{subtitle}</p>
      </CardContent></Card>
    );
  }

  function renderNotes() {
    return (
      <div className="space-y-4">
        {/* درجة الحساسية */}
        {c.confidentialityLevel && (
          <Card className="border-none shadow-sm"><CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-sm">درجة الحساسية</span>
              </div>
              <span className={cn("text-xs px-2 py-1 rounded-full font-medium", c.confidentialityLevel === "سري للغاية" ? "bg-red-500/10 text-red-400" : c.confidentialityLevel === "سري" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                {c.confidentialityLevel}
              </span>
            </div>
          </CardContent></Card>
        )}

        {/* الملاحظات الداخلية (internalNotes from wizard) */}
        {c.internalNotes && (
          <Card className="border-none shadow-sm"><CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary shrink-0" />
              <h3 className="font-semibold text-sm">الملاحظات الداخلية</h3>
              <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full">سري</span>
            </div>
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl text-xs text-primary flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> هذه الملاحظات لا تظهر للموكّل في بوابة العميل
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{c.internalNotes}</p>
          </CardContent></Card>
        )}

        {/* ملاحظات سرية (manual entries) */}
        <Card className="border-none shadow-sm"><CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">ملاحظات سرية إضافية</h3>
              <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full flex items-center gap-1"><Lock className="h-3 w-3" />سري</span>
            </div>
            <Button size="sm" onClick={() => { setConfForm({ content: "" }); setModal("conf-note"); }} className="gap-1.5 text-xs"><Plus className="h-3.5 w-3.5" />ملاحظة</Button>
          </div>
          {confNotes.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground border border-dashed border-border rounded-xl text-sm"><Lock className="h-6 w-6 mx-auto mb-1.5 opacity-20" />لا توجد ملاحظات سرية</div>
          ) : (
            <div className="space-y-3">
              {confNotes.map(n => (
                <div key={n.id} className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm flex-1 leading-relaxed">{n.content}</p>
                    <button onClick={() => setConfirmConfNoteId(n.id)} className="p-1 hover:bg-destructive/10 rounded-lg shrink-0"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    {n.createdBy && <span className="flex items-center gap-1"><User className="h-3 w-3" />{n.createdBy}</span>}
                    <span>{formatDateTN(n.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent></Card>

        {/* ملاحظات عامة */}
        <Card className="border-none shadow-sm"><CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">ملاحظات الملف</h3>
            <Button size="sm" onClick={() => { setNoteText(""); setNoteModal(true); }} className="gap-1.5 text-xs"><Plus className="h-3.5 w-3.5" />إضافة</Button>
          </div>
          {caseData.description && <div><p className="text-xs text-muted-foreground mb-1">الوصف</p><p className="text-sm leading-relaxed bg-muted/30 p-3 rounded-xl">{caseData.description}</p></div>}
          {caseData.notes && <div><p className="text-xs text-muted-foreground mb-1">ملاحظات</p><p className="text-sm leading-relaxed bg-muted/30 p-3 rounded-xl whitespace-pre-wrap">{caseData.notes}</p></div>}
          {!caseData.description && !caseData.notes && <div className="text-center py-6 text-muted-foreground border border-dashed border-border rounded-xl text-sm"><StickyNote className="h-6 w-6 mx-auto mb-1.5 opacity-20" />لا توجد ملاحظات</div>}
        </CardContent></Card>

        {/* القضايا المرتبطة (conservées ici) */}
        {relations.length > 0 && (
          <Card className="border-none shadow-sm"><CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm flex items-center gap-2"><Link2 className="h-4 w-4" />القضايا المرتبطة</h3>
              <Button size="sm" onClick={() => { setRelForm({ relatedCaseId: "", relationType: "مرتبطة" }); setModal("relation"); }} className="gap-1 text-xs h-7"><Plus className="h-3 w-3" />ربط</Button>
            </div>
            {relations.map(r => (
              <div key={r.id} onClick={() => navigate(`/cases/${r.relatedCaseId}`)} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border border-border cursor-pointer hover:border-primary/40 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-indigo-400 shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">{r.relatedTitle ?? `قضية #${r.relatedCaseId}`}</p>
                    <span className="text-xs text-muted-foreground">{r.relationType}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={e => { e.stopPropagation(); setConfirmRelationId(r.id); }} className="p-1.5 hover:bg-destructive/10 rounded-lg"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                </div>
              </div>
            ))}
          </CardContent></Card>
        )}
        {relations.length === 0 && (
          <Card className="border-none shadow-sm"><CardContent className="p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm flex items-center gap-2"><Link2 className="h-4 w-4 text-muted-foreground" />القضايا المرتبطة</h3>
              <Button size="sm" onClick={() => { setRelForm({ relatedCaseId: "", relationType: "مرتبطة" }); setModal("relation"); }} className="gap-1 text-xs h-7"><Plus className="h-3 w-3" />ربط قضية</Button>
            </div>
          </CardContent></Card>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Case Header */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <button onClick={() => window.history.back()} className="mt-1 p-2 rounded-xl hover:bg-muted transition-colors shrink-0">
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </button>
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  {c.caseNumber      && <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full font-mono flex items-center gap-1" title="رقم الملف الداخلي"><Hash className="h-3 w-3" />{c.caseNumber}</span>}
                  {c.courtCaseNumber && <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-full font-mono flex items-center gap-1" title="رقم القضية لدى المحكمة">⚖ {c.courtCaseNumber}</span>}
                  {c.clientFileRef   && <span className="text-xs px-2 py-0.5 bg-cyan-500/10 text-cyan-400 rounded-full font-mono flex items-center gap-1" title="مرجع الموكّل">📁 {c.clientFileRef}</span>}
                  <StatusBadge status={caseData.status} />
                  {c.archivedAt      && <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full flex items-center gap-1"><Archive className="h-3 w-3" />مؤرشفة</span>}
                  {c.procedureStage  && <span className="text-xs px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center gap-1"><Layers className="h-3 w-3" />{c.procedureStage}</span>}
                  {c.caseType        && <span className="text-xs px-2 py-0.5 bg-violet-500/10 text-violet-400 rounded-full">{tr(TR_CASE_TYPE, c.caseType)}</span>}
                  {c.casePriority && c.casePriority !== "normal" && <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${c.casePriority === "urgent" ? "bg-red-500/10 text-red-400" : "bg-primary/10 text-primary"}`}><AlertTriangle className="h-3 w-3" />{tr(TR_PRIORITY, c.casePriority)}</span>}
                  {c.confidentialityLevel && c.confidentialityLevel !== "normal" && <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full flex items-center gap-1"><Lock className="h-3 w-3" />{tr(TR_CONFIDENTIALITY, c.confidentialityLevel)}</span>}
                </div>
                <h1 className="text-xl font-bold mb-1">{caseData.title}</h1>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {caseData.clientName && <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" />{caseData.clientName}</span>}
                  {caseData.court     && <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{caseData.court}{c.division ? ` — ${c.division}` : ""}</span>}
                  {caseData.lawyer    && <span className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" />{caseData.lawyer}</span>}
                  {caseData.nextHearing && !c.archivedAt && <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{formatDateTN(caseData.nextHearing)}</span>}
                  {c.archivedAt && c.judgmentText && <span className="flex items-center gap-1.5 text-primary"><FileText className="h-3.5 w-3.5" />نص الحكم: {c.judgmentText}</span>}
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap shrink-0">
              {overdueCount > 0 && <span className="text-xs px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {overdueCount} أجل متأخر</span>}
              <Button size="sm" onClick={() => setShowWizard(true)} className="gap-1.5 text-xs"><Pencil className="h-3.5 w-3.5" />تعديل</Button>
              <Button size="sm" onClick={() => setConfirmArchive(true)} className="gap-1.5 text-xs"><Archive className="h-3.5 w-3.5" />{c.archivedAt ? "استرجاع" : "أرشفة"}</Button>
              <CasePdfButton caseId={Number(id)} caseTitle={caseData?.title} caseNumber={(caseData as { caseNumber?: string | null })?.caseNumber} />
              <Button
                size="sm"
                className="gap-1.5 text-xs"
                title="تصدير الملف القضائي"
                onClick={async () => {
                  const r = await authFetch(`${BASE}/api/data-exports`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ exportType: "single_case", scopeId: Number(id) }),
                  });
                  if (r.ok) {
                    toast({ title: "بدأت عملية تصدير الملف", description: "انتقل إلى «البيانات والخصوصية» لمتابعة التقدم" });
                  } else {
                    toast({ title: "فشل إنشاء التصدير", variant: "destructive" });
                  }
                }}
              >
                <Download className="h-3.5 w-3.5" />تصدير
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setConfirmCaseDelete(true)} className="gap-1.5 text-xs"><Trash2 className="h-3.5 w-3.5" />حذف</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stage Stepper — always visible above tabs */}
      <CaseStageStepper
        caseId={Number(id)}
        refreshKey={stageRefreshKey}
        onStageClick={(stage, mode) => {
          changeTab("judgment");
        }}
      />

      {/* Tabs */}
      <div>
        <div className="border-b border-border">
          <div className="flex gap-0.5 overflow-x-auto no-scrollbar">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => changeTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap shrink-0",
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                )}>
                {tab.icon}
                {tab.label}
                {tab.badgeIcon}
                {tab.badge != null && tab.badge > 0 && (
                  <span className={`text-[10px] ${tab.badgeColor ?? "bg-primary text-white"} rounded-full px-1.5 py-0.5 font-bold leading-none min-w-[1.1rem] text-center`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          {activeTab === "overview"   && renderOverview()}
          {activeTab === "timeline"   && renderTimeline()}
          {activeTab === "hearings"   && renderHearings()}
          {activeTab === "judgment"   && <CaseJudgmentTab caseId={Number(id)} onStagesChanged={() => setStageRefreshKey(k => k + 1)} />}
          {activeTab === "documents"  && renderDocuments()}
          {activeTab === "invoicing"  && renderInvoicing()}
          {activeTab === "expenses"   && renderExpenses()}
          {activeTab === "time"       && renderTime()}
          {activeTab === "notes"      && renderNotes()}
        </div>
      </div>

      {/* ─── MODALS ─────────────────────────────────────────── */}

      {/* Opponent modal */}
      <Modal open={modal === "opponent"} onClose={() => { setModal(null); setOppEditId(null); }} title={oppEditId ? "تعديل الخصم" : "إضافة خصم"}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="الاسم *" htmlFor="opp-name">
              <Input id="opp-name" value={oppForm.name} onChange={e => setOppForm({...oppForm, name: e.target.value})} placeholder="اسم الخصم" className={inputCls} />
            </FormField>
            <FormField label="الصفة" htmlFor="opp-capacity">
              <SelectNative id="opp-capacity" value={oppForm.capacity} onChange={e => setOppForm({...oppForm, capacity: e.target.value})} className={inputCls + " px-3 cursor-pointer"}>
                <option value="">اختر صفة...</option>
                {["شخص طبيعي", "شخص معنوي", "ورثة", "مجهول"].map(s => <option key={s} value={s}>{s}</option>)}
              </SelectNative>
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="محامي الخصم" htmlFor="opp-lawyer">
              <Input id="opp-lawyer" value={oppForm.lawyerName} onChange={e => setOppForm({...oppForm, lawyerName: e.target.value})} placeholder="اسم المحامي" className={inputCls} />
            </FormField>
            <FormField label="هاتف محامي الخصم" htmlFor="opp-lawyer-phone">
              <Input id="opp-lawyer-phone" value={oppForm.opponentLawyerPhone} onChange={e => setOppForm({...oppForm, opponentLawyerPhone: e.target.value})} placeholder="2X XXX XXX" className={inputCls} dir="ltr" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="هاتف الخصم" htmlFor="opp-phone">
              <Input id="opp-phone" value={oppForm.phone} onChange={e => setOppForm({...oppForm, phone: e.target.value})} placeholder="2X XXX XXX" className={inputCls} dir="ltr" />
            </FormField>
            <FormField label="العنوان" htmlFor="opp-addr">
              <Input id="opp-addr" value={oppForm.address} onChange={e => setOppForm({...oppForm, address: e.target.value})} placeholder="العنوان" className={inputCls} />
            </FormField>
          </div>
          <FormField label="ملاحظات" htmlFor="opp-notes">
            <SmartTextarea id="opp-notes" value={oppForm.notes} onChange={v => setOppForm({...oppForm, notes: v})} rows={3} aiContext="ملاحظات خصم قانوني" placeholder="ملاحظات حول الخصم..." />
          </FormField>
          <div className="flex gap-3">
            <Button className="flex-1" disabled={saving || !oppForm.name.trim()} onClick={() => withSave(async () => {
              if (oppEditId) {
                await authFetch(`${BASE}/api/opponents/${oppEditId}`, { method: "PUT", body: JSON.stringify({ name: oppForm.name, lawyerName: oppForm.lawyerName, phone: oppForm.phone, address: oppForm.address, notes: oppForm.notes, capacity: oppForm.capacity || undefined, opponentLawyerPhone: oppForm.opponentLawyerPhone || undefined }) });
                setOppEditId(null);
              } else {
                await authFetch(`${BASE}/api/opponents`, { method: "POST", body: JSON.stringify({ name: oppForm.name, lawyerName: oppForm.lawyerName, phone: oppForm.phone, address: oppForm.address, notes: oppForm.notes, caseId: Number(id), capacity: oppForm.capacity || undefined, opponentLawyerPhone: oppForm.opponentLawyerPhone || undefined }) });
              }
            }, load.opponents)}>{saving ? "جارٍ الحفظ..." : oppEditId ? "حفظ التعديلات" : "حفظ"}</Button>
            <Button variant="outline" onClick={() => { setModal(null); setOppEditId(null); }} className="px-5">إلغاء</Button>
          </div>
        </div>
      </Modal>

      {/* Add Note modal */}
      <Modal open={noteModal} onClose={() => setNoteModal(false)} title="إضافة ملاحظة">
        <div className="space-y-4">
          <FormField label="الملاحظة *" htmlFor="ov-note">
            <SmartTextarea id="ov-note" value={noteText} onChange={setNoteText} rows={5} aiContext="ملاحظة على قضية قانونية" placeholder="أضف ملاحظتك هنا..." />
          </FormField>
          <div className="flex gap-3">
            <Button className="flex-1" disabled={saving || !noteText.trim()} onClick={() => withSave(async () => {
              const existing = caseData?.notes ?? "";
              const appended = existing ? `${existing}\n\n${noteText.trim()}` : noteText.trim();
              await authFetch(`${BASE}/api/cases/${id}`, { method: "PUT", body: JSON.stringify({ ...(caseData as object), notes: appended }) });
              refetch();
            }, async () => {})}>{saving ? "جارٍ الحفظ..." : "حفظ"}</Button>
            <Button variant="outline" onClick={() => setNoteModal(false)} className="px-5">إلغاء</Button>
          </div>
        </div>
      </Modal>

      {/* Procedure modal */}
      <Modal open={modal === "procedure"} onClose={() => setModal(null)} title="إضافة إجراء قانوني">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="المرحلة" htmlFor="pr-stage">
              <SelectNative id="pr-stage" value={procForm.stage} onChange={e => setProcForm({...procForm, stage: e.target.value})} className={inputCls + " px-3 cursor-pointer"}>
                {["ابتدائي","استئناف","تعقيب","تنفيذ","ختم"].map(s => <option key={s} value={s}>{s}</option>)}
              </SelectNative>
            </FormField>
            <FormField label="الحالة" htmlFor="pr-status">
              <SelectNative id="pr-status" value={procForm.status} onChange={e => setProcForm({...procForm, status: e.target.value})} className={inputCls + " px-3 cursor-pointer"}>
                {["جارية","مكتملة","موقوفة"].map(s => <option key={s} value={s}>{s}</option>)}
              </SelectNative>
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="تاريخ البداية" htmlFor="pr-start"><Input id="pr-start" type="date" value={procForm.startedAt} onChange={e => setProcForm({...procForm, startedAt: e.target.value})} className={inputCls} dir="ltr" /></FormField>
            <FormField label="تاريخ النهاية" htmlFor="pr-end"><Input id="pr-end" type="date" value={procForm.endedAt} onChange={e => setProcForm({...procForm, endedAt: e.target.value})} className={inputCls} dir="ltr" /></FormField>
          </div>
          <FormField label="ملاحظات" htmlFor="pr-notes">
            <SmartTextarea id="pr-notes" value={procForm.notes} onChange={v => setProcForm({...procForm, notes: v})} rows={3} aiContext="ملاحظات إجراء قانوني" placeholder="ملاحظات حول الإجراء..." />
          </FormField>
          <div className="flex gap-3">
            <Button className="flex-1" disabled={saving} onClick={() => withSave(async () => { await authFetch(`${BASE}/api/cases/${id}/procedures`, { method: "POST", body: JSON.stringify(procForm) }); }, load.procedures)}>{saving ? "جارٍ الحفظ..." : "حفظ"}</Button>
            <Button variant="outline" onClick={() => setModal(null)} className="px-5">إلغاء</Button>
          </div>
        </div>
      </Modal>

      {/* Hearing modal */}
      <Modal open={modal === "hearing"} onClose={() => { setModal(null); setHEditId(null); }} title={hEditId ? "تعديل الجلسة" : "إضافة جلسة"} size="lg">
        <div className="space-y-4">
          <FormField label="عنوان الجلسة *" htmlFor="h-title">
            <Input id="h-title" value={hForm.title} onChange={e => setHForm({...hForm, title: e.target.value})} className={inputCls} placeholder="مثال: جلسة محكمة تونس الابتدائية" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="نوع الجلسة" htmlFor="h-type">
              <SelectNative id="h-type" value={hForm.type} onChange={e => setHForm({...hForm, type: e.target.value})} className={inputCls + " px-3 cursor-pointer"}>
                {HEARING_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </SelectNative>
            </FormField>
            <FormField label="الحالة" htmlFor="h-status">
              <SelectNative id="h-status" value={hForm.legalStatus} onChange={e => setHForm({...hForm, legalStatus: e.target.value})} className={inputCls + " px-3 cursor-pointer"}>
                {HEARING_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </SelectNative>
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="التاريخ *" htmlFor="h-date">
              <Input id="h-date" type="date" value={hForm.date} onChange={e => setHForm({...hForm, date: e.target.value})} className={inputCls} dir="ltr" />
            </FormField>
            <FormField label="الوقت" htmlFor="h-time">
              <Input id="h-time" type="time" value={hForm.time} onChange={e => setHForm({...hForm, time: e.target.value})} className={inputCls} dir="ltr" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="المحكمة" htmlFor="h-court">
              <CourtSelect value={hForm.court} onChange={v => setHForm({...hForm, court: v})} placeholder="اختر المحكمة..." />
            </FormField>
            <FormField label="الدائرة" htmlFor="h-div">
              <Input id="h-div" value={hForm.division} onChange={e => setHForm({...hForm, division: e.target.value})} className={inputCls} placeholder="الدائرة الأولى" />
            </FormField>
          </div>
          <FormField label="المكان" htmlFor="h-loc">
            <Input id="h-loc" value={hForm.location} onChange={e => setHForm({...hForm, location: e.target.value})} className={inputCls} placeholder="قاعة المحاكمات..." />
          </FormField>
          <div className="flex gap-3">
            <Button className="flex-1" disabled={saving || !hForm.title.trim() || !hForm.date} onClick={() => withSave(async () => {
              const body = JSON.stringify({
                title: hForm.title, date: hForm.date, time: hForm.time || null,
                type: hForm.type, legalStatus: hForm.legalStatus || null,
                court: hForm.court || null, division: hForm.division || null,
                location: hForm.location || null, caseId: Number(id), duration: Number(hForm.duration) || 60,
              });
              if (hEditId) {
                await authFetch(`${BASE}/api/events/${hEditId}`, { method: "PUT", body });
                setHEditId(null);
              } else {
                await authFetch(`${BASE}/api/events`, { method: "POST", body });
              }
            }, load.hearings)}>{saving ? "جارٍ الحفظ..." : hEditId ? "حفظ التعديلات" : "حفظ الجلسة"}</Button>
            <Button variant="outline" onClick={() => { setModal(null); setHEditId(null); }} className="px-5">إلغاء</Button>
          </div>
        </div>
      </Modal>

      {/* Deadline modal */}
      <Modal open={modal === "deadline"} onClose={() => { setModal(null); setDlEditId(null); }} title={dlEditId ? "تعديل الأجل القانوني" : "إضافة أجل قانوني"}>
        <div className="space-y-4">
          <FormField label="نوع الأجل" htmlFor="dl-type">
            <SelectNative id="dl-type" value={dlForm.type} onChange={e => setDlForm({...dlForm, type: e.target.value})} className={inputCls + " px-3 cursor-pointer"}>
              {DEADLINE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </SelectNative>
          </FormField>
          <FormField label="العنوان" htmlFor="dl-title"><Input id="dl-title" value={dlForm.title} onChange={e => setDlForm({...dlForm, title: e.target.value})} className={inputCls} placeholder="يُملأ تلقائياً حسب النوع" /></FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={dlForm.type === "custom" ? "تاريخ الانتهاء *" : "تاريخ (اختياري)"} htmlFor="dl-due">
              <Input id="dl-due" type="date" value={dlForm.dueDate} onChange={e => setDlForm({...dlForm, dueDate: e.target.value})} className={inputCls} dir="ltr" />
            </FormField>
            <FormField label="الأهمية" htmlFor="dl-urg">
              <SelectNative id="dl-urg" value={dlForm.urgency} onChange={e => setDlForm({...dlForm, urgency: e.target.value})} className={inputCls + " px-3 cursor-pointer"}>
                <option value="normal">عادي</option>
                <option value="high">عالٍ</option>
                <option value="critical">حرج</option>
              </SelectNative>
            </FormField>
          </div>
          <div className="flex gap-3">
            <Button className="flex-1" disabled={saving || (dlForm.type === "custom" && !dlForm.dueDate)} onClick={() => withSave(async () => {
              if (dlEditId) {
                await authFetch(`${BASE}/api/deadlines/${dlEditId}`, { method: "PUT", body: JSON.stringify(dlForm) });
                setDlEditId(null);
              } else {
                await authFetch(`${BASE}/api/cases/${id}/deadlines`, { method: "POST", body: JSON.stringify(dlForm) });
              }
            }, load.deadlines)}>{saving ? "جارٍ الحفظ..." : dlEditId ? "حفظ التعديلات" : "حفظ"}</Button>
            <Button variant="outline" onClick={() => { setModal(null); setDlEditId(null); }} className="px-5">إلغاء</Button>
          </div>
        </div>
      </Modal>

      {/* Team modal */}
      <Modal open={modal === "team"} onClose={() => { setModal(null); setTeamEditId(null); }} title={teamEditId ? "تعديل دور العضو" : "إضافة عضو للفريق"}>
        <div className="space-y-4">
          <FormField label="المستخدم" htmlFor="tm-user">
            <SelectNative id="tm-user" value={teamForm.userId} onChange={e => setTeamForm({...teamForm, userId: e.target.value})} className={inputCls + " px-3 cursor-pointer"}>
              <option value="">اختر مستخدماً...</option>
              {allUsers
                .filter(u => teamEditId ? true : !team.some(t => t.userId === u.id))
                .map(u => <option key={u.id} value={u.id}>{u.name} — {u.email}</option>)}
            </SelectNative>
          </FormField>
          <FormField label="الدور في القضية" htmlFor="tm-role">
            <SelectNative id="tm-role" value={teamForm.role} onChange={e => setTeamForm({...teamForm, role: e.target.value})} className={inputCls + " px-3 cursor-pointer"}>
              {["مسؤول رئيسي","مساعد","متربص"].map(r => <option key={r} value={r}>{r}</option>)}
            </SelectNative>
          </FormField>
          <div className="flex gap-3">
            <Button className="flex-1" disabled={saving || (!teamEditId && !teamForm.userId)}
              onClick={() => withSave(async () => {
                if (teamEditId) {
                  await authFetch(`${BASE}/api/case-teams/${teamEditId}`, { method: "PUT", body: JSON.stringify({ role: teamForm.role, userId: Number(teamForm.userId) }) });
                  setTeamEditId(null);
                } else {
                  await authFetch(`${BASE}/api/cases/${id}/team`, { method: "POST", body: JSON.stringify({...teamForm, userId: Number(teamForm.userId)}) });
                }
              }, load.team)}>{saving ? "جارٍ الحفظ..." : teamEditId ? "حفظ التعديل" : "حفظ"}</Button>
            <Button variant="outline" onClick={() => { setModal(null); setTeamEditId(null); }} className="px-5">إلغاء</Button>
          </div>
        </div>
      </Modal>

      {/* Confidential Note modal */}
      <Modal open={modal === "conf-note"} onClose={() => setModal(null)} title="ملاحظة داخلية سرية">
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-primary/10 text-primary rounded-xl text-sm">
            <Lock className="h-4 w-4 shrink-0" /> هذه الملاحظة للاستخدام الداخلي فقط
          </div>
          <FormField label="المحتوى *" htmlFor="cn-content">
            <SmartTextarea id="cn-content" value={confForm.content} onChange={v => setConfForm({...confForm, content: v})} rows={4} aiContext="ملاحظة سرية قانونية" placeholder="ملاحظة سرية، استراتيجية قانونية..." />
          </FormField>
          <div className="flex gap-3">
            <Button className="flex-1" disabled={saving || !confForm.content.trim()} onClick={() => withSave(async () => { await authFetch(`${BASE}/api/cases/${id}/confidential-notes`, { method: "POST", body: JSON.stringify({ content: confForm.content, createdBy: user?.name }) }); }, load.confNotes)}>{saving ? "جارٍ الحفظ..." : "حفظ"}</Button>
            <Button variant="outline" onClick={() => setModal(null)} className="px-5">إلغاء</Button>
          </div>
        </div>
      </Modal>

      {/* Time entry modal */}
      <Modal open={showTimeModal} onClose={() => { setShowTimeModal(false); setTimeEditId(null); }} title={timeEditId ? "تعديل إدخال الوقت" : "إدخال وقت يدوي"}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="التاريخ *" htmlFor="te-date">
              <Input id="te-date" type="date" className={inputCls} dir="ltr"
                value={timeForm.date} onChange={e => setTimeForm(f => ({ ...f, date: e.target.value }))} />
            </FormField>
            <FormField label="عدد الساعات *" htmlFor="te-hours">
              <Input id="te-hours" type="number" step="0.25" placeholder="1.5" className={inputCls} dir="ltr"
                value={timeForm.hours} onChange={e => setTimeForm(f => ({ ...f, hours: e.target.value }))} />
            </FormField>
          </div>
          <FormField label="وصف النشاط *" htmlFor="te-desc">
            <Input id="te-desc" placeholder="مثال: دراسة الملف وتحضير الدفاع" className={inputCls}
              value={timeForm.description} onChange={e => setTimeForm(f => ({ ...f, description: e.target.value }))} />
          </FormField>
          <FormField label="المعدل (د.ت/ساعة)" htmlFor="te-rate">
            <Input id="te-rate" type="number" className={inputCls} dir="ltr"
              value={timeForm.rate} onChange={e => setTimeForm(f => ({ ...f, rate: e.target.value }))} />
          </FormField>
          <label className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg cursor-pointer">
            <input type="checkbox" checked={timeForm.billable}
              onChange={e => setTimeForm(f => ({ ...f, billable: e.target.checked }))}
              className="h-4 w-4 accent-primary" />
            <span className="text-sm">هذا الوقت قابل للفوترة للموكّل</span>
          </label>
          {timeForm.hours && timeForm.rate && parseFloat(timeForm.hours) > 0 && (
            <div className="p-3 bg-primary/10 rounded-lg flex justify-between items-center">
              <span className="text-sm text-primary font-medium">المبلغ الإجمالي:</span>
              <span className="font-bold text-primary" dir="ltr"><Money amount={parseFloat(timeForm.hours) * parseFloat(timeForm.rate)} /></span>
            </div>
          )}
          <div className="flex gap-3">
            <Button className="flex-1" disabled={!timeForm.description.trim() || !timeForm.hours || parseFloat(timeForm.hours) <= 0}
              onClick={() => {
                if (timeEditId) {
                  setTimeEntries(es => es.map(x => x.id === timeEditId ? { ...x, date: timeForm.date, description: timeForm.description, hours: parseFloat(timeForm.hours), rate: parseFloat(timeForm.rate) || 150, billable: timeForm.billable } : x));
                  setTimeEditId(null);
                } else {
                  setTimeEntries(es => [{ id: Date.now(), date: timeForm.date, description: timeForm.description, hours: parseFloat(timeForm.hours), rate: parseFloat(timeForm.rate) || 150, billable: timeForm.billable }, ...es]);
                }
                setTimeForm({ date: new Date().toISOString().slice(0, 10), description: "", hours: "", rate: "150", billable: true });
                setShowTimeModal(false);
              }}>{timeEditId ? "حفظ التعديلات" : "حفظ الإدخال"}</Button>
            <Button variant="outline" onClick={() => { setShowTimeModal(false); setTimeEditId(null); }} className="px-5">إلغاء</Button>
          </div>
        </div>
      </Modal>

      {/* Add Expense modal */}
      <Modal open={showExpModal} onClose={() => { setShowExpModal(false); setExpEditId(null); }} title={expEditId ? "تعديل المصروف" : "إضافة مصروف قضائي"}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="التاريخ *" htmlFor="exp-date">
              <Input id="exp-date" type="date" className={inputCls} dir="ltr"
                value={expForm.date} onChange={e => setExpForm(f => ({ ...f, date: e.target.value }))} />
            </FormField>
            <FormField label="نوع المصروف *" htmlFor="exp-type">
              <SelectNative id="exp-type" className={inputCls + " px-3 cursor-pointer"}
                value={expForm.typeValue} onChange={e => setExpForm(f => ({ ...f, typeValue: e.target.value }))}>
                {EXPENSE_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{locale === "ar" ? t.ar : t.fr} — {locale === "ar" ? t.fr : t.ar}</option>
                ))}
              </SelectNative>
            </FormField>
          </div>
          <FormField label="الوصف" htmlFor="exp-desc">
            <Input id="exp-desc" placeholder="تفاصيل المصروف..." className={inputCls}
              value={expForm.description} onChange={e => setExpForm(f => ({ ...f, description: e.target.value }))} />
          </FormField>
          <FormField label="المبلغ (د.ت) *" htmlFor="exp-amount">
            <Input id="exp-amount" type="number" step="0.001" placeholder="0.000" className={inputCls} dir="ltr"
              value={expForm.amount} onChange={e => setExpForm(f => ({ ...f, amount: e.target.value }))} />
          </FormField>
          <label className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg cursor-pointer">
            <input type="checkbox" checked={expForm.reimbursable}
              onChange={e => setExpForm(f => ({ ...f, reimbursable: e.target.checked }))}
              className="h-4 w-4 accent-primary" />
            <div>
              <p className="text-sm font-medium">قابل للاسترجاع من الموكّل</p>
              <p className="text-xs text-muted-foreground">سيتم إضافة هذا المصروف إلى فاتورة الموكّل</p>
            </div>
          </label>
          <div className="flex gap-3">
            <Button className="flex-1" disabled={!expForm.amount || parseFloat(expForm.amount) <= 0}
              onClick={async () => {
                if (!expForm.amount || parseFloat(expForm.amount) <= 0) return;
                if (expEditId) {
                  const r = await authFetch(`${BASE}/api/expenses/${expEditId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ date: expForm.date, typeValue: expForm.typeValue, description: expForm.description, amount: parseFloat(expForm.amount), reimbursable: expForm.reimbursable }),
                  });
                  if (r.ok) { const updated = await r.json(); setExpenses(es => es.map(x => x.id === expEditId ? updated : x)); }
                  setExpEditId(null);
                } else {
                  const r = await authFetch(`${BASE}/api/expenses`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ caseId: Number(id), date: expForm.date, typeValue: expForm.typeValue, description: expForm.description, amount: parseFloat(expForm.amount), reimbursable: expForm.reimbursable }),
                  });
                  if (r.ok) { const created = await r.json(); setExpenses(es => [created, ...es]); }
                }
                setShowExpModal(false);
              }}>{expEditId ? "حفظ التعديلات" : "حفظ المصروف"}</Button>
            <Button variant="outline" onClick={() => { setShowExpModal(false); setExpEditId(null); }} className="px-5">إلغاء</Button>
          </div>
        </div>
      </Modal>

      {/* Upload / Edit Document modal */}
      <Modal open={modal === "upload-doc"} onClose={() => { setModal(null); setDocEditId(null); }} title={docEditId ? "تعديل الوثيقة" : "رفع وثيقة جديدة"}>
        <div className="space-y-4">
          {!docEditId && (
            <label
              className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer"
              htmlFor="cd-doc-file"
            >
              <Upload className="h-10 w-10 text-muted-foreground/40" />
              <p className="font-medium text-muted-foreground text-sm">اسحب الملف هنا أو انقر للاختيار</p>
              <p className="text-xs text-muted-foreground/60">PDF, Word, Excel, صور — حتى 20MB</p>
              <input
                id="cd-doc-file"
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.gif,.webp"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file && !docForm.name) setDocForm(f => ({ ...f, name: file.name }));
                }}
              />
            </label>
          )}
          <FormField label="اسم الوثيقة *" htmlFor="cd-doc-name">
            <Input
              id="cd-doc-name"
              placeholder="مثال: عقد شراكة بتاريخ 2026"
              className={inputCls}
              value={docForm.name}
              onChange={e => setDocForm(f => ({ ...f, name: e.target.value }))}
              autoFocus
            />
          </FormField>
          <FormField label="نوع الوثيقة" htmlFor="cd-doc-type">
            <SelectNative id="cd-doc-type" className={inputCls + " px-3 cursor-pointer"}
              value={docForm.fileType}
              onChange={e => setDocForm(f => ({ ...f, fileType: e.target.value }))}>
              {["عقد","وثيقة رسمية","مراسلة","حكم قضائي","تقرير خبرة","وكالة","أخرى"].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </SelectNative>
          </FormField>
          <FormField label="رابط خارجي (اختياري)" htmlFor="cd-doc-url">
            <Input
              id="cd-doc-url"
              placeholder="https://..."
              className={inputCls}
              dir="ltr"
              value={docForm.url}
              onChange={e => setDocForm(f => ({ ...f, url: e.target.value }))}
            />
          </FormField>
          <div className="flex gap-3">
            <Button
              className="flex-1"
              disabled={saving || !docForm.name.trim()}
              onClick={() => withSave(async () => {
                if (docEditId) {
                  await authFetch(`${BASE}/api/documents/${docEditId}`, {
                    method: "PUT",
                    body: JSON.stringify({ name: docForm.name.trim(), fileType: docForm.fileType || null, url: docForm.url.trim() || null }),
                  });
                  setDocEditId(null);
                } else {
                  await authFetch(`${BASE}/api/documents`, {
                    method: "POST",
                    body: JSON.stringify({ name: docForm.name.trim(), caseId: Number(id), fileType: docForm.fileType || null, url: docForm.url.trim() || null }),
                  });
                }
                setDocForm({ name: "", fileType: "عقد", url: "" });
              }, load.docs)}
            >
              {saving ? "جارٍ الحفظ..." : docEditId ? "حفظ التعديلات" : "حفظ الوثيقة"}
            </Button>
            <Button variant="outline" onClick={() => { setModal(null); setDocEditId(null); }} className="px-5">إلغاء</Button>
          </div>
        </div>
      </Modal>

      {/* Relation modal */}
      <Modal open={modal === "relation"} onClose={() => setModal(null)} title="ربط قضية">
        <div className="space-y-4">
          <FormField label="القضية المرتبطة" htmlFor="rl-case">
            <SelectNative id="rl-case" value={relForm.relatedCaseId} onChange={e => setRelForm({...relForm, relatedCaseId: e.target.value})} className={inputCls + " px-3 cursor-pointer"}>
              <option value="">اختر قضية...</option>
              {allCases.filter(cas => cas.id !== Number(id) && !relations.some(r => r.relatedCaseId === cas.id)).map(cas => <option key={cas.id} value={cas.id}>{cas.title}</option>)}
            </SelectNative>
          </FormField>
          <FormField label="نوع العلاقة" htmlFor="rl-type">
            <SelectNative id="rl-type" value={relForm.relationType} onChange={e => setRelForm({...relForm, relationType: e.target.value})} className={inputCls + " px-3 cursor-pointer"}>
              {["مرتبطة","استئناف عن","منبثقة عن","موحدة مع","مضمنة في"].map(t => <option key={t} value={t}>{t}</option>)}
            </SelectNative>
          </FormField>
          <div className="flex gap-3">
            <Button className="flex-1" disabled={saving || !relForm.relatedCaseId} onClick={() => withSave(async () => { await authFetch(`${BASE}/api/cases/${id}/relations`, { method: "POST", body: JSON.stringify({...relForm, relatedCaseId: Number(relForm.relatedCaseId)}) }); }, load.relations)}>{saving ? "جارٍ الحفظ..." : "حفظ"}</Button>
            <Button variant="outline" onClick={() => setModal(null)} className="px-5">إلغاء</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Case modal */}
      <Modal open={modal === "edit"} onClose={() => setModal(null)} title="تعديل بيانات القضية">
        <div className="space-y-4">
          <FormField label="عنوان القضية *" htmlFor="ed-title">
            <Input id="ed-title" value={editForm.title} onChange={e => setEditForm(f => ({...f, title: e.target.value}))} className={inputCls} placeholder="عنوان القضية" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="الحالة" htmlFor="ed-status">
              <SelectNative id="ed-status" value={editForm.status} onChange={e => setEditForm(f => ({...f, status: e.target.value}))} className={inputCls + " px-3 cursor-pointer"}>
                <option value="active">نشطة</option><option value="pending">معلقة</option><option value="closed">مغلقة</option><option value="archived">مؤرشفة</option>
              </SelectNative>
            </FormField>
            <FormField label="المرحلة الإجرائية" htmlFor="ed-stage">
              <SelectNative id="ed-stage" value={editForm.procedureStage} onChange={e => setEditForm(f => ({...f, procedureStage: e.target.value}))} className={inputCls + " px-3 cursor-pointer"}>
                {["ابتدائي","استئناف","تعقيب","تنفيذ","ختم"].map(s => <option key={s} value={s}>{s}</option>)}
              </SelectNative>
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="المحكمة" htmlFor="ed-court">
              <CourtSelect value={editForm.court} onChange={v => setEditForm(f => ({...f, court: v}))} />
            </FormField>
            <FormField label="الدائرة" htmlFor="ed-div">
              <Input id="ed-div" value={editForm.division} onChange={e => setEditForm(f => ({...f, division: e.target.value}))} className={inputCls} placeholder="الدائرة الأولى" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="المحامي المسؤول" htmlFor="ed-lawyer">
              <Input id="ed-lawyer" value={editForm.lawyer} onChange={e => setEditForm(f => ({...f, lawyer: e.target.value}))} className={inputCls} placeholder="اسم المحامي" />
            </FormField>
            <FormField label="موعد الجلسة القادمة" htmlFor="ed-hearing">
              <Input id="ed-hearing" type="date" value={editForm.nextHearing} onChange={e => setEditForm(f => ({...f, nextHearing: e.target.value}))} className={inputCls} dir="ltr" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="عدد القضية بالمحكمة" htmlFor="ed-courtnum">
              <Input id="ed-courtnum" value={editForm.courtCaseNumber} onChange={e => setEditForm(f => ({...f, courtCaseNumber: e.target.value}))} className={inputCls} placeholder="12345/2026" dir="ltr" />
            </FormField>
            <FormField label="مرجع الموكّل" htmlFor="ed-clientref">
              <Input id="ed-clientref" value={editForm.clientFileRef} onChange={e => setEditForm(f => ({...f, clientFileRef: e.target.value}))} className={inputCls} />
            </FormField>
          </div>
          <FormField label="نص الحكم" htmlFor="ed-judgment">
            <Input id="ed-judgment" value={editForm.judgmentText} onChange={e => setEditForm(f => ({...f, judgmentText: e.target.value}))} className={inputCls} placeholder="نص الحكم أو القرار النهائي" />
          </FormField>
          <FormField label="الوصف" htmlFor="ed-desc">
            <SmartTextarea id="ed-desc" value={editForm.description} onChange={v => setEditForm(f => ({...f, description: v}))} rows={3} aiContext="وصف قضية قانونية" placeholder="وصف القضية..." />
          </FormField>
          <div className="flex gap-3 pt-1">
            <Button className="flex-1" disabled={saving || !editForm.title} onClick={saveEdit}>{saving ? "جارٍ الحفظ..." : "حفظ التعديلات"}</Button>
            <Button variant="outline" onClick={() => setModal(null)} className="px-5">إلغاء</Button>
          </div>
        </div>
      </Modal>

      {/* Confirm archive */}
      <Modal open={confirmArchive} onClose={() => setConfirmArchive(false)} title={c.archivedAt ? "استرجاع الملف؟" : "أرشفة الملف؟"}>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">{c.archivedAt ? "سيتم نقل هذا الملف من الأرشيف إلى قائمة الملفات الجارية." : "سيتم نقل هذا الملف إلى الأرشيف. يمكنك استرجاعه في أي وقت."}</p>
          <div className="flex gap-3">
            <Button className="flex-1" onClick={async () => { await authFetch(`${BASE}/api/cases/${id}/archive`, { method: "PATCH" }); setConfirmArchive(false); refetch(); }}>{c.archivedAt ? "استرجاع الملف" : "أرشفة الملف"}</Button>
            <Button variant="outline" onClick={() => setConfirmArchive(false)} className="px-6">إلغاء</Button>
          </div>
        </div>
      </Modal>

      {/* Confirm case delete */}
      <ConfirmDestructive
        open={confirmCaseDelete} onClose={() => setConfirmCaseDelete(false)}
        onConfirm={async () => { await authFetch(`${BASE}/api/cases/${id}/soft-delete`, { method: "PATCH" }); navigate("/cases"); }}
        title="نقل الملف إلى سلة المحذوفات؟"
        description="سيتم نقل الملف إلى سلة المحذوفات لمدة 30 يوماً ثم يُحذف نهائياً."
        consequenceList={["جميع الوثائق المرتبطة ستصبح غير متاحة","السجل المالي يُحفظ لكن منفصلاً عن الملف","الجلسات الماضية تبقى مرئية في الرزنامة"]}
        confirmationText={c.caseNumber ?? undefined}
        confirmLabel="نقل إلى سلة المحذوفات"
      />

      {/* Confirm procedure delete */}
      <ConfirmDestructive
        open={confirmProcId !== null} onClose={() => setConfirmProcId(null)}
        onConfirm={async () => { await authFetch(`${BASE}/api/procedures/${confirmProcId}`, { method: "DELETE" }); await load.procedures(); }}
        title="حذف الإجراء نهائياً؟" description="سيتم حذف هذا الإجراء القانوني بشكل نهائي." confirmLabel="حذف الإجراء"
      />

      {/* Confirm deadline delete */}
      <ConfirmDestructive
        open={confirmDeadlineId !== null} onClose={() => setConfirmDeadlineId(null)}
        onConfirm={async () => { await authFetch(`${BASE}/api/deadlines/${confirmDeadlineId}`, { method: "DELETE" }); await load.deadlines(); }}
        title="حذف الأجل نهائياً؟" description="سيتم حذف هذا الأجل القانوني بشكل نهائي." confirmLabel="حذف الأجل"
      />

      {/* Confirm opponent delete */}
      <ConfirmDestructive
        open={confirmOppId !== null} onClose={() => setConfirmOppId(null)}
        onConfirm={async () => { await authFetch(`${BASE}/api/opponents/${confirmOppId}`, { method: "DELETE" }); await load.opponents(); }}
        title="حذف الخصم؟" description="سيتم حذف هذا الخصم نهائياً من القضية." confirmLabel="حذف"
      />

      {/* Confirm document delete */}
      <ConfirmDestructive
        open={confirmDocId !== null} onClose={() => setConfirmDocId(null)}
        onConfirm={async () => { await authFetch(`${BASE}/api/documents/${confirmDocId}`, { method: "DELETE" }); await load.docs(); }}
        title="حذف الوثيقة نهائياً؟" description="سيتم حذف هذه الوثيقة بشكل نهائي ولا يمكن التراجع عنه." confirmLabel="حذف الوثيقة"
      />

      {/* Confirm team member remove */}
      <ConfirmDestructive
        open={confirmTeamId !== null} onClose={() => setConfirmTeamId(null)}
        onConfirm={async () => { await authFetch(`${BASE}/api/case-teams/${confirmTeamId}`, { method: "DELETE" }); await load.team(); }}
        title="إزالة العضو من الفريق؟" description="سيتم إزالة هذا العضو من فريق القضية." confirmLabel="إزالة"
      />

      {/* Confirm confidential note delete */}
      <ConfirmDestructive
        open={confirmConfNoteId !== null} onClose={() => setConfirmConfNoteId(null)}
        onConfirm={async () => { await authFetch(`${BASE}/api/confidential-notes/${confirmConfNoteId}`, { method: "DELETE" }); await load.confNotes(); }}
        title="حذف الملاحظة السرية؟" description="سيتم حذف هذه الملاحظة الداخلية السرية نهائياً." confirmLabel="حذف"
      />

      {/* Confirm relation delete */}
      <ConfirmDestructive
        open={confirmRelationId !== null} onClose={() => setConfirmRelationId(null)}
        onConfirm={async () => { await authFetch(`${BASE}/api/case-relations/${confirmRelationId}`, { method: "DELETE" }); await load.relations(); }}
        title="فك الارتباط بين القضيتين؟" description="سيتم حذف هذا الرابط. القضيتان تبقيان موجودتين في قاعدة البيانات." confirmLabel="فك الارتباط"
      />

      {/* Edit via CaseWizard */}
      {showWizard && (() => {
        const cx = caseData as unknown as Record<string, unknown>;
        const initialData = {
          title:               String(caseData.title ?? ""),
          clientId:            String(caseData.clientId ?? ""),
          description:         String(cx.description ?? ""),
          clientFileRef:       String(cx.clientFileRef ?? ""),
          court:               String(caseData.court ?? ""),
          division:            String(cx.division ?? ""),
          courtCaseNumber:     String(cx.courtCaseNumber ?? ""),
          firstHearingDate:    caseData.nextHearing ? String(caseData.nextHearing).slice(0, 10) : "",
          openedAt:            cx.openedAt ? String(cx.openedAt).slice(0, 10) : new Date().toISOString().slice(0, 10),
          caseType:            String(cx.caseType ?? ""),
          litigationDegree:    String(cx.litigationDegree ?? ""),
          procedureType:       String(cx.procedureType ?? ""),
          casePriority:        String(cx.casePriority ?? "normal"),
          clientSource:        String(cx.clientSource ?? ""),
          judgeName:           String(cx.judgeName ?? ""),
          feeMethod:           String(cx.feeMethod ?? ""),
          agreedFees:          cx.agreedFees ? String(cx.agreedFees) : "",
          hourlyRate:          cx.hourlyRate ? String(cx.hourlyRate) : "",
          percentage:          cx.percentage ? String(cx.percentage) : "",
          percentageBasis:     String(cx.percentageBasis ?? ""),
          disputeValue:        cx.disputeValue ? String(cx.disputeValue) : "",
          confidentialityLevel: String(cx.confidentialityLevel ?? "normal"),
          internalNotes:       String(cx.internalNotes ?? ""),
        };
        return (
          <CaseWizard
            open={showWizard}
            onClose={() => setShowWizard(false)}
            caseId={Number(id)}
            initialData={initialData}
            onCreated={() => { setShowWizard(false); refetch(); }}
          />
        );
      })()}
    </div>
  );
}

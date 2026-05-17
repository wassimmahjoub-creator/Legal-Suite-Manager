import { SelectNative } from "@/components/SelectNative";
import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useGetCase } from "@workspace/api-client-react";
import { formatDateTN } from "@/lib/date";
import { authFetch } from "@/lib/authFetch";
import { useAuth } from "@/context/AuthContext";
import { StatusBadge } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Modal, FormField } from "@/components/Modal";
import { SmartTextarea } from "@/components/SmartTextarea";
import { CourtSelect } from "@/components/CourtSelect";
import {
  Plus, MapPin, User, Calendar, FileText, CheckCircle2,
  Clock, Briefcase, ArrowRight, Trash2,
  StickyNote, CircleCheck, Circle,
  Users, AlertTriangle, Lock, Link2, GitBranch,
  Archive, Hash, Layers, Shield, Pencil, DollarSign,
  BarChart2, Timer, FolderOpen, Receipt, ArrowUpRight,
  ExternalLink, Scale,
} from "lucide-react";
import { SkeletonClientPage } from "@/components/ui/skeletons";
import { CasePdfButton } from "@/components/CasePdfButton";
import { ConfirmDestructive } from "@/components/ui/ConfirmDestructive";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
const inputCls = "h-10 bg-muted/50 border-border focus-visible:ring-1 focus-visible:ring-primary rounded-lg w-full";

const DEADLINE_TYPES = [
  { value: "appeal",    label: "أجل الاستئناف (30 يوم)" },
  { value: "cassation", label: "أجل التعقيب (60 يوم)" },
  { value: "execution", label: "أجل التنفيذ (15 يوم)" },
  { value: "response",  label: "أجل الرد (20 يوم)" },
  { value: "custom",    label: "أجل مخصص" },
];
const URGENCY_COLORS: Record<string, string> = {
  critical: "bg-red-500/10 text-red-400 border-red-500/20",
  high:     "bg-orange-500/10 text-orange-400 border-orange-500/20",
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
type Invoice    = { id: number; invoiceNumber: string | null; amount: number; paidAmount: number | null; status: string; issuedAt: string | null; dueDate: string | null; caseId: number | null; clientId: number | null; description: string | null; deletedAt: string | null; };
type AuditLog   = { id: number; entityType: string; entityId: number | null; action: string; userName: string | null; createdAt: string; details: string | null; };

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
  const { data: caseData, isLoading, refetch } = useGetCase(Number(id), { query: { enabled: !!id } });

  // URL tab sync
  const getTabFromURL = (): TabId => {
    const p = new URLSearchParams(window.location.search).get("tab");
    return (TAB_IDS as readonly string[]).includes(p ?? "") ? (p as TabId) : "overview";
  };
  const [activeTab, setActiveTab] = useState<TabId>(getTabFromURL);
  const changeTab = useCallback((t: TabId) => {
    setActiveTab(t);
    window.history.replaceState(null, "", `?tab=${t}`);
  }, []);

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

  // Forms
  const [oppForm,  setOppForm]  = useState({ name: "", lawyerName: "", phone: "", address: "", notes: "", capacity: "", opponentLawyerPhone: "" });
  const [procForm, setProcForm] = useState({ stage: "ابتدائي", status: "جارية", notes: "", startedAt: "", endedAt: "" });
  const [dlForm,   setDlForm]   = useState({ title: "", type: "custom", dueDate: "", urgency: "normal", notes: "" });
  const [confForm, setConfForm] = useState({ content: "" });
  const [relForm,  setRelForm]  = useState({ relatedCaseId: "", relationType: "مرتبطة" });
  const [teamForm, setTeamForm] = useState({ userId: "", role: "مساعد" });
  const [editForm, setEditForm] = useState({
    title: "", clientId: "", court: "", division: "", lawyer: "", status: "active",
    nextHearing: "", description: "", procedureStage: "ابتدائي", courtCaseNumber: "",
    clientFileRef: "", opponentName: "", opponentLawyer: "", judgmentText: "",
  });
  const [noteText,  setNoteText]  = useState("");
  const [noteModal, setNoteModal] = useState(false);
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
  };

  useEffect(() => {
    if (!id) return;
    Object.values(load).forEach(fn => fn());
    authFetch(`${BASE}/api/cases`).then(r => { if (r.ok) r.json().then(setAllCases); });
    authFetch(`${BASE}/api/auth/users`).then(r => { if (r.ok) r.json().then(setAllUsers); });
  }, [id]);

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
  const totalInvoiced = invoices.reduce((s, i) => s + Number(i.amount ?? 0), 0);
  const totalPaid     = invoices.reduce((s, i) => s + Number(i.paidAmount ?? 0), 0);
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
      badge: upcomingCount > 0 ? upcomingCount : 0,
      badgeColor: overdueCount > 0 ? "bg-red-500" : upcomingCount > 0 ? "bg-orange-500" : undefined },
    { id: "judgment",   label: "الحكم والتنفيذ",      icon: <Scale className="h-4 w-4" /> },
    { id: "documents",  label: "المؤيدات والوثائق",   icon: <FolderOpen className="h-4 w-4" />,
      badge: activeDocs.length > 0 ? activeDocs.length : 0 },
    { id: "invoicing",  label: "الأتعاب والفواتير",   icon: <Receipt className="h-4 w-4" />,
      badge: hasOverdueInv ? 1 : 0, badgeColor: "bg-red-500" },
    { id: "expenses",   label: "المصاريف",             icon: <DollarSign className="h-4 w-4" /> },
    { id: "time",       label: "الوقت",                icon: <Timer className="h-4 w-4" /> },
    { id: "notes",      label: "الملاحظات والسجل",    icon: <StickyNote className="h-4 w-4" />,
      badgeIcon: c.confidentialityLevel && c.confidentialityLevel !== "عادي" ? <Lock className="h-3 w-3 text-orange-400" /> : undefined },
  ];

  // ─────────────────────────────────────────────────────────────
  // TAB CONTENT RENDERERS
  // ─────────────────────────────────────────────────────────────

  function renderOverview() {
    return (
      <div className="space-y-5">
        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {kpiCard("الرصيد المستحق", totalDue > 0 ? `${totalDue.toLocaleString()} د.ت` : "—", totalDue > 0 ? "مستحق" : "لا توجد ديون", () => changeTab("invoicing"), totalDue > 0 ? "text-orange-400" : undefined)}
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
                ["نوع الملف",       c.caseType],
                ["درجة التقاضي",    c.litigationDegree],
                ["نوع الإجراء",     c.procedureType],
                ["الأولوية",        c.casePriority],
                ["قيمة النزاع",     c.disputeValue ? `${Number(c.disputeValue).toLocaleString()} د.ت` : null],
                ["مصدر الحريف",    c.clientSource],
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
                  <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-xl">
                    <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm shrink-0">{caseData.clientName.charAt(0)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{caseData.clientName}</p>
                      <p className="text-[10px] text-muted-foreground">الحريف</p>
                    </div>
                    {(caseData as { clientId?: number }).clientId && (
                      <button onClick={() => navigate(`/clients/${(caseData as { clientId?: number }).clientId}`)} className="p-1 hover:bg-muted rounded-lg"><ExternalLink className="h-3.5 w-3.5 text-muted-foreground" /></button>
                    )}
                  </div>
                )}
                {/* Opponents */}
                {opponents.map(o => (
                  <div key={o.id} className="flex items-center gap-2 p-3 bg-destructive/5 border border-destructive/20 rounded-xl">
                    <div className="h-8 w-8 rounded-full bg-destructive/10 text-destructive flex items-center justify-center font-bold text-sm shrink-0">{o.name.charAt(0)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{o.name}</p>
                        {o.capacity && <span className="text-[10px] px-1.5 py-0.5 bg-muted text-muted-foreground rounded-full">{o.capacity}</span>}
                      </div>
                      {o.lawyerName && <p className="text-[10px] text-muted-foreground">ذ. {o.lawyerName}{o.opponentLawyerPhone ? ` — ${o.opponentLawyerPhone}` : ""}</p>}
                    </div>
                    <button onClick={() => setConfirmOppId(o.id)} className="p-1 hover:bg-destructive/10 rounded-lg shrink-0"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
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
                  <div key={m.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm shrink-0">{(m.userName ?? "م").charAt(0)}</div>
                      <div>
                        <p className="font-semibold text-sm">{m.userName ?? "مستخدم"}</p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400">{m.role}</span>
                      </div>
                    </div>
                    <button onClick={() => setConfirmTeamId(m.id)} className="p-1.5 hover:bg-destructive/10 rounded-lg"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
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
      <Card className="border-none shadow-sm"><CardContent className="p-5 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">التسلسل الإجرائي</h3>
          <Button size="sm" onClick={() => { setProcForm({ stage: c.litigationDegree ?? "ابتدائي", status: "جارية", notes: "", startedAt: "", endedAt: "" }); setModal("procedure"); }} className="gap-1.5 text-xs"><Plus className="h-3.5 w-3.5" />إجراء جديد</Button>
        </div>
        <div className="flex items-center gap-3 p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-xl text-sm">
          <GitBranch className="h-5 w-5 text-indigo-400 shrink-0" />
          <p className="text-muted-foreground">سيتم تفعيل التتبع التلقائي للمراحل الإجرائية قريباً. يمكنك إضافة الإجراءات يدوياً في الوقت الحالي.</p>
        </div>
        {procedures.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground border border-dashed border-border rounded-xl">
            <GitBranch className="h-8 w-8 mx-auto mb-2 opacity-20" /><p>لا توجد إجراءات مسجلة</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute right-5 top-5 bottom-5 w-0.5 bg-border" />
            <div className="space-y-4">
              {procedures.map((p, i) => (
                <div key={p.id} className="flex gap-4">
                  <div className={`h-10 w-10 rounded-full shrink-0 flex items-center justify-center z-10 border-2 font-bold text-sm ${p.status === "مكتملة" ? "bg-green-500/10 text-green-400 border-green-500/30" : p.status === "موقوفة" ? "bg-orange-500/10 text-orange-400 border-orange-500/30" : "bg-primary/10 text-primary border-primary/30"}`}>{i + 1}</div>
                  <div className="flex-1 p-4 bg-muted/30 rounded-xl border border-border">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">{p.stage}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${p.status === "مكتملة" ? "bg-green-500/10 text-green-400" : p.status === "موقوفة" ? "bg-orange-500/10 text-orange-400" : "bg-blue-500/10 text-blue-400"}`}>{p.status}</span>
                      </div>
                      <button onClick={() => setConfirmProcId(p.id)} className="p-1 hover:bg-destructive/10 rounded-lg"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                    </div>
                    {p.notes && <p className="text-sm text-muted-foreground mt-2">{p.notes}</p>}
                    {(p.startedAt || p.endedAt) && (
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        {p.startedAt && <span>البداية: {formatDateTN(p.startedAt)}</span>}
                        {p.endedAt   && <span>النهاية: {formatDateTN(p.endedAt)}</span>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent></Card>
    );
  }

  function renderHearings() {
    return (
      <Card className="border-none shadow-sm"><CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-semibold">الجلسات والآجال</h3>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => { setDlForm({ title: "", type: "custom", dueDate: "", urgency: "normal", notes: "" }); setModal("deadline"); }} className="gap-1.5 text-xs"><Plus className="h-3.5 w-3.5" />أجل قانوني</Button>
          </div>
        </div>
        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {(["all","upcoming","past"] as const).map(f => (
            <button key={f} onClick={() => setDlFilter(f)}
              className={cn("text-xs px-3 py-1.5 rounded-full border transition-colors", dlFilter === f ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50")}>
              {f === "all" ? "الكل" : f === "upcoming" ? "القادمة" : "الماضية"}
            </button>
          ))}
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
                <div key={d.id} className={`p-4 rounded-xl border ${d.completedAt ? "opacity-50 border-border bg-muted/20" : URGENCY_COLORS[d.urgency]}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <button onClick={async () => { if (d.completedAt) return; await authFetch(`${BASE}/api/deadlines/${d.id}/complete`, { method: "PATCH" }); load.deadlines(); }} className={d.completedAt ? "text-green-400" : "text-muted-foreground hover:text-green-400 transition-colors"}>
                        {d.completedAt ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                      </button>
                      <div>
                        <p className={`font-semibold text-sm ${d.completedAt ? "line-through" : ""}`}>{d.title}</p>
                        <div className="flex items-center gap-3 text-xs mt-0.5 flex-wrap">
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDateTN(d.dueDate)}</span>
                          {isOver && <span className="text-red-400 font-bold animate-pulse">متأخر!</span>}
                          {!isOver && !d.completedAt && days <= 30 && <span className={cn("font-semibold", days <= 3 ? "text-red-400" : days <= 7 ? "text-orange-400" : "text-green-400")}>{days} يوم</span>}
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${d.urgency === "critical" ? "bg-red-500/20 text-red-400" : d.urgency === "high" ? "bg-orange-500/20 text-orange-400" : "bg-muted text-muted-foreground"}`}>{d.urgency === "critical" ? "حرج" : d.urgency === "high" ? "عالٍ" : "عادي"}</span>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => setConfirmDeadlineId(d.id)} className="p-1 hover:bg-destructive/10 rounded-lg shrink-0"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
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
          <div className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-xl">
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
              <div key={doc.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border border-border">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><FileText className="h-4 w-4" /></div>
                  <div>
                    <p className="font-medium text-sm">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTN(doc.createdAt)}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  {doc.url && <a href={doc.url} target="_blank" rel="noreferrer" className="p-1.5 hover:bg-muted rounded-lg"><ExternalLink className="h-3.5 w-3.5 text-muted-foreground" /></a>}
                  <button onClick={() => setConfirmDocId(doc.id)} className="p-1.5 hover:bg-destructive/10 rounded-lg"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
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
              <div><p className="text-[10px] text-muted-foreground mb-0.5">طريقة الاحتساب</p><p className="text-sm font-medium">{c.feeMethod}</p></div>
              {c.feeMethod === "جزافية" && c.agreedFees && <div><p className="text-[10px] text-muted-foreground mb-0.5">الأتعاب المتفق عليها</p><p className="text-sm font-semibold text-primary">{Number(c.agreedFees).toLocaleString()} د.ت</p></div>}
              {c.feeMethod === "بالساعة" && c.hourlyRate && <div><p className="text-[10px] text-muted-foreground mb-0.5">التعرفة بالساعة</p><p className="text-sm font-semibold text-primary">{Number(c.hourlyRate).toLocaleString()} د.ت/ساعة</p></div>}
              {c.feeMethod === "نسبة مئوية" && c.percentage && <div><p className="text-[10px] text-muted-foreground mb-0.5">النسبة</p><p className="text-sm font-semibold text-primary">{c.percentage}%{c.percentageBasis ? ` من ${c.percentageBasis}` : ""}</p></div>}
              {c.disputeValue && <div><p className="text-[10px] text-muted-foreground mb-0.5">قيمة النزاع</p><p className="text-sm font-medium">{Number(c.disputeValue).toLocaleString()} د.ت</p></div>}
            </div>
          </CardContent></Card>
        )}

        {/* Invoice KPIs */}
        <div className="grid grid-cols-3 gap-3">
          {kpiCard("المفوتر",  totalInvoiced > 0 ? `${totalInvoiced.toLocaleString()} د.ت` : "—")}
          {kpiCard("المقبوض",  totalPaid     > 0 ? `${totalPaid.toLocaleString()} د.ت`     : "—", undefined, undefined, "text-green-400")}
          {kpiCard("الرصيد المستحق", totalDue > 0 ? `${totalDue.toLocaleString()} د.ت` : "—", undefined, undefined, totalDue > 0 ? "text-orange-400" : undefined)}
        </div>

        {/* Invoices list */}
        <Card className="border-none shadow-sm"><CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">الفواتير</h3>
            <Button size="sm" onClick={() => navigate(`/invoices/new?caseId=${id}`)} className="gap-1.5 text-xs"><Plus className="h-3.5 w-3.5" />فاتورة جديدة</Button>
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
                      <tr key={inv.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                        <td className="py-2.5 px-2 font-mono text-xs">{inv.invoiceNumber ?? `#${inv.id}`}</td>
                        <td className="py-2.5 px-2 text-muted-foreground text-xs">{inv.issuedAt ? formatDateTN(inv.issuedAt) : "—"}</td>
                        <td className="py-2.5 px-2 font-semibold">{Number(inv.amount).toLocaleString()} د.ت</td>
                        <td className="py-2.5 px-2 text-green-400">{inv.paidAmount ? `${Number(inv.paidAmount).toLocaleString()} د.ت` : "—"}</td>
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
              <span className={cn("text-xs px-2 py-1 rounded-full font-medium", c.confidentialityLevel === "سري للغاية" ? "bg-red-500/10 text-red-400" : c.confidentialityLevel === "سري" ? "bg-orange-500/10 text-orange-400" : "bg-muted text-muted-foreground")}>
                {c.confidentialityLevel}
              </span>
            </div>
          </CardContent></Card>
        )}

        {/* الملاحظات الداخلية (internalNotes from wizard) */}
        {c.internalNotes && (
          <Card className="border-none shadow-sm"><CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-orange-400 shrink-0" />
              <h3 className="font-semibold text-sm">الملاحظات الداخلية</h3>
              <span className="text-[10px] px-1.5 py-0.5 bg-orange-500/10 text-orange-400 rounded-full">سري</span>
            </div>
            <div className="p-3 bg-orange-500/5 border border-orange-500/20 rounded-xl text-xs text-orange-300 flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> هذه الملاحظات لا تظهر للحريف في بوابة العميل
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{c.internalNotes}</p>
          </CardContent></Card>
        )}

        {/* ملاحظات سرية (manual entries) */}
        <Card className="border-none shadow-sm"><CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">ملاحظات سرية إضافية</h3>
              <span className="text-xs px-2 py-0.5 bg-orange-500/10 text-orange-400 rounded-full flex items-center gap-1"><Lock className="h-3 w-3" />سري</span>
            </div>
            <Button size="sm" onClick={() => { setConfForm({ content: "" }); setModal("conf-note"); }} className="gap-1.5 text-xs"><Plus className="h-3.5 w-3.5" />ملاحظة</Button>
          </div>
          {confNotes.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground border border-dashed border-border rounded-xl text-sm"><Lock className="h-6 w-6 mx-auto mb-1.5 opacity-20" />لا توجد ملاحظات سرية</div>
          ) : (
            <div className="space-y-3">
              {confNotes.map(n => (
                <div key={n.id} className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-xl">
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
              <div key={r.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border border-border">
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-indigo-400 shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">{r.relatedTitle ?? `قضية #${r.relatedCaseId}`}</p>
                    <span className="text-xs text-muted-foreground">{r.relationType}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/cases/${r.relatedCaseId}`)} className="text-xs h-7">عرض</Button>
                  <button onClick={() => setConfirmRelationId(r.id)} className="p-1.5 hover:bg-destructive/10 rounded-lg"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
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
                  {c.clientFileRef   && <span className="text-xs px-2 py-0.5 bg-cyan-500/10 text-cyan-400 rounded-full font-mono flex items-center gap-1" title="مرجع الحريف">📁 {c.clientFileRef}</span>}
                  <StatusBadge status={caseData.status} />
                  {c.archivedAt      && <span className="text-xs px-2 py-0.5 bg-orange-500/10 text-orange-400 rounded-full flex items-center gap-1"><Archive className="h-3 w-3" />مؤرشفة</span>}
                  {c.procedureStage  && <span className="text-xs px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center gap-1"><Layers className="h-3 w-3" />{c.procedureStage}</span>}
                  {c.caseType        && <span className="text-xs px-2 py-0.5 bg-violet-500/10 text-violet-400 rounded-full">{c.caseType}</span>}
                  {c.casePriority && c.casePriority !== "عادية" && <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${c.casePriority === "حرجة" ? "bg-red-500/10 text-red-400" : "bg-orange-500/10 text-orange-400"}`}><AlertTriangle className="h-3 w-3" />{c.casePriority}</span>}
                  {c.confidentialityLevel && c.confidentialityLevel !== "عادي" && <span className="text-xs px-2 py-0.5 bg-orange-500/10 text-orange-400 rounded-full flex items-center gap-1"><Lock className="h-3 w-3" />{c.confidentialityLevel}</span>}
                </div>
                <h1 className="text-xl font-bold mb-1">{caseData.title}</h1>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {caseData.clientName && <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" />{caseData.clientName}</span>}
                  {caseData.court     && <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{caseData.court}{c.division ? ` — ${c.division}` : ""}</span>}
                  {caseData.lawyer    && <span className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" />{caseData.lawyer}</span>}
                  {caseData.nextHearing && !c.archivedAt && <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{formatDateTN(caseData.nextHearing)}</span>}
                  {c.archivedAt && c.judgmentText && <span className="flex items-center gap-1.5 text-orange-400"><FileText className="h-3.5 w-3.5" />نص الحكم: {c.judgmentText}</span>}
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap shrink-0">
              {overdueCount > 0 && <span className="text-xs px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {overdueCount} أجل متأخر</span>}
              <Button size="sm" onClick={openEdit} className="gap-1.5 text-xs"><Pencil className="h-3.5 w-3.5" />تعديل</Button>
              <Button size="sm" onClick={() => setConfirmArchive(true)} className="gap-1.5 text-xs"><Archive className="h-3.5 w-3.5" />{c.archivedAt ? "استرجاع" : "أرشفة"}</Button>
              <CasePdfButton caseId={Number(id)} caseTitle={caseData?.title} caseNumber={(caseData as { caseNumber?: string | null })?.caseNumber} />
              <Button variant="destructive" size="sm" onClick={() => setConfirmCaseDelete(true)} className="gap-1.5 text-xs"><Trash2 className="h-3.5 w-3.5" />حذف</Button>
            </div>
          </div>
        </CardContent>
      </Card>

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
                  <span className={`text-[10px] ${tab.badgeColor ?? "bg-primary/20 text-primary"} ${tab.badgeColor ? "text-white" : ""} rounded-full px-1.5 py-0.5 font-bold leading-none`}>
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
          {activeTab === "judgment"   && renderJudgment()}
          {activeTab === "documents"  && renderDocuments()}
          {activeTab === "invoicing"  && renderInvoicing()}
          {activeTab === "expenses"   && renderPlaceholder(<DollarSign className="h-7 w-7" />, "المصاريف", "إدارة مصاريف الملف ستُضاف في الإصدار القادم")}
          {activeTab === "time"       && renderPlaceholder(<Timer className="h-7 w-7" />, "الوقت", "تتبع ساعات العمل وتحديد التعرفة بالساعة — قيد التطوير")}
          {activeTab === "notes"      && renderNotes()}
        </div>
      </div>

      {/* ─── MODALS ─────────────────────────────────────────── */}

      {/* Opponent modal */}
      <Modal open={modal === "opponent"} onClose={() => setModal(null)} title="إضافة خصم">
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
              await authFetch(`${BASE}/api/opponents`, { method: "POST", body: JSON.stringify({ name: oppForm.name, lawyerName: oppForm.lawyerName, phone: oppForm.phone, address: oppForm.address, notes: oppForm.notes, caseId: Number(id), capacity: oppForm.capacity || undefined, opponentLawyerPhone: oppForm.opponentLawyerPhone || undefined }) });
            }, load.opponents)}>{saving ? "جارٍ الحفظ..." : "حفظ"}</Button>
            <Button variant="outline" onClick={() => setModal(null)} className="px-5">إلغاء</Button>
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

      {/* Deadline modal */}
      <Modal open={modal === "deadline"} onClose={() => setModal(null)} title="إضافة أجل قانوني">
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
            <Button className="flex-1" disabled={saving || (dlForm.type === "custom" && !dlForm.dueDate)} onClick={() => withSave(async () => { await authFetch(`${BASE}/api/cases/${id}/deadlines`, { method: "POST", body: JSON.stringify(dlForm) }); }, load.deadlines)}>{saving ? "جارٍ الحفظ..." : "حفظ"}</Button>
            <Button variant="outline" onClick={() => setModal(null)} className="px-5">إلغاء</Button>
          </div>
        </div>
      </Modal>

      {/* Team modal */}
      <Modal open={modal === "team"} onClose={() => setModal(null)} title="إضافة عضو للفريق">
        <div className="space-y-4">
          <FormField label="المستخدم" htmlFor="tm-user">
            <SelectNative id="tm-user" value={teamForm.userId} onChange={e => setTeamForm({...teamForm, userId: e.target.value})} className={inputCls + " px-3 cursor-pointer"}>
              <option value="">اختر مستخدماً...</option>
              {allUsers.filter(u => !team.some(t => t.userId === u.id)).map(u => <option key={u.id} value={u.id}>{u.name} — {u.email}</option>)}
            </SelectNative>
          </FormField>
          <FormField label="الدور في القضية" htmlFor="tm-role">
            <SelectNative id="tm-role" value={teamForm.role} onChange={e => setTeamForm({...teamForm, role: e.target.value})} className={inputCls + " px-3 cursor-pointer"}>
              {["مسؤول رئيسي","مساعد","متربص"].map(r => <option key={r} value={r}>{r}</option>)}
            </SelectNative>
          </FormField>
          <div className="flex gap-3">
            <Button className="flex-1" disabled={saving || !teamForm.userId} onClick={() => withSave(async () => { await authFetch(`${BASE}/api/cases/${id}/team`, { method: "POST", body: JSON.stringify({...teamForm, userId: Number(teamForm.userId)}) }); }, load.team)}>{saving ? "جارٍ الحفظ..." : "حفظ"}</Button>
            <Button variant="outline" onClick={() => setModal(null)} className="px-5">إلغاء</Button>
          </div>
        </div>
      </Modal>

      {/* Confidential Note modal */}
      <Modal open={modal === "conf-note"} onClose={() => setModal(null)} title="ملاحظة داخلية سرية">
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-orange-500/10 text-orange-400 rounded-xl text-sm">
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
            <FormField label="مرجع الحريف" htmlFor="ed-clientref">
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
    </div>
  );
}

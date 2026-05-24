import { SelectNative } from "@/components/SelectNative";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { TNDAmount } from "@/components/Money";
import { formatDateTN } from "@/lib/date";
import { useParams, useLocation } from "wouter";
import { authFetch } from "@/lib/authFetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Modal, FormField } from "@/components/Modal";
import { SmartTextarea } from "@/components/SmartTextarea";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonClientPage } from "@/components/ui/skeletons";
import {
  User, Building2, Phone, Mail, MapPin, Plus, Pencil, Trash2,
  Briefcase, FileText, Clock, MessageSquare, BookOpen,
  ChevronRight, MoreHorizontal, Star, CreditCard, Receipt,
  CheckCircle2, AlertCircle, Calendar, Hash, Loader2, Upload,
  FileImage, File, FileSpreadsheet, ArrowUpRight, ArrowDownLeft, ArrowRight, Send,
  Play, Pause, Square, Timer, TrendingUp, ShieldAlert, Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CourtSelect } from "@/components/CourtSelect";
import { useToast } from "@/hooks/use-toast";

const CASE_STAGES = ["ابتدائي", "استئناف", "تعقيب", "تنفيذ", "ختم"];

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
const inputCls = "h-10 bg-muted/50 border-border focus-visible:ring-1 focus-visible:ring-primary rounded-lg w-full";

interface ClientFull {
  id: number;
  name: string;
  clientType: string | null;
  legalForm: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  cin: string | null;
  taxId: string | null;
  commercialRegister: string | null;
  rib: string | null;
  withholdingRate: string | null;
  withholdingExempt: boolean | null;
  officeSeq: string | null;
  notes: string | null;
  createdAt: string;
}

interface Contact {
  id: number;
  clientId: number;
  firstName: string;
  lastName: string | null;
  role: string | null;
  phone: string | null;
  email: string | null;
  isPrimary: boolean | null;
}

interface ClientEvent {
  id: number;
  clientId: number;
  eventType: string;
  payload: Record<string, unknown> | null;
  occurredAt: string;
  createdBy: string | null;
}

interface CaseRow { id: number; title: string; status: string; court: string | null; caseNumber: string | null; archivedAt: string | null; createdAt: string; }
interface InvoiceRow { id: number; invoiceNumber: string | null; description: string | null; netToPay: string; balanceDue: string; amountPaid: string; status: string; dueDate: string | null; createdAt: string; }
interface DocRow { id: number; name: string; fileType: string | null; caseId: number | null; url: string | null; createdAt: string; }
interface CorrespRow { id: number; type: string; direction: string; date: string; subject: string; content: string | null; reference: string | null; status: string; caseName: string | null; }

const EVENT_ICONS: Record<string, React.ReactNode> = {
  case_created: <Briefcase className="h-4 w-4 text-blue-400" />,
  invoice_issued: <Receipt className="h-4 w-4 text-amber-400" />,
  payment_received: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
  document_signed: <FileText className="h-4 w-4 text-purple-400" />,
  message_sent: <MessageSquare className="h-4 w-4 text-indigo-400" />,
  note_added: <BookOpen className="h-4 w-4 text-rose-400" />,
};

const EVENT_LABELS: Record<string, string> = {
  case_created: "فتح قضية جديدة",
  invoice_issued: "إصدار فاتورة",
  payment_received: "استلام دفعة",
  document_signed: "توقيع وثيقة",
  message_sent: "إرسال رسالة",
  note_added: "إضافة ملاحظة",
};

const TABS = [
  { id: "info",        label: "المعلومات",         icon: <User className="h-4 w-4" /> },
  { id: "cases",       label: "الملفات الجارية", icon: <Briefcase className="h-4 w-4" /> },
  { id: "archived",    label: "الملفات المؤرشفة", icon: <BookOpen className="h-4 w-4" /> },
  { id: "billing",     label: "الفواتير",           icon: <Receipt className="h-4 w-4" /> },
  { id: "hours",       label: "الساعات",           icon: <Clock className="h-4 w-4" /> },
  { id: "documents",   label: "الوثائق",           icon: <FileText className="h-4 w-4" /> },
  { id: "corresp",     label: "المراسلات",         icon: <MessageSquare className="h-4 w-4" /> },
  { id: "journal",     label: "السجل",             icon: <Calendar className="h-4 w-4" /> },
];

const EMPTY_CONTACT = { firstName: "", lastName: "", role: "", phone: "", email: "", isPrimary: false };

function fmt(d: string | null) {
  return formatDateTN(d);
}

export default function ClientPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const clientId = Number(id);

  const [client, setClient] = useState<ClientFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("info");
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState<Partial<ClientFull>>({});
  const [saving, setSaving] = useState(false);
  const [unresolvedConflicts, setUnresolvedConflicts] = useState(0);
  const { toast } = useToast();

  // Lazy-loaded tab data
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [events, setEvents] = useState<ClientEvent[]>([]);
  const [tabLoaded, setTabLoaded] = useState<Set<string>>(new Set());

  // Time tracking
  interface TimeEntry { id: number; date: string; caseTitle: string; description: string; hours: number; rate: number; billable: boolean; }
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerElapsed, setTimerElapsed] = useState(0);
  const [timerCaseId, setTimerCaseId] = useState("");
  const [timerDesc, setTimerDesc] = useState("");
  const timerInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const [timeModal, setTimeModal] = useState(false);
  const [timeForm, setTimeForm] = useState({ date: new Date().toISOString().slice(0,10), caseId: "", description: "", hours: "", rate: "150", billable: true });

  // Correspondances
  const [corresp, setCorresp] = useState<CorrespRow[]>([]);
  const [corrModal, setCorrModal] = useState(false);
  const [corrForm, setCorrForm] = useState({
    type: "letter", direction: "outgoing",
    date: new Date().toISOString().slice(0, 10),
    subject: "", content: "", reference: "", status: "sent", caseId: "",
  });
  const [savingCorr, setSavingCorr] = useState(false);

  // Doc upload modal
  const [docModal, setDocModal] = useState(false);
  const [docForm, setDocForm] = useState({ name: "", fileType: "عقد", caseId: "", url: "" });
  const [savingDoc, setSavingDoc] = useState(false);

  // Quick case modal
  const [caseModal, setCaseModal] = useState(false);
  const [caseForm, setCaseForm] = useState({ title: "", court: "", division: "", lawyer: "", status: "active", nextHearing: "", description: "", procedureStage: "ابتدائي", courtCaseNumber: "", clientFileRef: "", opponentName: "", opponentLawyer: "" });
  const [savingCase, setSavingCase] = useState(false);

  // Quick invoice modal
  const [invoiceModal, setInvoiceModal] = useState(false);
  const [invForm, setInvForm] = useState({ description: "", unitPriceHt: "", vatRate: "19", dueDate: "", caseId: "" });
  const [savingInv, setSavingInv] = useState(false);

  // Note modal
  const [noteModal, setNoteModal] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // Contact modal
  const [contactModal, setContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [contactForm, setContactForm] = useState(EMPTY_CONTACT);
  const [savingContact, setSavingContact] = useState(false);

  const loadClient = useCallback(async () => {
    const [r, cr] = await Promise.all([
      authFetch(`${BASE}/api/clients/${clientId}`),
      authFetch(`${BASE}/api/conflict-checks?resolved=false&entityId=${clientId}&entityType=client`),
    ]);
    if (r.ok) setClient(await r.json());
    else navigate("/clients");
    if (cr.ok) {
      const conflicts = await cr.json() as unknown[];
      setUnresolvedConflicts(conflicts.length);
    }
    setLoading(false);
  }, [clientId, navigate]);

  useEffect(() => { loadClient(); }, [loadClient]);

  async function loadTab(tab: string) {
    if (tabLoaded.has(tab)) return;
    setTabLoaded(prev => new Set([...prev, tab]));
    if (tab === "info") {
      const r = await authFetch(`${BASE}/api/clients/${clientId}/contacts`);
      if (r.ok) setContacts(await r.json());
    } else if (tab === "cases" || tab === "archived") {
      if (!tabLoaded.has("cases") && !tabLoaded.has("archived")) {
        const r = await authFetch(`${BASE}/api/clients/${clientId}/cases`);
        if (r.ok) setCases(await r.json());
      }
    } else if (tab === "billing") {
      const r = await authFetch(`${BASE}/api/clients/${clientId}/invoices`);
      if (r.ok) setInvoices(await r.json());
    } else if (tab === "documents") {
      const r = await authFetch(`${BASE}/api/clients/${clientId}/documents`);
      if (r.ok) setDocs(await r.json());
    } else if (tab === "corresp") {
      const r = await authFetch(`${BASE}/api/correspondances?clientId=${clientId}`);
      if (r.ok) setCorresp(await r.json());
    } else if (tab === "journal") {
      const r = await authFetch(`${BASE}/api/clients/${clientId}/events`);
      if (r.ok) setEvents(await r.json());
    }
  }

  function switchTab(tab: string) {
    setActiveTab(tab);
    loadTab(tab);
  }

  // Timer tick
  useEffect(() => {
    if (timerRunning) {
      timerInterval.current = setInterval(() => setTimerElapsed(e => e + 1), 1000);
    } else {
      if (timerInterval.current) clearInterval(timerInterval.current);
    }
    return () => { if (timerInterval.current) clearInterval(timerInterval.current); };
  }, [timerRunning]);

  function fmtTimer(secs: number) {
    const h = Math.floor(secs / 3600).toString().padStart(2, "0");
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  }

  function stopTimer() {
    setTimerRunning(false);
    if (timerElapsed > 60) {
      const hours = parseFloat((timerElapsed / 3600).toFixed(2));
      const caseTitle = cases.find(c => String(c.id) === timerCaseId)?.title ?? "—";
      setTimeEntries(es => [{ id: Date.now(), date: new Date().toISOString().slice(0,10), caseTitle, description: timerDesc || "وقت مسجّل بالكرونومتر", hours, rate: 150, billable: true }, ...es]);
    }
    setTimerElapsed(0);
    setTimerDesc("");
  }

  // Load contacts and cases on mount
  useEffect(() => { loadTab("info"); loadTab("cases"); }, [clientId]); // eslint-disable-line react-hooks/exhaustive-deps

  function openEdit() {
    if (!client) return;
    setEditForm({ ...client });
    setEditModal(true);
  }

  async function saveEdit() {
    if (!editForm.name?.trim()) return;
    setSaving(true);
    const r = await authFetch(`${BASE}/api/clients/${clientId}`, {
      method: "PUT",
      body: JSON.stringify(editForm),
    });
    if (r.ok) { setClient(await r.json()); setEditModal(false); toast({ title: "تم حفظ بيانات الموكّل" }); }
    setSaving(false);
  }

  async function deleteClient() {
    if (!confirm("حذف هذا الموكّل نهائيًا؟")) return;
    await authFetch(`${BASE}/api/clients/${clientId}`, { method: "DELETE" });
    navigate("/clients");
  }

  // Contacts CRUD
  function openNewContact() {
    setEditingContact(null);
    setContactForm(EMPTY_CONTACT);
    setContactModal(true);
  }
  function openEditContact(c: Contact) {
    setEditingContact(c);
    setContactForm({ firstName: c.firstName, lastName: c.lastName ?? "", role: c.role ?? "", phone: c.phone ?? "", email: c.email ?? "", isPrimary: c.isPrimary ?? false });
    setContactModal(true);
  }
  async function saveContact() {
    setSavingContact(true);
    const url = editingContact
      ? `${BASE}/api/clients/${clientId}/contacts/${editingContact.id}`
      : `${BASE}/api/clients/${clientId}/contacts`;
    const r = await authFetch(url, { method: editingContact ? "PUT" : "POST", body: JSON.stringify(contactForm) });
    if (r.ok) {
      const rr = await authFetch(`${BASE}/api/clients/${clientId}/contacts`);
      if (rr.ok) setContacts(await rr.json());
      setContactModal(false);
    }
    setSavingContact(false);
  }
  async function deleteContact(contactId: number) {
    if (!confirm("حذف جهة الاتصال؟")) return;
    await authFetch(`${BASE}/api/clients/${clientId}/contacts/${contactId}`, { method: "DELETE" });
    setContacts(prev => prev.filter(c => c.id !== contactId));
  }

  const activeCases = cases.filter(c => !c.archivedAt);
  const archivedCases = cases.filter(c => !!c.archivedAt);
  const totalInvoiced = invoices.reduce((s, i) => s + Number(i.netToPay ?? 0), 0);
  const totalPaid = invoices.reduce((s, i) => s + Number(i.amountPaid ?? 0), 0);
  const balance = invoices.reduce((s, i) => s + Number(i.balanceDue ?? 0), 0);

  if (loading) return <SkeletonClientPage tabs={7} />;

  if (!client) return null;

  const isCompany = client.clientType === "company";

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <button onClick={() => window.history.back()}
            className="text-muted-foreground hover:text-foreground transition-colors mb-1">
            <ArrowRight className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{client.name}</h1>
            <span className={cn(
              "text-xs px-2.5 py-1 rounded-full border font-medium",
              isCompany
                ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
            )}>
              {isCompany ? "شخص معنوي" : "شخص طبيعي"}
            </span>
            {unresolvedConflicts > 0 && (
              <button
                onClick={() => navigate(`/conflicts`)}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-semibold bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20 transition-colors"
              >
                <ShieldAlert className="h-3.5 w-3.5" />
                ⚠ تعارض محتمل ({unresolvedConflicts})
              </button>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
            {client.officeSeq && (
              <span className="flex items-center gap-1"><Hash className="h-3.5 w-3.5" />{client.officeSeq}</span>
            )}
            {client.legalForm && <span>{client.legalForm}</span>}
            {client.phone && (
              <span className="flex items-center gap-1" dir="ltr"><Phone className="h-3.5 w-3.5" />{client.phone}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" className="gap-1.5 text-xs"
            onClick={() => { setCaseForm({ title: "", court: "", division: "", lawyer: "", status: "active", nextHearing: "", description: "", procedureStage: "ابتدائي", courtCaseNumber: "", clientFileRef: "", opponentName: "", opponentLawyer: "" }); setCaseModal(true); }}>
            <Plus className="h-3.5 w-3.5" /> ملف جديد
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-1 overflow-x-auto no-scrollbar">
          {TABS.map(tab => {
            let badge = 0;
            if (tab.id === "cases") badge = activeCases.length;
            if (tab.id === "archived") badge = archivedCases.length;
            if (tab.id === "billing") badge = invoices.length;
            if (tab.id === "documents") badge = docs.length;
            return (
              <button
                key={tab.id}
                onClick={() => switchTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0",
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                )}
              >
                {tab.icon}
                {tab.label}
                {badge > 0 && (
                  <span className="text-[10px] bg-primary text-white rounded-full px-1.5 py-0.5 font-bold leading-none min-w-[1.1rem] text-center">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {/* INFORMATIONS */}
        {activeTab === "info" && (
          <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">بيانات الموكّل</h2>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={openEdit} className="gap-1.5 text-xs">
                <Pencil className="h-3.5 w-3.5" /> تعديل
              </Button>
              <Button
                size="sm"
                title="تصدير بيانات الموكّل"
                className="gap-1.5 text-xs"
                onClick={async () => {
                  const r = await authFetch(`${BASE}/api/data-exports`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ exportType: "single_client", scopeId: client?.id }),
                  });
                  if (r.ok) {
                    toast({ title: "بدأت عملية التصدير", description: "انتقل إلى «البيانات والخصوصية» لمتابعة التقدم" });
                  } else {
                    toast({ title: "فشل إنشاء التصدير", variant: "destructive" });
                  }
                }}
              >
                <Download className="h-3.5 w-3.5" /> تصدير
              </Button>
              <button
                onClick={deleteClient}
                className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                title="حذف الموكّل"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </button>
            </div>
          </div>
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Identité */}
            <Card className="border-none shadow-sm">
              <CardContent className="p-6 space-y-4">
                <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">الهوية</h2>
                <dl className="space-y-3 text-sm">
                  <Row label="الاسم">{client.name}</Row>
                  {isCompany && <Row label="الشكل القانوني">{client.legalForm || "—"}</Row>}
                  {!isCompany && <Row label="بطاقة التعريف">{client.cin || "—"}</Row>}
                  <Row label="المعرف الجبائي">{client.taxId || "—"}</Row>
                  {isCompany && <Row label="السجل التجاري">{client.commercialRegister || "—"}</Row>}
                  {isCompany && <Row label="رقم الحساب البنكي (RIB)">{client.rib || "—"}</Row>}
                </dl>
              </CardContent>
            </Card>

            {/* Coordonnées */}
            <Card className="border-none shadow-sm">
              <CardContent className="p-6 space-y-4">
                <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">التواصل</h2>
                <dl className="space-y-3 text-sm">
                  <Row label="الهاتف">
                    {client.phone ? <span dir="ltr">{client.phone}</span> : "—"}
                  </Row>
                  <Row label="البريد الإلكتروني">{client.email || "—"}</Row>
                  <Row label="العنوان">{client.address || "—"}</Row>
                </dl>
              </CardContent>
            </Card>

            {/* Fiscalité */}
            <Card className="border-none shadow-sm">
              <CardContent className="p-6 space-y-4">
                <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">الجانب الجبائي</h2>
                <dl className="space-y-3 text-sm">
                  <Row label="نسبة الخصم من المورد">
                    {client.withholdingExempt
                      ? <span className="text-emerald-400">غير خاضع للخصم</span>
                      : `${client.withholdingRate ?? 0} %`}
                  </Row>
                  <Row label="المعرف الجبائي">{client.taxId || "—"}</Row>
                </dl>
              </CardContent>
            </Card>

            {/* Contacts */}
            <Card className="border-none shadow-sm">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">جهات الاتصال</h2>
                  <Button size="sm" onClick={openNewContact} className="gap-1 text-xs h-7 px-2">
                    <Plus className="h-3 w-3" /> إضافة
                  </Button>
                </div>
                {contacts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">لا توجد جهات اتصال</p>
                ) : (
                  <ul className="space-y-3">
                    {contacts.map(c => (
                      <li key={c.id} className="flex items-start justify-between gap-3 p-3 bg-muted/30 rounded-xl">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{c.firstName} {c.lastName}</p>
                            {c.isPrimary && <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />}
                          </div>
                          {c.role && <p className="text-xs text-muted-foreground">{c.role}</p>}
                          {c.phone && <p className="text-xs text-muted-foreground" dir="ltr">{c.phone}</p>}
                          {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => openEditContact(c)} className="p-1 hover:bg-muted rounded-lg">
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                          <button onClick={() => deleteContact(c.id)} className="p-1 hover:bg-destructive/10 rounded-lg">
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {client.notes && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">ملاحظات</h3>
                    <p className="text-sm text-muted-foreground">{client.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          </div>
        )}

        {/* DOSSIERS EN COURS */}
        {activeTab === "cases" && (
          <CasesTab cases={activeCases} label="الملفات الجارية" navigate={navigate} />
        )}

        {/* ملفات مؤرشفة */}
        {activeTab === "archived" && (
          <CasesTab cases={archivedCases} label="الملفات المؤرشفة" navigate={navigate} />
        )}

        {/* ÉCHÉANCIER FINANCIER */}
        {activeTab === "billing" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">الفواتير</h2>
              <Button size="sm" className="gap-1.5 text-xs"
                onClick={() => { setInvForm({ description: "", unitPriceHt: "", vatRate: "19", dueDate: "", caseId: "" }); setInvoiceModal(true); }}>
                <Plus className="h-3.5 w-3.5" /> فاتورة جديدة
              </Button>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard label="الرقم الإجمالي" value={<TNDAmount amount={totalInvoiced} className="text-xl font-bold" />} icon={<Receipt className="h-5 w-5 text-blue-400" />} />
              <KpiCard label="المحصّل" value={<TNDAmount amount={totalPaid} className="text-xl font-bold" />} icon={<CheckCircle2 className="h-5 w-5 text-emerald-400" />} />
              <KpiCard label="الرصيد المتبقي" value={<TNDAmount amount={balance} className="text-xl font-bold" />} icon={<AlertCircle className="h-5 w-5 text-amber-400" />} />
              <KpiCard label="عدد الفواتير" value={String(invoices.length)} icon={<FileText className="h-5 w-5 text-purple-400" />} />
            </div>
            {invoices.length === 0 ? (
              <EmptyState icon={<Receipt className="h-12 w-12 opacity-20" />} label="لا توجد فواتير" />
            ) : (
              <Card className="border-none shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/30 text-right">
                      <th className="px-4 py-3 font-semibold">رقم الفاتورة</th>
                      <th className="px-4 py-3 font-semibold hidden md:table-cell">الصافي (د.ت)</th>
                      <th className="px-4 py-3 font-semibold hidden sm:table-cell">الرصيد</th>
                      <th className="px-4 py-3 font-semibold">الحالة</th>
                      <th className="px-4 py-3 font-semibold hidden lg:table-cell">تاريخ الاستحقاق</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map(inv => (
                      <tr key={inv.id}
                        className="border-t border-border hover:bg-muted/20 cursor-pointer transition-colors"
                        onClick={() => navigate(`/billing/${inv.id}`)}>
                        <td className="px-4 py-3 font-mono text-primary font-semibold group-hover:underline">
                          {inv.invoiceNumber ?? `#${String(inv.id).padStart(4, "0")}`}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell"><TNDAmount amount={inv.netToPay} /></td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className={Number(inv.balanceDue) > 0 ? "text-warning font-semibold" : "text-muted-foreground"}>
                            <TNDAmount amount={inv.balanceDue} />
                          </span>
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                        <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{fmt(inv.dueDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
          </div>
        )}

        {/* HEURES */}
        {activeTab === "hours" && (() => {
          const totalHours = timeEntries.reduce((s, e) => s + e.hours, 0);
          const billableHours = timeEntries.filter(e => e.billable).reduce((s, e) => s + e.hours, 0);
          const totalAmount = timeEntries.filter(e => e.billable).reduce((s, e) => s + e.hours * e.rate, 0);
          const activeCasesList = cases.filter(c => !c.archivedAt);
          return (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">ساعات العمل</h2>
                <Button size="sm" className="gap-1.5 text-xs"
                  onClick={() => { setTimeForm({ date: new Date().toISOString().slice(0,10), caseId: activeCasesList[0] ? String(activeCasesList[0].id) : "", description: "", hours: "", rate: "150", billable: true }); setTimeModal(true); }}>
                  <Plus className="h-3.5 w-3.5" /> إدخال يدوي
                </Button>
              </div>

              {/* Stopwatch */}
              <Card className="border-none shadow-sm bg-gradient-to-l from-primary/5 to-card">
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row items-center gap-5">
                    <div className="text-center shrink-0">
                      <div className="text-4xl font-mono font-bold tracking-wider text-primary" dir="ltr">{fmtTimer(timerElapsed)}</div>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1"><Timer className="h-3 w-3" /> الكرونومتر</p>
                    </div>
                    <div className="flex-1 space-y-2.5 w-full">
                      {activeCasesList.length > 0 ? (
                        <SelectNative className={inputCls + " px-3 cursor-pointer"}
                          value={timerCaseId} onChange={e => setTimerCaseId(e.target.value)}>
                          <option value="">بدون ملف محدد</option>
                          {activeCasesList.map(c => <option key={c.id} value={String(c.id)}>{c.title}{c.caseNumber ? ` — ${c.caseNumber}` : ""}</option>)}
                        </SelectNative>
                      ) : (
                        <p className="text-xs text-muted-foreground p-2">لا توجد ملفات جارية</p>
                      )}
                      <Input placeholder="وصف النشاط (اختياري)..." className={inputCls}
                        value={timerDesc} onChange={e => setTimerDesc(e.target.value)} />
                    </div>
                    <div className="flex gap-3 shrink-0">
                      <button onClick={() => setTimerRunning(r => !r)}
                        className={`p-3.5 rounded-full transition-all shadow-md ${timerRunning ? "bg-orange-500 hover:bg-orange-600" : "bg-primary hover:bg-primary/90"} text-primary-foreground`}>
                        {timerRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                      </button>
                      {(timerRunning || timerElapsed > 0) && (
                        <button onClick={stopTimer}
                          className="p-3.5 rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground transition-all shadow-md">
                          <Square className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* KPIs */}
              <div className="grid grid-cols-3 gap-4">
                <KpiCard label="إجمالي الساعات" value={`${totalHours.toFixed(1)} س`} icon={<Clock className="h-5 w-5 text-blue-400" />} />
                <KpiCard label="قابلة للفوترة" value={`${billableHours.toFixed(1)} س`} icon={<Timer className="h-5 w-5 text-primary" />} />
                <KpiCard label="المبلغ القابل للفوترة" value={<TNDAmount amount={totalAmount} className="text-xl font-bold" />} icon={<TrendingUp className="h-5 w-5 text-green-400" />} />
              </div>

              {/* Entries */}
              {timeEntries.length === 0 ? (
                <EmptyState icon={<Clock className="h-12 w-12 opacity-20" />} label="لا توجد ساعات مسجلة — ابدأ الكرونومتر أو أدخل يدوياً" />
              ) : (
                <Card className="border-none shadow-sm overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/30 text-right">
                        <th className="px-4 py-3 font-semibold">التاريخ</th>
                        <th className="px-4 py-3 font-semibold hidden sm:table-cell">الملف</th>
                        <th className="px-4 py-3 font-semibold">الوصف</th>
                        <th className="px-4 py-3 font-semibold">الساعات</th>
                        <th className="px-4 py-3 font-semibold hidden md:table-cell">المبلغ (د.ت)</th>
                        <th className="px-4 py-3 font-semibold text-center">فاتورة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {timeEntries.map(e => (
                        <tr key={e.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{fmt(e.date)}</td>
                          <td className="px-4 py-3 hidden sm:table-cell max-w-[160px] truncate text-muted-foreground">{e.caseTitle}</td>
                          <td className="px-4 py-3">{e.description}</td>
                          <td className="px-4 py-3 font-mono font-semibold" dir="ltr">{e.hours.toFixed(2)}</td>
                          <td className="px-4 py-3 hidden md:table-cell">{e.billable ? <TNDAmount amount={e.hours * e.rate} /> : "—"}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${e.billable ? "bg-green-500/10 text-green-400" : "bg-muted text-muted-foreground"}`}>
                              {e.billable ? "نعم" : "لا"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              )}
            </div>
          );
        })()}

        {/* DOCUMENTS */}
        {activeTab === "documents" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">الوثائق المرفقة</h2>
              <Button size="sm" className="gap-1.5 text-xs"
                onClick={() => { setDocForm({ name: "", fileType: "عقد", caseId: "", url: "" }); setDocModal(true); }}>
                <Upload className="h-3.5 w-3.5" /> رفع وثيقة
              </Button>
            </div>
            {docs.length === 0 ? (
              <EmptyState icon={<FileText className="h-12 w-12 opacity-20" />} label="لا توجد وثائق" />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {docs.map(d => {
                  const ext = d.name?.split(".").pop()?.toLowerCase();
                  const DocIcon = ["jpg","jpeg","png","gif","webp"].includes(ext || "")
                    ? <FileImage className="h-8 w-8 text-purple-400 shrink-0" />
                    : ["xls","xlsx","csv"].includes(ext || "")
                    ? <FileSpreadsheet className="h-8 w-8 text-green-400 shrink-0" />
                    : ext === "pdf"
                    ? <FileText className="h-8 w-8 text-red-400 shrink-0" />
                    : <File className="h-8 w-8 text-blue-400 shrink-0" />;
                  return (
                    <Card key={d.id} className="border-none shadow-sm hover:shadow-md transition-all duration-200 rounded-xl group">
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-2 bg-muted/50 rounded-xl group-hover:bg-muted transition-colors shrink-0">
                          {DocIcon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{d.name}</p>
                          {d.fileType && (
                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-md">{d.fileType}</span>
                          )}
                          <p className="text-xs text-muted-foreground mt-0.5">{fmt(d.createdAt)}</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* CORRESPONDANCES */}
        {activeTab === "corresp" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">المراسلات</h2>
              <Button size="sm" className="gap-1.5 text-xs"
                onClick={() => {
                  setCorrForm({ type: "letter", direction: "outgoing", date: new Date().toISOString().slice(0, 10), subject: "", content: "", reference: "", status: "sent", caseId: "" });
                  setCorrModal(true);
                }}>
                <Plus className="h-3.5 w-3.5" /> مراسلة جديدة
              </Button>
            </div>
            {corresp.length === 0 ? (
              <EmptyState icon={<MessageSquare className="h-12 w-12 opacity-20" />} label="لا توجد مراسلات لهذا الموكّل" />
            ) : (
              <div className="space-y-3">
                {corresp.map(c => {
                  const TYPE_MAP: Record<string, { label: string; icon: React.ElementType }> = {
                    letter:  { label: "رسالة رسمية",   icon: FileText },
                    email:   { label: "بريد إلكتروني", icon: Mail },
                    fax:     { label: "فاكس",          icon: Send },
                    notice:  { label: "إشعار / إعلام", icon: Send },
                    other:   { label: "أخرى",          icon: FileText },
                  };
                  const STATUS_MAP: Record<string, { label: string; color: string }> = {
                    draft:        { label: "مسودة",   color: "bg-muted text-muted-foreground" },
                    sent:         { label: "مُرسلة",  color: "bg-blue-500/10 text-blue-400" },
                    received:     { label: "مُستلمة", color: "bg-green-500/10 text-green-400" },
                    acknowledged: { label: "مُؤكدة",  color: "bg-primary/10 text-primary" },
                  };
                  const typeInfo = TYPE_MAP[c.type] ?? TYPE_MAP.other;
                  const statusInfo = STATUS_MAP[c.status] ?? STATUS_MAP.sent;
                  const TypeIcon = typeInfo.icon;
                  const DirIcon = c.direction === "outgoing" ? ArrowUpRight : ArrowDownLeft;
                  const dirColor = c.direction === "outgoing" ? "text-orange-400" : "text-cyan-400";
                  return (
                    <Card key={c.id} className="border-border hover:border-primary/30 transition-colors border-none shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <TypeIcon className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <DirIcon className={`h-3.5 w-3.5 shrink-0 ${dirColor}`} />
                              <span className="font-semibold text-sm truncate">{c.subject}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{typeInfo.label}</span>
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                              {c.caseName && <span>الملف: <span className="text-foreground">{c.caseName}</span></span>}
                              {c.reference && <span>المرجع: <span className="font-mono text-primary">{c.reference}</span></span>}
                              <span>{fmt(c.date)}</span>
                            </div>
                            {c.content && <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{c.content}</p>}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* JOURNAL */}
        {activeTab === "journal" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">السجل الزمني</h2>
              <Button size="sm" className="gap-1.5 text-xs"
                onClick={() => { setNoteText(""); setNoteModal(true); }}>
                <Plus className="h-3.5 w-3.5" /> إضافة ملاحظة
              </Button>
            </div>
            {events.length === 0 ? (
              <EmptyState icon={<Calendar className="h-12 w-12 opacity-20" />} label="لا توجد أحداث مسجلة" />
            ) : (
              <div className="relative pr-5 space-y-1">
                <div className="absolute right-2 top-2 bottom-2 w-px bg-border" />
                {[...events].reverse().map((ev, i) => (
                  <div key={ev.id} className="relative flex gap-4 pb-5">
                    <div className="absolute -right-1 top-1 w-5 h-5 rounded-full bg-background border-2 border-primary/40 flex items-center justify-center shrink-0">
                      {EVENT_ICONS[ev.eventType]}
                    </div>
                    <div className="pr-7 flex-1">
                      <p className="text-sm font-medium">{EVENT_LABELS[ev.eventType] ?? ev.eventType}</p>
                      {ev.payload && Object.keys(ev.payload).length > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {JSON.stringify(ev.payload).replace(/[{}"]/g, "").replace(/,/g, " · ")}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                        <span>{fmt(ev.occurredAt)}</span>
                        {ev.createdBy && <span>— {ev.createdBy}</span>}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Case Modal */}
      <Modal open={caseModal} onClose={() => setCaseModal(false)} title="ملف جديد" size="lg">
        <div className="space-y-4">
          {/* Client banner */}
          <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl text-sm">
            <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="font-semibold">{client?.name}</p>
              <p className="text-xs text-muted-foreground">سيتم ربط الملف بهذا الموكّل تلقائياً</p>
            </div>
          </div>

          <FormField label="عنوان الملف *" htmlFor="c-title">
            <Input id="c-title" placeholder="مثال: قضية ميراث عائلة بن علي" className={inputCls}
              value={caseForm.title} onChange={e => setCaseForm(f => ({ ...f, title: e.target.value }))} autoFocus />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="المحامي المسؤول" htmlFor="c-lawyer">
              <Input id="c-lawyer" placeholder="اسم المحامي" className={inputCls}
                value={caseForm.lawyer} onChange={e => setCaseForm(f => ({ ...f, lawyer: e.target.value }))} />
            </FormField>
            <FormField label="الحالة" htmlFor="c-status">
              <SelectNative id="c-status" className={inputCls + " px-3 cursor-pointer"}
                value={caseForm.status} onChange={e => setCaseForm(f => ({ ...f, status: e.target.value }))}>
                <option value="active">نشطة</option>
                <option value="pending">في الانتظار</option>
                <option value="suspended">موقوفة</option>
                <option value="closed">مغلقة</option>
              </SelectNative>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="المحكمة" htmlFor="c-court">
              <CourtSelect value={caseForm.court} onChange={v => setCaseForm(f => ({ ...f, court: v }))} />
            </FormField>
            <FormField label="الدائرة" htmlFor="c-div">
              <Input id="c-div" placeholder="الدائرة الأولى" className={inputCls}
                value={caseForm.division} onChange={e => setCaseForm(f => ({ ...f, division: e.target.value }))} />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="المرحلة الإجرائية" htmlFor="c-stage">
              <SelectNative id="c-stage" className={inputCls + " px-3 cursor-pointer"}
                value={caseForm.procedureStage} onChange={e => setCaseForm(f => ({ ...f, procedureStage: e.target.value }))}>
                {CASE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </SelectNative>
            </FormField>
            <FormField label="عدد القضية بالمحكمة" htmlFor="c-court-num">
              <Input id="c-court-num" placeholder="12345/2026" className={inputCls} dir="ltr"
                value={caseForm.courtCaseNumber} onChange={e => setCaseForm(f => ({ ...f, courtCaseNumber: e.target.value }))} />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="اسم الخصم" htmlFor="c-opp">
              <Input id="c-opp" placeholder="الاسم الكامل للخصم" className={inputCls}
                value={caseForm.opponentName} onChange={e => setCaseForm(f => ({ ...f, opponentName: e.target.value }))} />
            </FormField>
            <FormField label="محامي الخصم" htmlFor="c-opp-lawyer">
              <Input id="c-opp-lawyer" placeholder="اسم محامي الطرف الآخر" className={inputCls}
                value={caseForm.opponentLawyer} onChange={e => setCaseForm(f => ({ ...f, opponentLawyer: e.target.value }))} />
            </FormField>
          </div>

          <FormField label="موعد الجلسة القادمة" htmlFor="c-hearing">
            <Input id="c-hearing" type="date" className={inputCls} dir="ltr"
              value={caseForm.nextHearing} onChange={e => setCaseForm(f => ({ ...f, nextHearing: e.target.value }))} />
          </FormField>

          <FormField label="وصف القضية" htmlFor="c-desc">
            <SmartTextarea id="c-desc" rows={2} placeholder="وصف مختصر للملف والوقائع..."
              aiContext="وصف قضية قانونية"
              value={caseForm.description} onChange={v => setCaseForm(f => ({ ...f, description: v }))} />
          </FormField>

          <div className="flex gap-3 pt-2">
            <Button className="flex-1" disabled={savingCase || !caseForm.title.trim()}
              onClick={async () => {
                setSavingCase(true);
                const r = await authFetch(`${BASE}/api/cases`, {
                  method: "POST",
                  body: JSON.stringify({
                    ...caseForm,
                    clientId,
                    nextHearing: caseForm.nextHearing || undefined,
                  }),
                });
                const newCase = await r.json();
                setSavingCase(false);
                // Refresh cases list then navigate to the new case
                const cr = await authFetch(`${BASE}/api/clients/${clientId}/cases`);
                if (cr.ok) setCases(await cr.json());
                setCaseModal(false);
                navigate(`/cases/${newCase.id}`);
              }}>
              {savingCase
                ? <><Loader2 className="h-4 w-4 animate-spin" /> جارٍ الحفظ...</>
                : "حفظ الملف"}
            </Button>
            <Button variant="outline" onClick={() => setCaseModal(false)} className="px-6">إلغاء</Button>
          </div>
        </div>
      </Modal>

      {/* Quick Invoice Modal */}
      <Modal open={invoiceModal} onClose={() => setInvoiceModal(false)} title="فاتورة جديدة" size="lg">
        <div className="space-y-4">
          {/* Client banner */}
          <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl text-sm">
            <User className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="font-semibold">{client?.name}</p>
              {client?.taxId && <p className="text-xs text-muted-foreground" dir="ltr">م.ج: {client.taxId}</p>}
            </div>
          </div>

          {/* Case selector */}
          {cases.length > 0 && (
            <FormField label="الملف المرتبط" htmlFor="inv-case">
              <SelectNative id="inv-case" value={invForm.caseId}
                onChange={e => setInvForm(f => ({ ...f, caseId: e.target.value }))}
                className={inputCls + " px-3 cursor-pointer"}>
                <option value="">بدون ملف</option>
                {cases.map(c => (
                  <option key={c.id} value={String(c.id)}>
                    {c.title}{c.caseNumber ? ` — ${c.caseNumber}` : ""}
                  </option>
                ))}
              </SelectNative>
            </FormField>
          )}

          {/* Description */}
          <FormField label="الخدمة / الوصف *" htmlFor="inv-desc">
            <textarea
              id="inv-desc"
              className={inputCls + " min-h-[80px] p-3 resize-none"}
              placeholder="مثال: أتعاب المحاماة في قضية رقم..."
              value={invForm.description}
              onChange={e => setInvForm(f => ({ ...f, description: e.target.value }))}
              autoFocus
            />
          </FormField>

          {/* Amount + VAT */}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="المبلغ قبل الضريبة (د.ت) *" htmlFor="inv-ht">
              <Input id="inv-ht" type="number" min="0" step="0.001" dir="ltr"
                placeholder="0.000"
                value={invForm.unitPriceHt}
                onChange={e => setInvForm(f => ({ ...f, unitPriceHt: e.target.value }))}
                className={inputCls} />
            </FormField>
            <FormField label="نسبة الضريبة (ض.ق.م)" htmlFor="inv-vat">
              <SelectNative id="inv-vat" value={invForm.vatRate}
                onChange={e => setInvForm(f => ({ ...f, vatRate: e.target.value }))}
                className={inputCls + " px-3 cursor-pointer"}>
                <option value="0">0 %</option>
                <option value="7">7 %</option>
                <option value="13">13 %</option>
                <option value="19">19 %</option>
              </SelectNative>
            </FormField>
          </div>

          {/* Live total preview */}
          {!!invForm.unitPriceHt && parseFloat(invForm.unitPriceHt) > 0 && (() => {
            const ht = parseFloat(invForm.unitPriceHt) || 0;
            const vat = parseFloat(invForm.vatRate) || 0;
            const vatAmt = ht * vat / 100;
            const ttc = ht + vatAmt;
            const whRate = client?.withholdingExempt ? 0 : (parseFloat(String(client?.withholdingRate ?? 0)) || 0);
            const whAmt = ht * whRate / 100;
            const net = ttc - whAmt;
            return (
              <div className="p-3 bg-muted/40 rounded-xl text-sm space-y-1.5">
                <div className="flex justify-between text-muted-foreground">
                  <span>المجموع قبل الضريبة</span><TNDAmount amount={ht} />
                </div>
                {vatAmt > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>ض.ق.م {vat}%</span><TNDAmount amount={vatAmt} />
                  </div>
                )}
                {whAmt > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>خصم المورد {whRate}%</span>
                    <span style={{ unicodeBidi: "isolate" } as React.CSSProperties}>−<TNDAmount amount={whAmt} /></span>
                  </div>
                )}
                <div className="flex justify-between font-bold border-t border-border pt-1.5">
                  <span>الصافي للدفع</span><TNDAmount amount={net} />
                </div>
              </div>
            );
          })()}

          {/* Due date */}
          <FormField label="تاريخ الاستحقاق" htmlFor="inv-due">
            <Input id="inv-due" type="date" dir="ltr"
              value={invForm.dueDate}
              onChange={e => setInvForm(f => ({ ...f, dueDate: e.target.value }))}
              className={inputCls} />
          </FormField>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Button className="flex-1"
              disabled={savingInv || !invForm.description.trim() || !invForm.unitPriceHt || parseFloat(invForm.unitPriceHt) <= 0}
              onClick={async () => {
                setSavingInv(true);
                const r = await authFetch(`${BASE}/api/invoices`, {
                  method: "POST",
                  body: JSON.stringify({
                    clientId,
                    caseId: invForm.caseId ? Number(invForm.caseId) : null,
                    dueDate: invForm.dueDate || null,
                    lines: [{
                      description: invForm.description.trim(),
                      unit: "جزافي",
                      quantity: 1,
                      unitPriceHt: parseFloat(invForm.unitPriceHt) || 0,
                      vatRate: parseFloat(invForm.vatRate) || 19,
                      position: 0,
                    }],
                  }),
                });
                const inv = await r.json();
                setSavingInv(false);
                navigate(`/billing/${inv.id}`);
              }}>
              {savingInv
                ? <><Loader2 className="h-4 w-4 animate-spin" /> جارٍ الإنشاء...</>
                : "إنشاء الفاتورة"}
            </Button>
            <Button variant="outline" onClick={() => setInvoiceModal(false)} className="px-6">إلغاء</Button>
          </div>
        </div>
      </Modal>

      {/* Time Entry Modal */}
      <Modal open={timeModal} onClose={() => setTimeModal(false)} title="إدخال وقت يدوي">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="التاريخ *" htmlFor="te-date">
              <Input id="te-date" type="date" className={inputCls} dir="ltr"
                value={timeForm.date} onChange={e => setTimeForm(f => ({ ...f, date: e.target.value }))} />
            </FormField>
            <FormField label="الملف المرتبط" htmlFor="te-case">
              <SelectNative id="te-case" className={inputCls + " px-3 cursor-pointer"}
                value={timeForm.caseId} onChange={e => setTimeForm(f => ({ ...f, caseId: e.target.value }))}>
                <option value="">بدون ملف</option>
                {cases.filter(c => !c.archivedAt).map(c => (
                  <option key={c.id} value={String(c.id)}>{c.title}{c.caseNumber ? ` — ${c.caseNumber}` : ""}</option>
                ))}
              </SelectNative>
            </FormField>
          </div>
          <FormField label="وصف النشاط *" htmlFor="te-desc">
            <Input id="te-desc" placeholder="مثال: دراسة الملف وتحضير الدفاع" className={inputCls} autoFocus
              value={timeForm.description} onChange={e => setTimeForm(f => ({ ...f, description: e.target.value }))} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="عدد الساعات *" htmlFor="te-hours">
              <Input id="te-hours" type="number" step="0.25" min="0.25" placeholder="1.5" className={inputCls} dir="ltr"
                value={timeForm.hours} onChange={e => setTimeForm(f => ({ ...f, hours: e.target.value }))} />
            </FormField>
            <FormField label="المعدل (د.ت/ساعة)" htmlFor="te-rate">
              <Input id="te-rate" type="number" className={inputCls} dir="ltr"
                value={timeForm.rate} onChange={e => setTimeForm(f => ({ ...f, rate: e.target.value }))} />
            </FormField>
          </div>
          <FormField label="" htmlFor="te-billable">
            <label className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg cursor-pointer">
              <input type="checkbox" checked={timeForm.billable}
                onChange={e => setTimeForm(f => ({ ...f, billable: e.target.checked }))}
                className="h-4 w-4 accent-primary" />
              <span className="text-sm">هذا الوقت قابل للفوترة للموكّل</span>
            </label>
          </FormField>
          {timeForm.hours && timeForm.rate && (
            <div className="p-3 bg-primary/10 rounded-lg flex justify-between items-center">
              <span className="text-sm text-primary font-medium">المبلغ الإجمالي:</span>
              <TNDAmount amount={parseFloat(timeForm.hours) * parseFloat(timeForm.rate)} className="font-bold text-primary" />
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <Button className="flex-1"
              disabled={!timeForm.description.trim() || !timeForm.hours}
              onClick={() => {
                const caseTitle = cases.find(c => String(c.id) === timeForm.caseId)?.title ?? "—";
                setTimeEntries(es => [{
                  id: Date.now(),
                  date: timeForm.date,
                  caseTitle,
                  description: timeForm.description.trim(),
                  hours: parseFloat(timeForm.hours),
                  rate: parseFloat(timeForm.rate),
                  billable: timeForm.billable,
                }, ...es]);
                setTimeModal(false);
              }}>
              <Timer className="h-4 w-4" /> حفظ الإدخال
            </Button>
            <Button variant="outline" onClick={() => setTimeModal(false)} className="px-6">إلغاء</Button>
          </div>
        </div>
      </Modal>

      {/* Correspondance Modal */}
      <Modal open={corrModal} onClose={() => setCorrModal(false)} title="مراسلة جديدة">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl text-sm">
            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="font-semibold">{client?.name}</p>
              <p className="text-xs text-muted-foreground">سيتم ربط المراسلة بهذا الموكّل تلقائياً</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="نوع المراسلة" htmlFor="corr-type">
              <SelectNative id="corr-type" className={inputCls + " px-3 cursor-pointer"}
                value={corrForm.type} onChange={e => setCorrForm(f => ({ ...f, type: e.target.value }))}>
                <option value="letter">رسالة رسمية</option>
                <option value="email">بريد إلكتروني</option>
                <option value="fax">فاكس</option>
                <option value="notice">إشعار / إعلام</option>
                <option value="other">أخرى</option>
              </SelectNative>
            </FormField>
            <FormField label="الاتجاه" htmlFor="corr-dir">
              <SelectNative id="corr-dir" className={inputCls + " px-3 cursor-pointer"}
                value={corrForm.direction} onChange={e => setCorrForm(f => ({ ...f, direction: e.target.value }))}>
                <option value="outgoing">صادر (من المكتب)</option>
                <option value="incoming">وارد (من الموكّل)</option>
              </SelectNative>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="التاريخ *" htmlFor="corr-date">
              <Input id="corr-date" type="date" className={inputCls} dir="ltr"
                value={corrForm.date} onChange={e => setCorrForm(f => ({ ...f, date: e.target.value }))} />
            </FormField>
            <FormField label="الحالة" htmlFor="corr-status">
              <SelectNative id="corr-status" className={inputCls + " px-3 cursor-pointer"}
                value={corrForm.status} onChange={e => setCorrForm(f => ({ ...f, status: e.target.value }))}>
                <option value="draft">مسودة</option>
                <option value="sent">مُرسلة</option>
                <option value="received">مُستلمة</option>
                <option value="acknowledged">مُؤكدة</option>
              </SelectNative>
            </FormField>
          </div>

          {cases.filter(c => !c.archivedAt).length > 0 && (
            <FormField label="الملف المرتبط" htmlFor="corr-case">
              <SelectNative id="corr-case" className={inputCls + " px-3 cursor-pointer"}
                value={corrForm.caseId} onChange={e => setCorrForm(f => ({ ...f, caseId: e.target.value }))}>
                <option value="">بدون قضية (اختياري)</option>
                {cases.filter(c => !c.archivedAt).map(c => (
                  <option key={c.id} value={String(c.id)}>
                    {c.title}{c.caseNumber ? ` — ${c.caseNumber}` : ""}
                  </option>
                ))}
              </SelectNative>
            </FormField>
          )}

          <FormField label="الموضوع *" htmlFor="corr-subject">
            <Input id="corr-subject" placeholder="موضوع المراسلة..." className={inputCls}
              value={corrForm.subject} onChange={e => setCorrForm(f => ({ ...f, subject: e.target.value }))} autoFocus />
          </FormField>

          <FormField label="رقم المرجع" htmlFor="corr-ref">
            <Input id="corr-ref" placeholder="مثال: مراسلة رقم 045/2026" className={inputCls} dir="ltr"
              value={corrForm.reference} onChange={e => setCorrForm(f => ({ ...f, reference: e.target.value }))} />
          </FormField>

          <FormField label="الملاحظات / المحتوى" htmlFor="corr-content">
            <SmartTextarea id="corr-content" rows={3}
              placeholder="ملخص أو محتوى المراسلة..."
              aiContext="مراسلة رسمية"
              value={corrForm.content}
              onChange={v => setCorrForm(f => ({ ...f, content: v }))} />
          </FormField>

          <div className="flex gap-3 pt-2">
            <Button className="flex-1"
              disabled={savingCorr || !corrForm.subject.trim() || !corrForm.date}
              onClick={async () => {
                setSavingCorr(true);
                try {
                  const r = await authFetch(`${BASE}/api/correspondances`, {
                    method: "POST",
                    body: JSON.stringify({
                      clientId: String(clientId),
                      caseId: corrForm.caseId || "",
                      type: corrForm.type,
                      direction: corrForm.direction,
                      date: corrForm.date,
                      subject: corrForm.subject.trim(),
                      content: corrForm.content,
                      reference: corrForm.reference,
                      status: corrForm.status,
                    }),
                  });
                  if (r.ok) {
                    const reloaded = await authFetch(`${BASE}/api/correspondances?clientId=${clientId}`);
                    if (reloaded.ok) setCorresp(await reloaded.json());
                    // reset tabLoaded so next visit reloads
                    setCorrModal(false);
                  }
                } finally {
                  setSavingCorr(false);
                }
              }}>
              {savingCorr
                ? <><Loader2 className="h-4 w-4 animate-spin" /> جارٍ الحفظ...</>
                : <><Send className="h-4 w-4" /> حفظ المراسلة</>}
            </Button>
            <Button variant="outline" onClick={() => setCorrModal(false)} className="px-6">إلغاء</Button>
          </div>
        </div>
      </Modal>

      {/* Doc Upload Modal */}
      <Modal open={docModal} onClose={() => setDocModal(false)} title="رفع وثيقة جديدة">
        <div className="space-y-4">
          {/* Drop zone — visual only, no binary upload in current infra */}
          <label
            className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer"
            htmlFor="doc-file-input"
          >
            <Upload className="h-10 w-10 text-muted-foreground/40" />
            <p className="font-medium text-muted-foreground text-sm">اسحب الملف هنا أو انقر للاختيار</p>
            <p className="text-xs text-muted-foreground/60">PDF, Word, Excel, صور — حتى 20MB</p>
            <input
              id="doc-file-input"
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.gif,.webp"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file && !docForm.name) {
                  setDocForm(f => ({ ...f, name: file.name }));
                }
              }}
            />
          </label>

          <FormField label="اسم الوثيقة *" htmlFor="doc-name">
            <Input
              id="doc-name"
              placeholder="مثال: عقد شراكة بتاريخ 2026"
              className={inputCls}
              value={docForm.name}
              onChange={e => setDocForm(f => ({ ...f, name: e.target.value }))}
              autoFocus
            />
          </FormField>

          <FormField label="نوع الوثيقة" htmlFor="doc-ftype">
            <SelectNative id="doc-ftype" className={inputCls + " px-3 cursor-pointer"}
              value={docForm.fileType}
              onChange={e => setDocForm(f => ({ ...f, fileType: e.target.value }))}>
              {["عقد","وثيقة رسمية","مراسلة","حكم قضائي","تقرير خبرة","وكالة","أخرى"].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </SelectNative>
          </FormField>

          <FormField label="الملف المرتبط *" htmlFor="doc-case">
            {cases.filter(c => !c.archivedAt).length === 0 ? (
              <p className="text-xs text-amber-400 p-2">يجب إنشاء ملف أولاً لربط الوثيقة به</p>
            ) : (
              <SelectNative id="doc-case" className={inputCls + " px-3 cursor-pointer"}
                value={docForm.caseId}
                onChange={e => setDocForm(f => ({ ...f, caseId: e.target.value }))}>
                <option value="">— اختر الملف —</option>
                {cases.filter(c => !c.archivedAt).map(c => (
                  <option key={c.id} value={String(c.id)}>
                    {c.title}{c.caseNumber ? ` — ${c.caseNumber}` : ""}
                  </option>
                ))}
              </SelectNative>
            )}
          </FormField>

          <FormField label="رابط خارجي (اختياري)" htmlFor="doc-url">
            <Input
              id="doc-url"
              placeholder="https://drive.google.com/..."
              className={inputCls}
              dir="ltr"
              value={docForm.url}
              onChange={e => setDocForm(f => ({ ...f, url: e.target.value }))}
            />
          </FormField>

          <div className="flex gap-3 pt-2">
            <Button
              className="flex-1"
              disabled={savingDoc || !docForm.name.trim() || !docForm.caseId}
              onClick={async () => {
                setSavingDoc(true);
                try {
                  const r = await authFetch(`${BASE}/api/documents`, {
                    method: "POST",
                    body: JSON.stringify({
                      name: docForm.name.trim(),
                      caseId: Number(docForm.caseId),
                      fileType: docForm.fileType || null,
                      url: docForm.url.trim() || null,
                    }),
                  });
                  if (r.ok) {
                    const dr = await authFetch(`${BASE}/api/clients/${clientId}/documents`);
                    if (dr.ok) setDocs(await dr.json());
                    setDocModal(false);
                  }
                } finally {
                  setSavingDoc(false);
                }
              }}
            >
              {savingDoc
                ? <><Loader2 className="h-4 w-4 animate-spin" /> جارٍ الحفظ...</>
                : <><Upload className="h-4 w-4" /> حفظ الوثيقة</>}
            </Button>
            <Button variant="outline" onClick={() => setDocModal(false)} className="px-6">إلغاء</Button>
          </div>
        </div>
      </Modal>

      {/* Add Note Modal */}
      <Modal open={noteModal} onClose={() => setNoteModal(false)} title="إضافة ملاحظة">
        <div className="space-y-4">
          <textarea
            className={inputCls + " min-h-[120px] p-3 resize-none"}
            placeholder="اكتب ملاحظتك هنا..."
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            autoFocus
          />
          <div className="flex gap-3 pt-1">
            <Button
              className="flex-1"
              disabled={savingNote || !noteText.trim()}
              onClick={async () => {
                setSavingNote(true);
                await authFetch(`${BASE}/api/clients/${clientId}/events`, {
                  method: "POST",
                  body: JSON.stringify({ eventType: "note_added", payload: { note: noteText.trim() }, createdBy: "مستخدم" }),
                });
                const r = await authFetch(`${BASE}/api/clients/${clientId}/events`);
                if (r.ok) setEvents(await r.json());
                setSavingNote(false);
                setNoteModal(false);
              }}
            >
              {savingNote ? "جارٍ الحفظ..." : "حفظ الملاحظة"}
            </Button>
            <Button variant="outline" onClick={() => setNoteModal(false)} className="px-6">إلغاء</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Client Modal */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="تعديل بيانات الموكّل" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="نوع الموكّل" htmlFor="e-cl-type">
              <SelectNative id="e-cl-type" className={inputCls + " px-3 cursor-pointer"}
                value={editForm.clientType ?? "individual"}
                onChange={e => setEditForm(f => ({ ...f, clientType: e.target.value }))}>
                <option value="individual">شخص طبيعي</option>
                <option value="company">شخص معنوي / شركة</option>
              </SelectNative>
            </FormField>
            <FormField label="الاسم الكامل *" htmlFor="e-cl-name">
              <Input id="e-cl-name" value={editForm.name ?? ""} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
            </FormField>
          </div>
          {editForm.clientType === "company" && (
            <div className="grid grid-cols-2 gap-4">
              <FormField label="الشكل القانوني" htmlFor="e-cl-legal">
                <Input id="e-cl-legal" value={editForm.legalForm ?? ""} onChange={e => setEditForm(f => ({ ...f, legalForm: e.target.value }))} className={inputCls} placeholder="SARL, SA, SUARL..." dir="ltr" />
              </FormField>
              <FormField label="السجل التجاري" htmlFor="e-cl-rc">
                <Input id="e-cl-rc" value={editForm.commercialRegister ?? ""} onChange={e => setEditForm(f => ({ ...f, commercialRegister: e.target.value }))} className={inputCls} dir="ltr" />
              </FormField>
            </div>
          )}
          {editForm.clientType !== "company" && (
            <FormField label="بطاقة التعريف (CIN)" htmlFor="e-cl-cin">
              <Input id="e-cl-cin" value={editForm.cin ?? ""} onChange={e => setEditForm(f => ({ ...f, cin: e.target.value }))} className={inputCls} dir="ltr" />
            </FormField>
          )}
          {editForm.clientType === "company" && (
            <FormField label="المعرف الجبائي *" htmlFor="e-cl-tax">
              <Input id="e-cl-tax" value={editForm.taxId ?? ""} onChange={e => setEditForm(f => ({ ...f, taxId: e.target.value }))} className={inputCls} dir="ltr" placeholder="1234567X/A/M/000" />
              <p className="text-xs text-muted-foreground mt-1">مثال : 1234567X/A/M/000</p>
            </FormField>
          )}
          {editForm.clientType === "company" && (
            <FormField label="رقم الحساب البنكي (RIB)" htmlFor="e-cl-rib">
              <Input id="e-cl-rib" value={editForm.rib ?? ""} onChange={e => setEditForm(f => ({ ...f, rib: e.target.value }))} className={inputCls} dir="ltr" placeholder="20 chiffres" />
            </FormField>
          )}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="الهاتف" htmlFor="e-cl-phone">
              <Input id="e-cl-phone" value={editForm.phone ?? ""} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} className={inputCls} dir="ltr" />
            </FormField>
            <FormField label="البريد الإلكتروني" htmlFor="e-cl-email">
              <Input id="e-cl-email" type="email" value={editForm.email ?? ""} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} className={inputCls} dir="ltr" />
            </FormField>
          </div>
          <FormField label="العنوان" htmlFor="e-cl-addr">
            <Input id="e-cl-addr" value={editForm.address ?? ""} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} className={inputCls} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="نسبة الخصم من المورد" htmlFor="e-cl-wh">
              <SelectNative id="e-cl-wh" className={inputCls + " px-3 cursor-pointer"}
                value={editForm.withholdingRate ?? "0"}
                onChange={e => setEditForm(f => ({ ...f, withholdingRate: e.target.value }))}>
                <option value="0">0 % — غير خاضع</option>
                <option value="3">3 %</option>
                <option value="5">5 %</option>
              </SelectNative>
            </FormField>
            <FormField label="إعفاء من الخصم" htmlFor="e-cl-exempt">
              <div className="flex items-center h-10 gap-3">
                <input type="checkbox" id="e-cl-exempt" checked={!!editForm.withholdingExempt}
                  onChange={e => setEditForm(f => ({ ...f, withholdingExempt: e.target.checked }))}
                  className="h-4 w-4 rounded border-border" />
                <label htmlFor="e-cl-exempt" className="text-sm cursor-pointer">معفى من الخصم</label>
              </div>
            </FormField>
          </div>
          <FormField label="ملاحظات" htmlFor="e-cl-notes">
            <SmartTextarea id="e-cl-notes" rows={2} aiContext="ملاحظات موكّل" value={editForm.notes ?? ""} onChange={v => setEditForm(f => ({ ...f, notes: v }))} />
          </FormField>
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={saveEdit} disabled={saving || !editForm.name?.trim()}>
              {saving ? "جارٍ الحفظ..." : "حفظ التعديلات"}
            </Button>
            <Button variant="outline" onClick={() => setEditModal(false)} className="px-6">إلغاء</Button>
          </div>
        </div>
      </Modal>

      {/* Contact Modal */}
      <Modal open={contactModal} onClose={() => setContactModal(false)} title={editingContact ? "تعديل جهة اتصال" : "إضافة جهة اتصال"}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="الاسم *" htmlFor="ct-fn">
              <Input id="ct-fn" value={contactForm.firstName} onChange={e => setContactForm(f => ({ ...f, firstName: e.target.value }))} className={inputCls} />
            </FormField>
            <FormField label="اللقب" htmlFor="ct-ln">
              <Input id="ct-ln" value={contactForm.lastName} onChange={e => setContactForm(f => ({ ...f, lastName: e.target.value }))} className={inputCls} />
            </FormField>
          </div>
          <FormField label="الصفة / الدور" htmlFor="ct-role">
            <Input id="ct-role" value={contactForm.role} onChange={e => setContactForm(f => ({ ...f, role: e.target.value }))} className={inputCls} placeholder="مثال: مدير عام، محاسب..." />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="الهاتف" htmlFor="ct-phone">
              <Input id="ct-phone" value={contactForm.phone} onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))} className={inputCls} dir="ltr" />
            </FormField>
            <FormField label="البريد" htmlFor="ct-email">
              <Input id="ct-email" type="email" value={contactForm.email} onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))} className={inputCls} dir="ltr" />
            </FormField>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="ct-primary" checked={contactForm.isPrimary}
              onChange={e => setContactForm(f => ({ ...f, isPrimary: e.target.checked }))}
              className="h-4 w-4 rounded border-border" />
            <label htmlFor="ct-primary" className="text-sm cursor-pointer flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 text-amber-400" /> جهة الاتصال الرئيسية
            </label>
          </div>
          <div className="flex gap-3 pt-1">
            <Button className="flex-1" onClick={saveContact} disabled={savingContact || !contactForm.firstName.trim()}>
              {savingContact ? "جارٍ الحفظ..." : "حفظ"}
            </Button>
            <Button variant="outline" onClick={() => setContactModal(false)} className="px-5">إلغاء</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <dt className="text-muted-foreground shrink-0 w-36">{label}</dt>
      <dd className="font-medium break-all">{children ?? "—"}</dd>
    </div>
  );
}

function KpiCard({ label, value, icon }: { label: string; value: React.ReactNode; icon: React.ReactNode }) {
  return (
    <Card className="border-none shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className="text-xl font-bold">{value}</p>
          </div>
          <div className="p-2 bg-muted/50 rounded-xl">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="text-center py-16 text-muted-foreground flex flex-col items-center gap-3">
      {icon}
      <p>{label}</p>
    </div>
  );
}

function CasesTab({ cases, label, navigate }: { cases: CaseRow[]; label: string; navigate: (to: string) => void }) {
  if (cases.length === 0) {
    return <EmptyState icon={<Briefcase className="h-12 w-12 opacity-20" />} label={`لا توجد ${label}`} />;
  }
  return (
    <Card className="border-none shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/30 text-right">
            <th className="px-4 py-3 font-semibold">العنوان</th>
            <th className="px-4 py-3 font-semibold hidden sm:table-cell">المحكمة</th>
            <th className="px-4 py-3 font-semibold">الحالة</th>
            <th className="px-4 py-3 font-semibold hidden md:table-cell">التاريخ</th>
            <th className="py-3 w-10"></th>
          </tr>
        </thead>
        <tbody>
          {cases.map(c => (
            <tr key={c.id} className="border-t border-border hover:bg-muted/20 cursor-pointer"
              onClick={() => navigate(`/cases/${c.id}`)}>
              <td className="px-4 py-3">
                <div>
                  <p className="font-medium">{c.title}</p>
                  {c.caseNumber && <p className="text-xs font-mono text-muted-foreground">{c.caseNumber}</p>}
                </div>
              </td>
              <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{c.court || "—"}</td>
              <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
              <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{formatDateTN(c.createdAt)}</td>
              <td className="py-3 px-2">
                <ChevronRight className="h-4 w-4 text-muted-foreground rotate-180" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { authFetch } from "@/lib/authFetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Modal, FormField } from "@/components/Modal";
import { SmartTextarea } from "@/components/SmartTextarea";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  User, Building2, Phone, Mail, MapPin, Plus, Pencil, Trash2,
  Briefcase, FileText, Clock, MessageSquare, BookOpen,
  ChevronRight, MoreHorizontal, Star, CreditCard, Receipt,
  CheckCircle2, AlertCircle, Calendar, Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
interface InvoiceRow { id: number; description: string; amount: string; status: string; dueDate: string | null; createdAt: string; }
interface DocRow { id: number; name: string; type: string | null; createdAt: string; }

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
  { id: "cases",       label: "الدوسيهات الجارية", icon: <Briefcase className="h-4 w-4" /> },
  { id: "archived",    label: "الدوسيهات المؤرشفة", icon: <BookOpen className="h-4 w-4" /> },
  { id: "billing",     label: "الجدول المالي",     icon: <CreditCard className="h-4 w-4" /> },
  { id: "hours",       label: "الساعات",           icon: <Clock className="h-4 w-4" /> },
  { id: "documents",   label: "الوثائق",           icon: <FileText className="h-4 w-4" /> },
  { id: "corresp",     label: "المراسلات",         icon: <MessageSquare className="h-4 w-4" /> },
  { id: "journal",     label: "السجل",             icon: <Calendar className="h-4 w-4" /> },
];

const EMPTY_CONTACT = { firstName: "", lastName: "", role: "", phone: "", email: "", isPrimary: false };

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ar-TN");
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

  // Lazy-loaded tab data
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [events, setEvents] = useState<ClientEvent[]>([]);
  const [tabLoaded, setTabLoaded] = useState<Set<string>>(new Set());

  // Contact modal
  const [contactModal, setContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [contactForm, setContactForm] = useState(EMPTY_CONTACT);
  const [savingContact, setSavingContact] = useState(false);

  const loadClient = useCallback(async () => {
    const r = await authFetch(`${BASE}/api/clients/${clientId}`);
    if (r.ok) setClient(await r.json());
    else navigate("/clients");
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
    } else if (tab === "journal") {
      const r = await authFetch(`${BASE}/api/clients/${clientId}/events`);
      if (r.ok) setEvents(await r.json());
    }
  }

  function switchTab(tab: string) {
    setActiveTab(tab);
    loadTab(tab);
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
    if (r.ok) { setClient(await r.json()); setEditModal(false); }
    setSaving(false);
  }

  async function deleteClient() {
    if (!confirm("حذف هذا الحريف نهائيًا؟")) return;
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
  const totalInvoiced = invoices.reduce((s, i) => s + Number(i.amount ?? 0), 0);
  const totalPaid = invoices.filter(i => i.status === "paid").reduce((s, i) => s + Number(i.amount ?? 0), 0);
  const balance = totalInvoiced - totalPaid;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-36 rounded-2xl" />
        <Skeleton className="h-10 rounded-xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!client) return null;

  const isCompany = client.clientType === "company";

  return (
    <div className="space-y-6 pb-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <button onClick={() => navigate("/clients")} className="hover:text-foreground transition-colors">
          الحرفاء
        </button>
        <ChevronRight className="h-3.5 w-3.5 rotate-180" />
        <span className="text-foreground font-medium truncate">{client.name}</span>
      </nav>

      {/* Header */}
      <div className="rounded-2xl bg-card border border-border p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 justify-between">
          <div className="flex items-center gap-4">
            <div className={cn(
              "h-16 w-16 rounded-2xl flex items-center justify-center font-bold text-2xl shrink-0",
              isCompany ? "bg-blue-500/10 text-blue-400" : "bg-primary/10 text-primary"
            )}>
              {isCompany ? <Building2 className="h-8 w-8" /> : client.name.charAt(0)}
            </div>
            <div>
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
                {client.legalForm && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                    {client.legalForm}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground">
                {client.officeSeq && (
                  <span className="flex items-center gap-1">
                    <Hash className="h-3.5 w-3.5" />{client.officeSeq}
                  </span>
                )}
                {client.phone && (
                  <span className="flex items-center gap-1.5" dir="ltr"><Phone className="h-3.5 w-3.5" />{client.phone}</span>
                )}
                {client.email && (
                  <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{client.email}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs"
              onClick={() => navigate(`/cases?clientId=${clientId}`)}>
              <Plus className="h-3.5 w-3.5" /> دوسيه جديد
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs"
              onClick={() => navigate(`/billing?clientId=${clientId}`)}>
              <Receipt className="h-3.5 w-3.5" /> فاتورة جديدة
            </Button>
            <Button size="sm" onClick={openEdit} className="gap-1.5 text-xs">
              <Pencil className="h-3.5 w-3.5" /> تعديل
            </Button>
            <button
              onClick={deleteClient}
              className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
              title="حذف الحريف"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </button>
          </div>
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
                  <span className="text-[10px] bg-primary/20 text-primary rounded-full px-1.5 py-0.5 font-bold leading-none">
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
                  <Button size="sm" variant="outline" onClick={openNewContact} className="gap-1 text-xs h-7 px-2">
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
        )}

        {/* DOSSIERS EN COURS */}
        {activeTab === "cases" && (
          <CasesTab cases={activeCases} label="الدوسيهات الجارية" navigate={navigate} />
        )}

        {/* DOSSIERS ARCHIVÉS */}
        {activeTab === "archived" && (
          <CasesTab cases={archivedCases} label="الدوسيهات المؤرشفة" navigate={navigate} />
        )}

        {/* ÉCHÉANCIER FINANCIER */}
        {activeTab === "billing" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard label="الرقم الإجمالي" value={`${totalInvoiced.toFixed(3)} د.ت`} icon={<Receipt className="h-5 w-5 text-blue-400" />} />
              <KpiCard label="المحصّل" value={`${totalPaid.toFixed(3)} د.ت`} icon={<CheckCircle2 className="h-5 w-5 text-emerald-400" />} />
              <KpiCard label="الرصيد المتبقي" value={`${balance.toFixed(3)} د.ت`} icon={<AlertCircle className="h-5 w-5 text-amber-400" />} />
              <KpiCard label="عدد الفواتير" value={String(invoices.length)} icon={<FileText className="h-5 w-5 text-purple-400" />} />
            </div>
            {invoices.length === 0 ? (
              <EmptyState icon={<Receipt className="h-12 w-12 opacity-20" />} label="لا توجد فواتير" />
            ) : (
              <Card className="border-none shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/30 text-right">
                      <th className="px-4 py-3 font-semibold">الوصف</th>
                      <th className="px-4 py-3 font-semibold hidden md:table-cell">المبلغ (د.ت)</th>
                      <th className="px-4 py-3 font-semibold">الحالة</th>
                      <th className="px-4 py-3 font-semibold hidden sm:table-cell">تاريخ الاستحقاق</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map(inv => (
                      <tr key={inv.id} className="border-t border-border hover:bg-muted/20">
                        <td className="px-4 py-3">{inv.description || "—"}</td>
                        <td className="px-4 py-3 hidden md:table-cell font-mono">{Number(inv.amount).toFixed(3)}</td>
                        <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                        <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{fmt(inv.dueDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )}
          </div>
        )}

        {/* HEURES */}
        {activeTab === "hours" && (
          <EmptyState icon={<Clock className="h-12 w-12 opacity-20" />} label="تتبع الساعات قريبًا" />
        )}

        {/* DOCUMENTS */}
        {activeTab === "documents" && (
          <div className="space-y-4">
            {docs.length === 0 ? (
              <EmptyState icon={<FileText className="h-12 w-12 opacity-20" />} label="لا توجد وثائق" />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {docs.map(d => (
                  <Card key={d.id} className="border-none shadow-sm">
                    <CardContent className="p-4 flex items-center gap-3">
                      <FileText className="h-8 w-8 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{d.name}</p>
                        <p className="text-xs text-muted-foreground">{fmt(d.createdAt)}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CORRESPONDANCES */}
        {activeTab === "corresp" && (
          <EmptyState icon={<MessageSquare className="h-12 w-12 opacity-20" />} label="المراسلات المرتبطة بهذا الحريف ستظهر هنا" />
        )}

        {/* JOURNAL */}
        {activeTab === "journal" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">السجل الزمني</h2>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs"
                onClick={async () => {
                  const note = prompt("محتوى الملاحظة:");
                  if (!note) return;
                  await authFetch(`${BASE}/api/clients/${clientId}/events`, {
                    method: "POST",
                    body: JSON.stringify({ eventType: "note_added", payload: { note }, createdBy: "مستخدم" }),
                  });
                  const r = await authFetch(`${BASE}/api/clients/${clientId}/events`);
                  if (r.ok) setEvents(await r.json());
                }}>
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

      {/* Edit Client Modal */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="تعديل بيانات الحريف" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="نوع الحريف" htmlFor="e-cl-type">
              <select id="e-cl-type" className={inputCls + " px-3 cursor-pointer"}
                value={editForm.clientType ?? "individual"}
                onChange={e => setEditForm(f => ({ ...f, clientType: e.target.value }))}>
                <option value="individual">شخص طبيعي</option>
                <option value="company">شخص معنوي / شركة</option>
              </select>
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
          <div className="grid grid-cols-2 gap-4">
            {editForm.clientType !== "company" && (
              <FormField label="بطاقة التعريف (CIN)" htmlFor="e-cl-cin">
                <Input id="e-cl-cin" value={editForm.cin ?? ""} onChange={e => setEditForm(f => ({ ...f, cin: e.target.value }))} className={inputCls} dir="ltr" />
              </FormField>
            )}
            <FormField label="المعرف الجبائي" htmlFor="e-cl-tax">
              <Input id="e-cl-tax" value={editForm.taxId ?? ""} onChange={e => setEditForm(f => ({ ...f, taxId: e.target.value }))} className={inputCls} dir="ltr" placeholder="1234567A/P/M/000" />
            </FormField>
          </div>
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
              <select id="e-cl-wh" className={inputCls + " px-3 cursor-pointer"}
                value={editForm.withholdingRate ?? "0"}
                onChange={e => setEditForm(f => ({ ...f, withholdingRate: e.target.value }))}>
                <option value="0">0 % — غير خاضع</option>
                <option value="3">3 %</option>
                <option value="5">5 %</option>
              </select>
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
            <SmartTextarea id="e-cl-notes" rows={2} aiContext="ملاحظات حريف" value={editForm.notes ?? ""} onChange={v => setEditForm(f => ({ ...f, notes: v }))} />
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

function KpiCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <Card className="border-none shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className="text-xl font-bold" dir="ltr">{value}</p>
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
              <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{new Date(c.createdAt).toLocaleDateString("ar-TN")}</td>
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

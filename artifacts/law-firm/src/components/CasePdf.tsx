import {
  Document, Page, Text, View, StyleSheet, Font,
} from "@react-pdf/renderer";
import { formatCurrency } from "@/lib/currency";
import { formatDateTN } from "@/lib/date";
import cairoRegular from "@fontsource/cairo/files/cairo-arabic-400-normal.woff2?url";
import cairoBold from "@fontsource/cairo/files/cairo-arabic-700-normal.woff2?url";

Font.register({
  family: "Cairo",
  fonts: [
    { src: cairoRegular, fontWeight: 400 },
    { src: cairoBold, fontWeight: 700 },
  ],
});

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PdfCaseData {
  id: number;
  caseNumber: string | null;
  courtCaseNumber: string | null;
  clientFileRef: string | null;
  title: string;
  status: string;
  court: string | null;
  division: string | null;
  lawyer: string | null;
  nextHearing: string | null;
  opponentName: string | null;
  opponentLawyer: string | null;
  judgmentText: string | null;
  description: string | null;
  procedureStage: string | null;
  createdAt: string;
  clientName: string | null;
  clientType: string | null;
  clientTaxId: string | null;
  clientPhone: string | null;
  clientAddress: string | null;
}

interface Procedure {
  id: number; stage: string; status: string;
  notes: string | null; startedAt: string | null; endedAt: string | null;
}

interface Deadline {
  id: number; title: string; type: string; dueDate: string;
  urgency: string; notes: string | null; completedAt: string | null;
}

interface CaseEvent {
  id: number; title: string; date: string; time: string | null;
  court: string | null; division: string | null; type: string;
  objective: string | null; result: string | null; legalStatus: string | null;
  postponedTo: string | null; notes: string | null;
}

interface Invoice {
  id: number; invoiceNumber: string | null; issueDate: string | null;
  status: string; totalTtc: string; amountPaid: string; balanceDue: string;
}

interface DocFile {
  id: number; name: string; fileType: string | null; createdAt: string;
}

interface Cabinet {
  cabinetName: string | null; cabinetAddress: string | null;
  cabinetPhone: string | null; cabinetEmail: string | null;
  cabinetTaxId: string | null;
}

export interface CasePdfProps {
  case: PdfCaseData;
  procedures: Procedure[];
  deadlines: Deadline[];
  events: CaseEvent[];
  invoices: Invoice[];
  documents: DocFile[];
  cabinet: Cabinet | null;
  lang: "ar" | "fr";
  generatedAt: string;
}

// ── Labels ────────────────────────────────────────────────────────────────────

const LABELS = {
  ar: {
    docTitle: "بطاقة القضية",
    caseFile: "ملف القضية",
    client: "الحريف",
    clientType: "صنف الحريف",
    taxId: "المعرف الجبائي",
    phone: "الهاتف",
    address: "العنوان",
    opponent: "الخصم",
    opponentLawyer: "محامي الخصم",
    court: "المحكمة",
    division: "الدائرة",
    courtRef: "رقم الرول",
    nextHearing: "الجلسة القادمة",
    stage: "مرحلة الإجراء",
    openedOn: "تاريخ الفتح",
    lawyer: "المحامي المعالج",
    description: "الوصف",
    procedure: "الإجراء",
    status: "الحالة",
    from: "من",
    to: "إلى",
    notes: "ملاحظات",
    sessions: "الجلسات",
    date: "التاريخ",
    type: "النوع",
    objective: "الهدف",
    result: "النتيجة",
    postponed: "مرجأ إلى",
    financials: "الجانب المالي",
    invoice: "فاتورة",
    invoiceNum: "رقم الفاتورة",
    issueDate: "تاريخ الإصدار",
    total: "المجموع ش.ض",
    paid: "المدفوع",
    balance: "الرصيد",
    invoiceStatus: "الحالة",
    deadlines: "الآجال",
    deadline: "الأجل",
    dueDate: "تاريخ الاستحقاق",
    urgency: "الأولوية",
    documents: "الوثائق",
    docName: "الاسم",
    docType: "النوع",
    addedOn: "تاريخ الإضافة",
    noData: "لا توجد بيانات",
    confidential: "سري – وثيقة داخلية",
    page: "صفحة",
    of: "من",
    editedOn: "تاريخ الطباعة",
    statusMap: { active: "جارية", archived: "مختومة", pending: "قيد الانتظار", closed: "مغلقة" } as Record<string, string>,
    urgencyMap: { critical: "حرجة", high: "عالية", normal: "عادية" } as Record<string, string>,
  },
  fr: {
    docTitle: "Fiche Dossier",
    caseFile: "Dossier",
    client: "Client",
    clientType: "Type",
    taxId: "Matricule fiscal",
    phone: "Téléphone",
    address: "Adresse",
    opponent: "Partie adverse",
    opponentLawyer: "Avocat adverse",
    court: "Tribunal",
    division: "Chambre",
    courtRef: "N° de rôle",
    nextHearing: "Prochaine audience",
    stage: "Stade procédural",
    openedOn: "Ouvert le",
    lawyer: "Avocat chargé",
    description: "Description",
    procedure: "Procédure",
    status: "Statut",
    from: "Du",
    to: "Au",
    notes: "Notes",
    sessions: "Audiences",
    date: "Date",
    type: "Type",
    objective: "Objet",
    result: "Résultat",
    postponed: "Renvoyé au",
    financials: "Volet financier",
    invoice: "Facture",
    invoiceNum: "N° Facture",
    issueDate: "Date émission",
    total: "Total TTC",
    paid: "Versé",
    balance: "Solde",
    invoiceStatus: "Statut",
    deadlines: "Échéances",
    deadline: "Échéance",
    dueDate: "Date limite",
    urgency: "Priorité",
    documents: "Documents",
    docName: "Nom",
    docType: "Type",
    addedOn: "Ajouté le",
    noData: "Aucune donnée",
    confidential: "Confidentiel – Document interne",
    page: "Page",
    of: "/",
    editedOn: "Édité le",
    statusMap: { active: "En cours", archived: "Clôturé", pending: "En attente", closed: "Fermé" } as Record<string, string>,
    urgencyMap: { critical: "Critique", high: "Élevée", normal: "Normale" } as Record<string, string>,
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const NAVY = "#1e3a5f";
const GOLD = "#b8963e";
const LIGHT = "#f4f6f9";
const BORDER = "#d0d8e4";

const fmt = (n: string | number | null | undefined) =>
  formatCurrency(typeof n === "string" ? parseFloat(n) : (n ?? 0), "fr");

const fmtDate = (d: string | null | undefined) => formatDateTN(d ?? null);

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: { fontFamily: "Cairo", fontSize: 9, padding: 40, paddingBottom: 60, color: "#222" },

  // Page header
  pageHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: NAVY },
  pageHeaderLeft: { flex: 1 },
  pageHeaderRight: { alignItems: "flex-end" },
  cabinetName: { fontSize: 12, fontWeight: 700, color: NAVY },
  cabinetSub: { fontSize: 7.5, color: "#666", marginTop: 1 },
  caseLabel: { fontSize: 7, color: "#888", textTransform: "uppercase" },
  caseNum: { fontSize: 14, fontWeight: 700, color: NAVY, marginTop: 2 },
  statusBadge: { fontSize: 7.5, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginTop: 4, alignSelf: "flex-end" },

  // Cover title
  docTitle: { fontSize: 20, fontWeight: 700, color: NAVY, textAlign: "center", marginBottom: 4 },
  docSubtitle: { fontSize: 11, color: GOLD, textAlign: "center", marginBottom: 20 },

  // Sections
  sectionHeader: { backgroundColor: NAVY, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 0, marginTop: 12 },
  sectionTitle: { color: "#fff", fontSize: 8.5, fontWeight: 700, textTransform: "uppercase" },
  sectionBody: { borderWidth: 1, borderTopWidth: 0, borderColor: BORDER, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 4 },

  // Field rows
  fieldRow: { flexDirection: "row", marginBottom: 4 },
  fieldLabel: { width: "32%", color: "#666", fontSize: 8 },
  fieldValue: { flex: 1, fontWeight: 700, fontSize: 8.5 },
  fieldGrid: { flexDirection: "row", gap: 16 },
  fieldCol: { flex: 1 },

  // Table
  table: { marginTop: 0 },
  tableHead: { flexDirection: "row", backgroundColor: LIGHT, borderWidth: 1, borderColor: BORDER, paddingVertical: 5, paddingHorizontal: 6 },
  tableRow: { flexDirection: "row", borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: BORDER, paddingVertical: 4, paddingHorizontal: 6 },
  tableRowAlt: { backgroundColor: "#fafbfd" },
  th: { fontSize: 7.5, fontWeight: 700, color: NAVY },
  td: { fontSize: 8, color: "#333" },
  tdMono: { fontSize: 8, fontFamily: "Courier", color: "#333" },
  emptyRow: { paddingVertical: 10, alignItems: "center" },
  emptyText: { fontSize: 8, color: "#aaa" },

  // Financial summary
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: BORDER },
  totalLabel: { fontSize: 8, color: "#555" },
  totalValue: { fontSize: 8, fontFamily: "Courier" },
  grandRow: { flexDirection: "row", justifyContent: "space-between", backgroundColor: NAVY, paddingVertical: 5, paddingHorizontal: 10, marginTop: 4, borderRadius: 3 },
  grandLabel: { color: "#fff", fontWeight: 700, fontSize: 9 },
  grandValue: { color: GOLD, fontFamily: "Courier-Bold", fontSize: 9 },

  // Page footer
  footer: { position: "absolute", bottom: 20, left: 40, right: 40, borderTopWidth: 0.5, borderTopColor: "#ccc", paddingTop: 5, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  footerLeft: { flex: 1 },
  footerCenter: { flex: 1, alignItems: "center" },
  footerRight: { flex: 1, alignItems: "flex-end" },
  footerText: { fontSize: 6.5, color: "#888" },
  footerConfidential: { fontSize: 6.5, color: "#b04040", fontWeight: 700 },
});

// ── Shared page header ────────────────────────────────────────────────────────

function PdfPageHeader({ data, L, cabinet }: { data: PdfCaseData; L: typeof LABELS["ar"]; cabinet: Cabinet | null }) {
  const statusLabel = L.statusMap[data.status] ?? data.status;
  const statusColor = data.status === "active" ? "#1a7a1a" : data.status === "archived" ? "#888" : "#b04040";
  return (
    <View style={s.pageHeader} fixed>
      <View style={s.pageHeaderLeft}>
        <Text style={s.cabinetName}>{cabinet?.cabinetName ?? "Cabinet d'Avocats"}</Text>
        {cabinet?.cabinetAddress && <Text style={s.cabinetSub}>{cabinet.cabinetAddress}</Text>}
        {cabinet?.cabinetPhone && <Text style={s.cabinetSub}>{cabinet.cabinetPhone}</Text>}
      </View>
      <View style={s.pageHeaderRight}>
        <Text style={s.caseLabel}>{L.caseFile}</Text>
        <Text style={s.caseNum}>{data.caseNumber ?? `#${String(data.id).padStart(4, "0")}`}</Text>
        <Text style={[s.statusBadge, { color: statusColor, borderWidth: 0.5, borderColor: statusColor }]}>
          {statusLabel}
        </Text>
      </View>
    </View>
  );
}

// ── Shared page footer ────────────────────────────────────────────────────────

function PdfPageFooter({ L, cabinet, generatedAt }: { L: typeof LABELS["ar"]; cabinet: Cabinet | null; generatedAt: string }) {
  return (
    <View style={s.footer} fixed>
      <View style={s.footerLeft}>
        <Text style={s.footerText}>{cabinet?.cabinetName ?? ""}</Text>
        {cabinet?.cabinetAddress && <Text style={s.footerText}>{cabinet.cabinetAddress}</Text>}
        {cabinet?.cabinetPhone && <Text style={s.footerText}>{cabinet.cabinetPhone}</Text>}
      </View>
      <View style={s.footerCenter}>
        <Text style={s.footerConfidential}>{L.confidential}</Text>
      </View>
      <View style={s.footerRight}>
        <Text style={s.footerText}>{L.editedOn} {generatedAt}</Text>
        <Text style={s.footerText} render={({ pageNumber, totalPages }) => `${L.page} ${pageNumber} ${L.of} ${totalPages}`} />
      </View>
    </View>
  );
}

// ── Field row helper ──────────────────────────────────────────────────────────

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <View style={s.fieldRow}>
      <Text style={s.fieldLabel}>{label}</Text>
      <Text style={s.fieldValue}>{value || "—"}</Text>
    </View>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function Section({ title }: { title: string }) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionTitle}>{title}</Text>
    </View>
  );
}

// ── PDF Document ──────────────────────────────────────────────────────────────

export function CaseDocument({ case: c, procedures, deadlines, events, invoices, documents, cabinet, lang, generatedAt }: CasePdfProps) {
  const L = LABELS[lang];
  const cabName = cabinet?.cabinetName ?? "Cabinet d'Avocats";

  const totalInvoiced = invoices.reduce((s, i) => s + parseFloat(i.totalTtc), 0);
  const totalPaid = invoices.reduce((s, i) => s + parseFloat(i.amountPaid), 0);
  const totalBalance = invoices.reduce((s, i) => s + parseFloat(i.balanceDue), 0);

  return (
    <Document title={`${L.docTitle} — ${c.caseNumber ?? c.title}`} author={cabName} creator="محامي بلوس">

      {/* ═══════════════════════════ PAGE 1 — CASE HEADER ═══════════════════════ */}
      <Page size="A4" style={s.page}>
        <PdfPageHeader data={c} L={L} cabinet={cabinet} />

        <Text style={s.docTitle}>{L.docTitle}</Text>
        <Text style={s.docSubtitle}>{c.title}</Text>

        {/* Client */}
        <Section title={L.client} />
        <View style={s.sectionBody}>
          <View style={s.fieldGrid}>
            <View style={s.fieldCol}>
              <Field label={L.client} value={c.clientName} />
              {c.clientTaxId && <Field label={L.taxId} value={c.clientTaxId} />}
              {c.clientPhone && <Field label={L.phone} value={c.clientPhone} />}
            </View>
            <View style={s.fieldCol}>
              {c.clientAddress && <Field label={L.address} value={c.clientAddress} />}
              {c.clientFileRef && <Field label={L.caseFile} value={c.clientFileRef} />}
            </View>
          </View>
        </View>

        {/* Opponent */}
        {(c.opponentName || c.opponentLawyer) && (
          <>
            <Section title={L.opponent} />
            <View style={s.sectionBody}>
              <Field label={L.opponent} value={c.opponentName} />
              {c.opponentLawyer && <Field label={L.opponentLawyer} value={c.opponentLawyer} />}
            </View>
          </>
        )}

        {/* Court / Jurisdiction */}
        <Section title={`${L.court} / ${L.courtRef}`} />
        <View style={s.sectionBody}>
          <View style={s.fieldGrid}>
            <View style={s.fieldCol}>
              <Field label={L.court} value={c.court} />
              <Field label={L.division} value={c.division} />
              <Field label={L.courtRef} value={c.courtCaseNumber} />
            </View>
            <View style={s.fieldCol}>
              <Field label={L.lawyer} value={c.lawyer} />
              <Field label={L.nextHearing} value={fmtDate(c.nextHearing)} />
              <Field label={L.stage} value={c.procedureStage} />
            </View>
          </View>
        </View>

        {/* Procedure timeline */}
        {procedures.length > 0 && (
          <>
            <Section title={L.procedure} />
            <View style={s.table}>
              <View style={s.tableHead}>
                <Text style={[s.th, { flex: 2 }]}>{L.stage}</Text>
                <Text style={[s.th, { flex: 2 }]}>{L.status}</Text>
                <Text style={[s.th, { flex: 1.5 }]}>{L.from}</Text>
                <Text style={[s.th, { flex: 1.5 }]}>{L.to}</Text>
                <Text style={[s.th, { flex: 3 }]}>{L.notes}</Text>
              </View>
              {procedures.map((p, i) => (
                <View key={p.id} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
                  <Text style={[s.td, { flex: 2, fontWeight: 700 }]}>{p.stage}</Text>
                  <Text style={[s.td, { flex: 2 }]}>{p.status}</Text>
                  <Text style={[s.tdMono, { flex: 1.5 }]}>{fmtDate(p.startedAt)}</Text>
                  <Text style={[s.tdMono, { flex: 1.5 }]}>{fmtDate(p.endedAt)}</Text>
                  <Text style={[s.td, { flex: 3, color: "#666" }]}>{p.notes ?? ""}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Description */}
        {c.description && (
          <>
            <Section title={L.description} />
            <View style={s.sectionBody}>
              <Text style={{ fontSize: 8.5, color: "#444", lineHeight: 1.5 }}>{c.description}</Text>
            </View>
          </>
        )}

        <PdfPageFooter L={L} cabinet={cabinet} generatedAt={generatedAt} />
      </Page>

      {/* ═══════════════════════════ PAGE 2 — SESSIONS ════════════════════════ */}
      <Page size="A4" style={s.page}>
        <PdfPageHeader data={c} L={L} cabinet={cabinet} />

        <Section title={L.sessions} />
        <View style={s.table}>
          <View style={s.tableHead}>
            <Text style={[s.th, { flex: 1.5 }]}>{L.date}</Text>
            <Text style={[s.th, { flex: 2 }]}>{L.court}</Text>
            <Text style={[s.th, { flex: 1.5 }]}>{L.type}</Text>
            <Text style={[s.th, { flex: 3 }]}>{L.objective}</Text>
            <Text style={[s.th, { flex: 3 }]}>{L.result}</Text>
            <Text style={[s.th, { flex: 1.5 }]}>{L.postponed}</Text>
          </View>
          {events.length === 0 ? (
            <View style={[s.tableRow, s.emptyRow]}>
              <Text style={s.emptyText}>{L.noData}</Text>
            </View>
          ) : events.map((ev, i) => (
            <View key={ev.id} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
              <Text style={[s.tdMono, { flex: 1.5 }]}>{fmtDate(ev.date)}</Text>
              <Text style={[s.td, { flex: 2 }]}>{ev.court ?? ev.title}</Text>
              <Text style={[s.td, { flex: 1.5 }]}>{ev.type}</Text>
              <Text style={[s.td, { flex: 3, color: "#444" }]}>{ev.objective ?? ""}</Text>
              <Text style={[s.td, { flex: 3, color: "#444" }]}>{ev.result ?? ""}</Text>
              <Text style={[s.tdMono, { flex: 1.5 }]}>{fmtDate(ev.postponedTo)}</Text>
            </View>
          ))}
        </View>

        {/* Deadlines */}
        {deadlines.length > 0 && (
          <>
            <Section title={L.deadlines} />
            <View style={s.table}>
              <View style={s.tableHead}>
                <Text style={[s.th, { flex: 3 }]}>{L.deadline}</Text>
                <Text style={[s.th, { flex: 1.5 }]}>{L.dueDate}</Text>
                <Text style={[s.th, { flex: 1.5 }]}>{L.urgency}</Text>
                <Text style={[s.th, { flex: 1 }]}>{L.status}</Text>
                <Text style={[s.th, { flex: 3 }]}>{L.notes}</Text>
              </View>
              {deadlines.map((d, i) => (
                <View key={d.id} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
                  <Text style={[s.td, { flex: 3 }]}>{d.title}</Text>
                  <Text style={[s.tdMono, { flex: 1.5 }]}>{fmtDate(d.dueDate)}</Text>
                  <Text style={[s.td, { flex: 1.5, color: d.urgency === "critical" ? "#c00" : d.urgency === "high" ? "#c45000" : "#555" }]}>
                    {L.urgencyMap[d.urgency] ?? d.urgency}
                  </Text>
                  <Text style={[s.td, { flex: 1, color: d.completedAt ? "#1a7a1a" : "#888" }]}>
                    {d.completedAt ? "✓" : "○"}
                  </Text>
                  <Text style={[s.td, { flex: 3, color: "#666" }]}>{d.notes ?? ""}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <PdfPageFooter L={L} cabinet={cabinet} generatedAt={generatedAt} />
      </Page>

      {/* ═══════════════════════════ PAGE 3 — FINANCIALS ═══════════════════════ */}
      <Page size="A4" style={s.page}>
        <PdfPageHeader data={c} L={L} cabinet={cabinet} />

        <Section title={L.financials} />

        <View style={s.table}>
          <View style={s.tableHead}>
            <Text style={[s.th, { flex: 2 }]}>{L.invoiceNum}</Text>
            <Text style={[s.th, { flex: 1.5 }]}>{L.issueDate}</Text>
            <Text style={[s.th, { flex: 1 }]}>{L.invoiceStatus}</Text>
            <Text style={[s.th, { flex: 1.5, textAlign: "right" }]}>{L.total}</Text>
            <Text style={[s.th, { flex: 1.5, textAlign: "right" }]}>{L.paid}</Text>
            <Text style={[s.th, { flex: 1.5, textAlign: "right" }]}>{L.balance}</Text>
          </View>
          {invoices.length === 0 ? (
            <View style={[s.tableRow, s.emptyRow]}>
              <Text style={s.emptyText}>{L.noData}</Text>
            </View>
          ) : invoices.map((inv, i) => (
            <View key={inv.id} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
              <Text style={[s.td, { flex: 2, fontWeight: 700 }]}>
                {inv.invoiceNumber ?? `#${String(inv.id).padStart(4, "0")}`}
              </Text>
              <Text style={[s.tdMono, { flex: 1.5 }]}>{fmtDate(inv.issueDate)}</Text>
              <Text style={[s.td, { flex: 1, color: inv.status === "paid" ? "#1a7a1a" : "#c45000" }]}>
                {L.statusMap[inv.status] ?? inv.status}
              </Text>
              <Text style={[s.tdMono, { flex: 1.5, textAlign: "right" }]}>{fmt(inv.totalTtc)}</Text>
              <Text style={[s.tdMono, { flex: 1.5, textAlign: "right", color: "#1a7a1a" }]}>{fmt(inv.amountPaid)}</Text>
              <Text style={[s.tdMono, { flex: 1.5, textAlign: "right", color: parseFloat(inv.balanceDue) > 0 ? "#c45000" : "#555" }]}>
                {fmt(inv.balanceDue)}
              </Text>
            </View>
          ))}
        </View>

        {invoices.length > 0 && (
          <View style={{ alignSelf: "flex-end", width: 240, marginTop: 10 }}>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>{L.total}</Text>
              <Text style={s.totalValue}>{fmt(totalInvoiced)}</Text>
            </View>
            <View style={s.totalRow}>
              <Text style={[s.totalLabel, { color: "#1a7a1a" }]}>{L.paid}</Text>
              <Text style={[s.totalValue, { color: "#1a7a1a" }]}>{fmt(totalPaid)}</Text>
            </View>
            <View style={s.grandRow}>
              <Text style={s.grandLabel}>{L.balance}</Text>
              <Text style={s.grandValue}>{fmt(totalBalance)}</Text>
            </View>
          </View>
        )}

        <PdfPageFooter L={L} cabinet={cabinet} generatedAt={generatedAt} />
      </Page>

      {/* ═══════════════════════════ PAGE 4 — DOCUMENTS ═══════════════════════ */}
      <Page size="A4" style={s.page}>
        <PdfPageHeader data={c} L={L} cabinet={cabinet} />

        <Section title={L.documents} />
        <View style={s.table}>
          <View style={s.tableHead}>
            <Text style={[s.th, { flex: 4 }]}>{L.docName}</Text>
            <Text style={[s.th, { flex: 2 }]}>{L.docType}</Text>
            <Text style={[s.th, { flex: 2 }]}>{L.addedOn}</Text>
          </View>
          {documents.length === 0 ? (
            <View style={[s.tableRow, s.emptyRow]}>
              <Text style={s.emptyText}>{L.noData}</Text>
            </View>
          ) : documents.map((d, i) => (
            <View key={d.id} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
              <Text style={[s.td, { flex: 4 }]}>{d.name}</Text>
              <Text style={[s.td, { flex: 2, color: "#666" }]}>{d.fileType ?? "—"}</Text>
              <Text style={[s.tdMono, { flex: 2 }]}>{fmtDate(d.createdAt)}</Text>
            </View>
          ))}
        </View>

        <PdfPageFooter L={L} cabinet={cabinet} generatedAt={generatedAt} />
      </Page>

    </Document>
  );
}

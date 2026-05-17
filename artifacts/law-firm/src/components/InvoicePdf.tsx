import {
  Document, Page, Text, View, StyleSheet,
  PDFDownloadLink,
} from "@react-pdf/renderer";
import { formatCurrency } from "@/lib/currency";

// ── Types ─────────────────────────────────────────────────────────────────────

interface InvoiceLine {
  id: number; description: string; unit: string | null;
  quantity: number; unitPriceHt: number; vatRate: number;
  lineTotalHt: number; lineVat: number;
}

interface Invoice {
  id: number; invoiceNumber: string | null;
  clientName: string | null; clientTaxId: string | null;
  caseName: string | null;
  issueDate: string | null; dueDate: string | null;
  subtotalHt: number; vatTotal: number; stampDuty: number;
  withholdingTax: number; totalTtc: number; netToPay: number;
  amountPaid: number; balanceDue: number;
  clientWithholdingRate: number | null;
  paymentTerms: string | null; notes: string | null;
  lines: InvoiceLine[];
}

interface CabinetSettings {
  cabinetName?: string | null; cabinetTaxId?: string | null;
  cabinetRib?: string | null; cabinetRc?: string | null;
  cabinetAddress?: string | null; cabinetPhone?: string | null;
  cabinetEmail?: string | null;
  invoiceFooterAr?: string | null; invoiceFooterFr?: string | null;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9, padding: 36 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  cabinetBlock: { flex: 1 },
  invoiceBlock: { alignItems: "flex-end" },
  h1: { fontSize: 22, fontFamily: "Helvetica-Bold", color: "#1e3a5f" },
  h2: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  label: { color: "#888", fontSize: 8 },
  value: { fontFamily: "Helvetica-Bold" },
  mono: { fontFamily: "Courier" },
  divider: { height: 1, backgroundColor: "#e0e0e0", marginVertical: 10 },
  sectionTitle: { fontSize: 8, color: "#1e3a5f", fontFamily: "Helvetica-Bold", marginBottom: 4, textTransform: "uppercase" },
  row: { flexDirection: "row", marginBottom: 3 },
  colLabel: { width: "35%", color: "#666" },
  colValue: { width: "65%" },
  // Table
  table: { marginTop: 8 },
  tableHeader: { flexDirection: "row", backgroundColor: "#1e3a5f", color: "#fff", paddingVertical: 5, paddingHorizontal: 4 },
  tableRow: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 4, borderBottomWidth: 0.5, borderBottomColor: "#e0e0e0" },
  tableRowAlt: { backgroundColor: "#f8f9fa" },
  thDesc: { flex: 3, fontFamily: "Helvetica-Bold", color: "#fff", fontSize: 8 },
  thNum: { flex: 1, fontFamily: "Helvetica-Bold", color: "#fff", fontSize: 8, textAlign: "right" },
  tdDesc: { flex: 3, fontSize: 8 },
  tdNum: { flex: 1, fontSize: 8, textAlign: "right", fontFamily: "Courier" },
  // Totals
  totalsBox: { marginTop: 12, alignSelf: "flex-end", width: 220 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: "#e0e0e0" },
  totalLabel: { color: "#666", fontSize: 8.5 },
  totalValue: { fontFamily: "Courier", fontSize: 8.5 },
  netRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, marginTop: 4, backgroundColor: "#1e3a5f", paddingHorizontal: 8, borderRadius: 3 },
  netLabel: { color: "#fff", fontFamily: "Helvetica-Bold", fontSize: 10 },
  netValue: { color: "#ffd700", fontFamily: "Courier-Bold", fontSize: 10 },
  // Footer
  footer: { position: "absolute", bottom: 24, left: 36, right: 36, borderTopWidth: 0.5, borderTopColor: "#ccc", paddingTop: 6 },
  footerText: { fontSize: 7, color: "#888", textAlign: "center" },
  badge: { fontSize: 7, color: "#1e3a5f", textAlign: "center" },
});

// ── PDF Document ──────────────────────────────────────────────────────────────

function InvoiceDocument({ inv, cab }: { inv: Invoice; cab: CabinetSettings }) {
  const fmt = (n: number) => formatCurrency(n, "fr");
  const fmtDate = (d: string | null) => d ? new Date(d + "T00:00:00").toLocaleDateString("fr-TN") : "—";
  const cabName = cab.cabinetName ?? "Cabinet d'Avocats";
  const invNum = inv.invoiceNumber ?? `#${String(inv.id).padStart(4, "0")}`;

  return (
    <Document title={`Facture ${invNum}`} author={cabName}>
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={s.headerRow}>
          <View style={s.cabinetBlock}>
            <Text style={s.h2}>{cabName}</Text>
            {cab.cabinetAddress && <Text style={s.label}>{cab.cabinetAddress}</Text>}
            {cab.cabinetPhone && <Text style={s.label}>Tél: {cab.cabinetPhone}</Text>}
            {cab.cabinetEmail && <Text style={s.label}>{cab.cabinetEmail}</Text>}
            {cab.cabinetTaxId && <Text style={[s.label, { marginTop: 4 }]}>MF: {cab.cabinetTaxId}</Text>}
            {cab.cabinetRc && <Text style={s.label}>RC: {cab.cabinetRc}</Text>}
            {cab.cabinetRib && <Text style={s.label}>RIB: {cab.cabinetRib}</Text>}
          </View>
          <View style={s.invoiceBlock}>
            <Text style={s.h1}>FACTURE</Text>
            <Text style={[s.mono, { fontSize: 13, color: "#1e3a5f", marginTop: 4 }]}>{invNum}</Text>
            <Text style={[s.label, { marginTop: 6 }]}>Date d'émission: {fmtDate(inv.issueDate)}</Text>
            {inv.dueDate && <Text style={s.label}>Échéance: {fmtDate(inv.dueDate)}</Text>}
          </View>
        </View>

        <View style={s.divider} />

        {/* ── Client ── */}
        <View style={{ marginBottom: 12 }}>
          <Text style={s.sectionTitle}>Facturé à / الفوترة لفائدة</Text>
          <Text style={[s.h2, { marginBottom: 2 }]}>{inv.clientName ?? "—"}</Text>
          {inv.clientTaxId && <Text style={s.label}>MF: {inv.clientTaxId}</Text>}
          {inv.caseName && <Text style={[s.label, { marginTop: 2 }]}>Dossier: {inv.caseName}</Text>}
          {inv.clientWithholdingRate && inv.clientWithholdingRate > 0 && (
            <Text style={[s.label, { color: "#c45000", marginTop: 2 }]}>
              Retenue à la source: {inv.clientWithholdingRate}%
            </Text>
          )}
        </View>

        {/* ── Lines table ── */}
        <Text style={s.sectionTitle}>Détail des prestations</Text>
        <View style={s.table}>
          <View style={s.tableHeader}>
            <Text style={s.thDesc}>Description</Text>
            <Text style={s.thNum}>Unité</Text>
            <Text style={s.thNum}>Qté</Text>
            <Text style={s.thNum}>P.U HT</Text>
            <Text style={s.thNum}>TVA%</Text>
            <Text style={s.thNum}>Total HT</Text>
            <Text style={s.thNum}>TVA</Text>
          </View>
          {inv.lines.map((l, i) => (
            <View key={l.id} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
              <Text style={s.tdDesc}>{l.description}</Text>
              <Text style={s.tdNum}>{l.unit ?? "forf."}</Text>
              <Text style={s.tdNum}>{l.quantity.toFixed(3)}</Text>
              <Text style={s.tdNum}>{l.unitPriceHt.toFixed(3)}</Text>
              <Text style={s.tdNum}>{l.vatRate}%</Text>
              <Text style={s.tdNum}>{l.lineTotalHt.toFixed(3)}</Text>
              <Text style={s.tdNum}>{l.lineVat.toFixed(3)}</Text>
            </View>
          ))}
        </View>

        {/* ── Totals ── */}
        <View style={s.totalsBox}>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Sous-total HT / المجموع خ.ض</Text>
            <Text style={s.totalValue}>{fmt(inv.subtotalHt)}</Text>
          </View>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>TVA</Text>
            <Text style={s.totalValue}>{fmt(inv.vatTotal)}</Text>
          </View>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Timbre fiscal / الطابع الجبائي</Text>
            <Text style={s.totalValue}>{fmt(inv.stampDuty)}</Text>
          </View>
          <View style={s.totalRow}>
            <Text style={[s.totalLabel, { fontFamily: "Helvetica-Bold" }]}>Total TTC / المجموع ش.ض</Text>
            <Text style={[s.totalValue, { fontFamily: "Courier-Bold" }]}>{fmt(inv.totalTtc)}</Text>
          </View>
          {inv.withholdingTax > 0 && (
            <View style={s.totalRow}>
              <Text style={[s.totalLabel, { color: "#c45000" }]}>
                Retenue à la source ({inv.clientWithholdingRate ?? 0}%)
              </Text>
              <Text style={[s.totalValue, { color: "#c45000" }]}>- {fmt(inv.withholdingTax)}</Text>
            </View>
          )}
          <View style={s.netRow}>
            <Text style={s.netLabel}>Net à payer / الصافي للدفع</Text>
            <Text style={s.netValue}>{fmt(inv.netToPay)}</Text>
          </View>
          {inv.amountPaid > 0 && (
            <View style={[s.totalRow, { marginTop: 6 }]}>
              <Text style={[s.totalLabel, { color: "#1a7a1a" }]}>Déjà payé</Text>
              <Text style={[s.totalValue, { color: "#1a7a1a" }]}>{fmt(inv.amountPaid)}</Text>
            </View>
          )}
          {inv.balanceDue > 0 && (
            <View style={s.totalRow}>
              <Text style={[s.totalLabel, { fontFamily: "Helvetica-Bold", color: "#c45000" }]}>Solde restant</Text>
              <Text style={[s.totalValue, { fontFamily: "Courier-Bold", color: "#c45000" }]}>{fmt(inv.balanceDue)}</Text>
            </View>
          )}
        </View>

        {/* ── Conditions ── */}
        {(inv.paymentTerms || inv.notes) && (
          <View style={{ marginTop: 16 }}>
            <View style={s.divider} />
            {inv.paymentTerms && (
              <View style={{ marginBottom: 6 }}>
                <Text style={s.sectionTitle}>Conditions de paiement</Text>
                <Text style={{ fontSize: 8, color: "#444" }}>{inv.paymentTerms}</Text>
              </View>
            )}
            {inv.notes && (
              <View>
                <Text style={s.sectionTitle}>Notes</Text>
                <Text style={{ fontSize: 8, color: "#444" }}>{inv.notes}</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.badge}>
            {cab.cabinetName ?? "Cabinet d'Avocats"} — MF: {cab.cabinetTaxId ?? "—"} — RIB: {cab.cabinetRib ?? "—"} — RC: {cab.cabinetRc ?? "—"}
          </Text>
          {cab.cabinetAddress && <Text style={s.footerText}>{cab.cabinetAddress}</Text>}
          <Text style={s.footerText}>TVA acquittée d'après les débits</Text>
          {(cab.invoiceFooterFr || cab.invoiceFooterAr) && (
            <Text style={s.footerText}>{cab.invoiceFooterFr ?? cab.invoiceFooterAr}</Text>
          )}
        </View>

      </Page>
    </Document>
  );
}

// ── Download button ───────────────────────────────────────────────────────────

export function InvoicePdfButton({ inv, cab }: { inv: Invoice; cab: CabinetSettings }) {
  const filename = `${inv.invoiceNumber ?? `facture-${inv.id}`}.pdf`;
  return (
    <PDFDownloadLink document={<InvoiceDocument inv={inv} cab={cab} />} fileName={filename}>
      {({ loading }) => (loading ? "Génération PDF..." : "Télécharger PDF")}
    </PDFDownloadLink>
  );
}

import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { authFetch } from "@/lib/authFetch";
import { formatDateTN } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormField, Modal } from "@/components/Modal";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowRight, Lock, Edit2, FileX, CreditCard, Download, Loader2, Trash2, ExternalLink,
} from "lucide-react";
import { ConfirmDestructive } from "@/components/ui/ConfirmDestructive";
import { InvoicePdfButton } from "@/components/InvoicePdf";
import { STATUS_LABELS, STATUS_COLORS } from "@/services/invoiceCalculator";
import { Money } from "@/components/Money";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

interface InvoiceLine {
  id: number; position: number; description: string; unit: string | null;
  quantity: number; unitPriceHt: number; vatRate: number; lineTotalHt: number; lineVat: number;
}
interface Invoice {
  id: number; invoiceNumber: string | null;
  clientId: number; clientName: string | null; clientTaxId: string | null;
  clientWithholdingRate: number | null; clientWithholdingExempt: boolean | null;
  caseId: number | null; caseName: string | null;
  issueDate: string | null; dueDate: string | null; status: string;
  subtotalHt: number; vatTotal: number; stampDuty: number;
  withholdingTax: number; totalTtc: number; netToPay: number;
  amountPaid: number; balanceDue: number;
  paymentTerms: string | null; notes: string | null;
  lockedAt: string | null; cancelledByInvoiceId: number | null;
  createdAt: string; updatedAt: string;
  lines: InvoiceLine[];
}

export default function InvoicePage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [inv, setInv] = useState<Invoice | null>(null);
  const [cab, setCab] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [paymentModal, setPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);
  const [creditLoading, setCreditLoading] = useState(false);
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmCreditNote, setConfirmCreditNote] = useState(false);
  const [confirmUnlock, setConfirmUnlock] = useState(false);

  async function load() {
    const [invRes, cabRes] = await Promise.all([
      authFetch(`${BASE}/api/invoices/${params.id}`),
      authFetch(`${BASE}/api/cabinet-settings`),
    ]);
    if (invRes.ok) setInv(await invRes.json());
    if (cabRes.ok) setCab(await cabRes.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, [params.id]);

  async function recordPayment() {
    if (!inv) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;
    setSavingPayment(true);
    const r = await authFetch(`${BASE}/api/invoices/${inv.id}/payment`, {
      method: "POST", body: JSON.stringify({ amount }),
    });
    if (r.ok) { const updated = await r.json(); setInv(prev => prev ? { ...prev, ...updated } : prev); }
    setSavingPayment(false);
    setPaymentModal(false);
    setPaymentAmount("");
  }

  async function doUnlock() {
    if (!inv) return;
    setUnlockLoading(true);
    const r = await authFetch(`${BASE}/api/invoices/${inv.id}/unlock`, { method: "POST" });
    if (r.ok) { await load(); }
    setUnlockLoading(false);
    setConfirmUnlock(false);
  }

  async function doCreditNote() {
    if (!inv) return;
    setCreditLoading(true);
    const r = await authFetch(`${BASE}/api/invoices/${inv.id}/credit-note`, { method: "POST" });
    if (r.ok) {
      const credit = await r.json();
      navigate(`/billing/${credit.id}`);
    }
    setCreditLoading(false);
  }

  async function deleteInvoice() {
    if (!inv) return;
    await authFetch(`${BASE}/api/invoices/${inv.id}/soft-delete`, { method: "PATCH" });
    navigate("/billing");
  }

  function printPdf() {
    window.print();
  }

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );

  if (!inv) return (
    <div className="text-center py-20 text-muted-foreground">الفاتورة غير موجودة</div>
  );

  const isLocked = !!inv.lockedAt;
  const statusLabel = STATUS_LABELS[inv.status] ?? inv.status;
  const statusCls = STATUS_COLORS[inv.status] ?? "bg-muted";

  return (
    <div className="space-y-6 pb-10">
      {/* Breadcrumb + actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <button onClick={() => window.history.back()}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-1 transition-colors">
            <ArrowRight className="h-3.5 w-3.5" /> رجوع
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-mono">
              {inv.invoiceNumber ?? `#INV-${String(inv.id).padStart(4, "0")}`}
            </h1>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCls}`}>{statusLabel}</span>
            {isLocked && <Lock className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {!isLocked && (
            <Button size="sm" className="gap-2 text-xs"
              onClick={() => navigate(`/billing/${inv.id}/edit`)}>
              <Edit2 className="h-4 w-4" /> تعديل
            </Button>
          )}
          {!isLocked && (
            <Button variant="destructive" size="sm" className="gap-2 text-xs"
              onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4" /> حذف المسودة
            </Button>
          )}
          {isLocked && inv.status !== "cancelled" && (
            <>
              <Button size="sm" className="gap-2 text-xs"
                onClick={() => setPaymentModal(true)}>
                <CreditCard className="h-4 w-4" /> تسجيل دفعة
              </Button>
              <Button size="sm" className="gap-2 text-xs"
                onClick={() => setConfirmUnlock(true)} disabled={unlockLoading}>
                {unlockLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                إلغاء القفل للتعديل
              </Button>
              <Button size="sm" className="gap-2 text-xs"
                onClick={() => setConfirmCreditNote(true)} disabled={creditLoading}>
                {creditLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileX className="h-4 w-4" />}
                إصدار فاتورة تصحيحية
              </Button>
            </>
          )}
          {inv && (
            <Button size="sm" className="gap-2 text-xs" asChild>
              <span className="cursor-pointer">
                <Download className="h-4 w-4" />
                <InvoicePdfButton inv={inv} cab={cab} />
              </span>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="xl:col-span-2 space-y-5">

          {/* Client + case */}
          <Card className="border-none shadow-md">
            <CardContent className="pt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-1">الحريف</p>
                <button
                  onClick={() => navigate(`/clients/${inv.clientId}`)}
                  className="flex items-center gap-1.5 font-semibold text-base hover:text-primary transition-colors group text-right"
                >
                  {inv.clientName}
                  <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
                </button>
                {inv.clientTaxId && <p className="text-muted-foreground text-xs mt-0.5">م.ج: {inv.clientTaxId}</p>}
                {inv.clientWithholdingRate && !inv.clientWithholdingExempt && (
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">
                    خصم في المنبع: {inv.clientWithholdingRate}%
                  </p>
                )}
              </div>
              <div>
                {inv.caseName && inv.caseId && (
                  <>
                    <p className="text-xs text-muted-foreground mb-1">القضية</p>
                    <button
                      onClick={() => navigate(`/cases/${inv.caseId}`)}
                      className="flex items-center gap-1.5 font-medium hover:text-primary transition-colors group text-right"
                    >
                      {inv.caseName}
                      <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
                    </button>
                  </>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">تاريخ الإصدار</p>
                <p>{inv.issueDate ? formatDateTN(inv.issueDate) : "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">تاريخ الاستحقاق</p>
                <p>{inv.dueDate ? formatDateTN(inv.dueDate) : "—"}</p>
              </div>
            </CardContent>
          </Card>

          {/* Lines */}
          <Card className="border-none shadow-md overflow-hidden">
            <CardHeader className="pb-3"><CardTitle className="text-base">البنود</CardTitle></CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm border-collapse" dir="rtl">
                <thead className="bg-muted/40 text-muted-foreground text-xs">
                  <tr>
                    <th className="border border-border px-3 py-2 text-right">البيان</th>
                    <th className="border border-border px-3 py-2 text-right w-24">الوحدة</th>
                    <th className="border border-border px-3 py-2 text-right w-20">الكمية</th>
                    <th className="border border-border px-3 py-2 text-right w-28">سعر الوحدة خ.ض</th>
                    <th className="border border-border px-3 py-2 text-right w-20">TVA %</th>
                    <th className="border border-border px-3 py-2 text-right w-28">الإجمالي خ.ض</th>
                    <th className="border border-border px-3 py-2 text-right w-24">TVA</th>
                  </tr>
                </thead>
                <tbody>
                  {inv.lines.map(l => (
                    <tr key={l.id} className="border-b border-border/50">
                      <td className="border border-border px-3 py-2">{l.description}</td>
                      <td className="border border-border px-3 py-2 text-muted-foreground text-xs">{l.unit}</td>
                      <td className="border border-border px-3 py-2 text-left font-mono" dir="ltr">{l.quantity.toFixed(3)}</td>
                      <td className="border border-border px-3 py-2 text-left font-mono" dir="ltr">{l.unitPriceHt.toFixed(3)}</td>
                      <td className="border border-border px-3 py-2 text-left font-mono" dir="ltr">{l.vatRate}%</td>
                      <td className="border border-border px-3 py-2 text-left font-mono font-semibold" dir="ltr">{l.lineTotalHt.toFixed(3)}</td>
                      <td className="border border-border px-3 py-2 text-left font-mono" dir="ltr">{l.lineVat.toFixed(3)}</td>
                    </tr>
                  ))}
                  {inv.lines.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">لا توجد بنود</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Notes */}
          {(inv.paymentTerms || inv.notes) && (
            <Card className="border-none shadow-md">
              <CardContent className="pt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                {inv.paymentTerms && (
                  <div><p className="text-xs text-muted-foreground mb-1">شروط الدفع</p><p>{inv.paymentTerms}</p></div>
                )}
                {inv.notes && (
                  <div><p className="text-xs text-muted-foreground mb-1">ملاحظات</p><p>{inv.notes}</p></div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: totals + payment */}
        <div className="space-y-5">
          <Card className="border-none shadow-md">
            <CardHeader className="pb-3"><CardTitle className="text-base">الملخص المالي</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="المجموع خ.ض" amount={inv.subtotalHt} />
              <Row label="TVA" amount={inv.vatTotal} />
              <Row label="الطابع الجبائي" amount={inv.stampDuty} />
              <div className="border-t border-border pt-2">
                <Row label="المجموع ش.ض" amount={inv.totalTtc} bold />
              </div>
              {inv.withholdingTax > 0 && (
                <div className="text-orange-600 dark:text-orange-400">
                  <Row label={`الخصم في المنبع (${inv.clientWithholdingRate ?? 0}%)`}
                    amount={inv.withholdingTax} prefix="- " />
                </div>
              )}
              <div className="border-t border-border pt-2">
                <Row label="الصافي للدفع" amount={inv.netToPay} bold highlight />
              </div>
              {inv.amountPaid > 0 && (
                <>
                  <div className="border-t border-border pt-2 text-green-600 dark:text-green-400">
                    <Row label="المدفوع" amount={inv.amountPaid} />
                  </div>
                  <div className="text-primary font-bold">
                    <Row label="الرصيد المتبقي" amount={inv.balanceDue} bold />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {isLocked && (
            <Card className="border-none shadow-sm bg-muted/30">
              <CardContent className="pt-4 text-xs text-muted-foreground space-y-1">
                <p>تاريخ الإصدار: {inv.issueDate ? formatDateTN(inv.issueDate) : "—"}</p>
                <p className="font-mono text-primary">{inv.invoiceNumber}</p>
                <div className="flex items-center gap-1 mt-2">
                  <Lock className="h-3 w-3" />
                  <span>الفاتورة مغلوقة ولا يمكن تعديلها</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Confirm draft invoice delete */}
      <ConfirmDestructive
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={deleteInvoice}
        title={`حذف المسودة ${inv?.invoiceNumber ?? ""}؟`}
        description="سيتم نقل هذه المسودة إلى سلة المحذوفات."
        confirmationText={inv?.invoiceNumber ?? undefined}
        confirmLabel="حذف المسودة"
      />

      {/* Confirm unlock */}
      <ConfirmDestructive
        open={confirmUnlock}
        onClose={() => setConfirmUnlock(false)}
        onConfirm={doUnlock}
        title="إلغاء قفل الفاتورة؟"
        description="ستعود الفاتورة إلى حالة مسودة وستتمكن من تعديل جميع معلوماتها. إذا كانت قد أُرسلت للحريف، تأكد من إعادة إصدارها بعد التعديل."
        confirmLabel="إلغاء القفل والتعديل"
      />

      {/* Confirm credit note */}
      <ConfirmDestructive
        open={confirmCreditNote}
        onClose={() => setConfirmCreditNote(false)}
        onConfirm={doCreditNote}
        title="إصدار فاتورة تصحيحية؟"
        description="سيتم إلغاء هذه الفاتورة وإنشاء فاتورة تصحيحية (avoir) مرتبطة بها. لا يمكن التراجع عن هذه العملية."
        confirmLabel="إصدار الفاتورة التصحيحية"
      />

      {/* Payment modal */}
      <Modal open={paymentModal} onClose={() => setPaymentModal(false)} title="تسجيل دفعة">
        <div className="space-y-4">
          <div className="p-3 bg-muted/40 rounded-lg text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">الصافي للدفع</span>
              <Money amount={inv.netToPay} />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">المدفوع</span>
              <Money amount={inv.amountPaid} />
            </div>
            <div className="flex justify-between font-semibold text-primary">
              <span>الرصيد المتبقي</span>
              <Money amount={inv.balanceDue} />
            </div>
          </div>
          <FormField label="مبلغ الدفعة (د.ت)" htmlFor="payment-amount">
            <Input id="payment-amount" type="number" min="0.001" step="0.001" dir="ltr"
              value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)}
              placeholder="0.000" className="h-12 text-xl font-mono text-left" />
          </FormField>
          <div className="flex gap-3">
            <Button className="flex-1" onClick={recordPayment} disabled={savingPayment || !paymentAmount}>
              {savingPayment ? <Loader2 className="h-4 w-4 animate-spin" /> : "تسجيل الدفعة"}
            </Button>
            <Button variant="outline" onClick={() => setPaymentModal(false)} className="px-6">إلغاء</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Row({ label, amount, bold, highlight, prefix }: { label: string; amount: number; bold?: boolean; highlight?: boolean; prefix?: string }) {
  return (
    <div className={`flex justify-between py-0.5 ${bold ? "font-semibold" : ""} ${highlight ? "text-primary text-base" : ""}`}>
      <span className={!bold && !highlight ? "text-muted-foreground" : ""}>{label}</span>
      <span dir="ltr" className="font-mono whitespace-nowrap">{prefix}<Money amount={amount} /></span>
    </div>
  );
}

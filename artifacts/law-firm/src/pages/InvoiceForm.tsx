import { SelectNative } from "@/components/SelectNative";
import { useState, useEffect, useMemo, useId } from "react";
import { useLocation, useParams } from "wouter";
import { authFetch } from "@/lib/authFetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/Modal";
import { ArrowRight, Plus, Trash2, Send, Save, Loader2 } from "lucide-react";
import { SkeletonForm } from "@/components/ui/skeletons";
import { calcLine, calcTotals, UNITS, UNIT_LABELS, VAT_RATES } from "@/services/invoiceCalculator";
import { Money } from "@/components/Money";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

interface Client {
  id: number; name: string; taxId: string | null;
  withholdingRate: number | null; withholdingExempt: boolean | null;
}
interface CaseOption { id: number; title: string; caseNumber: string | null; clientId: number; }

interface LineForm {
  _id: string;
  description: string;
  unit: string;
  quantity: string;
  unitPriceHt: string;
  vatRate: string;
}

const EMPTY_LINE = (): LineForm => ({
  _id: Math.random().toString(36).slice(2),
  description: "", unit: "forfait",
  quantity: "1", unitPriceHt: "0", vatRate: "19",
});

const inputCls = "h-9 bg-muted/50 border-border focus-visible:ring-1 focus-visible:ring-primary rounded-lg";
const cellCls = "border border-border px-2 py-1";

export default function InvoiceForm() {
  const params = useParams<{ id?: string }>();
  const isEdit = !!params.id;
  const [, navigate] = useLocation();

  const [clients, setClients] = useState<Client[]>([]);
  const [cases, setCases] = useState<CaseOption[]>([]);
  const [clientId, setClientId] = useState("");
  const [caseId, setCaseId] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineForm[]>([EMPTY_LINE()]);
  const [saving, setSaving] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const uid = useId();

  const selectedClient = clients.find(c => String(c.id) === clientId);
  const filteredCases = cases.filter(c => !clientId || c.clientId === Number(clientId));

  useEffect(() => {
    authFetch(`${BASE}/api/clients`).then(r => r.ok ? r.json() : []).then(setClients);
    authFetch(`${BASE}/api/cases`).then(r => r.ok ? r.json() : []).then((list: CaseOption[]) => {
      setCases(list);
      // Pre-fill from query params on new invoice
      if (!isEdit) {
        const qp = new URLSearchParams(window.location.search);
        const qCaseId   = qp.get("caseId");
        const qClientId = qp.get("clientId");
        const qDesc     = qp.get("desc");
        const qAmount   = qp.get("amount");

        if (qCaseId) {
          setCaseId(qCaseId);
          // derive clientId from case list if not explicitly provided
          if (!qClientId) {
            const matched = list.find(c => String(c.id) === qCaseId);
            if (matched) setClientId(String(matched.clientId));
          }
        }
        if (qClientId) setClientId(qClientId);

        // Pre-fill first line with description and/or amount from case
        if (qDesc || qAmount) {
          let desc = "";
          if (qDesc) {
            try { desc = decodeURIComponent(qDesc); } catch { desc = qDesc; }
          }
          setLines([{
            _id: Math.random().toString(36).slice(2),
            description: desc,
            unit: "forfait",
            quantity: "1",
            unitPriceHt: qAmount ?? "0",
            vatRate: "19",
          }]);
        }
      }
    });
  }, [isEdit]);

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    authFetch(`${BASE}/api/invoices/${params.id}`)
      .then(r => r.json())
      .then(inv => {
        setClientId(String(inv.clientId));
        setCaseId(inv.caseId ? String(inv.caseId) : "");
        setIssueDate(inv.issueDate ?? new Date().toISOString().slice(0, 10));
        setDueDate(inv.dueDate ?? "");
        setPaymentTerms(inv.paymentTerms ?? "");
        setNotes(inv.notes ?? "");
        if (inv.lines?.length > 0) {
          setLines(inv.lines.map((l: { description: string; unit: string | null; quantity: number; unitPriceHt: number; vatRate: number }) => ({
            _id: Math.random().toString(36).slice(2),
            description: l.description,
            unit: l.unit ?? "forfait",
            quantity: String(l.quantity),
            unitPriceHt: String(l.unitPriceHt),
            vatRate: String(l.vatRate),
          })));
        }
        setLoading(false);
      });
  }, [isEdit, params.id]);

  const computedLines = useMemo(() =>
    lines.map(l => calcLine({
      quantity: parseFloat(l.quantity) || 0,
      unitPriceHt: parseFloat(l.unitPriceHt) || 0,
      vatRate: parseFloat(l.vatRate) || 19,
    })),
    [lines]
  );

  const totals = useMemo(() => calcTotals(
    computedLines,
    selectedClient?.withholdingRate ?? 0,
    selectedClient?.withholdingExempt ?? false,
  ), [computedLines, selectedClient]);

  function updateLine(idx: number, field: keyof LineForm, value: string) {
    setLines(ls => ls.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  }

  function removeLine(idx: number) {
    setLines(ls => ls.filter((_, i) => i !== idx));
  }

  function buildPayload() {
    return {
      clientId: Number(clientId),
      caseId: caseId ? Number(caseId) : null,
      issueDate: issueDate || null,
      dueDate: dueDate || null,
      paymentTerms: paymentTerms || null,
      notes: notes || null,
      lines: lines.map((l, i) => ({
        description: l.description,
        unit: l.unit,
        quantity: parseFloat(l.quantity) || 0,
        unitPriceHt: parseFloat(l.unitPriceHt) || 0,
        vatRate: parseFloat(l.vatRate) || 19,
        position: i,
      })),
    };
  }

  async function saveDraft() {
    if (!clientId) return;
    setSaving(true);
    const payload = buildPayload();
    let inv;
    if (isEdit) {
      const r = await authFetch(`${BASE}/api/invoices/${params.id}`, { method: "PUT", body: JSON.stringify(payload) });
      inv = await r.json();
    } else {
      const r = await authFetch(`${BASE}/api/invoices`, { method: "POST", body: JSON.stringify(payload) });
      inv = await r.json();
    }
    setSaving(false);
    navigate(`/billing/${inv.id}`);
  }

  async function issue() {
    if (!clientId || lines.every(l => !l.description)) return;
    setIssuing(true);
    const payload = buildPayload();
    let id = params.id ? Number(params.id) : null;
    if (!id) {
      const r = await authFetch(`${BASE}/api/invoices`, { method: "POST", body: JSON.stringify(payload) });
      const inv = await r.json();
      id = inv.id;
    } else {
      await authFetch(`${BASE}/api/invoices/${id}`, { method: "PUT", body: JSON.stringify(payload) });
    }
    const r = await authFetch(`${BASE}/api/invoices/${id}/issue`, { method: "POST", body: JSON.stringify({ issueDate }) });
    setIssuing(false);
    const inv = await r.json();
    navigate(`/billing/${inv.id}`);
  }

  if (loading) return <SkeletonForm fields={5} className="max-w-2xl mx-auto rounded-2xl border border-border bg-card" />;

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <button onClick={() => window.history.back()} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-1 transition-colors">
            <ArrowRight className="h-3.5 w-3.5" /> الفوترة
          </button>
          <h1 className="text-2xl font-bold">{isEdit ? "تعديل الفاتورة" : "فاتورة جديدة"}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: form */}
        <div className="xl:col-span-2 space-y-5">

          {/* Section 1: Header info */}
          <Card className="border-none shadow-md">
            <CardHeader className="pb-3"><CardTitle className="text-base">معلومات الفاتورة</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="الحريف *" htmlFor={`${uid}-client`}>
                <SelectNative id={`${uid}-client`} value={clientId}
                  onChange={e => { setClientId(e.target.value); setCaseId(""); }}
                  className={inputCls + " w-full px-2 cursor-pointer"}>
                  <option value="">— اختر حريفاً —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </SelectNative>
              </FormField>

              <FormField label="القضية (اختياري)" htmlFor={`${uid}-case`}>
                <SelectNative id={`${uid}-case`} value={caseId}
                  onChange={e => {
                    const val = e.target.value;
                    setCaseId(val);
                    if (val) {
                      const matched = cases.find(c => String(c.id) === val);
                      if (matched) setClientId(String(matched.clientId));
                    }
                  }}
                  className={inputCls + " w-full px-2 cursor-pointer"}>
                  <option value="">— بدون قضية —</option>
                  {filteredCases.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.caseNumber ? `${c.caseNumber} — ` : ""}{c.title}
                    </option>
                  ))}
                </SelectNative>
              </FormField>

              <FormField label="تاريخ الإصدار" htmlFor={`${uid}-issue`}>
                <Input id={`${uid}-issue`} type="date" className={inputCls + " w-full"} dir="ltr" lang="ar-TN"
                  value={issueDate} onChange={e => setIssueDate(e.target.value)} />
              </FormField>

              <FormField label="تاريخ الاستحقاق" htmlFor={`${uid}-due`}>
                <Input id={`${uid}-due`} type="date" className={inputCls + " w-full"} dir="ltr" lang="ar-TN"
                  value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </FormField>
            </CardContent>
          </Card>

          {/* Section 2: Lines */}
          <Card className="border-none shadow-md overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">بنود الفاتورة</CardTitle>
                <Button size="sm" variant="outline" onClick={() => setLines(ls => [...ls, EMPTY_LINE()])}
                  className="gap-1.5 h-8 text-xs">
                  <Plus className="h-3.5 w-3.5" /> إضافة بند
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm border-collapse" dir="rtl">
                <thead className="bg-muted/40 text-muted-foreground text-xs">
                  <tr>
                    <th className={`${cellCls} text-right w-[35%]`}>البيان</th>
                    <th className={`${cellCls} text-right w-[10%]`}>الوحدة</th>
                    <th className={`${cellCls} text-right w-[10%]`}>الكمية</th>
                    <th className={`${cellCls} text-right w-[15%]`}>سعر الوحدة خ.ض</th>
                    <th className={`${cellCls} text-right w-[8%]`}>% ض.م</th>
                    <th className={`${cellCls} text-right w-[14%]`}>الإجمالي خ.ض</th>
                    <th className={`${cellCls} w-[8%]`}></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, idx) => {
                    const computed = computedLines[idx];
                    return (
                      <tr key={line._id} className="hover:bg-muted/20 transition-colors">
                        <td className={cellCls}>
                          <Input value={line.description} onChange={e => updateLine(idx, "description", e.target.value)}
                            placeholder="وصف الخدمة..." className="h-8 border-0 bg-transparent focus-visible:ring-0 p-0 text-sm" />
                        </td>
                        <td className={cellCls}>
                          <SelectNative value={line.unit} onChange={e => updateLine(idx, "unit", e.target.value)}
                            className="h-8 w-full bg-transparent border-0 text-xs cursor-pointer focus:outline-none">
                            {UNITS.map(u => <option key={u} value={u}>{UNIT_LABELS[u] ?? u}</option>)}
                          </SelectNative>
                        </td>
                        <td className={cellCls}>
                          <Input value={line.quantity} onChange={e => updateLine(idx, "quantity", e.target.value)}
                            type="number" min="0" step="0.001" dir="ltr"
                            className="h-8 border-0 bg-transparent focus-visible:ring-0 p-0 text-sm text-left w-16" />
                        </td>
                        <td className={cellCls}>
                          <Input value={line.unitPriceHt} onChange={e => updateLine(idx, "unitPriceHt", e.target.value)}
                            type="number" min="0" step="0.001" dir="ltr"
                            className="h-8 border-0 bg-transparent focus-visible:ring-0 p-0 text-sm text-left w-24" />
                        </td>
                        <td className={cellCls}>
                          <SelectNative value={line.vatRate} onChange={e => updateLine(idx, "vatRate", e.target.value)}
                            className="h-8 w-full bg-transparent border-0 text-xs cursor-pointer focus:outline-none" dir="ltr">
                            {VAT_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                          </SelectNative>
                        </td>
                        <td className={`${cellCls} text-left font-mono text-xs text-muted-foreground`} dir="ltr">
                          {computed.lineTotalHt.toFixed(3)}
                        </td>
                        <td className={cellCls}>
                          <button onClick={() => removeLine(idx)}
                            className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {lines.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-8 text-muted-foreground text-sm">لا توجد بنود — أضف بنداً</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Section 3: Conditions */}
          <Card className="border-none shadow-md">
            <CardHeader className="pb-3"><CardTitle className="text-base">الشروط والملاحظات</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="شروط الدفع" htmlFor={`${uid}-terms`}>
                <textarea id={`${uid}-terms`} rows={3} value={paymentTerms}
                  onChange={e => setPaymentTerms(e.target.value)}
                  placeholder="مثال: دفع فور الاستلام..."
                  className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary" />
              </FormField>
              <FormField label="ملاحظات" htmlFor={`${uid}-notes`}>
                <textarea id={`${uid}-notes`} rows={3} value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="ملاحظات داخلية..."
                  className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary" />
              </FormField>
            </CardContent>
          </Card>
        </div>

        {/* Right: summary */}
        <div className="space-y-5">
          <Card className="border-none shadow-md sticky top-4">
            <CardHeader className="pb-3"><CardTitle className="text-base">الملخص</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">المجموع خ.ض</span>
                <Money amount={totals.subtotalHt} />
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">ض.م</span>
                <Money amount={totals.vatTotal} />
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">الطابع الجبائي</span>
                <Money amount={totals.stampDuty} />
              </div>
              <div className="flex justify-between py-1 border-b border-border/50 font-semibold">
                <span>المجموع ش.ض</span>
                <Money amount={totals.totalTtc} />
              </div>
              {totals.withholdingTax > 0 && (
                <div className="flex justify-between py-1 border-b border-border/50 text-orange-600 dark:text-orange-400">
                  <span>
                    الخصم في المنبع
                    {selectedClient?.withholdingRate ? ` (${selectedClient.withholdingRate}%)` : ""}
                  </span>
                  <span dir="ltr" className="font-mono whitespace-nowrap">- <Money amount={totals.withholdingTax} /></span>
                </div>
              )}
              <div className="flex justify-between py-2 text-base font-bold text-primary">
                <span>الصافي للدفع</span>
                <Money amount={totals.netToPay} />
              </div>

              {selectedClient?.withholdingExempt && (
                <p className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded p-2">
                  الحريف معفى من الخصم في المنبع
                </p>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card className="border-none shadow-md">
            <CardContent className="pt-5 space-y-3">
              <Button className="w-full gap-2" variant="outline" onClick={saveDraft} disabled={saving || !clientId}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                حفظ كمسودة
              </Button>
              <Button className="w-full gap-2" onClick={issue} disabled={issuing || !clientId}>
                {issuing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                إصدار الفاتورة
              </Button>
              <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => navigate("/billing")}>
                إلغاء
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { authFetch } from "@/lib/authFetch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Download, Edit2, CreditCard, TrendingUp, Clock, CheckCircle, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Modal, FormField } from "@/components/Modal";
import { useKeypadInput } from "@/context/KeypadContext";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

interface Invoice {
  id: number;
  clientId: number;
  clientName: string;
  caseId: number | null;
  caseName: string | null;
  amount: number;
  status: string;
  dueDate: string | null;
  notes: string | null;
  createdAt: string;
}

interface Client { id: number; name: string; }
interface CaseOption { id: number; title: string; caseNumber: string | null; }

const inputCls = "h-10 bg-muted/50 border-border focus-visible:ring-1 focus-visible:ring-primary rounded-lg w-full";

export default function Billing() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [cases, setCases] = useState<CaseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);
  const [form, setForm] = useState({
    clientId: "",
    caseId: "",
    status: "pending",
    dueDate: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [amount, setAmount] = useState("");
  const amountKeypad = useKeypadInput("new-invoice-amount");

  async function load() {
    setLoading(true);
    const [invRes, clientRes, caseRes] = await Promise.all([
      authFetch(`${BASE}/api/invoices`),
      authFetch(`${BASE}/api/clients`),
      authFetch(`${BASE}/api/cases`),
    ]);
    if (invRes.ok) setInvoices(await invRes.json());
    if (clientRes.ok) setClients(await clientRes.json());
    if (caseRes.ok) setCases(await caseRes.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openNew() {
    setForm({ clientId: "", caseId: "", status: "pending", dueDate: "", notes: "" });
    setAmount("");
    setShowModal(true);
  }

  async function saveNew() {
    const parsedAmount = parseFloat(amount || "0");
    if (!form.clientId || isNaN(parsedAmount) || parsedAmount <= 0) return;
    setSaving(true);
    await authFetch(`${BASE}/api/invoices`, {
      method: "POST",
      body: JSON.stringify({
        clientId: Number(form.clientId),
        caseId:   form.caseId ? Number(form.caseId) : null,
        amount:   parsedAmount,
        status:   form.status,
        dueDate:  form.dueDate || null,
        notes:    form.notes || null,
      }),
    });
    await load();
    setSaving(false);
    setShowModal(false);
  }

  async function saveEdit() {
    if (!editInvoice) return;
    setSaving(true);
    await authFetch(`${BASE}/api/invoices/${editInvoice.id}`, {
      method: "PUT",
      body: JSON.stringify({
        clientId: editInvoice.clientId,
        caseId:   editInvoice.caseId,
        amount:   editInvoice.amount,
        status:   editInvoice.status,
        dueDate:  editInvoice.dueDate || null,
        notes:    editInvoice.notes || null,
      }),
    });
    await load();
    setSaving(false);
    setEditInvoice(null);
  }

  async function remove(id: number) {
    if (!confirm("حذف هذه الفاتورة؟")) return;
    await authFetch(`${BASE}/api/invoices/${id}`, { method: "DELETE" });
    await load();
  }

  const total   = invoices.reduce((s, i) => s + i.amount, 0);
  const paid    = invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const pending = invoices.filter(i => i.status === "pending").reduce((s, i) => s + i.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">الفوترة</h1>
          <p className="text-muted-foreground text-sm mt-0.5">إدارة الفواتير والمدفوعات</p>
        </div>
        <Button onClick={openNew} className="rounded-lg gap-2 px-5">
          <Plus className="h-4 w-4" /> فاتورة جديدة
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm bg-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-xl"><CreditCard className="h-5 w-5 text-blue-500" /></div>
            <div>
              <p className="text-xs text-muted-foreground">إجمالي الفواتير</p>
              <p className="text-xl font-bold" dir="ltr">{total.toFixed(2)} <span className="text-sm font-normal">د.ت</span></p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-green-500/10 rounded-xl"><CheckCircle className="h-5 w-5 text-green-500" /></div>
            <div>
              <p className="text-xs text-muted-foreground">المدفوع</p>
              <p className="text-xl font-bold" dir="ltr">{paid.toFixed(2)} <span className="text-sm font-normal">د.ت</span></p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-orange-500/10 rounded-xl"><Clock className="h-5 w-5 text-orange-500" /></div>
            <div>
              <p className="text-xs text-muted-foreground">في الانتظار</p>
              <p className="text-xl font-bold" dir="ltr">{pending.toFixed(2)} <span className="text-sm font-normal">د.ت</span></p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-md overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-right py-3 font-semibold">رقم الفاتورة</TableHead>
                <TableHead className="text-right py-3 font-semibold">الحريف</TableHead>
                <TableHead className="text-right py-3 font-semibold hidden md:table-cell">القضية</TableHead>
                <TableHead className="text-right py-3 font-semibold">المبلغ</TableHead>
                <TableHead className="text-right py-3 font-semibold">الحالة</TableHead>
                <TableHead className="text-right py-3 font-semibold hidden sm:table-cell">الاستحقاق</TableHead>
                <TableHead className="text-center py-3 font-semibold w-24">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j} className="py-3"><Skeleton className="h-5 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : invoices.length === 0
                ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-40 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <TrendingUp className="h-10 w-10 opacity-20" />
                        <p>لا توجد فواتير</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )
                : invoices.map(inv => (
                  <TableRow key={inv.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-mono text-sm py-3 text-muted-foreground">
                      #INV-{inv.id.toString().padStart(4, "0")}
                    </TableCell>
                    <TableCell className="font-semibold py-3">{inv.clientName}</TableCell>
                    <TableCell className="py-3 text-muted-foreground hidden md:table-cell">{inv.caseName || "—"}</TableCell>
                    <TableCell className="py-3 font-bold" dir="ltr">{inv.amount.toFixed(2)} TND</TableCell>
                    <TableCell className="py-3"><StatusBadge status={inv.status} /></TableCell>
                    <TableCell className="py-3 text-muted-foreground hidden sm:table-cell">
                      {inv.dueDate
                        ? new Date(inv.dueDate + "T00:00:00").toLocaleDateString("ar-TN")
                        : "—"}
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setEditInvoice(inv)}
                          className="p-1.5 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors" title="تعديل">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => remove(inv.id)}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="حذف">
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <button className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground" title="تحميل">
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              }
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* New Invoice Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="فاتورة جديدة">
        <div className="space-y-4">
          <FormField label="الحريف *" htmlFor="inv-client">
            <select id="inv-client" value={form.clientId}
              onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}
              className={inputCls + " px-3 cursor-pointer"}>
              <option value="">— اختر حريفاً —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </FormField>

          <FormField label="القضية (اختياري)" htmlFor="inv-case">
            <select id="inv-case" value={form.caseId}
              onChange={e => setForm(f => ({ ...f, caseId: e.target.value }))}
              className={inputCls + " px-3 cursor-pointer"}>
              <option value="">— بدون قضية —</option>
              {cases.map(c => (
                <option key={c.id} value={c.id}>
                  {c.caseNumber ? `${c.caseNumber} — ` : ""}{c.title}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="المبلغ (د.ت)" htmlFor="new-invoice-amount"
            hint="استخدم اللوحة الرقمية على اليمين لإدخال المبلغ">
            <Input
              id="new-invoice-amount"
              type="text"
              inputMode="decimal"
              placeholder="0.000"
              className="h-14 text-2xl font-bold font-mono tracking-wider focus-visible:ring-primary text-left bg-muted/30 border-primary/30 rounded-lg"
              dir="ltr"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              {...amountKeypad}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="الحالة" htmlFor="inv-status">
              <select id="inv-status" className={inputCls + " px-3 cursor-pointer"}
                value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="pending">في الانتظار</option>
                <option value="paid">مدفوعة</option>
                <option value="cancelled">ملغاة</option>
              </select>
            </FormField>
            <FormField label="تاريخ الاستحقاق" htmlFor="inv-due">
              <Input id="inv-due" type="date" className={inputCls} dir="ltr"
                value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
            </FormField>
          </div>

          <FormField label="ملاحظات" htmlFor="inv-notes">
            <textarea id="inv-notes" rows={2} placeholder="وصف الأتعاب أو ملاحظات إضافية..."
              className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </FormField>

          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={saveNew} disabled={saving || !form.clientId}>
              {saving ? "جاري الحفظ..." : "حفظ الفاتورة"}
            </Button>
            <Button variant="outline" onClick={() => setShowModal(false)} className="px-6">إلغاء</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Invoice Modal */}
      {editInvoice && (
        <Modal open={!!editInvoice} onClose={() => setEditInvoice(null)}
          title={`تعديل الفاتورة #INV-${editInvoice.id.toString().padStart(4, "0")}`}>
          <div className="space-y-4">
            <div className="p-4 bg-muted/30 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">الحريف:</span>
                <span className="font-semibold">{editInvoice.clientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">المبلغ:</span>
                <span className="font-bold font-mono">{editInvoice.amount.toFixed(2)} د.ت</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">التاريخ:</span>
                <span>{new Date(editInvoice.createdAt).toLocaleDateString("ar-TN")}</span>
              </div>
            </div>

            <FormField label="تغيير الحالة" htmlFor="edit-status">
              <select id="edit-status" className={inputCls + " px-3 cursor-pointer"}
                value={editInvoice.status}
                onChange={e => setEditInvoice(inv => inv ? { ...inv, status: e.target.value } : null)}>
                <option value="pending">في الانتظار</option>
                <option value="paid">مدفوعة</option>
                <option value="cancelled">ملغاة</option>
              </select>
            </FormField>

            <FormField label="تاريخ الاستحقاق" htmlFor="edit-due">
              <Input id="edit-due" type="date" className={inputCls} dir="ltr"
                value={editInvoice.dueDate ?? ""}
                onChange={e => setEditInvoice(inv => inv ? { ...inv, dueDate: e.target.value || null } : null)} />
            </FormField>

            <FormField label="ملاحظات" htmlFor="edit-notes">
              <textarea id="edit-notes" rows={2}
                className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                value={editInvoice.notes ?? ""}
                onChange={e => setEditInvoice(inv => inv ? { ...inv, notes: e.target.value || null } : null)} />
            </FormField>

            <div className="flex gap-3 pt-2">
              <Button className="flex-1" onClick={saveEdit} disabled={saving}>
                {saving ? "جاري الحفظ..." : "حفظ التعديلات"}
              </Button>
              <Button variant="outline" onClick={() => setEditInvoice(null)} className="px-6">إلغاء</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

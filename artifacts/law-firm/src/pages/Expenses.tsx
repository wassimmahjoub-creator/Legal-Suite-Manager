import { SelectNative } from "@/components/SelectNative";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/Money";
import { formatDateTN } from "@/lib/date";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Modal, FormField } from "@/components/Modal";
import { Plus, Receipt, TrendingDown, Banknote, Scale, Trash2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLocale } from "@/context/LocaleContext";
import { authFetch } from "@/lib/authFetch";
import { SkeletonTable } from "@/components/ui/skeletons";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDestructive } from "@/components/ui/ConfirmDestructive";
import { useMutate } from "@/hooks/useMutate";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

interface CaseOption { id: number; title: string; caseNumber: string | null; }

interface ExpenseType {
  value: string;
  ar: string;
  fr: string;
}

const EXPENSE_TYPES: ExpenseType[] = [
  { value: "court_fees",    ar: "حقوق الكتابة",          fr: "Droits de greffe"       },
  { value: "expert_fees",   ar: "رسوم الخبير",            fr: "Frais d'expertise"      },
  { value: "bailiff",       ar: "رسوم الأعوان القضائيين", fr: "Frais d'huissier"       },
  { value: "travel",        ar: "مصاريف السفر والتنقل",   fr: "Frais de déplacement"   },
  { value: "stamps",        ar: "طوابع فسكالية",          fr: "Timbres fiscaux"        },
  { value: "postage",       ar: "مصاريف المراسلة",        fr: "Frais de courrier"      },
  { value: "process",       ar: "رسوم المحضر",            fr: "Frais de signification" },
  { value: "translation",   ar: "رسوم الترجمة",           fr: "Frais de traduction"    },
  { value: "corr_lawyer",   ar: "أتعاب محامي مراسل",     fr: "Honoraires confrère"    },
  { value: "other",         ar: "أخرى",                   fr: "Autres"                 },
];

interface Expense {
  id: number;
  date: string;
  caseId: number | null;
  caseTitle: string;
  typeValue: string;
  description: string;
  amount: number;
  reimbursable: boolean;
}

function getTypeLabel(value: string, locale: "ar" | "fr"): string {
  const t = EXPENSE_TYPES.find(t => t.value === value);
  if (!t) return value;
  return locale === "ar" ? t.ar : t.fr;
}

function getTypeAlt(value: string, locale: "ar" | "fr"): string {
  const t = EXPENSE_TYPES.find(t => t.value === value);
  if (!t) return value;
  return locale === "ar" ? t.fr : t.ar;
}

export default function Expenses() {
  const locale = useLocale();
  const [, navigate] = useLocation();

  const [cases, setCases] = useState<CaseOption[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [filterCase, setFilterCase] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const mutate = useMutate();

  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    caseId: "",
    typeValue: EXPENSE_TYPES[0].value,
    description: "",
    amount: "",
    reimbursable: true,
  });

  async function load() {
    setIsLoading(true);
    try {
      const [casesRes, expensesRes] = await Promise.all([
        authFetch(`${BASE}/api/cases`),
        authFetch(`${BASE}/api/expenses`),
      ]);
      const casesData: CaseOption[] = casesRes.ok ? await casesRes.json() : [];
      const expensesData: any[] = expensesRes.ok ? await expensesRes.json() : [];
      const active = casesData.filter((c: any) => !c.deletedAt);
      setCases(active);
      if (active.length > 0 && !form.caseId) {
        setForm(f => ({ ...f, caseId: String(active[0].id) }));
      }
      setExpenses(expensesData.map((e: any) => ({
        ...e,
        caseTitle: active.find(c => c.id === e.caseId)?.title ?? "—",
      })));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function saveExpense() {
    if (!form.description || !form.amount || !form.caseId) return;
    const ok = await mutate(
      () => authFetch(`${BASE}/api/expenses`, {
        method: "POST",
        body: JSON.stringify({
          date: form.date,
          caseId: Number(form.caseId),
          typeValue: form.typeValue,
          description: form.description,
          amount: parseFloat(form.amount),
          reimbursable: form.reimbursable,
        }),
      }),
      { successMsg: "تمت إضافة المصروف", errorMsg: "فشل حفظ المصروف" }
    );
    if (ok !== null) {
      setForm(f => ({ ...f, description: "", amount: "" }));
      setShowModal(false);
      await load();
    }
  }

  async function deleteExpense(id: number) {
    const ok = await mutate(
      () => authFetch(`${BASE}/api/expenses/${id}`, { method: "DELETE" }),
      { successMsg: "تم حذف المصروف", errorMsg: "فشل الحذف" }
    );
    if (ok !== null) {
      setConfirmId(null);
      await load();
    }
  }

  const filtered = filterCase === "all"
    ? expenses
    : expenses.filter(e => String(e.caseId) === filterCase);

  const total           = filtered.reduce((s, e) => s + e.amount, 0);
  const reimbursable    = filtered.filter(e => e.reimbursable).reduce((s, e) => s + e.amount, 0);
  const notReimbursable = total - reimbursable;

  const inputCls = "h-10 bg-muted/50 border-border focus-visible:ring-1 focus-visible:ring-primary rounded-lg w-full";

  function caseLabel(c: CaseOption) {
    return c.caseNumber ? `${c.caseNumber} — ${c.title}` : c.title;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">المصاريف</h1>
            <p className="text-muted-foreground text-sm mt-0.5">تتبع مصاريف الملفات والتكاليف القابلة للاسترجاع</p>
          </div>
          <Button onClick={() => setShowModal(true)} className="rounded-lg gap-2 px-5">
            <Plus className="h-4 w-4" /> إضافة مصروف
          </Button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-none shadow-sm">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-destructive/10 rounded-xl"><TrendingDown className="h-5 w-5 text-destructive" /></div>
              <div>
                <p className="text-xs text-muted-foreground">إجمالي المصاريف</p>
                <Money amount={total} className="text-xl font-bold" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-success/10 rounded-xl"><Banknote className="h-5 w-5 text-success" /></div>
              <div>
                <p className="text-xs text-muted-foreground">قابلة للاسترجاع</p>
                <Money amount={reimbursable} className="text-xl font-bold" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-warning/10 rounded-xl"><Scale className="h-5 w-5 text-warning" /></div>
              <div>
                <p className="text-xs text-muted-foreground">مصاريف المكتب</p>
                <Money amount={notReimbursable} className="text-xl font-bold" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3">
          <SelectNative className="h-10 bg-card border border-border rounded-lg px-3 text-sm cursor-pointer w-72"
            value={filterCase} onChange={e => setFilterCase(e.target.value)}>
            <option value="all">كل الملفات</option>
            {cases.map(c => <option key={c.id} value={String(c.id)}>{caseLabel(c)}</option>)}
          </SelectNative>
        </div>

        {/* Table */}
        <Card className="border-none shadow-md overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-start py-3 px-4 font-semibold">التاريخ</th>
                    <th className="text-start py-3 px-4 font-semibold">القضية</th>
                    <th className="text-start py-3 px-4 font-semibold w-[200px]">نوع المصروف</th>
                    <th className="text-start py-3 px-4 font-semibold hidden md:table-cell">الوصف</th>
                    <th className="text-start py-3 px-4 font-semibold">المبلغ</th>
                    <th className="text-center py-3 px-4 font-semibold">قابل للاسترجاع</th>
                    <th className="text-center py-3 px-4 font-semibold w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    <tr><td colSpan={7} className="p-0"><SkeletonTable rows={5} cols={7} /></td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={7} className="py-0">
                      <EmptyState
                        illustration={<Receipt className="h-16 w-16 text-muted-foreground/30" />}
                        title="لا توجد مصاريف مسجلة"
                        description="سجّل مصاريف القضايا — ستظهر هنا فور إضافتها"
                      />
                    </td></tr>
                  ) : filtered.map(e => {
                    const label = getTypeLabel(e.typeValue, locale);
                    const alt   = getTypeAlt(e.typeValue, locale);
                    return (
                      <tr
                        key={e.id}
                        className="hover:bg-muted/20 transition-colors cursor-pointer"
                        onClick={() => e.caseId && navigate(`/cases/${e.caseId}`)}
                      >
                        <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                          {formatDateTN(e.date)}
                        </td>
                        <td className="py-3 px-4 font-medium max-w-[160px] truncate">
                          <span className="text-primary hover:underline">
                            {e.caseTitle}
                          </span>
                        </td>
                        <td className="py-3 px-4 w-[200px]" onClick={ev => ev.stopPropagation()}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="bg-muted/60 px-2 py-1 rounded-md text-xs block max-w-[184px] whitespace-nowrap overflow-hidden text-ellipsis cursor-default">
                                {label}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p className="font-medium">{alt}</p>
                            </TooltipContent>
                          </Tooltip>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">{e.description}</td>
                        <td className="py-3 px-4 font-bold" dir="ltr"><Money amount={e.amount} /></td>
                        <td className="py-3 px-4 text-center">
                          <span className={`text-xs px-2 py-1 rounded-full ${e.reimbursable ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                            {e.reimbursable ? "نعم" : "لا"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center" onClick={ev => ev.stopPropagation()}>
                          <button
                            onClick={() => setConfirmId(e.id)}
                            className="p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {filtered.length > 0 && (
                  <tfoot className="bg-muted/20 border-t border-border">
                    <tr>
                      <td colSpan={4} className="py-3 px-4 font-semibold text-muted-foreground text-left">المجموع</td>
                      <td className="py-3 px-4 font-bold text-primary" dir="ltr"><Money amount={total} /></td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Add Expense Modal */}
        <Modal open={showModal} onClose={() => setShowModal(false)} title="إضافة مصروف قضائي" size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="التاريخ *" htmlFor="exp-date">
                <Input id="exp-date" type="date" className={inputCls} dir="ltr"
                  value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </FormField>
              <FormField label="القضية *" htmlFor="exp-case">
                <SelectNative id="exp-case" className={inputCls + " px-3 cursor-pointer"}
                  value={form.caseId} onChange={e => setForm(f => ({ ...f, caseId: e.target.value }))}>
                  {cases.map(c => <option key={c.id} value={String(c.id)}>{caseLabel(c)}</option>)}
                </SelectNative>
              </FormField>
            </div>
            <FormField label="نوع المصروف *" htmlFor="exp-type">
              <SelectNative id="exp-type" className={inputCls + " px-3 cursor-pointer"}
                value={form.typeValue} onChange={e => setForm(f => ({ ...f, typeValue: e.target.value }))}>
                {EXPENSE_TYPES.map(t => (
                  <option key={t.value} value={t.value}>
                    {locale === "ar" ? t.ar : t.fr} — {locale === "ar" ? t.fr : t.ar}
                  </option>
                ))}
              </SelectNative>
            </FormField>
            <FormField label="الوصف" htmlFor="exp-desc">
              <Input id="exp-desc" placeholder="تفاصيل المصروف..." className={inputCls}
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </FormField>
            <FormField label="المبلغ (د.ت) *" htmlFor="exp-amount">
              <Input id="exp-amount" type="number" step="0.01" placeholder="0.00" className={inputCls} dir="ltr"
                value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            </FormField>
            <label className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg cursor-pointer">
              <input type="checkbox" checked={form.reimbursable}
                onChange={e => setForm(f => ({ ...f, reimbursable: e.target.checked }))}
                className="h-4 w-4 accent-primary" />
              <div>
                <p className="text-sm font-medium">قابل للاسترجاع من الموكّل</p>
                <p className="text-xs text-muted-foreground">سيتم إضافة هذا المصروف إلى فاتورة الموكّل</p>
              </div>
            </label>
            <div className="flex gap-3 pt-2">
              <Button className="flex-1" onClick={saveExpense}>حفظ المصروف</Button>
              <Button variant="outline" onClick={() => setShowModal(false)} className="px-5">إلغاء</Button>
            </div>
          </div>
        </Modal>
      </div>

      <ConfirmDestructive
        open={confirmId !== null}
        onClose={() => setConfirmId(null)}
        onConfirm={() => deleteExpense(confirmId!)}
        title="حذف المصروف؟"
        description="سيتم حذف هذا المصروف نهائياً. هذا الإجراء لا يمكن التراجع عنه."
        confirmLabel="حذف"
      />
    </TooltipProvider>
  );
}

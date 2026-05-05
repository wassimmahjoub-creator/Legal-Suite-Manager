import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Modal, FormField } from "@/components/Modal";
import { Plus, Receipt, TrendingDown, Banknote, Scale, Trash2 } from "lucide-react";

const CASES = [
  "قضية ميراث عائلة بن علي",
  "قضية عقار الزهراء",
  "قضية عقد شراكة التريكي",
];

const EXPENSE_TYPES = [
  "حقوق الكتابة (droits de greffe)",
  "رسوم الخبير (frais d'expertise)",
  "رسوم الأعوان القضائيين",
  "مصاريف السفر والتنقل",
  "طوابع فسكالية",
  "مصاريف المراسلة",
  "رسوم المحضر (huissier)",
  "رسوم الترجمة",
  "أتعاب محامي مراسل",
  "أخرى",
];

const INITIAL = [
  { id: 1, date: "2026-05-03", case: "قضية ميراث عائلة بن علي", type: "حقوق الكتابة (droits de greffe)", description: "دفع حقوق تسجيل الدعوى", amount: 120, reimbursable: true },
  { id: 2, date: "2026-05-01", case: "قضية عقار الزهراء", type: "رسوم الخبير (frais d'expertise)", description: "أتعاب خبير عقاري", amount: 800, reimbursable: true },
  { id: 3, date: "2026-04-28", case: "قضية عقد شراكة التريكي", type: "رسوم الأعوان القضائيين", description: "تبليغ استدعاء", amount: 45, reimbursable: true },
  { id: 4, date: "2026-04-25", case: "قضية ميراث عائلة بن علي", type: "مصاريف السفر والتنقل", description: "تنقل للمحكمة الابتدائية تونس", amount: 30, reimbursable: false },
  { id: 5, date: "2026-04-20", case: "قضية عقار الزهراء", type: "طوابع فسكالية", description: "طوابع الطعن بالاستئناف", amount: 15, reimbursable: true },
];

export default function Expenses() {
  const [expenses, setExpenses] = useState(INITIAL);
  const [showModal, setShowModal] = useState(false);
  const [filterCase, setFilterCase] = useState("all");
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    case: CASES[0],
    type: EXPENSE_TYPES[0],
    description: "",
    amount: "",
    reimbursable: true,
  });

  const filtered = filterCase === "all" ? expenses : expenses.filter(e => e.case === filterCase);
  const total = filtered.reduce((s, e) => s + e.amount, 0);
  const reimbursable = filtered.filter(e => e.reimbursable).reduce((s, e) => s + e.amount, 0);
  const notReimbursable = total - reimbursable;

  const inputCls = "h-10 bg-muted/50 border-border focus-visible:ring-1 focus-visible:ring-primary rounded-lg w-full";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">المصاريف القضائية</h1>
          <p className="text-muted-foreground text-sm mt-0.5">تتبع مصاريف التقاضي والتكاليف القابلة للاسترجاع</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="rounded-lg gap-2 px-5">
          <Plus className="h-4 w-4" /> إضافة مصروف
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-red-500/10 rounded-xl"><TrendingDown className="h-5 w-5 text-red-400" /></div>
            <div>
              <p className="text-xs text-muted-foreground">إجمالي المصاريف</p>
              <p className="text-xl font-bold" dir="ltr">{total.toFixed(2)} <span className="text-sm font-normal">د.ت</span></p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-green-500/10 rounded-xl"><Banknote className="h-5 w-5 text-green-500" /></div>
            <div>
              <p className="text-xs text-muted-foreground">قابلة للاسترجاع</p>
              <p className="text-xl font-bold" dir="ltr">{reimbursable.toFixed(2)} <span className="text-sm font-normal">د.ت</span></p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-orange-500/10 rounded-xl"><Scale className="h-5 w-5 text-orange-500" /></div>
            <div>
              <p className="text-xs text-muted-foreground">مصاريف المكتب</p>
              <p className="text-xl font-bold" dir="ltr">{notReimbursable.toFixed(2)} <span className="text-sm font-normal">د.ت</span></p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <select className="h-10 bg-card border border-border rounded-lg px-3 text-sm cursor-pointer w-64"
          value={filterCase} onChange={e => setFilterCase(e.target.value)}>
          <option value="all">كل القضايا</option>
          {CASES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      <Card className="border-none shadow-md overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-right py-3 px-4 font-semibold">التاريخ</th>
                  <th className="text-right py-3 px-4 font-semibold">القضية</th>
                  <th className="text-right py-3 px-4 font-semibold">نوع المصروف</th>
                  <th className="text-right py-3 px-4 font-semibold hidden md:table-cell">الوصف</th>
                  <th className="text-right py-3 px-4 font-semibold">المبلغ</th>
                  <th className="text-center py-3 px-4 font-semibold">قابل للاسترجاع</th>
                  <th className="text-center py-3 px-4 font-semibold w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-muted-foreground">
                      <Receipt className="h-10 w-10 mx-auto mb-3 opacity-20" />
                      <p>لا توجد مصاريف مسجلة</p>
                    </td>
                  </tr>
                ) : filtered.map(e => (
                  <tr key={e.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4 text-muted-foreground">{new Date(e.date).toLocaleDateString("ar-TN")}</td>
                    <td className="py-3 px-4 font-medium max-w-[160px] truncate">{e.case}</td>
                    <td className="py-3 px-4">
                      <span className="bg-muted/60 px-2 py-1 rounded-md text-xs">{e.type}</span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">{e.description}</td>
                    <td className="py-3 px-4 font-bold" dir="ltr">{e.amount.toFixed(2)} د.ت</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-xs px-2 py-1 rounded-full ${e.reimbursable ? "bg-green-500/10 text-green-400" : "bg-muted text-muted-foreground"}`}>
                        {e.reimbursable ? "نعم" : "لا"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setExpenses(es => es.filter(x => x.id !== e.id))}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              {filtered.length > 0 && (
                <tfoot className="bg-muted/20 border-t border-border">
                  <tr>
                    <td colSpan={4} className="py-3 px-4 font-semibold text-muted-foreground text-left">المجموع</td>
                    <td className="py-3 px-4 font-bold text-primary" dir="ltr">{total.toFixed(2)} د.ت</td>
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
              <select id="exp-case" className={inputCls + " px-3 cursor-pointer"}
                value={form.case} onChange={e => setForm(f => ({ ...f, case: e.target.value }))}>
                {CASES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </FormField>
          </div>
          <FormField label="نوع المصروف *" htmlFor="exp-type">
            <select id="exp-type" className={inputCls + " px-3 cursor-pointer"}
              value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              {EXPENSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
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
              <p className="text-sm font-medium">قابل للاسترجاع من الحريف</p>
              <p className="text-xs text-muted-foreground">سيتم إضافة هذا المصروف إلى فاتورة الحريف</p>
            </div>
          </label>
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={() => {
              if (form.description && form.amount) {
                setExpenses(es => [{ id: Date.now(), date: form.date, case: form.case, type: form.type, description: form.description, amount: parseFloat(form.amount), reimbursable: form.reimbursable }, ...es]);
                setForm({ date: new Date().toISOString().split("T")[0], case: CASES[0], type: EXPENSE_TYPES[0], description: "", amount: "", reimbursable: true });
              }
              setShowModal(false);
            }}>حفظ المصروف</Button>
            <Button variant="outline" onClick={() => setShowModal(false)} className="px-5">إلغاء</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

import { SelectNative } from "@/components/SelectNative";
import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { formatDateTN } from "@/lib/date";
import { Money } from "@/components/Money";
import { formatCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal, FormField } from "@/components/Modal";
import { Play, Pause, Square, Plus, Timer, TrendingUp, Clock, Receipt } from "lucide-react";

const CASES = [
  "قضية ميراث عائلة بن علي",
  "قضية عقار الزهراء",
  "قضية عقد شراكة التريكي",
];

const INITIAL_ENTRIES = [
  { id: 1, date: "2026-05-04", case: "قضية ميراث عائلة بن علي", description: "دراسة الملف وتحضير الدفاع", hours: 2.5, rate: 150, billable: true },
  { id: 2, date: "2026-05-03", case: "قضية عقار الزهراء", description: "اجتماع مع الموكّل ومراجعة العقود", hours: 1.5, rate: 150, billable: true },
  { id: 3, date: "2026-05-02", case: "قضية عقد شراكة التريكي", description: "صياغة مذكرة الرد", hours: 3.0, rate: 150, billable: true },
  { id: 4, date: "2026-05-01", case: "قضية ميراث عائلة بن علي", description: "حضور جلسة المحكمة", hours: 2.0, rate: 200, billable: true },
  { id: 5, date: "2026-04-30", case: "قضية عقار الزهراء", description: "مراسلة كاتب المحكمة", hours: 0.5, rate: 150, billable: false },
];

function fmt(secs: number) {
  const h = Math.floor(secs / 3600).toString().padStart(2, "0");
  const m = Math.floor((secs % 3600) / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export default function TimeTracking() {
  const [entries, setEntries] = useState(INITIAL_ENTRIES);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [timerCase, setTimerCase] = useState(CASES[0]);
  const [timerDesc, setTimerDesc] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [filterCase, setFilterCase] = useState("all");
  const [form, setForm] = useState({ date: new Date().toISOString().split("T")[0], case: CASES[0], description: "", hours: "", rate: "150", billable: true });
  const interval = useRef<any>(null);
  const [, navigate] = useLocation();

  useEffect(() => {
    if (running) {
      interval.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      clearInterval(interval.current);
    }
    return () => clearInterval(interval.current);
  }, [running]);

  const stopTimer = () => {
    setRunning(false);
    if (elapsed > 60) {
      const hours = parseFloat((elapsed / 3600).toFixed(2));
      setEntries(es => [{ id: Date.now(), date: new Date().toISOString().split("T")[0], case: timerCase, description: timerDesc || "وقت مسجّل بالكرونومتر", hours, rate: 150, billable: true }, ...es]);
    }
    setElapsed(0);
    setTimerDesc("");
  };

  const filtered = filterCase === "all" ? entries : entries.filter(e => e.case === filterCase);
  const totalHours = filtered.reduce((s, e) => s + e.hours, 0);
  const totalAmount = filtered.reduce((s, e) => e.billable ? s + e.hours * e.rate : s, 0);
  const billableHours = filtered.filter(e => e.billable).reduce((s, e) => s + e.hours, 0);

  const inputCls = "h-10 bg-muted/50 border-border focus-visible:ring-1 focus-visible:ring-primary rounded-lg w-full";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">بيان الوقت</h1>
          <p className="text-muted-foreground text-sm mt-0.5">تتبع الوقت المخصص لكل قضية وتحويله إلى فاتورة</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="rounded-lg gap-2 px-5">
          <Plus className="h-4 w-4" /> إدخال يدوي
        </Button>
      </div>

      {/* Stopwatch */}
      <Card className="border-none shadow-md bg-gradient-to-l from-primary/5 to-card">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="text-center">
              <div className="text-5xl font-mono font-bold tracking-wider text-primary" dir="ltr">
                {fmt(elapsed)}
              </div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                <Timer className="h-3 w-3" /> الكرونومتر
              </p>
            </div>
            <div className="flex-1 space-y-3 w-full">
              <SelectNative
                className={inputCls + " px-3 cursor-pointer"}
                value={timerCase}
                onChange={e => setTimerCase(e.target.value)}
              >
                {CASES.map(c => <option key={c} value={c}>{c}</option>)}
              </SelectNative>
              <Input
                placeholder="وصف النشاط (اختياري)..."
                className={inputCls}
                value={timerDesc}
                onChange={e => setTimerDesc(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setRunning(r => !r)}
                className={`p-4 rounded-full transition-all shadow-md ${running ? "bg-warning hover:bg-warning/90" : "bg-primary hover:bg-primary/90"} text-primary-foreground`}
              >
                {running ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
              </button>
              {(running || elapsed > 0) && (
                <button
                  onClick={stopTimer}
                  className="p-4 rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground transition-all shadow-md"
                >
                  <Square className="h-6 w-6" />
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "إجمالي الساعات", value: `${totalHours.toFixed(1)} س`, icon: Clock, color: "text-info" },
          { label: "ساعات قابلة للفوترة", value: `${billableHours.toFixed(1)} س`, icon: Timer, color: "text-primary" },
          { label: "المبلغ القابل للفوترة", value: formatCurrency(totalAmount, "ar"), icon: TrendingUp, color: "text-success" },
          { label: "المعدل اليومي", value: `${(totalHours / Math.max(1, [...new Set(filtered.map(e => e.date))].length)).toFixed(1)} س`, icon: Receipt, color: "text-muted-foreground" },
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2.5 bg-muted/50 rounded-lg ${stat.color}`}>
                <stat.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="font-bold text-sm mt-0.5" dir="ltr">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <SelectNative className="h-10 bg-card border border-border rounded-lg px-3 text-sm cursor-pointer w-64"
          value={filterCase} onChange={e => setFilterCase(e.target.value)}>
          <option value="all">كل القضايا</option>
          {CASES.map(c => <option key={c} value={c}>{c}</option>)}
        </SelectNative>
        {filterCase !== "all" && (
          <Button size="sm" variant="outline" className="gap-2 h-10" onClick={() => navigate("/billing")}>
            <Receipt className="h-4 w-4" /> تحويل إلى فاتورة
          </Button>
        )}
      </div>

      {/* Entries Table */}
      <Card className="border-none shadow-md overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-start py-3 px-4 font-semibold">التاريخ</th>
                  <th className="text-start py-3 px-4 font-semibold">القضية</th>
                  <th className="text-start py-3 px-4 font-semibold">الوصف</th>
                  <th className="text-start py-3 px-4 font-semibold">الساعات</th>
                  <th className="text-start py-3 px-4 font-semibold">المعدل</th>
                  <th className="text-start py-3 px-4 font-semibold">المبلغ</th>
                  <th className="text-center py-3 px-4 font-semibold">فاتورة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(e => (
                  <tr key={e.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4 text-muted-foreground">{formatDateTN(e.date)}</td>
                    <td className="py-3 px-4 font-medium max-w-[200px] truncate">{e.case}</td>
                    <td className="py-3 px-4 text-muted-foreground">{e.description}</td>
                    <td className="py-3 px-4 font-mono" dir="ltr">{e.hours.toFixed(2)}</td>
                    <td className="py-3 px-4 text-muted-foreground" dir="ltr"><Money amount={e.rate} />/س</td>
                    <td className="py-3 px-4 font-bold" dir="ltr"><Money amount={e.hours * e.rate} /></td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-xs px-2 py-1 rounded-full ${e.billable ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                        {e.billable ? "نعم" : "لا"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add Entry Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="إدخال وقت يدوي" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="التاريخ *" htmlFor="te-date">
              <Input id="te-date" type="date" className={inputCls} dir="ltr"
                value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </FormField>
            <FormField label="القضية *" htmlFor="te-case">
              <SelectNative id="te-case" className={inputCls + " px-3 cursor-pointer"}
                value={form.case} onChange={e => setForm(f => ({ ...f, case: e.target.value }))}>
                {CASES.map(c => <option key={c} value={c}>{c}</option>)}
              </SelectNative>
            </FormField>
          </div>
          <FormField label="وصف النشاط *" htmlFor="te-desc">
            <Input id="te-desc" placeholder="مثال: دراسة الملف وتحضير الدفاع" className={inputCls}
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="عدد الساعات *" htmlFor="te-hours">
              <Input id="te-hours" type="number" step="0.25" placeholder="1.5" className={inputCls} dir="ltr"
                value={form.hours} onChange={e => setForm(f => ({ ...f, hours: e.target.value }))} />
            </FormField>
            <FormField label="المعدل (د.ت/ساعة)" htmlFor="te-rate">
              <Input id="te-rate" type="number" className={inputCls} dir="ltr"
                value={form.rate} onChange={e => setForm(f => ({ ...f, rate: e.target.value }))} />
            </FormField>
          </div>
          <FormField label="قابل للفوترة" htmlFor="te-billable">
            <label className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg cursor-pointer">
              <input type="checkbox" checked={form.billable}
                onChange={e => setForm(f => ({ ...f, billable: e.target.checked }))}
                className="h-4 w-4 accent-primary" />
              <span className="text-sm">هذا الوقت قابل للفوترة للموكّل</span>
            </label>
          </FormField>
          {form.hours && form.rate && (
            <div className="p-3 bg-primary/10 rounded-lg flex justify-between items-center">
              <span className="text-sm text-primary font-medium">المبلغ الإجمالي:</span>
              <span className="font-bold text-primary" dir="ltr">
                <Money amount={parseFloat(form.hours) * parseFloat(form.rate)} />
              </span>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={() => {
              if (form.description && form.hours) {
                setEntries(es => [{
                  id: Date.now(),
                  date: form.date,
                  case: form.case,
                  description: form.description,
                  hours: parseFloat(form.hours),
                  rate: parseFloat(form.rate),
                  billable: form.billable
                }, ...es]);
                setForm({ date: new Date().toISOString().split("T")[0], case: CASES[0], description: "", hours: "", rate: "150", billable: true });
              }
              setShowModal(false);
            }}>حفظ الإدخال</Button>
            <Button variant="outline" onClick={() => setShowModal(false)} className="px-5">إلغاء</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

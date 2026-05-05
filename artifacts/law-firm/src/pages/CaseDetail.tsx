import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useGetCase } from "@workspace/api-client-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Modal, FormField } from "@/components/Modal";
import {
  Plus, MapPin, User, Calendar, FileText, CheckCircle2,
  Clock, Briefcase, ArrowRight, Upload, Edit2, Trash2,
  StickyNote, CreditCard, CircleCheck, Circle
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type ModalType = "doc" | "task" | "note" | "event" | "invoice" | "edit" | null;

const mockTasks = [
  { id: 1, title: "تحضير ملف الميراث", done: true, due: "2026-05-01" },
  { id: 2, title: "جمع وثائق الملكية", done: false, due: "2026-05-10" },
  { id: 3, title: "مراسلة كتابة المحكمة", done: false, due: "2026-05-15" },
];

const mockDocs = [
  { id: 1, title: "عقد التوكيل.pdf", type: "وكالة", date: "2026-04-01" },
  { id: 2, title: "شهادة الوارثين.pdf", type: "وثيقة رسمية", date: "2026-04-10" },
];

const mockEvents = [
  { id: 1, title: "جلسة أولى", date: "2026-05-15", time: "09:00", location: "قاعة 3" },
  { id: 2, title: "اجتماع مع الحريف", date: "2026-05-10", time: "14:00", location: "المكتب" },
];

const mockInvoices = [
  { id: 1, amount: 1500, status: "pending", date: "2026-04-15" },
  { id: 2, amount: 800, status: "paid", date: "2026-03-20" },
];

export default function CaseDetail() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { data: caseData, isLoading } = useGetCase(Number(id), { query: { enabled: !!id } });
  const [modal, setModal] = useState<ModalType>(null);
  const [tasks, setTasks] = useState(mockTasks);

  const inputCls = "h-10 bg-muted/50 border-border focus-visible:ring-1 focus-visible:ring-primary rounded-lg w-full";

  const [docForm, setDocForm] = useState({ title: "", type: "عقد", notes: "" });
  const [taskForm, setTaskForm] = useState({ title: "", due: "", priority: "medium" });
  const [noteForm, setNoteForm] = useState({ content: "" });
  const [eventForm, setEventForm] = useState({ title: "", date: "", time: "", location: "" });
  const [invoiceForm, setInvoiceForm] = useState({ amount: "", status: "pending" });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="text-center p-16 space-y-4">
        <p className="text-muted-foreground text-lg">القضية غير موجودة</p>
        <Button variant="outline" onClick={() => navigate("/cases")} className="gap-2">
          <ArrowRight className="h-4 w-4" /> العودة للقضايا
        </Button>
      </div>
    );
  }

  const toggleTask = (taskId: number) => {
    setTasks(ts => ts.map(t => t.id === taskId ? { ...t, done: !t.done } : t));
  };

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        onClick={() => navigate("/cases")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowRight className="h-4 w-4" />
        العودة للقضايا
      </button>

      {/* Case Header */}
      <div className="bg-card rounded-xl shadow-sm p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden border border-border/50">
        <div className="absolute top-0 right-0 w-1 h-full bg-primary" />
        <div className="space-y-3 pr-4">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-bold">{caseData.title}</h1>
            <StatusBadge status={caseData.status} />
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" />{caseData.clientName}</span>
            {caseData.court && <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{caseData.court}</span>}
            {caseData.lawyer && <span className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" />{caseData.lawyer}</span>}
            <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{new Date(caseData.createdAt).toLocaleDateString("ar-TN")}</span>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setModal("edit")} className="gap-2 shrink-0">
          <Edit2 className="h-4 w-4" /> تعديل القضية
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Tabs */}
        <div className="lg:col-span-3">
          <Tabs defaultValue="overview">
            <TabsList className="w-full justify-start bg-transparent border-b border-border rounded-none h-auto p-0 mb-6 gap-1 overflow-x-auto">
              {[
                { value: "overview", label: "نظرة عامة" },
                { value: "tasks", label: `مهام (${tasks.length})` },
                { value: "docs", label: `وثائق (${mockDocs.length})` },
                { value: "calendar", label: "الرزنامة" },
                { value: "billing", label: "الفوترة" },
              ].map(tab => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 py-3 text-sm whitespace-nowrap"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Overview */}
            <TabsContent value="overview" className="space-y-4">
              <Card className="border-none shadow-sm">
                <CardContent className="p-5 space-y-3">
                  <h3 className="font-semibold">الوصف</h3>
                  <p className="text-muted-foreground leading-relaxed text-sm">
                    {caseData.description || "لا يوجد وصف لهذه القضية."}
                  </p>
                </CardContent>
              </Card>
              {caseData.notes && (
                <Card className="border-none shadow-sm bg-primary/5 border-r-2 border-r-primary">
                  <CardContent className="p-5 space-y-2">
                    <h3 className="font-semibold flex items-center gap-2"><StickyNote className="h-4 w-4 text-primary" /> ملاحظات</h3>
                    <p className="text-muted-foreground leading-relaxed text-sm">{caseData.notes}</p>
                  </CardContent>
                </Card>
              )}
              {!caseData.notes && (
                <button
                  onClick={() => setModal("note")}
                  className="w-full border-2 border-dashed border-border rounded-xl p-6 text-center text-muted-foreground hover:border-primary/50 hover:bg-primary/5 transition-colors text-sm flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4" /> أضف ملاحظة
                </button>
              )}
            </TabsContent>

            {/* Tasks */}
            <TabsContent value="tasks" className="space-y-3">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-muted-foreground">{tasks.filter(t => t.done).length}/{tasks.length} مكتملة</span>
                <Button size="sm" onClick={() => setModal("task")} className="gap-1.5 h-8">
                  <Plus className="h-3.5 w-3.5" /> مهمة جديدة
                </Button>
              </div>
              {tasks.map(task => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border/50 hover:shadow-sm transition-shadow group"
                >
                  <button onClick={() => toggleTask(task.id)} className="shrink-0 text-muted-foreground hover:text-primary transition-colors">
                    {task.done
                      ? <CircleCheck className="h-5 w-5 text-green-500" />
                      : <Circle className="h-5 w-5" />
                    }
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${task.done ? "line-through text-muted-foreground" : ""}`}>
                      {task.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">الأجل: {new Date(task.due).toLocaleDateString("ar-TN")}</p>
                  </div>
                  <button className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-all">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {tasks.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">لا توجد مهام</p>
                </div>
              )}
            </TabsContent>

            {/* Docs */}
            <TabsContent value="docs" className="space-y-3">
              <div className="flex justify-end mb-4">
                <Button size="sm" onClick={() => setModal("doc")} className="gap-1.5 h-8">
                  <Upload className="h-3.5 w-3.5" /> رفع وثيقة
                </Button>
              </div>
              {mockDocs.map(doc => (
                <div key={doc.id} className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border/50 hover:shadow-sm transition-shadow group">
                  <div className="p-3 bg-red-500/10 rounded-lg shrink-0">
                    <FileText className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">{doc.type} • {new Date(doc.date).toLocaleDateString("ar-TN")}</p>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                    <button className="p-1.5 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors">
                      <FileText className="h-4 w-4" />
                    </button>
                    <button className="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </TabsContent>

            {/* Calendar */}
            <TabsContent value="calendar" className="space-y-3">
              <div className="flex justify-end mb-4">
                <Button size="sm" onClick={() => setModal("event")} className="gap-1.5 h-8">
                  <Plus className="h-3.5 w-3.5" /> موعد جديد
                </Button>
              </div>
              {mockEvents.map(ev => (
                <div key={ev.id} className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border/50 hover:shadow-sm transition-shadow">
                  <div className="p-3 bg-primary/10 rounded-lg shrink-0">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{ev.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(ev.date).toLocaleDateString("ar-TN")} • {ev.time} • {ev.location}
                    </p>
                  </div>
                </div>
              ))}
            </TabsContent>

            {/* Billing */}
            <TabsContent value="billing" className="space-y-3">
              <div className="flex justify-end mb-4">
                <Button size="sm" onClick={() => setModal("invoice")} className="gap-1.5 h-8">
                  <Plus className="h-3.5 w-3.5" /> فاتورة جديدة
                </Button>
              </div>
              {mockInvoices.map(inv => (
                <div key={inv.id} className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border/50">
                  <div className="p-3 bg-green-500/10 rounded-lg shrink-0">
                    <CreditCard className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm" dir="ltr">{inv.amount.toFixed(2)} TND</p>
                    <p className="text-xs text-muted-foreground">{new Date(inv.date).toLocaleDateString("ar-TN")}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    inv.status === "paid" ? "bg-green-500/10 text-green-500" : "bg-orange-500/10 text-orange-500"
                  }`}>
                    {inv.status === "paid" ? "مدفوعة" : "في الانتظار"}
                  </span>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </div>

        {/* Quick Actions Sidebar */}
        <div className="space-y-4">
          <Card className="border-none shadow-sm">
            <CardContent className="p-4 space-y-2">
              <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wide mb-3">إجراءات سريعة</h3>
              <button
                onClick={() => setModal("doc")}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-medium text-sm transition-colors"
              >
                <Upload className="h-4 w-4 shrink-0" /> زيد وثيقة
              </button>
              <button
                onClick={() => setModal("task")}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-medium text-sm transition-colors"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0" /> زيد مهمة
              </button>
              <button
                onClick={() => setModal("note")}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 font-medium text-sm transition-colors"
              >
                <StickyNote className="h-4 w-4 shrink-0" /> زيد ملاحظة
              </button>
              <button
                onClick={() => setModal("event")}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 font-medium text-sm transition-colors"
              >
                <Calendar className="h-4 w-4 shrink-0" /> زيد موعد
              </button>
              <button
                onClick={() => setModal("invoice")}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-green-500/10 hover:bg-green-500/20 text-green-400 font-medium text-sm transition-colors"
              >
                <CreditCard className="h-4 w-4 shrink-0" /> زيد فاتورة
              </button>
            </CardContent>
          </Card>

          {/* Case Info */}
          <Card className="border-none shadow-sm">
            <CardContent className="p-4 space-y-3">
              <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wide">معلومات القضية</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الحريف</span>
                  <span className="font-medium">{caseData.clientName}</span>
                </div>
                {caseData.court && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">المحكمة</span>
                    <span className="font-medium text-left max-w-28 truncate">{caseData.court}</span>
                  </div>
                )}
                {caseData.nextHearing && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الجلسة القادمة</span>
                    <span className="font-medium text-primary">{new Date(caseData.nextHearing).toLocaleDateString("ar-TN")}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">تاريخ الفتح</span>
                  <span className="font-medium">{new Date(caseData.createdAt).toLocaleDateString("ar-TN")}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* === MODALS === */}

      {/* Add Document */}
      <Modal open={modal === "doc"} onClose={() => setModal(null)} title="رفع وثيقة جديدة">
        <div className="space-y-4">
          <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer">
            <Upload className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">اسحب الملف هنا أو انقر للاختيار</p>
            <p className="text-xs text-muted-foreground/60 mt-1">PDF, Word, Excel — حتى 20MB</p>
          </div>
          <FormField label="عنوان الوثيقة *" htmlFor="doc-title">
            <Input id="doc-title" placeholder="مثال: عقد شراكة موقع" className={inputCls}
              value={docForm.title} onChange={e => setDocForm(f => ({ ...f, title: e.target.value }))} />
          </FormField>
          <FormField label="نوع الوثيقة" htmlFor="doc-type">
            <select id="doc-type" className={inputCls + " px-3 cursor-pointer"}
              value={docForm.type} onChange={e => setDocForm(f => ({ ...f, type: e.target.value }))}>
              {["عقد", "وثيقة رسمية", "مراسلة", "حكم قضائي", "تقرير خبرة", "وكالة", "أخرى"].map(t =>
                <option key={t} value={t}>{t}</option>
              )}
            </select>
          </FormField>
          <FormField label="ملاحظات" htmlFor="doc-notes">
            <textarea id="doc-notes" rows={2} placeholder="ملاحظات..."
              className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              value={docForm.notes} onChange={e => setDocForm(f => ({ ...f, notes: e.target.value }))} />
          </FormField>
          <div className="flex gap-3">
            <Button className="flex-1" onClick={() => setModal(null)}>رفع الوثيقة</Button>
            <Button variant="outline" onClick={() => setModal(null)} className="px-5">إلغاء</Button>
          </div>
        </div>
      </Modal>

      {/* Add Task */}
      <Modal open={modal === "task"} onClose={() => setModal(null)} title="مهمة جديدة">
        <div className="space-y-4">
          <FormField label="عنوان المهمة *" htmlFor="task-title">
            <Input id="task-title" placeholder="مثال: تحضير مذكرة الرد" className={inputCls}
              value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} />
          </FormField>
          <FormField label="تاريخ الأجل" htmlFor="task-due">
            <Input id="task-due" type="date" className={inputCls} dir="ltr"
              value={taskForm.due} onChange={e => setTaskForm(f => ({ ...f, due: e.target.value }))} />
          </FormField>
          <FormField label="الأولوية" htmlFor="task-priority">
            <select id="task-priority" className={inputCls + " px-3 cursor-pointer"}
              value={taskForm.priority} onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value }))}>
              <option value="low">عادية</option>
              <option value="medium">متوسطة</option>
              <option value="high">عاجلة</option>
            </select>
          </FormField>
          <div className="flex gap-3">
            <Button className="flex-1" onClick={() => {
              if (taskForm.title) {
                setTasks(ts => [...ts, { id: Date.now(), title: taskForm.title, done: false, due: taskForm.due || new Date().toISOString().split("T")[0] }]);
                setTaskForm({ title: "", due: "", priority: "medium" });
              }
              setModal(null);
            }}>إضافة المهمة</Button>
            <Button variant="outline" onClick={() => setModal(null)} className="px-5">إلغاء</Button>
          </div>
        </div>
      </Modal>

      {/* Add Note */}
      <Modal open={modal === "note"} onClose={() => setModal(null)} title="إضافة ملاحظة">
        <div className="space-y-4">
          <FormField label="الملاحظة" htmlFor="note-content">
            <textarea id="note-content" rows={6} placeholder="اكتب ملاحظاتك هنا..."
              className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              value={noteForm.content} onChange={e => setNoteForm({ content: e.target.value })} />
          </FormField>
          <div className="flex gap-3">
            <Button className="flex-1" onClick={() => setModal(null)}>حفظ الملاحظة</Button>
            <Button variant="outline" onClick={() => setModal(null)} className="px-5">إلغاء</Button>
          </div>
        </div>
      </Modal>

      {/* Add Event */}
      <Modal open={modal === "event"} onClose={() => setModal(null)} title="موعد جديد">
        <div className="space-y-4">
          <FormField label="عنوان الموعد *" htmlFor="ev-title">
            <Input id="ev-title" placeholder="مثال: جلسة محكمة تونس" className={inputCls}
              value={eventForm.title} onChange={e => setEventForm(f => ({ ...f, title: e.target.value }))} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="التاريخ *" htmlFor="ev-date">
              <Input id="ev-date" type="date" className={inputCls} dir="ltr"
                value={eventForm.date} onChange={e => setEventForm(f => ({ ...f, date: e.target.value }))} />
            </FormField>
            <FormField label="الوقت" htmlFor="ev-time">
              <Input id="ev-time" type="time" className={inputCls} dir="ltr"
                value={eventForm.time} onChange={e => setEventForm(f => ({ ...f, time: e.target.value }))} />
            </FormField>
          </div>
          <FormField label="المكان" htmlFor="ev-loc">
            <Input id="ev-loc" placeholder="مثال: قاعة 3 — محكمة تونس" className={inputCls}
              value={eventForm.location} onChange={e => setEventForm(f => ({ ...f, location: e.target.value }))} />
          </FormField>
          <div className="flex gap-3">
            <Button className="flex-1" onClick={() => setModal(null)}>حفظ الموعد</Button>
            <Button variant="outline" onClick={() => setModal(null)} className="px-5">إلغاء</Button>
          </div>
        </div>
      </Modal>

      {/* Add Invoice */}
      <Modal open={modal === "invoice"} onClose={() => setModal(null)} title="فاتورة جديدة">
        <div className="space-y-4">
          <FormField label="المبلغ (د.ت) *" htmlFor="inv-amount">
            <Input id="inv-amount" type="number" placeholder="0.000" className={inputCls} dir="ltr"
              value={invoiceForm.amount} onChange={e => setInvoiceForm(f => ({ ...f, amount: e.target.value }))} />
          </FormField>
          <FormField label="الحالة" htmlFor="inv-status">
            <select id="inv-status" className={inputCls + " px-3 cursor-pointer"}
              value={invoiceForm.status} onChange={e => setInvoiceForm(f => ({ ...f, status: e.target.value }))}>
              <option value="pending">في الانتظار</option>
              <option value="paid">مدفوعة</option>
              <option value="overdue">متأخرة</option>
            </select>
          </FormField>
          <div className="flex gap-3">
            <Button className="flex-1" onClick={() => setModal(null)}>إنشاء الفاتورة</Button>
            <Button variant="outline" onClick={() => setModal(null)} className="px-5">إلغاء</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Case */}
      <Modal open={modal === "edit"} onClose={() => setModal(null)} title="تعديل القضية" size="lg">
        <div className="space-y-4">
          <FormField label="عنوان القضية" htmlFor="edit-title">
            <Input id="edit-title" defaultValue={caseData.title} className={inputCls} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="المحكمة" htmlFor="edit-court">
              <Input id="edit-court" defaultValue={caseData.court || ""} className={inputCls} />
            </FormField>
            <FormField label="الحالة" htmlFor="edit-status">
              <select id="edit-status" className={inputCls + " px-3 cursor-pointer"} defaultValue={caseData.status}>
                <option value="active">نشطة</option>
                <option value="pending">في الانتظار</option>
                <option value="suspended">موقوفة</option>
                <option value="closed">مغلقة</option>
              </select>
            </FormField>
          </div>
          <FormField label="الجلسة القادمة" htmlFor="edit-hearing">
            <Input id="edit-hearing" type="date" className={inputCls} dir="ltr"
              defaultValue={caseData.nextHearing ? new Date(caseData.nextHearing).toISOString().split("T")[0] : ""} />
          </FormField>
          <FormField label="الوصف" htmlFor="edit-desc">
            <textarea id="edit-desc" rows={3} defaultValue={caseData.description || ""}
              className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
          </FormField>
          <div className="flex gap-3">
            <Button className="flex-1" onClick={() => setModal(null)}>حفظ التعديلات</Button>
            <Button variant="outline" onClick={() => setModal(null)} className="px-5">إلغاء</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

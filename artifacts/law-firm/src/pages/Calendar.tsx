import { useState } from "react";
import { useListEvents } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarIcon, Clock, MapPin, Briefcase, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Modal, FormField } from "@/components/Modal";

export default function CalendarView() {
  const { data: events, isLoading } = useListEvents();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: "", date: "", time: "", location: "", case: "", notes: "" });

  const grouped = events?.reduce((acc, e) => {
    const key = new Date(e.date).toLocaleDateString("ar-TN", {
      weekday: "long", year: "numeric", month: "long", day: "numeric"
    });
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {} as Record<string, typeof events>);

  const inputCls = "h-10 bg-muted/50 border-border focus-visible:ring-1 focus-visible:ring-primary rounded-lg w-full";

  const eventTypeColor = (title: string) => {
    if (title.includes("جلسة") || title.includes("محكمة")) return "bg-blue-500";
    if (title.includes("اجتماع")) return "bg-purple-500";
    return "bg-primary";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">الرزنامة</h1>
          <p className="text-muted-foreground text-sm mt-0.5">مواعيد الجلسات والاجتماعات</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="rounded-lg gap-2 px-5">
          <Plus className="h-4 w-4" />
          موعد جديد
        </Button>
      </div>

      <div className="space-y-8">
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-6 w-52" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          ))
        ) : !grouped || Object.keys(grouped).length === 0 ? (
          <div className="text-center py-20 bg-card rounded-xl shadow-sm flex flex-col items-center gap-3">
            <CalendarIcon className="h-14 w-14 text-muted-foreground/20" />
            <p className="text-muted-foreground">لا توجد مواعيد قادمة</p>
            <Button variant="outline" onClick={() => setShowModal(true)} className="gap-2">
              <Plus className="h-4 w-4" /> أضف موعدك الأول
            </Button>
          </div>
        ) : (
          Object.entries(grouped).map(([date, dayEvents]) => (
            <div key={date} className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <CalendarIcon className="h-4 w-4 text-primary" />
                </div>
                <h2 className="text-base font-bold text-foreground">{date}</h2>
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
                  {dayEvents.length} {dayEvents.length === 1 ? "موعد" : "مواعيد"}
                </span>
              </div>
              <div className="space-y-3 mr-9">
                {dayEvents.map(event => (
                  <Card key={event.id} className="border-none shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                    <CardContent className="p-0 flex">
                      <div className={`w-1 shrink-0 ${eventTypeColor(event.title)}`} />
                      <div className="p-4 flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="space-y-1.5">
                            <h3 className="font-bold">{event.title}</h3>
                            {event.caseName && (
                              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <Briefcase className="h-3.5 w-3.5" />
                                <span>{event.caseName}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-3 text-sm">
                            {event.time && (
                              <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full font-medium">
                                <Clock className="h-3.5 w-3.5" />
                                <span dir="ltr">{event.time}</span>
                              </div>
                            )}
                            {event.location && (
                              <div className="flex items-center gap-1.5 bg-muted/50 px-3 py-1 rounded-full text-muted-foreground">
                                <MapPin className="h-3.5 w-3.5" />
                                <span>{event.location}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {event.notes && (
                          <p className="mt-3 text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border/40">
                            {event.notes}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* New Event Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="موعد جديد" size="lg">
        <div className="space-y-4">
          <FormField label="عنوان الموعد *" htmlFor="event-title">
            <Input id="event-title" placeholder="مثال: جلسة محكمة تونس الابتدائية" className={inputCls}
              value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="التاريخ *" htmlFor="event-date">
              <Input id="event-date" type="date" className={inputCls} dir="ltr"
                value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </FormField>
            <FormField label="الوقت" htmlFor="event-time">
              <Input id="event-time" type="time" className={inputCls} dir="ltr"
                value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
            </FormField>
          </div>
          <FormField label="المكان" htmlFor="event-loc">
            <Input id="event-loc" placeholder="مثال: محكمة تونس الابتدائية" className={inputCls}
              value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
          </FormField>
          <FormField label="القضية المرتبطة" htmlFor="event-case">
            <Input id="event-case" placeholder="اسم القضية (اختياري)" className={inputCls}
              value={form.case} onChange={e => setForm(f => ({ ...f, case: e.target.value }))} />
          </FormField>
          <FormField label="ملاحظات" htmlFor="event-notes">
            <textarea id="event-notes" rows={3} placeholder="ملاحظات إضافية..."
              className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </FormField>
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={() => setShowModal(false)}>حفظ الموعد</Button>
            <Button variant="outline" onClick={() => setShowModal(false)} className="px-6">إلغاء</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

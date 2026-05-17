import { useState } from "react";
import { useLocation } from "wouter";
import { authFetch } from "@/lib/authFetch";
import { formatDateTN } from "@/lib/date";
import { useListCases } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Eye, Filter, Briefcase, Archive, Hash } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Modal, FormField } from "@/components/Modal";
import { SmartTextarea } from "@/components/SmartTextarea";
import { MicButton } from "@/components/MicButton";
import { CourtSelect } from "@/components/CourtSelect";
import { EmptyState } from "@/components/ui/EmptyState";
import { EmptyCasesIllustration } from "@/components/illustrations/EmptyCases";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

export default function Cases() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewArchived, setViewArchived] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    title: "", clientId: "", court: "", division: "", lawyer: "", status: "active",
    nextHearing: "", description: "", procedureStage: "ابتدائي", courtCaseNumber: "", clientFileRef: "",
    opponentName: "", opponentLawyer: "",
  });
  const [clients, setClients] = useState<Array<{ id: number; name: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [, navigate] = useLocation();
  const { data: cases, isLoading, refetch } = useListCases();

  async function openNewModal() {
    const rc = await authFetch(`${BASE}/api/clients`);
    if (rc.ok) setClients(await rc.json());
    setForm({ title: "", clientId: "", court: "", division: "", lawyer: "", status: "active", nextHearing: "", description: "", procedureStage: "ابتدائي", courtCaseNumber: "", clientFileRef: "", opponentName: "", opponentLawyer: "" });
    setShowModal(true);
  }

  async function saveCase() {
    if (!form.title || !form.clientId) return;
    setSaving(true);
    await authFetch(`${BASE}/api/cases`, {
      method: "POST",
      body: JSON.stringify({ ...form, clientId: Number(form.clientId), nextHearing: form.nextHearing || undefined }),
    });
    refetch(); setSaving(false); setShowModal(false);
  }

  const filteredCases = cases?.filter((c: any) => {
    if (viewArchived) {
      if (!c.archivedAt) return false;
    } else {
      if (c.archivedAt) return false;
    }
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (search && !c.title.toLowerCase().includes(search.toLowerCase()) && !c.clientName?.includes(search) && !(c.caseNumber ?? "").includes(search) && !(c.courtCaseNumber ?? "").includes(search)) return false;
    return true;
  });

  const inputCls = "h-10 bg-muted/50 border-border focus-visible:ring-1 focus-visible:ring-primary rounded-lg w-full";
  const STAGES = ["ابتدائي", "استئناف", "تعقيب", "تنفيذ", "ختم"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">القضايا</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {viewArchived ? "القضايا المؤرشفة" : "إدارة وتتبع جميع قضايا المكتب"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewArchived ? "default" : "outline"}
            size="sm"
            onClick={() => setViewArchived(v => !v)}
            className="gap-2"
          >
            <Archive className="h-4 w-4" />
            {viewArchived ? "العودة للنشطة" : "المحفوظات"}
          </Button>
          <Button onClick={openNewModal} className="rounded-lg gap-2 px-5">
            <Plus className="h-4 w-4" />
            قضية جديدة
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالعنوان، الحريف، أو رقم الملف..."
            className="pe-9 h-10 bg-card border-border"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-44">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10 bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              <SelectItem value="active">نشطة</SelectItem>
              <SelectItem value="pending">في الانتظار</SelectItem>
              <SelectItem value="suspended">موقوفة</SelectItem>
              <SelectItem value="closed">مغلقة</SelectItem>
              <SelectItem value="archived">مؤرشفة</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      {!isLoading && cases && (
        <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
          <span className="px-2.5 py-1 bg-muted/40 rounded-full">{cases.filter((c: any) => !c.archivedAt && !c.deletedAt).length} قضية نشطة</span>
          <span className="px-2.5 py-1 bg-orange-500/10 text-orange-400 rounded-full">{cases.filter((c: any) => c.archivedAt).length} مؤرشفة</span>
        </div>
      )}

      {/* Table */}
      <Card className="border-none shadow-md overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-start py-3 font-semibold w-28">رقم الملف</TableHead>
                <TableHead className="text-start py-3 font-semibold">القضية</TableHead>
                <TableHead className="text-start py-3 font-semibold">الحريف</TableHead>
                <TableHead className="text-start py-3 font-semibold hidden md:table-cell">المحكمة</TableHead>
                <TableHead className="text-start py-3 font-semibold">الحالة</TableHead>
                <TableHead className="text-start py-3 font-semibold hidden lg:table-cell">الجلسة القادمة</TableHead>
                <TableHead className="text-start py-3 font-semibold hidden lg:table-cell">المرحلة</TableHead>
                <TableHead className="text-center py-3 font-semibold w-16">عرض</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j} className="py-3"><Skeleton className="h-5 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : filteredCases?.length === 0
                ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-0">
                      <EmptyState
                        illustration={<EmptyCasesIllustration />}
                        title={viewArchived ? "لا توجد قضايا مؤرشفة" : "لا توجد قضايا بعد"}
                        description={viewArchived
                          ? "لم يتم أرشفة أي قضية بعد"
                          : "ابدأ بإنشاء قضيتك الأولى — ستظهر هنا فور إضافتها بالضغط على «+ قضية جديدة» أعلاه"}
                      />
                    </TableCell>
                  </TableRow>
                )
                : filteredCases?.map((c: any) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer hover:bg-muted/30 transition-colors group"
                    onClick={() => navigate(`/cases/${c.id}`)}
                  >
                    <TableCell className="py-3">
                      <div className="flex flex-col gap-1">
                        {c.caseNumber ? (
                          <span className="text-xs font-mono px-2 py-0.5 bg-primary/10 text-primary rounded-md flex items-center gap-1 w-fit">
                            <Hash className="h-3 w-3" />{c.caseNumber}
                          </span>
                        ) : <span className="text-muted-foreground/40 text-xs">—</span>}
                        {c.courtCaseNumber && (
                          <span className="text-[10px] font-mono px-2 py-0.5 bg-muted/60 text-muted-foreground rounded-md flex items-center gap-1 w-fit" title="عدد القضية بالمحكمة">
                            ⚖ {c.courtCaseNumber}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold py-3 text-primary group-hover:underline">{c.title}</TableCell>
                    <TableCell className="py-3 text-muted-foreground">{c.clientName}</TableCell>
                    <TableCell className="py-3 text-muted-foreground hidden md:table-cell">{c.court || "—"}</TableCell>
                    <TableCell className="py-3"><StatusBadge status={c.status} /></TableCell>
                    <TableCell className="py-3 hidden lg:table-cell">
                      {c.nextHearing ? formatDateTN(c.nextHearing) : "—"}
                    </TableCell>
                    <TableCell className="py-3 hidden lg:table-cell">
                      {c.procedureStage ? (
                        <span className="text-xs px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-full">{c.procedureStage}</span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="py-3 text-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/cases/${c.id}`); }}
                        className="inline-flex items-center justify-center p-2 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              }
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* New Case Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="قضية جديدة" size="lg">
        <div className="space-y-4">
          <FormField label="عنوان القضية *" htmlFor="case-title">
            <Input id="case-title" placeholder="مثال: قضية ميراث عائلة بن علي" className={inputCls}
              value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="الحريف *" htmlFor="case-client">
              <select id="case-client" value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))} className={inputCls + " px-3 cursor-pointer"}>
                <option value="">اختر حريفاً...</option>
                {clients.map(cl => <option key={cl.id} value={cl.id}>{cl.name}</option>)}
              </select>
            </FormField>
            <FormField label="المحامي المسؤول" htmlFor="case-lawyer">
              <Input id="case-lawyer" placeholder="اسم المحامي" className={inputCls}
                value={form.lawyer} onChange={e => setForm(f => ({ ...f, lawyer: e.target.value }))} />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="المحكمة" htmlFor="case-court">
              <CourtSelect
                value={form.court}
                onChange={v => setForm(f => ({ ...f, court: v }))}
              />
            </FormField>
            <FormField label="الدائرة" htmlFor="case-div">
              <Input id="case-div" placeholder="الدائرة الأولى" className={inputCls}
                value={form.division} onChange={e => setForm(f => ({ ...f, division: e.target.value }))} />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="عدد القضية بالمحكمة" htmlFor="case-court-num"
              hint="العدد الذي خصصته المحكمة">
              <Input id="case-court-num" placeholder="12345/2026" className={inputCls} dir="ltr"
                value={form.courtCaseNumber}
                onChange={e => setForm(f => ({ ...f, courtCaseNumber: e.target.value }))} />
            </FormField>
            <FormField label="مرجع الحريف" htmlFor="case-client-ref"
              hint="رقم الملف لدى الحريف نفسه">
              <Input id="case-client-ref" placeholder="مرجع داخلي للحريف" className={inputCls}
                value={form.clientFileRef}
                onChange={e => setForm(f => ({ ...f, clientFileRef: e.target.value }))} />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="اسم الخصم" htmlFor="case-opponent">
              <Input id="case-opponent" placeholder="الاسم الكامل للخصم" className={inputCls}
                value={form.opponentName}
                onChange={e => setForm(f => ({ ...f, opponentName: e.target.value }))} />
            </FormField>
            <FormField label="محامي الخصم" htmlFor="case-opp-lawyer">
              <Input id="case-opp-lawyer" placeholder="اسم محامي الطرف الآخر" className={inputCls}
                value={form.opponentLawyer}
                onChange={e => setForm(f => ({ ...f, opponentLawyer: e.target.value }))} />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="الحالة" htmlFor="case-status">
              <select id="case-status" className={inputCls + " px-3 cursor-pointer"}
                value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="active">نشطة</option>
                <option value="pending">في الانتظار</option>
                <option value="suspended">موقوفة</option>
                <option value="closed">مغلقة</option>
              </select>
            </FormField>
            <FormField label="المرحلة الإجرائية" htmlFor="case-stage">
              <select id="case-stage" className={inputCls + " px-3 cursor-pointer"}
                value={form.procedureStage} onChange={e => setForm(f => ({ ...f, procedureStage: e.target.value }))}>
                {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </FormField>
          </div>

          <FormField label="موعد الجلسة القادمة" htmlFor="case-hearing">
            <Input id="case-hearing" type="date" className={inputCls} dir="ltr"
              value={form.nextHearing} onChange={e => setForm(f => ({ ...f, nextHearing: e.target.value }))} />
          </FormField>

          <FormField label="وصف القضية" htmlFor="case-desc">
            <SmartTextarea id="case-desc" rows={3} placeholder="وصف مختصر للقضية والوقائع..."
              aiContext="وصف قضية قانونية"
              value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} />
          </FormField>

          <div className="flex gap-3 pt-2">
            <Button className="flex-1" disabled={saving || !form.title || !form.clientId} onClick={saveCase}>
              {saving ? "جارٍ الحفظ..." : "حفظ القضية"}
            </Button>
            <Button variant="outline" onClick={() => setShowModal(false)} className="px-6">
              إلغاء
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

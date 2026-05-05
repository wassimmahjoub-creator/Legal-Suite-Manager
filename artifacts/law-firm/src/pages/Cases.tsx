import { useState } from "react";
import { useLocation } from "wouter";
import { useListCases } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Eye, Filter, Briefcase } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Modal, FormField } from "@/components/Modal";

export default function Cases() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    title: "", client: "", court: "", lawyer: "", status: "active",
    nextHearing: "", description: ""
  });
  const [, navigate] = useLocation();
  const { data: cases, isLoading } = useListCases();

  const filteredCases = cases?.filter(c => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (search && !c.title.includes(search) && !c.clientName?.includes(search)) return false;
    return true;
  });

  const inputCls = "h-10 bg-muted/50 border-border focus-visible:ring-1 focus-visible:ring-primary rounded-lg w-full";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">القضايا</h1>
          <p className="text-muted-foreground text-sm mt-0.5">إدارة وتتبع جميع قضايا المكتب</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="rounded-lg gap-2 px-5">
          <Plus className="h-4 w-4" />
          قضية جديدة
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث باسم القضية أو الحريف..."
            className="pr-9 h-10 bg-card border-border"
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
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <Card className="border-none shadow-md overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-right py-3 font-semibold">القضية</TableHead>
                <TableHead className="text-right py-3 font-semibold">الحريف</TableHead>
                <TableHead className="text-right py-3 font-semibold hidden md:table-cell">المحكمة</TableHead>
                <TableHead className="text-right py-3 font-semibold">الحالة</TableHead>
                <TableHead className="text-right py-3 font-semibold hidden lg:table-cell">الجلسة القادمة</TableHead>
                <TableHead className="text-right py-3 font-semibold hidden lg:table-cell">المحامي</TableHead>
                <TableHead className="text-center py-3 font-semibold w-16">عرض</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j} className="py-3"><Skeleton className="h-5 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : filteredCases?.length === 0
                ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-40 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Briefcase className="h-10 w-10 opacity-20" />
                        <p>لم يتم العثور على قضايا</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )
                : filteredCases?.map((c) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => navigate(`/cases/${c.id}`)}
                  >
                    <TableCell className="font-semibold py-3">{c.title}</TableCell>
                    <TableCell className="py-3 text-muted-foreground">{c.clientName}</TableCell>
                    <TableCell className="py-3 text-muted-foreground hidden md:table-cell">{c.court || "—"}</TableCell>
                    <TableCell className="py-3"><StatusBadge status={c.status} /></TableCell>
                    <TableCell className="py-3 hidden lg:table-cell">
                      {c.nextHearing ? new Date(c.nextHearing).toLocaleDateString("ar-TN") : "—"}
                    </TableCell>
                    <TableCell className="py-3 hidden lg:table-cell text-muted-foreground">{c.lawyer || "—"}</TableCell>
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
              <Input id="case-client" placeholder="اسم الحريف" className={inputCls}
                value={form.client} onChange={e => setForm(f => ({ ...f, client: e.target.value }))} />
            </FormField>
            <FormField label="المحامي المسؤول" htmlFor="case-lawyer">
              <Input id="case-lawyer" placeholder="اسم المحامي" className={inputCls}
                value={form.lawyer} onChange={e => setForm(f => ({ ...f, lawyer: e.target.value }))} />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="المحكمة" htmlFor="case-court">
              <Input id="case-court" placeholder="مثال: محكمة تونس الابتدائية" className={inputCls}
                value={form.court} onChange={e => setForm(f => ({ ...f, court: e.target.value }))} />
            </FormField>
            <FormField label="الحالة" htmlFor="case-status">
              <select id="case-status" className={inputCls + " px-3 cursor-pointer"}
                value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="active">نشطة</option>
                <option value="pending">في الانتظار</option>
                <option value="suspended">موقوفة</option>
                <option value="closed">مغلقة</option>
              </select>
            </FormField>
          </div>

          <FormField label="موعد الجلسة القادمة" htmlFor="case-hearing">
            <Input id="case-hearing" type="date" className={inputCls} dir="ltr"
              value={form.nextHearing} onChange={e => setForm(f => ({ ...f, nextHearing: e.target.value }))} />
          </FormField>

          <FormField label="وصف القضية" htmlFor="case-desc">
            <textarea id="case-desc" rows={3} placeholder="وصف مختصر للقضية والوقائع..."
              className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </FormField>

          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={() => setShowModal(false)}>
              حفظ القضية
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

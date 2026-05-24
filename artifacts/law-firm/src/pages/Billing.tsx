import { SelectNative } from "@/components/SelectNative";
import { useState } from "react";
import { useLocation } from "wouter";
import { useInvoices, useInvalidateInvoices } from "../hooks/useInvoices";
import { useDebounce } from "../hooks/useDebounce";
import { formatDateTN, formatDateLongTN } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, TrendingUp, CreditCard, Clock, CheckCircle, AlertCircle, ArrowRight } from "lucide-react";
import { ExportDropdown } from "@/components/ExportDropdown";
import { STATUS_LABELS, STATUS_COLORS } from "@/services/invoiceCalculator";
import { Money, TNDAmount } from "@/components/Money";
import { EmptyState } from "@/components/ui/EmptyState";
import { EmptyInvoicesIllustration } from "@/components/illustrations/EmptyInvoices";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

interface Invoice {
  id: number;
  invoiceNumber: string | null;
  clientId: number;
  clientName: string | null;
  caseId: number | null;
  caseName: string | null;
  issueDate: string | null;
  dueDate: string | null;
  status: string;
  subtotalHt: number;
  vatTotal: number;
  totalTtc: number;
  netToPay: number;
  amountPaid: number;
  balanceDue: number;
  withholdingTax: number;
  lockedAt: string | null;
  createdAt: string;
}

export default function Billing() {
  const fromParam = new URLSearchParams(window.location.search).get("from");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [, navigate] = useLocation();
  const debouncedSearch = useDebounce(search, 300);
  const { data: invoices = [], isLoading: loading } = useInvoices({
    search: debouncedSearch || undefined,
    status: statusFilter   || undefined,
  });
  const invalidateInvoices = useInvalidateInvoices();

  const filtered = invoices as any[];

  const totalNet = invoices.filter(i => i.status !== "draft" && i.status !== "cancelled").reduce((s, i) => s + i.netToPay, 0);
  const totalPaid = invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.netToPay, 0);
  const totalBalance = invoices.reduce((s, i) => s + i.balanceDue, 0);
  const overdueCount = invoices.filter(i =>
    i.dueDate && i.status !== "paid" && i.status !== "cancelled" && i.lockedAt &&
    new Date(i.dueDate) < new Date()
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          {(fromParam === "dashboard" || fromParam === "today") && (
            <button
              onClick={() => fromParam === "today" ? navigate("/today") : navigate("/")}
              className="text-muted-foreground hover:text-foreground transition-colors mb-1">
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
          <h1 className="text-2xl font-bold">الفوترة</h1>
          <p className="text-muted-foreground text-sm mt-0.5">إدارة الفواتير والمدفوعات</p>
        </div>
        <div className="flex gap-2">
          <ExportDropdown endpoint="invoices" params={{ search, status: statusFilter || undefined }} />
          <Button onClick={() => navigate("/billing/new")} className="rounded-lg gap-2 px-5">
            <Plus className="h-4 w-4" /> فاتورة جديدة
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={<CreditCard className="h-5 w-5 text-info" />}
          bg="bg-info/10" label="إجمالي الفواتير" value={<TNDAmount amount={totalNet} />} />
        <KpiCard icon={<CheckCircle className="h-5 w-5 text-success" />}
          bg="bg-success/10" label="المدفوع" value={<TNDAmount amount={totalPaid} />} />
        <KpiCard icon={<Clock className="h-5 w-5 text-warning" />}
          bg="bg-warning/10" label="الرصيد المتبقي" value={<TNDAmount amount={totalBalance} />} />
        <KpiCard icon={<AlertCircle className="h-5 w-5 text-destructive" />}
          bg="bg-destructive/10" label="متأخرة السداد" value={String(overdueCount)} unit="" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 -translate-y-1/2 end-3 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالموكّل أو رقم الفاتورة..."
            className="h-10 pe-9 bg-muted/50 border-border rounded-lg" />
        </div>
        <SelectNative value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="h-10 px-3 rounded-lg border border-border bg-muted/50 text-sm cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary">
          <option value="">كل الحالات</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </SelectNative>
      </div>

      {/* Table */}
      <Card className="border-none shadow-md overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-start py-3 font-semibold">رقم الفاتورة</TableHead>
                <TableHead className="text-start py-3 font-semibold">الموكّل</TableHead>
                <TableHead className="text-start py-3 font-semibold hidden md:table-cell">الملف</TableHead>
                <TableHead className="text-start py-3 font-semibold">خ.ض</TableHead>
                <TableHead className="text-start py-3 font-semibold">الصافي</TableHead>
                <TableHead className="text-start py-3 font-semibold hidden sm:table-cell">الرصيد</TableHead>
                <TableHead className="text-start py-3 font-semibold">الحالة</TableHead>
                <TableHead className="text-start py-3 font-semibold hidden lg:table-cell">الاستحقاق</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j} className="py-3"><Skeleton className="h-5 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : filtered.length === 0
                ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-0">
                      <EmptyState
                        illustration={<EmptyInvoicesIllustration />}
                        title="لا فواتير بعد"
                        description="أصدر فاتورتك الأولى — ستظهر هنا فور إنشائها بالضغط على «+ فاتورة جديدة» أعلاه"
                      />
                    </TableCell>
                  </TableRow>
                )
                : filtered.map(inv => {
                  const isOverdue = inv.dueDate && inv.status !== "paid" && inv.status !== "cancelled"
                    && inv.lockedAt && new Date(inv.dueDate) < new Date();
                  return (
                    <TableRow key={inv.id}
                      className="hover:bg-muted/30 transition-colors cursor-pointer group"
                      onClick={() => navigate(`/billing/${inv.id}`)}>
                      <TableCell className="font-mono text-sm py-3 text-primary font-semibold group-hover:underline">
                        {inv.invoiceNumber ?? `#${String(inv.id).padStart(4, "0")}`}
                      </TableCell>
                      <TableCell className="py-3 font-semibold">{inv.clientName ?? "—"}</TableCell>
                      <TableCell className="py-3 text-muted-foreground text-sm hidden md:table-cell">
                        {inv.caseName ?? "—"}
                      </TableCell>
                      <TableCell className="py-3 font-mono text-sm">
                        {inv.withholdingTax > 0 ? <Money amount={inv.withholdingTax} /> : "—"}
                      </TableCell>
                      <TableCell className="py-3 font-mono font-bold">
                        <Money amount={inv.netToPay} />
                      </TableCell>
                      <TableCell className="py-3 font-mono text-sm hidden sm:table-cell">
                        <span className={inv.balanceDue > 0 && inv.lockedAt ? "text-warning" : ""}>
                          <Money amount={inv.balanceDue} />
                        </span>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[inv.status] ?? "bg-muted"}`}>
                          {STATUS_LABELS[inv.status] ?? inv.status}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 text-sm hidden lg:table-cell">
                        {inv.dueDate ? (
                          <span
                            title={formatDateLongTN(inv.dueDate)}
                            className={isOverdue ? "text-destructive font-semibold" : "text-muted-foreground"}
                          >
                            {formatDateTN(inv.dueDate)}
                          </span>
                        ) : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ icon, bg, label, value, unit = "" }: {
  icon: React.ReactNode; bg: string; label: string; value: React.ReactNode; unit?: string;
}) {
  return (
    <Card className="border-none shadow-sm bg-card">
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`p-3 ${bg} rounded-xl shrink-0`}>{icon}</div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className="text-lg font-bold font-mono" dir="ltr">{value}<span className="text-sm font-normal text-muted-foreground">{unit}</span></p>
        </div>
      </CardContent>
    </Card>
  );
}

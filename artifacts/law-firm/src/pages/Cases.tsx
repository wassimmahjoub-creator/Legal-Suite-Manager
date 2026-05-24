import { SelectNative } from "@/components/SelectNative";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { authFetch } from "@/lib/authFetch";
import { formatDateTN, formatDateLongTN } from "@/lib/date";
import { useListCases } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Filter, Archive, Hash, ArrowRight } from "lucide-react";
import { ExportDropdown } from "@/components/ExportDropdown";
import { StatusBadge } from "@/components/StatusBadge";
import { ServiceTypeBadge } from "@/components/ServiceTypeBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { EmptyCasesIllustration } from "@/components/illustrations/EmptyCases";
import { CaseWizard } from "@/components/cases/CaseWizard";
import { useQueryClient } from "@tanstack/react-query";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

export default function Cases() {
  const params        = new URLSearchParams(window.location.search);
  const userIdParam   = params.get("userId");
  const userNameParam = params.get("userName");
  const fromParam     = params.get("from");
  const fromTabParam  = params.get("fromTab");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewArchived, setViewArchived] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>(() =>
    new URLSearchParams(window.location.search).get("serviceType") ?? "all"
  );

  const OTHER_TYPES: string[] = [];

  const TABS = [
    { key: "all",                label: "الكل" },
    { key: "lawsuit",            label: "قضايا" },
    { key: "consultation",       label: "استشارات" },
    { key: "contract",           label: "عقود" },
    { key: "debt_recovery",      label: "تحصيل" },
    { key: "company_creation",   label: "شركات" },
    { key: "legal_notice",       label: "إنذارات" },
    { key: "judgment_execution", label: "تنفيذ" },
    { key: "real_estate_file",   label: "عقاري" },
    { key: "labor_file",         label: "شغل" },
    { key: "tax_file",           label: "جبائي" },
    { key: "administrative",     label: "إداري" },
    { key: "mediation",          label: "وساطة" },
    { key: "other",              label: "أخرى" },
  ];

  const [lawyerCases, setLawyerCases] = useState<any[] | null>(null);
  const [, navigate] = useLocation();
  const { data: cases, isLoading } = useListCases({ query: { staleTime: 0 } });
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userIdParam) { setLawyerCases(null); return; }
    authFetch(`${BASE}/api/cases?userId=${userIdParam}`)
      .then(r => r.ok ? r.json() : [])
      .then(setLawyerCases);
  }, [userIdParam]);

  const casesSource = lawyerCases ?? cases;

  const baseFiltered = (casesSource ?? []).filter((c: any) => {
    if (viewArchived) { if (!c.archivedAt) return false; }
    else              { if (c.archivedAt)  return false; }
    return true;
  });

  const tabCounts: Record<string, number> = { all: baseFiltered.length };
  for (const c of baseFiltered) {
    const t: string = c.serviceType ?? c.service_type ?? "lawsuit";
    tabCounts[t] = (tabCounts[t] ?? 0) + 1;
  }

  const filteredCases = baseFiltered.filter((c: any) => {
    const t: string = c.serviceType ?? c.service_type ?? "lawsuit";
    if (serviceTypeFilter !== "all") {
      if (t !== serviceTypeFilter) return false;
    }
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!c.title?.toLowerCase().includes(q) &&
          !c.clientName?.includes(search) &&
          !(c.caseNumber ?? "").includes(search) &&
          !(c.courtCaseNumber ?? "").includes(search)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Back-to-reports banner */}
      {fromParam === "reports" && userNameParam && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-primary/10 border border-primary/20 rounded-xl">
          <button onClick={() => navigate(`/reports?tab=${fromTabParam ?? "lawyers"}`)}
            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors shrink-0">
            <ArrowRight className="h-3.5 w-3.5" /> التقارير
          </button>
          <span className="text-xs text-muted-foreground">ملفات المحامي:</span>
          <span className="text-xs font-bold text-white">{userNameParam}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-start gap-3">
          <div>
            {(fromParam === "dashboard" || viewArchived) && (
              <button onClick={() => fromParam === "dashboard" ? navigate("/") : setViewArchived(false)}
                className="text-muted-foreground hover:text-foreground transition-colors mb-1">
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
            <h1 className="text-2xl font-bold">القضايا</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {viewArchived ? "الملفات المؤرشفة" : "إدارة وتتبع جميع قضايا المكتب"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <ExportDropdown
            endpoint="cases"
            params={{ search, status: statusFilter !== "all" ? statusFilter : undefined, archived: viewArchived ? "true" : undefined }}
          />
          {!viewArchived && (
            <Button onClick={() => setViewArchived(true)} className="rounded-lg gap-2 px-5">
              <Archive className="h-4 w-4" />
              الملفات المؤرشفة
            </Button>
          )}
          <Button onClick={() => navigate("/cases/new")} className="rounded-lg gap-2 px-5">
            <Plus className="h-4 w-4" />
            ملف جديد
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالعنوان، الموكّل، أو رقم الملف..."
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

      {/* ── Onglets type de dossier ── */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
        {TABS.map(tab => {
          const count = tabCounts[tab.key] ?? 0;
          const active = serviceTypeFilter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setServiceTypeFilter(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap border transition-colors
                ${active
                  ? "bg-primary text-primary-foreground border-primary font-semibold"
                  : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"}`}
            >
              {tab.label}
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium
                  ${active ? "bg-white/20 text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Stats */}
      {!isLoading && cases && (
        <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
          <span className="px-2.5 py-1 bg-muted/40 rounded-full">{cases.filter((c: any) => !c.archivedAt && !c.deletedAt).length} قضية نشطة</span>
          <span className="px-2.5 py-1 bg-primary/10 text-primary rounded-full">{cases.filter((c: any) => c.archivedAt).length} مؤرشفة</span>
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
                <TableHead className="text-start py-3 font-semibold">الموكّل</TableHead>
                <TableHead className="text-start py-3 font-semibold hidden md:table-cell">المحكمة</TableHead>
                <TableHead className="text-start py-3 font-semibold">الحالة</TableHead>
                <TableHead className="text-start py-3 font-semibold hidden md:table-cell">النوع</TableHead>
                <TableHead className="text-start py-3 font-semibold hidden lg:table-cell">الجلسة القادمة</TableHead>
                <TableHead className="text-start py-3 font-semibold hidden lg:table-cell">المرحلة</TableHead>
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
                    <TableCell className="py-3 hidden md:table-cell">
                      <ServiceTypeBadge type={c.serviceType ?? c.service_type} />
                    </TableCell>
                    <TableCell className="py-3 hidden lg:table-cell">
                      {c.nextHearing ? (
                        <span title={formatDateLongTN(c.nextHearing)}>{formatDateTN(c.nextHearing)}</span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="py-3 hidden lg:table-cell">
                      {c.procedureStage ? (
                        <span className="text-xs px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-full">{c.procedureStage}</span>
                      ) : "—"}
                    </TableCell>
                  </TableRow>
                ))
              }
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Wizard */}
      <CaseWizard
        open={showWizard}
        onClose={() => setShowWizard(false)}
        onCreated={(id) => {
          setShowWizard(false);
          queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
          navigate(`/cases/${id}`);
        }}
      />
    </div>
  );
}

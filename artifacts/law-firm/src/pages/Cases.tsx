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
import { PageHeader } from "@/components/PageHeader";
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
  const [activeGroup,       setActiveGroup]       = useState<string>("all");
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>("all");

  const GROUPS = [
    {
      key: "litigation",
      label: "الملفات القضائية",
      types: [
        { key: "lawsuit",            label: "دعوى قضائية" },
        { key: "real_estate_file",   label: "ملف عقاري" },
        { key: "labor_file",         label: "ملف شغل" },
        { key: "tax_file",           label: "ملف جبائي" },
        { key: "judgment_execution", label: "تنفيذ حكم" },
      ],
    },
    {
      key: "consultations",
      label: "الاستشارات والعقود",
      types: [
        { key: "consultation",     label: "استشارة قانونية" },
        { key: "contract",         label: "تحرير عقد" },
        { key: "company_creation", label: "تأسيس شركة" },
        { key: "debt_recovery",    label: "استخلاص ديون" },
      ],
    },
    {
      key: "other",
      label: "الإجراءات الأخرى",
      types: [
        { key: "legal_notice",   label: "إنذار" },
        { key: "administrative", label: "ملف إداري" },
        { key: "mediation",      label: "وساطة" },
        { key: "other",          label: "أخرى" },
      ],
    },
  ];

  const [lawyerCases, setLawyerCases] = useState<any[] | null>(null);
  const [, navigate] = useLocation();
  const { data: cases, isLoading } = useListCases(undefined, { query: { staleTime: 0 } });
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

  const typeCounts: Record<string, number> = {};
  for (const c of baseFiltered) {
    const t: string = c.serviceType ?? c.service_type ?? "lawsuit";
    typeCounts[t] = (typeCounts[t] ?? 0) + 1;
  }
  const groupCount = (gkey: string) => {
    const g = GROUPS.find(g => g.key === gkey);
    return g ? g.types.reduce((s, t) => s + (typeCounts[t.key] ?? 0), 0) : 0;
  };

  const activeGroupDef = GROUPS.find(g => g.key === activeGroup) ?? null;

  const filteredCases = baseFiltered.filter((c: any) => {
    const t: string = c.serviceType ?? c.service_type ?? "lawsuit";
    if (activeGroup !== "all") {
      if (serviceTypeFilter !== "all") {
        if (t !== serviceTypeFilter) return false;
      } else {
        const gTypes = activeGroupDef?.types.map(x => x.key) ?? [];
        if (!gTypes.includes(t)) return false;
      }
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

      <PageHeader
        title="القضايا"
        subtitle={viewArchived ? "الملفات المؤرشفة" : "إدارة وتتبع جميع قضايا المكتب"}
        back
        actions={<div className="flex gap-2">
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
        </div>}
      />

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

      {/* ── Onglets type de dossier — style CaseDetail ── */}
      <div className="border-b border-border -mx-0">
        <div className="flex gap-0 overflow-x-auto no-scrollbar">
          {/* الكل */}
          <button
            onClick={() => { setActiveGroup("all"); setServiceTypeFilter("all"); }}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0
              ${activeGroup === "all"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"}`}
          >
            الكل
            <span className={`text-[10px] rounded-full px-1.5 py-0.5 font-bold leading-none min-w-[1.1rem] text-center
              ${activeGroup === "all" ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
              {baseFiltered.length}
            </span>
          </button>
          {/* Groups */}
          {GROUPS.map(g => {
            const isActive = activeGroup === g.key;
            const cnt = groupCount(g.key);
            return (
              <button key={g.key}
                onClick={() => { setActiveGroup(g.key); setServiceTypeFilter("all"); }}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0
                  ${isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"}`}
              >
                {g.label}
                {cnt > 0 && (
                  <span className={`text-[10px] rounded-full px-1.5 py-0.5 font-bold leading-none min-w-[1.1rem] text-center
                    ${isActive ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                    {cnt}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Sous-onglets (visibles uniquement quand un groupe est actif) ── */}
      {activeGroupDef && (
        <div className="border-b border-border/40 bg-muted/20 -mx-0 rounded-b-none">
          <div className="flex gap-0 overflow-x-auto no-scrollbar px-2">
            {/* الكل — sous-onglet par défaut */}
            <button
              onClick={() => setServiceTypeFilter("all")}
              className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium border-b-2 transition-colors whitespace-nowrap shrink-0
                ${serviceTypeFilter === "all"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              الكل
              <span className={`text-[10px] rounded-full px-1.5 py-0.5 font-bold leading-none min-w-[1.1rem] text-center
                ${serviceTypeFilter === "all" ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                {groupCount(activeGroup)}
              </span>
            </button>
            {activeGroupDef.types.map(t => {
              const isActive = serviceTypeFilter === t.key;
              const cnt = typeCounts[t.key] ?? 0;
              return (
                <button key={t.key}
                  onClick={() => setServiceTypeFilter(isActive ? "all" : t.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium border-b-2 transition-colors whitespace-nowrap shrink-0
                    ${isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"}`}
                >
                  {t.label}
                  {cnt > 0 && (
                    <span className={`text-[10px] rounded-full px-1.5 py-0.5 font-bold leading-none min-w-[1.1rem] text-center
                      ${isActive ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                      {cnt}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

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

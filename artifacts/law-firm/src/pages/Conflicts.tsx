import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ShieldAlert, CheckCircle2, AlertTriangle, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { authFetch } from "@/lib/authFetch";
import { formatDateTN } from "@/lib/date";
import type { ConflictData } from "@/components/ConflictWarningModal";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

interface Stats {
  unresolvedTotal: number;
  resolvedThisMonth: number;
  total: number;
}

const CONFLICT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  opponent_is_client:           { label: "الخصم موكّل في المكتب",      color: "bg-destructive/10 text-destructive"   },
  client_is_opponent_elsewhere: { label: "الموكّل خصمٌ في ملف آخر",    color: "bg-orange-500/10 text-orange-400"    },
  shared_party:                 { label: "طرف مشترك",                  color: "bg-yellow-500/10 text-yellow-400"    },
};

const MATCH_LABELS: Record<string, string> = {
  tax_id_exact: "معرف جبائي",
  name_exact:   "اسم تام",
  name_fuzzy:   "اسم مشابه",
};

type Filter = "unresolved" | "resolved" | "all";

export default function Conflicts() {
  const [conflicts, setConflicts] = useState<ConflictData[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("unresolved");
  const [, navigate] = useLocation();

  async function load() {
    setLoading(true);
    const [cRes, sRes] = await Promise.all([
      authFetch(`${BASE}/api/conflict-checks`),
      authFetch(`${BASE}/api/conflict-checks/stats`),
    ]);
    if (cRes.ok) setConflicts(await cRes.json());
    if (sRes.ok) setStats(await sRes.json());
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  const filtered = conflicts.filter((c) => {
    if (filter === "unresolved") return !c.resolved;
    if (filter === "resolved") return c.resolved;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-destructive/10 rounded-xl">
          <ShieldAlert className="h-6 w-6 text-destructive" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">تعارض المصالح</h1>
          <p className="text-muted-foreground text-sm">مراقبة تعارضات المصالح وفق أخلاقيات المهنة</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 bg-destructive/10 rounded-xl shrink-0">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">غير مُبرَّرة</p>
              <p className="text-2xl font-bold text-destructive">
                {loading ? "—" : (stats?.unresolvedTotal ?? 0)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 bg-green-500/10 rounded-xl shrink-0">
              <CheckCircle2 className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">مُبرَّرة هذا الشهر</p>
              <p className="text-2xl font-bold text-green-400">
                {loading ? "—" : (stats?.resolvedThisMonth ?? 0)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl shrink-0">
              <ShieldAlert className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">المجموع</p>
              <p className="text-2xl font-bold">{loading ? "—" : (stats?.total ?? 0)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 text-sm">
        {(["unresolved", "resolved", "all"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full font-medium transition-colors ${
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            {f === "unresolved" ? "غير مُبرَّرة" : f === "resolved" ? "مُبرَّرة" : "الكل"}
          </button>
        ))}
      </div>

      {/* Table */}
      <Card className="border-none shadow-md overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-green-400 opacity-60" />
              <p className="font-medium">
                {filter === "unresolved" ? "لا توجد تعارضات غير مُبرَّرة" : "لا توجد نتائج"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {/* Table head */}
              <div className="grid grid-cols-[1fr_1.5fr_1fr_1fr_1fr_80px] gap-4 px-5 py-3 bg-muted/40 text-xs font-semibold text-muted-foreground">
                <span>تاريخ الرصد</span>
                <span>الملف</span>
                <span>النوع</span>
                <span>الطرف</span>
                <span>طريقة الرصد</span>
                <span>الحالة</span>
              </div>

              {filtered.map((c) => {
                const typeInfo = CONFLICT_TYPE_LABELS[c.conflictType] ?? { label: c.conflictType, color: "bg-muted text-muted-foreground" };
                return (
                  <div
                    key={c.id}
                    className="grid grid-cols-[1fr_1.5fr_1fr_1fr_1fr_80px] gap-4 px-5 py-4 items-center hover:bg-muted/20 transition-colors text-sm"
                  >
                    <span className="text-muted-foreground text-xs">{formatDateTN(c.detectedAt)}</span>

                    <button
                      className="text-primary hover:underline font-medium text-start flex items-center gap-1 truncate"
                      onClick={() => navigate(`/cases/${c.caseId}`)}
                    >
                      <span className="truncate">{(c as ConflictData & { caseName?: string; caseNumber?: string }).caseName ?? `#${c.caseId}`}</span>
                      <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
                    </button>

                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium w-fit ${typeInfo.color}`}>
                      {typeInfo.label}
                    </span>

                    <div className="truncate">
                      {c.conflictingEntityType === "client" ? (
                        <button
                          className="text-primary hover:underline truncate"
                          onClick={() => navigate(`/clients/${c.conflictingEntityId}`)}
                        >
                          {c.conflictingEntityName ?? `#${c.conflictingEntityId}`}
                        </button>
                      ) : (
                        <span className="text-muted-foreground">{c.conflictingEntityName ?? `#${c.conflictingEntityId}`}</span>
                      )}
                      {c.otherCaseName && (
                        <div className="text-xs text-muted-foreground truncate">
                          ← {c.otherCaseName}
                        </div>
                      )}
                    </div>

                    <span className="text-xs">
                      {MATCH_LABELS[c.matchedOn] ?? c.matchedOn}
                      {c.matchScore && (
                        <span className="text-muted-foreground"> ({Math.round(parseFloat(c.matchScore) * 100)}%)</span>
                      )}
                    </span>

                    <div className="flex items-center">
                      {c.resolved ? (
                        <span className="flex items-center gap-1 text-xs text-green-400">
                          <CheckCircle2 className="h-3.5 w-3.5" /> مُبرَّر
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-destructive">
                          <AlertTriangle className="h-3.5 w-3.5" /> معلق
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

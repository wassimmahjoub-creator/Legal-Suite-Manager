import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useGetCase } from "@workspace/api-client-react";
import { authFetch } from "@/lib/authFetch";
import { useAuth } from "@/context/AuthContext";
import { StatusBadge } from "@/components/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Modal, FormField } from "@/components/Modal";
import { SmartTextarea } from "@/components/SmartTextarea";
import {
  Plus, MapPin, User, Calendar, FileText, CheckCircle2,
  Clock, Briefcase, ArrowRight, Trash2,
  StickyNote, CircleCheck, Circle,
  Users, AlertTriangle, Lock, Link2, GitBranch,
  Archive, Hash, Layers, Shield,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
const inputCls = "h-10 bg-muted/50 border-border focus-visible:ring-1 focus-visible:ring-primary rounded-lg w-full";

const PROCEDURE_STAGES = ["ابتدائي", "استئناف", "تعقيب", "تنفيذ", "ختم"];
const DEADLINE_TYPES = [
  { value: "appeal", label: "أجل الاستئناف (30 يوم)" },
  { value: "cassation", label: "أجل التعقيب (60 يوم)" },
  { value: "execution", label: "أجل التنفيذ (15 يوم)" },
  { value: "response", label: "أجل الرد (20 يوم)" },
  { value: "custom", label: "أجل مخصص" },
];
const URGENCY_COLORS: Record<string, string> = {
  critical: "bg-red-500/10 text-red-400 border-red-500/20",
  high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  normal: "bg-muted text-muted-foreground border-border",
};

type Procedure = { id: number; stage: string; status: string; notes: string | null; startedAt: string | null; endedAt: string | null; };
type Deadline = { id: number; title: string; type: string; dueDate: string; urgency: string; notes: string | null; completedAt: string | null; };
type TeamMember = { id: number; userId: number; role: string; userName: string | null; };
type ConfNote = { id: number; content: string; createdBy: string | null; createdAt: string; };
type Relation = { id: number; relatedCaseId: number; relationType: string; relatedTitle: string | null; };
type UserItem = { id: number; name: string; email: string; role: string; };

export default function CaseDetail() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { data: caseData, isLoading, refetch } = useGetCase(Number(id), { query: { enabled: !!id } });

  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [confNotes, setConfNotes] = useState<ConfNote[]>([]);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [allCases, setAllCases] = useState<Array<{ id: number; title: string }>>([]);
  const [allUsers, setAllUsers] = useState<UserItem[]>([]);

  const [modal, setModal] = useState<string | null>(null);
  const [procForm, setProcForm] = useState({ stage: "ابتدائي", status: "جارية", notes: "", startedAt: "", endedAt: "" });
  const [dlForm, setDlForm] = useState({ title: "", type: "custom", dueDate: "", urgency: "normal", notes: "" });
  const [confForm, setConfForm] = useState({ content: "" });
  const [relForm, setRelForm] = useState({ relatedCaseId: "", relationType: "مرتبطة" });
  const [teamForm, setTeamForm] = useState({ userId: "", role: "مساعد" });
  const [saving, setSaving] = useState(false);

  const load = {
    procedures: async () => { const r = await authFetch(`${BASE}/api/cases/${id}/procedures`); if (r.ok) setProcedures(await r.json()); },
    deadlines: async () => { const r = await authFetch(`${BASE}/api/cases/${id}/deadlines`); if (r.ok) setDeadlines(await r.json()); },
    team: async () => { const r = await authFetch(`${BASE}/api/cases/${id}/team`); if (r.ok) setTeam(await r.json()); },
    confNotes: async () => { const r = await authFetch(`${BASE}/api/cases/${id}/confidential-notes`); if (r.ok) setConfNotes(await r.json()); },
    relations: async () => { const r = await authFetch(`${BASE}/api/cases/${id}/relations`); if (r.ok) setRelations(await r.json()); },
  };

  useEffect(() => {
    if (!id) return;
    Object.values(load).forEach(fn => fn());
    authFetch(`${BASE}/api/cases`).then(r => { if (r.ok) r.json().then(setAllCases); });
    authFetch(`${BASE}/api/auth/users`).then(r => { if (r.ok) r.json().then(setAllUsers); });
  }, [id]);

  async function withSave(fn: () => Promise<void>, reloader: () => Promise<void>) {
    setSaving(true); await fn(); await reloader(); setSaving(false); setModal(null);
  }

  if (isLoading) return (
    <div className="space-y-6">
      <Skeleton className="h-32 w-full rounded-2xl" />
      <Skeleton className="h-96 w-full rounded-2xl" />
    </div>
  );
  if (!caseData) return <div className="text-center py-20 text-muted-foreground">القضية غير موجودة</div>;

  const c = caseData as typeof caseData & { caseNumber?: string; courtCaseNumber?: string; clientFileRef?: string; officeRef?: string; division?: string; procedureStage?: string; archivedAt?: string | null; opponentName?: string | null; opponentLawyer?: string | null; judgmentText?: string | null; };
  const today = new Date().toISOString().slice(0, 10);
  const overdueCount = deadlines.filter(d => !d.completedAt && d.dueDate < today).length;

  return (
    <div className="space-y-6">
      {/* Case Header */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <button onClick={() => navigate("/cases")} className="mt-1 p-2 rounded-xl hover:bg-muted transition-colors shrink-0">
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </button>
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  {c.caseNumber && <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full font-mono flex items-center gap-1" title="رقم الملف الداخلي"><Hash className="h-3 w-3" />{c.caseNumber}</span>}
                  {c.courtCaseNumber && <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-full font-mono flex items-center gap-1" title="رقم القضية لدى المحكمة">⚖ {c.courtCaseNumber}</span>}
                  {c.clientFileRef && <span className="text-xs px-2 py-0.5 bg-cyan-500/10 text-cyan-400 rounded-full font-mono flex items-center gap-1" title="مرجع الحريف">📁 {c.clientFileRef}</span>}
                  <StatusBadge status={caseData.status} />
                  {c.archivedAt && <span className="text-xs px-2 py-0.5 bg-orange-500/10 text-orange-400 rounded-full flex items-center gap-1"><Archive className="h-3 w-3" />مؤرشفة</span>}
                  {c.procedureStage && <span className="text-xs px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center gap-1"><Layers className="h-3 w-3" />{c.procedureStage}</span>}
                </div>
                <h1 className="text-xl font-bold mb-1">{caseData.title}</h1>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {caseData.clientName && <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" />{caseData.clientName}</span>}
                  {caseData.court && <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{caseData.court}{c.division ? ` — ${c.division}` : ""}</span>}
                  {caseData.lawyer && <span className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" />{caseData.lawyer}</span>}
                  {caseData.nextHearing && !c.archivedAt && <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{new Date(caseData.nextHearing).toLocaleDateString("ar-TN")}</span>}
                  {c.archivedAt && c.judgmentText && <span className="flex items-center gap-1.5 text-orange-400"><FileText className="h-3.5 w-3.5" />نص الحكم: {c.judgmentText}</span>}
                  {c.opponentName && <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" />{c.opponentName}{c.opponentLawyer ? ` — ذ. ${c.opponentLawyer}` : ""}</span>}
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap shrink-0">
              {overdueCount > 0 && (
                <span className="text-xs px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> {overdueCount} أجل متأخر
                </span>
              )}
              <Button variant="outline" size="sm" onClick={async () => { if (!confirm(c.archivedAt ? "استرجاع هذه القضية؟" : "أرشفة هذه القضية؟")) return; await authFetch(`${BASE}/api/cases/${id}/archive`, { method: "PATCH" }); refetch(); }} className="gap-1.5 text-xs">
                <Archive className="h-3.5 w-3.5" /> {c.archivedAt ? "استرجاع" : "أرشفة"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5 text-xs">
                <FileText className="h-3.5 w-3.5" /> طباعة
              </Button>
              <Button variant="destructive" size="sm" onClick={async () => { if (!confirm("نقل إلى سلة المحذوفات؟")) return; await authFetch(`${BASE}/api/cases/${id}/soft-delete`, { method: "PATCH" }); navigate("/cases"); }} className="gap-1.5 text-xs">
                <Trash2 className="h-3.5 w-3.5" /> حذف
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="procedures">
        <TabsList className="flex-wrap h-auto gap-1 bg-muted/40 p-1.5 rounded-xl mb-2">
          <TabsTrigger value="procedures" className="rounded-lg text-xs gap-1"><GitBranch className="h-3.5 w-3.5" />الإجراءات</TabsTrigger>
          <TabsTrigger value="deadlines" className="rounded-lg text-xs gap-1 relative">
            <Clock className="h-3.5 w-3.5" />الآجال
            {overdueCount > 0 && <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">{overdueCount}</span>}
          </TabsTrigger>
          <TabsTrigger value="team" className="rounded-lg text-xs gap-1"><Users className="h-3.5 w-3.5" />الفريق</TabsTrigger>
          <TabsTrigger value="relations" className="rounded-lg text-xs gap-1"><Link2 className="h-3.5 w-3.5" />قضايا مرتبطة</TabsTrigger>
          <TabsTrigger value="conf-notes" className="rounded-lg text-xs gap-1"><Lock className="h-3.5 w-3.5" />ملاحظات سرية</TabsTrigger>
          <TabsTrigger value="overview" className="rounded-lg text-xs gap-1"><StickyNote className="h-3.5 w-3.5" />ملاحظات</TabsTrigger>
        </TabsList>

        {/* PROCEDURES */}
        <TabsContent value="procedures" className="mt-0">
          <Card className="border-none shadow-sm"><CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">الإجراءات القانونية</h3>
              <Button size="sm" onClick={() => { setProcForm({ stage: "ابتدائي", status: "جارية", notes: "", startedAt: "", endedAt: "" }); setModal("procedure"); }} className="gap-1.5 text-xs"><Plus className="h-3.5 w-3.5" />إجراء جديد</Button>
            </div>
            {procedures.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground border border-dashed border-border rounded-xl"><GitBranch className="h-8 w-8 mx-auto mb-2 opacity-20" /><p>لا توجد إجراءات</p></div>
            ) : (
              <div className="relative">
                <div className="absolute right-5 top-5 bottom-5 w-0.5 bg-border" />
                <div className="space-y-4">
                  {procedures.map((p, i) => (
                    <div key={p.id} className="flex gap-4">
                      <div className={`h-10 w-10 rounded-full shrink-0 flex items-center justify-center z-10 border-2 font-bold text-sm ${p.status === "مكتملة" ? "bg-green-500/10 text-green-400 border-green-500/30" : p.status === "موقوفة" ? "bg-orange-500/10 text-orange-400 border-orange-500/30" : "bg-primary/10 text-primary border-primary/30"}`}>{i + 1}</div>
                      <div className="flex-1 p-4 bg-muted/30 rounded-xl border border-border">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold">{p.stage}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${p.status === "مكتملة" ? "bg-green-500/10 text-green-400" : p.status === "موقوفة" ? "bg-orange-500/10 text-orange-400" : "bg-blue-500/10 text-blue-400"}`}>{p.status}</span>
                          </div>
                          <button onClick={async () => { if (!confirm("حذف هذا الإجراء؟")) return; await authFetch(`${BASE}/api/procedures/${p.id}`, { method: "DELETE" }); load.procedures(); }} className="p-1 hover:bg-destructive/10 rounded-lg"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                        </div>
                        {p.notes && <p className="text-sm text-muted-foreground mt-2">{p.notes}</p>}
                        {(p.startedAt || p.endedAt) && (
                          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                            {p.startedAt && <span>البداية: {new Date(p.startedAt).toLocaleDateString("ar-TN")}</span>}
                            {p.endedAt && <span>النهاية: {new Date(p.endedAt).toLocaleDateString("ar-TN")}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent></Card>
        </TabsContent>

        {/* DEADLINES */}
        <TabsContent value="deadlines" className="mt-0">
          <Card className="border-none shadow-sm"><CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">الآجال القانونية</h3>
              <Button size="sm" onClick={() => { setDlForm({ title: "", type: "custom", dueDate: "", urgency: "normal", notes: "" }); setModal("deadline"); }} className="gap-1.5 text-xs"><Plus className="h-3.5 w-3.5" />أجل جديد</Button>
            </div>
            {deadlines.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground border border-dashed border-border rounded-xl"><Clock className="h-8 w-8 mx-auto mb-2 opacity-20" /><p>لا توجد آجال</p></div>
            ) : (
              <div className="space-y-3">
                {deadlines.map(d => {
                  const isOver = !d.completedAt && d.dueDate < today;
                  return (
                    <div key={d.id} className={`p-4 rounded-xl border ${d.completedAt ? "opacity-50 border-border bg-muted/20" : URGENCY_COLORS[d.urgency]}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button onClick={async () => { if (d.completedAt) return; await authFetch(`${BASE}/api/deadlines/${d.id}/complete`, { method: "PATCH" }); load.deadlines(); }} className={d.completedAt ? "text-green-400" : "text-muted-foreground hover:text-green-400 transition-colors"}>
                            {d.completedAt ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                          </button>
                          <div>
                            <p className={`font-semibold text-sm ${d.completedAt ? "line-through" : ""}`}>{d.title}</p>
                            <div className="flex items-center gap-3 text-xs mt-0.5">
                              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(d.dueDate).toLocaleDateString("ar-TN")}</span>
                              {isOver && <span className="text-red-400 font-bold animate-pulse">متأخر!</span>}
                              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${d.urgency === "critical" ? "bg-red-500/20 text-red-400" : d.urgency === "high" ? "bg-orange-500/20 text-orange-400" : "bg-muted text-muted-foreground"}`}>{d.urgency === "critical" ? "حرج" : d.urgency === "high" ? "عالٍ" : "عادي"}</span>
                            </div>
                          </div>
                        </div>
                        <button onClick={async () => { if (!confirm("حذف هذا الأجل؟")) return; await authFetch(`${BASE}/api/deadlines/${d.id}`, { method: "DELETE" }); load.deadlines(); }} className="p-1 hover:bg-destructive/10 rounded-lg"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent></Card>
        </TabsContent>

        {/* TEAM */}
        <TabsContent value="team" className="mt-0">
          <Card className="border-none shadow-sm"><CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">فريق القضية</h3>
              <Button size="sm" onClick={() => { setTeamForm({ userId: "", role: "مساعد" }); setModal("team"); }} className="gap-1.5 text-xs"><Plus className="h-3.5 w-3.5" />إضافة عضو</Button>
            </div>
            {team.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground border border-dashed border-border rounded-xl"><Users className="h-8 w-8 mx-auto mb-2 opacity-20" /><p>لا يوجد فريق</p></div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {team.map(m => (
                  <div key={m.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">{(m.userName ?? "م").charAt(0)}</div>
                      <div>
                        <p className="font-semibold text-sm">{m.userName ?? "مستخدم"}</p>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">{m.role}</span>
                      </div>
                    </div>
                    <button onClick={async () => { await authFetch(`${BASE}/api/case-teams/${m.id}`, { method: "DELETE" }); load.team(); }} className="p-1.5 hover:bg-destructive/10 rounded-lg"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                  </div>
                ))}
              </div>
            )}
          </CardContent></Card>
        </TabsContent>

        {/* RELATIONS */}
        <TabsContent value="relations" className="mt-0">
          <Card className="border-none shadow-sm"><CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">القضايا المرتبطة</h3>
              <Button size="sm" onClick={() => { setRelForm({ relatedCaseId: "", relationType: "مرتبطة" }); setModal("relation"); }} className="gap-1.5 text-xs"><Plus className="h-3.5 w-3.5" />ربط قضية</Button>
            </div>
            {relations.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground border border-dashed border-border rounded-xl"><Link2 className="h-8 w-8 mx-auto mb-2 opacity-20" /><p>لا توجد قضايا مرتبطة</p></div>
            ) : (
              <div className="space-y-3">
                {relations.map(r => (
                  <div key={r.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center"><Link2 className="h-4 w-4" /></div>
                      <div>
                        <p className="font-semibold text-sm">{r.relatedTitle ?? `قضية #${r.relatedCaseId}`}</p>
                        <span className="text-xs text-muted-foreground">{r.relationType}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/cases/${r.relatedCaseId}`)} className="text-xs h-8">عرض</Button>
                      <button onClick={async () => { await authFetch(`${BASE}/api/case-relations/${r.id}`, { method: "DELETE" }); load.relations(); }} className="p-1.5 hover:bg-destructive/10 rounded-lg"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent></Card>
        </TabsContent>

        {/* CONFIDENTIAL NOTES */}
        <TabsContent value="conf-notes" className="mt-0">
          <Card className="border-none shadow-sm"><CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">ملاحظات داخلية سرية</h3>
                <span className="text-xs px-2 py-0.5 bg-orange-500/10 text-orange-400 rounded-full flex items-center gap-1"><Lock className="h-3 w-3" />سري</span>
              </div>
              <Button size="sm" onClick={() => { setConfForm({ content: "" }); setModal("conf-note"); }} className="gap-1.5 text-xs"><Plus className="h-3.5 w-3.5" />ملاحظة جديدة</Button>
            </div>
            {confNotes.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground border border-dashed border-border rounded-xl"><Lock className="h-8 w-8 mx-auto mb-2 opacity-20" /><p>لا توجد ملاحظات سرية</p></div>
            ) : (
              <div className="space-y-3">
                {confNotes.map(n => (
                  <div key={n.id} className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-xl">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm flex-1 leading-relaxed">{n.content}</p>
                      <button onClick={async () => { await authFetch(`${BASE}/api/confidential-notes/${n.id}`, { method: "DELETE" }); load.confNotes(); }} className="p-1 hover:bg-destructive/10 rounded-lg shrink-0"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      {n.createdBy && <span className="flex items-center gap-1"><User className="h-3 w-3" />{n.createdBy}</span>}
                      <span dir="ltr">{new Date(n.createdAt).toLocaleDateString("ar-TN")}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent></Card>
        </TabsContent>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="mt-0">
          <Card className="border-none shadow-sm"><CardContent className="p-5 space-y-4">
            {caseData.description && (
              <div><h4 className="text-sm font-semibold text-muted-foreground mb-2">الوصف</h4><p className="text-sm leading-relaxed bg-muted/30 p-3 rounded-xl">{caseData.description}</p></div>
            )}
            {caseData.notes && (
              <div><h4 className="text-sm font-semibold text-muted-foreground mb-2">ملاحظات</h4><p className="text-sm leading-relaxed bg-muted/30 p-3 rounded-xl">{caseData.notes}</p></div>
            )}
            {!caseData.description && !caseData.notes && (
              <div className="text-center py-10 text-muted-foreground"><StickyNote className="h-8 w-8 mx-auto mb-2 opacity-20" /><p>لا توجد ملاحظات</p></div>
            )}
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* MODAL: Procedure */}
      <Modal open={modal === "procedure"} onClose={() => setModal(null)} title="إضافة إجراء قانوني">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="المرحلة" htmlFor="pr-stage">
              <select id="pr-stage" value={procForm.stage} onChange={e => setProcForm({...procForm, stage: e.target.value})} className={inputCls + " px-3 cursor-pointer"}>
                {PROCEDURE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </FormField>
            <FormField label="الحالة" htmlFor="pr-status">
              <select id="pr-status" value={procForm.status} onChange={e => setProcForm({...procForm, status: e.target.value})} className={inputCls + " px-3 cursor-pointer"}>
                {["جارية", "مكتملة", "موقوفة"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="تاريخ البداية" htmlFor="pr-start"><Input id="pr-start" type="date" value={procForm.startedAt} onChange={e => setProcForm({...procForm, startedAt: e.target.value})} className={inputCls} dir="ltr" /></FormField>
            <FormField label="تاريخ النهاية" htmlFor="pr-end"><Input id="pr-end" type="date" value={procForm.endedAt} onChange={e => setProcForm({...procForm, endedAt: e.target.value})} className={inputCls} dir="ltr" /></FormField>
          </div>
          <FormField label="ملاحظات" htmlFor="pr-notes">
            <SmartTextarea id="pr-notes" value={procForm.notes} onChange={v => setProcForm({...procForm, notes: v})} rows={3} aiContext="ملاحظات إجراء قانوني" placeholder="ملاحظات حول الإجراء..." />
          </FormField>
          <div className="flex gap-3">
            <Button className="flex-1" disabled={saving} onClick={() => withSave(async () => { await authFetch(`${BASE}/api/cases/${id}/procedures`, { method: "POST", body: JSON.stringify(procForm) }); }, load.procedures)}>{saving ? "جارٍ الحفظ..." : "حفظ"}</Button>
            <Button variant="outline" onClick={() => setModal(null)} className="px-5">إلغاء</Button>
          </div>
        </div>
      </Modal>

      {/* MODAL: Deadline */}
      <Modal open={modal === "deadline"} onClose={() => setModal(null)} title="إضافة أجل قانوني">
        <div className="space-y-4">
          <FormField label="نوع الأجل" htmlFor="dl-type">
            <select id="dl-type" value={dlForm.type} onChange={e => setDlForm({...dlForm, type: e.target.value})} className={inputCls + " px-3 cursor-pointer"}>
              {DEADLINE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </FormField>
          <FormField label="العنوان" htmlFor="dl-title"><Input id="dl-title" value={dlForm.title} onChange={e => setDlForm({...dlForm, title: e.target.value})} className={inputCls} placeholder="يُملأ تلقائياً حسب النوع" /></FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={dlForm.type === "custom" ? "تاريخ الانتهاء *" : "تاريخ (اختياري)"} htmlFor="dl-due">
              <Input id="dl-due" type="date" value={dlForm.dueDate} onChange={e => setDlForm({...dlForm, dueDate: e.target.value})} className={inputCls} dir="ltr" />
            </FormField>
            <FormField label="الأهمية" htmlFor="dl-urg">
              <select id="dl-urg" value={dlForm.urgency} onChange={e => setDlForm({...dlForm, urgency: e.target.value})} className={inputCls + " px-3 cursor-pointer"}>
                <option value="normal">عادي</option>
                <option value="high">عالٍ</option>
                <option value="critical">حرج</option>
              </select>
            </FormField>
          </div>
          <div className="flex gap-3">
            <Button className="flex-1" disabled={saving || (dlForm.type === "custom" && !dlForm.dueDate)} onClick={() => withSave(async () => { await authFetch(`${BASE}/api/cases/${id}/deadlines`, { method: "POST", body: JSON.stringify(dlForm) }); }, load.deadlines)}>{saving ? "جارٍ الحفظ..." : "حفظ"}</Button>
            <Button variant="outline" onClick={() => setModal(null)} className="px-5">إلغاء</Button>
          </div>
        </div>
      </Modal>

      {/* MODAL: Team */}
      <Modal open={modal === "team"} onClose={() => setModal(null)} title="إضافة عضو للفريق">
        <div className="space-y-4">
          <FormField label="المستخدم" htmlFor="tm-user">
            <select id="tm-user" value={teamForm.userId} onChange={e => setTeamForm({...teamForm, userId: e.target.value})} className={inputCls + " px-3 cursor-pointer"}>
              <option value="">اختر مستخدماً...</option>
              {allUsers.filter(u => !team.some(t => t.userId === u.id)).map(u => <option key={u.id} value={u.id}>{u.name} — {u.email}</option>)}
            </select>
          </FormField>
          <FormField label="الدور في القضية" htmlFor="tm-role">
            <select id="tm-role" value={teamForm.role} onChange={e => setTeamForm({...teamForm, role: e.target.value})} className={inputCls + " px-3 cursor-pointer"}>
              {["مسؤول رئيسي", "مساعد", "متربص"].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </FormField>
          <div className="flex gap-3">
            <Button className="flex-1" disabled={saving || !teamForm.userId} onClick={() => withSave(async () => { await authFetch(`${BASE}/api/cases/${id}/team`, { method: "POST", body: JSON.stringify({...teamForm, userId: Number(teamForm.userId)}) }); }, load.team)}>{saving ? "جارٍ الحفظ..." : "حفظ"}</Button>
            <Button variant="outline" onClick={() => setModal(null)} className="px-5">إلغاء</Button>
          </div>
        </div>
      </Modal>

      {/* MODAL: Confidential Note */}
      <Modal open={modal === "conf-note"} onClose={() => setModal(null)} title="ملاحظة داخلية سرية">
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-orange-500/10 text-orange-400 rounded-xl text-sm">
            <Lock className="h-4 w-4 shrink-0" /> هذه الملاحظة للاستخدام الداخلي فقط
          </div>
          <FormField label="المحتوى *" htmlFor="cn-content">
            <SmartTextarea id="cn-content" value={confForm.content} onChange={v => setConfForm({...confForm, content: v})} rows={4} aiContext="ملاحظة سرية قانونية" placeholder="ملاحظة سرية، استراتيجية قانونية..." />
          </FormField>
          <div className="flex gap-3">
            <Button className="flex-1" disabled={saving || !confForm.content.trim()} onClick={() => withSave(async () => { await authFetch(`${BASE}/api/cases/${id}/confidential-notes`, { method: "POST", body: JSON.stringify({ content: confForm.content, createdBy: user?.name }) }); }, load.confNotes)}>{saving ? "جارٍ الحفظ..." : "حفظ"}</Button>
            <Button variant="outline" onClick={() => setModal(null)} className="px-5">إلغاء</Button>
          </div>
        </div>
      </Modal>

      {/* MODAL: Relation */}
      <Modal open={modal === "relation"} onClose={() => setModal(null)} title="ربط قضية">
        <div className="space-y-4">
          <FormField label="القضية المرتبطة" htmlFor="rl-case">
            <select id="rl-case" value={relForm.relatedCaseId} onChange={e => setRelForm({...relForm, relatedCaseId: e.target.value})} className={inputCls + " px-3 cursor-pointer"}>
              <option value="">اختر قضية...</option>
              {allCases.filter(cas => cas.id !== Number(id) && !relations.some(r => r.relatedCaseId === cas.id)).map(cas => <option key={cas.id} value={cas.id}>{cas.title}</option>)}
            </select>
          </FormField>
          <FormField label="نوع العلاقة" htmlFor="rl-type">
            <select id="rl-type" value={relForm.relationType} onChange={e => setRelForm({...relForm, relationType: e.target.value})} className={inputCls + " px-3 cursor-pointer"}>
              {["مرتبطة", "استئناف عن", "منبثقة عن", "موحدة مع", "مضمنة في"].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </FormField>
          <div className="flex gap-3">
            <Button className="flex-1" disabled={saving || !relForm.relatedCaseId} onClick={() => withSave(async () => { await authFetch(`${BASE}/api/cases/${id}/relations`, { method: "POST", body: JSON.stringify({...relForm, relatedCaseId: Number(relForm.relatedCaseId)}) }); }, load.relations)}>{saving ? "جارٍ الحفظ..." : "حفظ"}</Button>
            <Button variant="outline" onClick={() => setModal(null)} className="px-5">إلغاء</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

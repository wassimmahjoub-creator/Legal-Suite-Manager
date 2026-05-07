import { useState, useEffect, useCallback } from "react";
import { authFetch } from "@/lib/authFetch";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/Modal";
import {
  Plus, UserPlus, Pencil, Trash2, RefreshCw, Copy, Check,
  Shield, ShieldOff, Users, Link2, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

const ROLES = [
  { value: "admin", label: "مدير" },
  { value: "partner", label: "شريك" },
  { value: "lawyer", label: "محامي" },
  { value: "secretary", label: "سكرتيرة" },
  { value: "trainee", label: "متربص" },
  { value: "accountant", label: "محاسب" },
];

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-primary/15 text-primary",
  partner: "bg-purple-500/15 text-purple-500",
  lawyer: "bg-blue-500/15 text-blue-500",
  secretary: "bg-green-500/15 text-green-500",
  trainee: "bg-orange-500/15 text-orange-500",
  accountant: "bg-cyan-500/15 text-cyan-500",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/10 text-green-500",
  suspended: "bg-orange-500/10 text-orange-500",
  archived: "bg-muted text-muted-foreground",
};
const STATUS_LABELS: Record<string, string> = { active: "نشط", suspended: "موقوف", archived: "محذوف" };

const PERMISSIONS = [
  { key: "viewCases", label: "عرض القضايا" },
  { key: "editCases", label: "تعديل القضايا" },
  { key: "deleteCases", label: "حذف القضايا" },
  { key: "createInvoices", label: "إنشاء الفواتير" },
  { key: "viewAccounting", label: "عرض المحاسبة" },
  { key: "manageUsers", label: "إدارة المستخدمين" },
  { key: "exportDocuments", label: "تصدير الوثائق" },
  { key: "manageTemplates", label: "إدارة النماذج" },
];

interface AppUser {
  id: number; name: string; email: string; phone?: string;
  role: string; roleLabel: string; status: string; orgId?: number;
  permissions: Record<string, boolean>; createdAt: string;
}

interface Invitation {
  id: number; email: string; role: string; roleLabel: string;
  status: string; expiresAt: string; token: string;
}

type Modal2 = "add-user" | "invite" | "edit" | "permissions" | "reset-pwd" | null;

export default function UserManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Modal2>(null);
  const [selected, setSelected] = useState<AppUser | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [tab, setTab] = useState<"users" | "invitations">("users");

  const [addForm, setAddForm] = useState({ name: "", email: "", password: "", role: "lawyer", phone: "" });
  const [inviteForm, setInviteForm] = useState({ email: "", role: "lawyer" });
  const [editForm, setEditForm] = useState({ name: "", role: "lawyer", phone: "", status: "active" });
  const [perms, setPerms] = useState<Record<string, boolean>>({});
  const [newPwd, setNewPwd] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastInviteToken, setLastInviteToken] = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [u, i] = await Promise.all([
      authFetch(`${BASE}/api/users`).then(r => r.json()) as Promise<AppUser[]>,
      authFetch(`${BASE}/api/invitations`).then(r => r.json()) as Promise<Invitation[]>,
    ]);
    setUsers(u);
    setInvitations(i);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  function openEdit(u: AppUser) { setSelected(u); setEditForm({ name: u.name, role: u.role, phone: u.phone ?? "", status: u.status }); setModal("edit"); }
  function openPerms(u: AppUser) { setSelected(u); setPerms({ ...u.permissions }); setModal("permissions"); }
  function openResetPwd(u: AppUser) { setSelected(u); setNewPwd(""); setModal("reset-pwd"); }

  async function addUser() {
    setSaving(true);
    try {
      const r = await authFetch(`${BASE}/api/users`, { method: "POST", body: JSON.stringify(addForm) });
      const d = await r.json() as { error?: string };
      if (!r.ok) { toast({ title: "خطأ", description: d.error, variant: "destructive" }); return; }
      toast({ title: "تم إضافة المستخدم بنجاح" }); setModal(null); setAddForm({ name: "", email: "", password: "", role: "lawyer", phone: "" }); loadAll();
    } finally { setSaving(false); }
  }

  async function sendInvite() {
    setSaving(true);
    try {
      const r = await authFetch(`${BASE}/api/invitations`, { method: "POST", body: JSON.stringify(inviteForm) });
      const d = await r.json() as { token?: string; error?: string };
      if (!r.ok) { toast({ title: "خطأ", description: d.error, variant: "destructive" }); return; }
      setLastInviteToken(d.token ?? ""); setInviteForm({ email: "", role: "lawyer" }); loadAll();
    } finally { setSaving(false); }
  }

  async function saveEdit() {
    if (!selected) return;
    setSaving(true);
    try {
      const r = await authFetch(`${BASE}/api/users/${selected.id}`, { method: "PATCH", body: JSON.stringify(editForm) });
      if (!r.ok) { const d = await r.json() as { error?: string }; toast({ title: "خطأ", description: d.error, variant: "destructive" }); return; }
      toast({ title: "تم الحفظ" }); setModal(null); loadAll();
    } finally { setSaving(false); }
  }

  async function savePerms() {
    if (!selected) return;
    setSaving(true);
    try {
      const r = await authFetch(`${BASE}/api/users/${selected.id}`, { method: "PATCH", body: JSON.stringify({ permissions: perms }) });
      if (!r.ok) { const d = await r.json() as { error?: string }; toast({ title: "خطأ", description: d.error, variant: "destructive" }); return; }
      toast({ title: "تم حفظ الصلاحيات" }); setModal(null); loadAll();
    } finally { setSaving(false); }
  }

  async function doResetPwd() {
    if (!selected) return;
    setSaving(true);
    try {
      const r = await authFetch(`${BASE}/api/users/${selected.id}/reset-password`, { method: "POST", body: JSON.stringify({ newPassword: newPwd }) });
      if (!r.ok) { const d = await r.json() as { error?: string }; toast({ title: "خطأ", description: d.error, variant: "destructive" }); return; }
      toast({ title: "تم إعادة تعيين كلمة المرور" }); setModal(null);
    } finally { setSaving(false); }
  }

  async function archiveUser(u: AppUser) {
    if (!confirm(`هل تريد أرشفة المستخدم ${u.name}؟`)) return;
    const r = await authFetch(`${BASE}/api/users/${u.id}`, { method: "DELETE" });
    if (r.ok) { toast({ title: "تم الأرشفة" }); loadAll(); }
  }

  async function toggleStatus(u: AppUser) {
    const newStatus = u.status === "active" ? "suspended" : "active";
    const r = await authFetch(`${BASE}/api/users/${u.id}`, { method: "PATCH", body: JSON.stringify({ status: newStatus }) });
    if (r.ok) { toast({ title: newStatus === "active" ? "تم التفعيل" : "تم الإيقاف" }); loadAll(); }
  }

  async function cancelInvite(id: number) {
    await authFetch(`${BASE}/api/invitations/${id}`, { method: "DELETE" });
    loadAll();
  }

  function copyInviteUrl(token: string) {
    const url = `${window.location.origin}${BASE}/invite/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  }

  const inputCls = "h-10 bg-muted/50 border-border focus-visible:ring-1 focus-visible:ring-primary rounded-lg text-right";
  const isAdmin = user?.role === "admin";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">إدارة المستخدمين</h1>
          <p className="text-muted-foreground text-sm mt-0.5">أعضاء الفريق والدعوات المعلقة</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setModal("invite")} className="gap-1.5">
              <Link2 className="h-4 w-4" /> دعوة
            </Button>
            <Button size="sm" onClick={() => setModal("add-user")} className="gap-1.5">
              <UserPlus className="h-4 w-4" /> إضافة مستخدم
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/40 p-1 rounded-xl w-fit">
        {(["users", "invitations"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
              tab === t ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
            {t === "users" ? `المستخدمون (${users.length})` : `الدعوات المعلقة (${invitations.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted/30 rounded-xl animate-pulse" />)}
        </div>
      ) : tab === "users" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {users.map(u => (
            <div key={u.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                    {u.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{u.name}</p>
                    <p className="text-xs text-muted-foreground" dir="ltr">{u.email}</p>
                    {u.phone && <p className="text-xs text-muted-foreground" dir="ltr">{u.phone}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", ROLE_COLORS[u.role] ?? "bg-muted text-muted-foreground")}>
                    {u.roleLabel}
                  </span>
                  <span className={cn("text-xs px-2 py-0.5 rounded-full", STATUS_COLORS[u.status] ?? "")}>
                    {STATUS_LABELS[u.status] ?? u.status}
                  </span>
                </div>
              </div>
              {isAdmin && u.id !== user?.id && (
                <div className="flex gap-1.5 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => openEdit(u)} className="h-7 px-2 text-xs gap-1">
                    <Pencil className="h-3 w-3" /> تعديل
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openPerms(u)} className="h-7 px-2 text-xs gap-1">
                    <Shield className="h-3 w-3" /> الصلاحيات
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openResetPwd(u)} className="h-7 px-2 text-xs gap-1">
                    <RefreshCw className="h-3 w-3" /> إعادة تعيين
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toggleStatus(u)}
                    className={cn("h-7 px-2 text-xs gap-1", u.status === "active" ? "text-orange-500 hover:text-orange-600" : "text-green-500 hover:text-green-600")}>
                    {u.status === "active" ? <ShieldOff className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                    {u.status === "active" ? "إيقاف" : "تفعيل"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => archiveUser(u)} className="h-7 px-2 text-xs gap-1 text-destructive hover:text-destructive">
                    <Trash2 className="h-3 w-3" /> حذف
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {invitations.length === 0 ? (
            <div className="text-center text-muted-foreground py-12 text-sm">لا توجد دعوات معلقة</div>
          ) : invitations.map(inv => (
            <div key={inv.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-sm" dir="ltr">{inv.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn("text-xs px-2 py-0.5 rounded-full", ROLE_COLORS[inv.role] ?? "bg-muted text-muted-foreground")}>
                    {inv.roleLabel}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    تنتهي: {new Date(inv.expiresAt).toLocaleDateString("ar-TN")}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => copyInviteUrl(inv.token)} className="h-8 px-3 gap-1.5">
                  {copiedToken === inv.token ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedToken === inv.token ? "تم" : "نسخ الرابط"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => cancelInvite(inv.id)} className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add User Modal */}
      <Modal open={modal === "add-user"} onClose={() => setModal(null)} title="إضافة مستخدم جديد">
        <div className="space-y-3">
          {[
            { label: "الاسم الكامل", key: "name", type: "text", placeholder: "المحامي محمد..." },
            { label: "البريد الإلكتروني", key: "email", type: "email", placeholder: "example@cabinet.tn" },
            { label: "كلمة المرور", key: "password", type: "password", placeholder: "••••••••" },
            { label: "رقم الهاتف", key: "phone", type: "tel", placeholder: "+216..." },
          ].map(f => (
            <div key={f.key} className="space-y-1">
              <label className="text-sm font-medium">{f.label}</label>
              <Input type={f.type} value={(addForm as Record<string, string>)[f.key]} dir={f.type === "email" || f.type === "password" || f.type === "tel" ? "ltr" : undefined}
                onChange={e => setAddForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.placeholder} className={inputCls} />
            </div>
          ))}
          <div className="space-y-1">
            <label className="text-sm font-medium">الدور</label>
            <select value={addForm.role} onChange={e => setAddForm(f => ({ ...f, role: e.target.value }))}
              className="w-full h-10 bg-muted/50 border border-border rounded-lg px-3 text-sm text-right">
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={addUser} disabled={saving} className="flex-1">{saving ? "جارٍ الإضافة..." : "إضافة"}</Button>
            <Button variant="outline" onClick={() => setModal(null)} className="flex-1">إلغاء</Button>
          </div>
        </div>
      </Modal>

      {/* Invite Modal */}
      <Modal open={modal === "invite"} onClose={() => { setModal(null); setLastInviteToken(""); }} title="إرسال دعوة">
        <div className="space-y-4">
          {!lastInviteToken ? (
            <>
              <div className="space-y-1">
                <label className="text-sm font-medium">البريد الإلكتروني</label>
                <Input type="email" value={inviteForm.email} dir="ltr" onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="example@cabinet.tn" className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">الدور</label>
                <select value={inviteForm.role} onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full h-10 bg-muted/50 border border-border rounded-lg px-3 text-sm text-right">
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <Button onClick={sendInvite} disabled={saving} className="flex-1">{saving ? "جارٍ الإرسال..." : "إنشاء رابط الدعوة"}</Button>
                <Button variant="outline" onClick={() => setModal(null)} className="flex-1">إلغاء</Button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <Check className="h-10 w-10 text-green-500 mx-auto" />
                <p className="font-semibold">تم إنشاء رابط الدعوة</p>
                <p className="text-xs text-muted-foreground">شارك هذا الرابط مع المستخدم — صالح 7 أيام</p>
              </div>
              <div className="bg-muted/60 rounded-xl p-3 text-xs break-all font-mono" dir="ltr">
                {`${window.location.origin}${BASE}/invite/${lastInviteToken}`}
              </div>
              <Button onClick={() => copyInviteUrl(lastInviteToken)} variant="outline" className="w-full gap-2">
                {copiedToken === lastInviteToken ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                {copiedToken === lastInviteToken ? "تم النسخ!" : "نسخ الرابط"}
              </Button>
            </div>
          )}
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={modal === "edit"} onClose={() => setModal(null)} title={`تعديل: ${selected?.name}`}>
        <div className="space-y-3">
          {[
            { label: "الاسم", key: "name", type: "text" },
            { label: "رقم الهاتف", key: "phone", type: "tel" },
          ].map(f => (
            <div key={f.key} className="space-y-1">
              <label className="text-sm font-medium">{f.label}</label>
              <Input type={f.type} value={(editForm as Record<string, string>)[f.key]}
                onChange={e => setEditForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                className={inputCls} />
            </div>
          ))}
          <div className="space-y-1">
            <label className="text-sm font-medium">الدور</label>
            <select value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
              className="w-full h-10 bg-muted/50 border border-border rounded-lg px-3 text-sm text-right">
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={saveEdit} disabled={saving} className="flex-1">{saving ? "جارٍ الحفظ..." : "حفظ"}</Button>
            <Button variant="outline" onClick={() => setModal(null)} className="flex-1">إلغاء</Button>
          </div>
        </div>
      </Modal>

      {/* Permissions Modal */}
      <Modal open={modal === "permissions"} onClose={() => setModal(null)} title={`صلاحيات: ${selected?.name}`}>
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2">
            {PERMISSIONS.map(p => (
              <label key={p.key} className="flex items-center justify-between p-3 bg-muted/40 rounded-xl cursor-pointer hover:bg-muted/60 transition-colors">
                <span className="text-sm font-medium">{p.label}</span>
                <div className={cn("w-10 h-5 rounded-full transition-colors relative cursor-pointer",
                  perms[p.key] ? "bg-primary" : "bg-muted border border-border")}
                  onClick={() => setPerms(prev => ({ ...prev, [p.key]: !prev[p.key] }))}>
                  <div className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all",
                    perms[p.key] ? "left-5" : "left-0.5")} />
                </div>
              </label>
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={savePerms} disabled={saving} className="flex-1">{saving ? "جارٍ الحفظ..." : "حفظ الصلاحيات"}</Button>
            <Button variant="outline" onClick={() => setModal(null)} className="flex-1">إلغاء</Button>
          </div>
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal open={modal === "reset-pwd"} onClose={() => setModal(null)} title={`إعادة تعيين كلمة مرور: ${selected?.name}`}>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">كلمة المرور الجديدة</label>
            <Input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)}
              placeholder="••••••••" className={inputCls} dir="ltr" minLength={6} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={doResetPwd} disabled={saving || newPwd.length < 6} className="flex-1">
              {saving ? "جارٍ التغيير..." : "تغيير كلمة المرور"}
            </Button>
            <Button variant="outline" onClick={() => setModal(null)} className="flex-1">إلغاء</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

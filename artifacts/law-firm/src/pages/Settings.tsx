import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Building2, Bell, Shield, Palette, Save, CheckCircle2, AlertCircle } from "lucide-react";
import { FormField } from "@/components/Modal";
import { useAuth } from "@/context/AuthContext";

const tabs = [
  { id: "profile", label: "الملف الشخصي", icon: User },
  { id: "office", label: "معلومات المكتب", icon: Building2 },
  { id: "notifications", label: "الإشعارات", icon: Bell },
  { id: "security", label: "الأمان", icon: Shield },
  { id: "display", label: "العرض", icon: Palette },
];

type Status = { type: "success" | "error"; msg: string } | null;

export default function Settings() {
  const { user, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const inputCls = "h-10 bg-muted/50 border-border focus-visible:ring-1 focus-visible:ring-primary rounded-lg";

  /* ── Profile tab state ── */
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [profileStatus, setProfileStatus] = useState<Status>(null);
  const [profileSaving, setProfileSaving] = useState(false);

  /* ── Security tab state ── */
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [secStatus, setSecStatus] = useState<Status>(null);
  const [secSaving, setSecSaving] = useState(false);

  /* Sync if user loads after mount */
  useEffect(() => {
    if (user) { setName(user.name); setEmail(user.email); }
  }, [user?.id]);

  async function saveProfile() {
    if (!name.trim() || !email.trim()) return;
    setProfileSaving(true); setProfileStatus(null);
    try {
      await updateProfile({ name: name.trim(), email: email.trim() });
      setProfileStatus({ type: "success", msg: "تم تحديث الملف الشخصي بنجاح" });
    } catch (e) {
      setProfileStatus({ type: "error", msg: (e as Error).message });
    } finally {
      setProfileSaving(false);
    }
  }

  async function savePassword() {
    if (!currentPw || !newPw || !confirmPw) return;
    if (newPw !== confirmPw) { setSecStatus({ type: "error", msg: "كلمتا المرور غير متطابقتين" }); return; }
    if (newPw.length < 6) { setSecStatus({ type: "error", msg: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" }); return; }
    setSecSaving(true); setSecStatus(null);
    try {
      await updateProfile({ currentPassword: currentPw, newPassword: newPw });
      setSecStatus({ type: "success", msg: "تم تغيير كلمة المرور بنجاح" });
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch (e) {
      setSecStatus({ type: "error", msg: (e as Error).message });
    } finally {
      setSecSaving(false);
    }
  }

  const StatusBar = ({ status }: { status: Status }) => status ? (
    <div className={`flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl ${status.type === "success" ? "bg-green-500/10 text-green-400" : "bg-destructive/10 text-destructive"}`}>
      {status.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
      {status.msg}
    </div>
  ) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">الإعدادات</h1>
        <p className="text-muted-foreground text-sm mt-0.5">إدارة حسابك وإعدادات المكتب</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tab sidebar */}
        <div className="lg:w-56 shrink-0">
          <Card className="border-none shadow-sm">
            <CardContent className="p-2">
              <nav className="space-y-1">
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-right ${
                        activeTab === tab.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                      }`}>
                      <Icon className="h-4 w-4 shrink-0" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Tab content */}
        <div className="flex-1 space-y-4">

          {/* ── PROFILE ── */}
          {activeTab === "profile" && (
            <Card className="border-none shadow-sm">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" /> الملف الشخصي
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                {/* Avatar */}
                <div className="flex items-center gap-4 pb-5 border-b border-border">
                  <div className="h-16 w-16 rounded-full bg-primary/20 text-primary flex items-center justify-center text-2xl font-bold shrink-0">
                    {name.charAt(0) || "م"}
                  </div>
                  <div>
                    <p className="font-semibold text-base">{name || "—"}</p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                    <span className="text-xs px-2 py-0.5 mt-1 inline-block bg-primary/10 text-primary rounded-full">
                      {user?.roleLabel}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="الاسم الكامل *" htmlFor="s-name">
                    <Input id="s-name" value={name} onChange={e => setName(e.target.value)} className={inputCls} placeholder="اسمك الكامل" />
                  </FormField>
                  <FormField label="البريد الإلكتروني *" htmlFor="s-email">
                    <Input id="s-email" type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} dir="ltr" placeholder="email@cabinet.tn" />
                  </FormField>
                </div>

                <StatusBar status={profileStatus} />

                <Button onClick={saveProfile} disabled={profileSaving || !name.trim() || !email.trim()} className="gap-2">
                  <Save className="h-4 w-4" />
                  {profileSaving ? "جاري الحفظ..." : "حفظ التغييرات"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ── OFFICE ── */}
          {activeTab === "office" && (
            <Card className="border-none shadow-sm">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" /> معلومات المكتب
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-xl">
                  هذه المعلومات ستظهر في الفواتير والوثائق الرسمية للمكتب.
                </p>
                <FormField label="اسم المكتب" htmlFor="o-name">
                  <Input id="o-name" placeholder="مكتب المحامي..." className={inputCls} />
                </FormField>
                <FormField label="العنوان" htmlFor="o-address">
                  <Input id="o-address" placeholder="شارع، المدينة" className={inputCls} />
                </FormField>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="الهاتف" htmlFor="o-phone">
                    <Input id="o-phone" placeholder="71 234 567" className={inputCls} dir="ltr" />
                  </FormField>
                  <FormField label="الفاكس" htmlFor="o-fax">
                    <Input id="o-fax" placeholder="71 234 568" className={inputCls} dir="ltr" />
                  </FormField>
                </div>
                <FormField label="البريد الإلكتروني" htmlFor="o-email">
                  <Input id="o-email" type="email" placeholder="contact@cabinet.tn" className={inputCls} dir="ltr" />
                </FormField>
                <FormField label="الترقيم الجبائي" htmlFor="o-tax">
                  <Input id="o-tax" placeholder="1234567A/P/M/000" className={inputCls} dir="ltr" />
                </FormField>
                <Button className="gap-2">
                  <Save className="h-4 w-4" /> حفظ
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ── NOTIFICATIONS ── */}
          {activeTab === "notifications" && (
            <Card className="border-none shadow-sm">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" /> الإشعارات
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                {[
                  { label: "تذكير بالجلسات", desc: "48 ساعة قبل موعد الجلسة", on: true },
                  { label: "فواتير معلقة", desc: "تنبيه عند تأخر الدفع", on: true },
                  { label: "آجال قريبة", desc: "تنبيه بمواعيد التقديم", on: true },
                  { label: "تقارير أسبوعية", desc: "ملخص نشاط المكتب كل أسبوع", on: false },
                ].map((item, i) => (
                  <label key={i} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl cursor-pointer hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="font-medium text-sm">{item.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                    <input type="checkbox" defaultChecked={item.on} className="h-4 w-4 accent-primary cursor-pointer" />
                  </label>
                ))}
                <Button className="gap-2 mt-2"><Save className="h-4 w-4" /> حفظ الإعدادات</Button>
              </CardContent>
            </Card>
          )}

          {/* ── SECURITY ── */}
          {activeTab === "security" && (
            <Card className="border-none shadow-sm">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" /> الأمان — تغيير كلمة المرور
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <FormField label="كلمة المرور الحالية" htmlFor="pass-current">
                  <Input id="pass-current" type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="••••••••" className={inputCls} dir="ltr" />
                </FormField>
                <FormField label="كلمة المرور الجديدة" htmlFor="pass-new">
                  <Input id="pass-new" type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="••••••••" className={inputCls} dir="ltr" />
                </FormField>
                <FormField label="تأكيد كلمة المرور الجديدة" htmlFor="pass-confirm">
                  <Input id="pass-confirm" type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="••••••••" className={inputCls} dir="ltr" />
                </FormField>

                <StatusBar status={secStatus} />

                <Button onClick={savePassword} disabled={secSaving || !currentPw || !newPw || !confirmPw} className="gap-2">
                  <Shield className="h-4 w-4" />
                  {secSaving ? "جاري التحديث..." : "تحديث كلمة المرور"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ── DISPLAY ── */}
          {activeTab === "display" && (
            <Card className="border-none shadow-sm">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Palette className="h-5 w-5 text-primary" /> إعدادات العرض
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div>
                  <p className="text-sm font-medium mb-3">المظهر</p>
                  <div className="grid grid-cols-2 gap-3 max-w-xs">
                    <button className="p-4 rounded-xl border-2 border-primary bg-primary/10 text-primary text-sm font-medium">
                      داكن (الافتراضي)
                    </button>
                    <button className="p-4 rounded-xl border-2 border-border hover:border-muted-foreground text-sm font-medium transition-colors opacity-40 cursor-not-allowed">
                      فاتح
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">الوضع الفاتح سيكون متاحاً في تحديث قادم</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-3">اللغة</p>
                  <select className={inputCls + " px-3 cursor-pointer max-w-xs"}>
                    <option value="ar">العربية (الدارجة التونسية)</option>
                  </select>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

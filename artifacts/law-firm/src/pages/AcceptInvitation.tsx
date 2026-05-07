import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { Scale, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

interface InviteInfo {
  email: string;
  role: string;
  roleLabel: string;
}

export default function AcceptInvitation() {
  const [, params] = useRoute("/invite/:token");
  const token = params?.token ?? "";
  const [, navigate] = useLocation();
  const { acceptInvite } = useAuth();

  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [infoError, setInfoError] = useState("");
  const [form, setForm] = useState({ name: "", password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`${BASE}/api/invitations/accept/${token}`)
      .then(r => r.json())
      .then((d: InviteInfo & { error?: string }) => {
        if (d.error) setInfoError(d.error);
        else setInfo(d);
      })
      .catch(() => setInfoError("خطأ في الاتصال"));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) { setError("كلمتا المرور غير متطابقتين"); return; }
    setLoading(true);
    try {
      await acceptInvite(token, form.name, form.password);
      setDone(true);
      setTimeout(() => navigate("/"), 2000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "h-11 bg-muted/50 border-border focus-visible:ring-1 focus-visible:ring-primary rounded-lg text-right";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10">
            <Scale className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-primary">قبول الدعوة</h1>
        </div>

        {infoError ? (
          <div className="bg-card rounded-2xl p-6 border border-destructive/30 text-center space-y-3">
            <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
            <p className="font-semibold text-destructive">{infoError}</p>
          </div>
        ) : done ? (
          <div className="bg-card rounded-2xl p-8 border border-border shadow-lg text-center space-y-4">
            <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto" />
            <p className="font-bold text-lg">مرحباً بك في الفريق!</p>
            <p className="text-sm text-muted-foreground">جارٍ التحويل...</p>
          </div>
        ) : info ? (
          <form onSubmit={handleSubmit} className="space-y-4 bg-card rounded-2xl p-6 border border-border shadow-lg">
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-sm space-y-1">
              <p className="font-medium">تمت دعوتك للانضمام كـ <span className="text-primary font-bold">{info.roleLabel}</span></p>
              <p className="text-muted-foreground text-xs" dir="ltr">{info.email}</p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">اسمك الكامل *</label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="المحامي محمد..." className={inputCls} required />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">كلمة المرور *</label>
              <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="••••••••" className={inputCls} dir="ltr" required minLength={6} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">تأكيد كلمة المرور *</label>
              <Input type="password" value={form.confirmPassword} onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                placeholder="••••••••" className={inputCls} dir="ltr" required minLength={6} />
            </div>
            {error && <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{error}</p>}
            <Button type="submit" className="w-full h-11 font-semibold" disabled={loading}>
              {loading ? "جارٍ الانضمام..." : "انضم إلى الفريق"}
            </Button>
          </form>
        ) : (
          <div className="bg-card rounded-2xl p-8 border border-border flex items-center justify-center">
            <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}

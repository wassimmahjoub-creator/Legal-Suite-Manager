import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { Scale, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

export default function ResetPassword() {
  const [, params] = useRoute("/reset-password/:token");
  const token = params?.token ?? "";
  const [, navigate] = useLocation();
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) { setError("كلمتا المرور غير متطابقتين"); return; }
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: form.password, confirmPassword: form.confirmPassword }),
      });
      const d = await r.json() as { error?: string };
      if (!r.ok) { setError(d.error ?? "خطأ غير متوقع"); return; }
      setDone(true);
      setTimeout(() => navigate("/login"), 3000);
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
          <div>
            <h1 className="text-2xl font-bold text-primary">إعادة تعيين كلمة المرور</h1>
            <p className="text-muted-foreground text-sm mt-1">أدخل كلمة المرور الجديدة</p>
          </div>
        </div>

        {done ? (
          <div className="bg-card rounded-2xl p-8 border border-border shadow-lg text-center space-y-4">
            <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto" />
            <p className="font-bold text-lg">تم تغيير كلمة المرور بنجاح!</p>
            <p className="text-sm text-muted-foreground">سيتم توجيهك إلى صفحة تسجيل الدخول...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 bg-card rounded-2xl p-6 border border-border shadow-lg">
            <div className="space-y-1">
              <label className="text-sm font-medium">كلمة المرور الجديدة</label>
              <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="••••••••" className={inputCls} dir="ltr" required minLength={6} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">تأكيد كلمة المرور</label>
              <Input type="password" value={form.confirmPassword} onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                placeholder="••••••••" className={inputCls} dir="ltr" required minLength={6} />
            </div>
            {error && <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{error}</p>}
            <Button type="submit" className="w-full h-11 font-semibold" disabled={loading || !token}>
              {loading ? "جارٍ التغيير..." : "تغيير كلمة المرور"}
            </Button>
          </form>
        )}

        <div className="text-center">
          <Link href="/login" className="text-sm text-primary hover:underline">العودة إلى تسجيل الدخول</Link>
        </div>
      </div>
    </div>
  );
}

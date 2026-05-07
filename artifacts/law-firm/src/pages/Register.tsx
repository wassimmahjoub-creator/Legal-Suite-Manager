import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";

export default function Register() {
  const { register } = useAuth();
  const [form, setForm] = useState({ fullName: "", email: "", password: "", confirmPassword: "", officeName: "", phone: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function set(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) { setError("كلمتا المرور غير متطابقتين"); return; }
    setLoading(true);
    try {
      await register(form);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "h-11 bg-muted/50 border-border focus-visible:ring-1 focus-visible:ring-primary rounded-lg text-right";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10">
            <Scale className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-primary">محامي بلوس</h1>
            <p className="text-muted-foreground text-sm mt-1">إنشاء حساب جديد — تجربة مجانية 3 أشهر</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-card rounded-2xl p-6 border border-border shadow-lg">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2">
              <label className="text-sm font-medium">اسم المكتب / المكتب القانوني *</label>
              <Input value={form.officeName} onChange={set("officeName")} placeholder="مكتب المحامي..." className={inputCls} required />
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-sm font-medium">الاسم الكامل *</label>
              <Input value={form.fullName} onChange={set("fullName")} placeholder="المحامي محمد..." className={inputCls} required />
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-sm font-medium">البريد الإلكتروني *</label>
              <Input type="email" value={form.email} onChange={set("email")} placeholder="example@cabinet.tn" className={inputCls} dir="ltr" required />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">رقم الهاتف</label>
              <Input type="tel" value={form.phone} onChange={set("phone")} placeholder="+216..." className={inputCls} dir="ltr" />
            </div>
            <div className="space-y-1" />
            <div className="space-y-1">
              <label className="text-sm font-medium">كلمة المرور *</label>
              <Input type="password" value={form.password} onChange={set("password")} placeholder="••••••••" className={inputCls} dir="ltr" required minLength={6} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">تأكيد كلمة المرور *</label>
              <Input type="password" value={form.confirmPassword} onChange={set("confirmPassword")} placeholder="••••••••" className={inputCls} dir="ltr" required minLength={6} />
            </div>
          </div>

          {error && <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{error}</p>}

          <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={loading}>
            {loading ? "جاري الإنشاء..." : "إنشاء الحساب والبدء"}
          </Button>

          <div className="text-center">
            <span className="text-sm text-muted-foreground">لديك حساب؟ </span>
            <Link href="/login" className="text-sm text-primary hover:underline font-medium">تسجيل الدخول</Link>
          </div>
        </form>

        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center space-y-1">
          <p className="text-sm font-semibold text-primary">🎁 تجربة مجانية 3 أشهر</p>
          <p className="text-xs text-muted-foreground">جميع الميزات متاحة بالكامل — بدون بطاقة بنكية</p>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          محامي بلوس — برنامج إدارة المكاتب القانونية التونية
        </p>
      </div>
    </div>
  );
}

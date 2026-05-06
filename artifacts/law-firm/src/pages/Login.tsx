import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Login() {
  const { login, setup, hasUsers } = useAuth();
  const isSetup = hasUsers === false;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isSetup) {
        await setup(name, email, password);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "h-11 bg-muted/50 border-border focus-visible:ring-1 focus-visible:ring-primary rounded-lg text-right";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10">
            <Scale className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-primary">محامي بلوس</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {isSetup ? "إنشاء حساب المدير — المرة الأولى" : "تسجيل الدخول"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-card rounded-2xl p-6 border border-border shadow-lg">
          {isSetup && (
            <div className="space-y-1">
              <label className="text-sm font-medium">الاسم الكامل</label>
              <Input
                value={name} onChange={e => setName(e.target.value)}
                placeholder="المحامي محمد..." className={inputCls} required
              />
            </div>
          )}
          <div className="space-y-1">
            <label className="text-sm font-medium">البريد الإلكتروني</label>
            <Input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="example@cabinet.tn" className={inputCls} dir="ltr" required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">كلمة المرور</label>
            <Input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" className={inputCls} dir="ltr" required minLength={6}
            />
          </div>
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{error}</p>
          )}
          <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={loading}>
            {loading ? "جاري..." : isSetup ? "إنشاء الحساب" : "تسجيل الدخول"}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          محامي بلوس — برنامج إدارة المكاتب القانونية التونية
        </p>
      </div>
    </div>
  );
}

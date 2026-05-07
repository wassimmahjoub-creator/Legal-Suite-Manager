import { useState } from "react";
import { Scale, Copy, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [copied, setCopied] = useState(false);

  const resetUrl = resetToken ? `${window.location.origin}${BASE}/reset-password/${resetToken}` : "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const d = await r.json() as { token?: string; error?: string };
      if (!r.ok) { setError(d.error ?? "خطأ غير متوقع"); return; }
      setResetToken(d.token ?? "");
    } finally {
      setLoading(false);
    }
  }

  function copy() {
    navigator.clipboard.writeText(resetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            <h1 className="text-2xl font-bold text-primary">نسيت كلمة المرور؟</h1>
            <p className="text-muted-foreground text-sm mt-1">أدخل بريدك الإلكتروني لإعادة التعيين</p>
          </div>
        </div>

        {!resetToken ? (
          <form onSubmit={handleSubmit} className="space-y-4 bg-card rounded-2xl p-6 border border-border shadow-lg">
            <div className="space-y-1">
              <label className="text-sm font-medium">البريد الإلكتروني</label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="example@cabinet.tn" className={inputCls} dir="ltr" required />
            </div>
            {error && <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{error}</p>}
            <Button type="submit" className="w-full h-11 font-semibold" disabled={loading}>
              {loading ? "جاري البحث..." : "إرسال رابط إعادة التعيين"}
            </Button>
          </form>
        ) : (
          <div className="space-y-4 bg-card rounded-2xl p-6 border border-border shadow-lg">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                <Check className="h-6 w-6 text-green-500" />
              </div>
              <p className="font-semibold">تم توليد رابط إعادة التعيين</p>
              <p className="text-sm text-muted-foreground">انسخ الرابط أدناه وافتحه لتغيير كلمة المرور</p>
            </div>
            <div className="bg-muted/60 rounded-xl p-3 text-xs break-all text-muted-foreground font-mono" dir="ltr">
              {resetUrl}
            </div>
            <Button onClick={copy} variant="outline" className="w-full gap-2">
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              {copied ? "تم النسخ!" : "نسخ الرابط"}
            </Button>
            <Link href={`/reset-password/${resetToken}`}>
              <Button className="w-full gap-2">
                <ArrowRight className="h-4 w-4" /> فتح الرابط الآن
              </Button>
            </Link>
          </div>
        )}

        <div className="text-center">
          <Link href="/login" className="text-sm text-primary hover:underline">العودة إلى تسجيل الدخول</Link>
        </div>
      </div>
    </div>
  );
}

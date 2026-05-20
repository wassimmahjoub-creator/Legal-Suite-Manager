import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/context/AuthContext";
import { Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const LoginSchema = z.object({
  email: z.string()
    .min(1, "البريد الإلكتروني مطلوب")
    .email("صيغة البريد الإلكتروني غير صحيحة"),
  password: z.string()
    .min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
});

type LoginForm = z.infer<typeof LoginSchema>;

export default function Login() {
  const { login } = useAuth();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(LoginSchema),
  });
  const [serverError, setServerError] = useState<string | null>(null);

  async function onSubmit(data: LoginForm) {
    setServerError(null);
    try {
      await login(data.email, data.password);
    } catch (err) {
      setServerError((err as Error).message);
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
            <h1 className="text-3xl font-bold text-primary">محامي بلوس</h1>
            <p className="text-muted-foreground text-sm mt-1">تسجيل الدخول</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 bg-card rounded-2xl p-6 border border-border shadow-lg">
          <div className="space-y-1">
            <label className="text-sm font-medium">البريد الإلكتروني</label>
            <Input
              {...register("email")}
              type="email"
              placeholder="example@cabinet.tn"
              className={inputCls}
              dir="ltr"
              autoComplete="email"
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">كلمة المرور</label>
              <a href="forgot-password" className="text-xs text-primary hover:underline">نسيت كلمة المرور؟</a>
            </div>
            <Input
              {...register("password")}
              type="password"
              placeholder="••••••••"
              className={inputCls}
              dir="ltr"
              autoComplete="current-password"
            />
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          {serverError && (
            <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{serverError}</p>
          )}

          <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={isSubmitting}>
            {isSubmitting ? "جارٍ تسجيل الدخول..." : "تسجيل الدخول"}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            ليس لديك حساب؟{" "}
            <a href="register" className="text-primary hover:underline font-medium">إنشاء حساب جديد</a>
          </div>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          محامي بلوس — برنامج إدارة المكاتب القانونية التونية
        </p>
      </div>
    </div>
  );
}

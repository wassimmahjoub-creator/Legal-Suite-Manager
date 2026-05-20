import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const RegisterSchema = z.object({
  officeName:      z.string().min(2, "اسم المكتب مطلوب (حرفان على الأقل)"),
  fullName:        z.string().min(2, "الاسم الكامل مطلوب"),
  email:           z.string().min(1, "البريد الإلكتروني مطلوب").email("صيغة البريد غير صحيحة"),
  phone:           z.string().optional(),
  password:        z.string().min(12, "كلمة المرور يجب أن تكون 12 حرفاً على الأقل"),
  confirmPassword: z.string().min(1, "تأكيد كلمة المرور مطلوب"),
}).refine(d => d.password === d.confirmPassword, {
  message: "كلمتا المرور غير متطابقتين",
  path: ["confirmPassword"],
});

type RegisterForm = z.infer<typeof RegisterSchema>;

export default function Register() {
  const { register: registerUser } = useAuth();

  const {
    register: field,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({ resolver: zodResolver(RegisterSchema) });
  const [serverError, setServerError] = useState("");

  async function onSubmit(data: RegisterForm) {
    setServerError("");
    try {
      await registerUser(data);
    } catch (err) {
      setServerError((err as Error).message);
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 bg-card rounded-2xl p-6 border border-border shadow-lg">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2">
              <label className="text-sm font-medium">اسم المكتب / المكتب القانوني *</label>
              <Input {...field("officeName")} placeholder="مكتب المحامي..." className={inputCls} />
              {errors.officeName && <p className="text-xs text-destructive mt-1">{errors.officeName.message}</p>}
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-sm font-medium">الاسم الكامل *</label>
              <Input {...field("fullName")} placeholder="المحامي محمد..." className={inputCls} />
              {errors.fullName && <p className="text-xs text-destructive mt-1">{errors.fullName.message}</p>}
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-sm font-medium">البريد الإلكتروني *</label>
              <Input type="email" {...field("email")} placeholder="example@cabinet.tn" className={inputCls} dir="ltr" />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">رقم الهاتف</label>
              <Input type="tel" {...field("phone")} placeholder="+216..." className={inputCls} dir="ltr" />
            </div>
            <div className="space-y-1" />
            <div className="space-y-1">
              <label className="text-sm font-medium">كلمة المرور *</label>
              <Input type="password" {...field("password")} placeholder="••••••••" className={inputCls} dir="ltr" />
              {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">تأكيد كلمة المرور *</label>
              <Input type="password" {...field("confirmPassword")} placeholder="••••••••" className={inputCls} dir="ltr" />
              {errors.confirmPassword && <p className="text-xs text-destructive mt-1">{errors.confirmPassword.message}</p>}
            </div>
          </div>

          {serverError && <p className="text-sm text-destructive text-center">{serverError}</p>}

          <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={isSubmitting}>
            {isSubmitting ? "جارٍ الإنشاء..." : "إنشاء الحساب والبدء"}
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
          محامي بلوس — برنامج إدارة المكاتب القانونية
        </p>
      </div>
    </div>
  );
}

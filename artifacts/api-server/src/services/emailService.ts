import { Resend } from "resend";

const _apiKey = process.env["RESEND_API_KEY"];
const FROM = process.env["EMAIL_FROM"] ?? "noreply@yourdomain.com";
const FRONTEND_URL = (process.env["FRONTEND_URL"] ?? "").split(",")[0].trim();

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  if (!_apiKey) {
    console.warn(`[DEV] Password reset link for ${to}: ${FRONTEND_URL}/reset-password?token=${token}`);
    return;
  }
  const resend = new Resend(_apiKey);
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`;
  await resend.emails.send({
    from: FROM,
    to,
    subject: "إعادة تعيين كلمة المرور — Legal Suite",
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 500px; margin: auto;">
        <h2>إعادة تعيين كلمة المرور</h2>
        <p>لقد طلبت إعادة تعيين كلمة مرور حسابك.</p>
        <p>انقر على الرابط أدناه لإعادة التعيين (صالح لمدة ساعة واحدة):</p>
        <a href="${resetUrl}" style="display:inline-block; padding:12px 24px; background:#2563eb; color:white; text-decoration:none; border-radius:6px;">
          إعادة تعيين كلمة المرور
        </a>
        <p style="margin-top:16px; color:#6b7280; font-size:14px;">
          إذا لم تطلب ذلك، يمكنك تجاهل هذه الرسالة.
        </p>
      </div>
    `,
  });
}

import { Link } from "wouter";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center" dir="rtl">
      <div className="bg-muted/30 rounded-full p-6 mb-6">
        <FileQuestion className="h-14 w-14 text-muted-foreground/50" />
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-2">الصفحة غير موجودة</h1>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        الرابط الذي اتبعته غير موجود أو تمّ نقله.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        العودة إلى الرئيسية
      </Link>
    </div>
  );
}

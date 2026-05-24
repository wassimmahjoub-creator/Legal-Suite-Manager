import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, navigate] = useLocation();
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-muted/30" dir="rtl">
      <Card className="w-full max-w-md mx-4 shadow-lg border-border">
        <CardContent className="pt-8 pb-8 text-center space-y-5">
          <div className="flex justify-center">
            <div className="rounded-full bg-muted p-4">
              <FileQuestion className="h-10 w-10 text-muted-foreground" />
            </div>
          </div>
          <div>
            <p className="text-5xl font-bold text-primary mb-2">404</p>
            <h1 className="text-xl font-semibold text-foreground">الصفحة غير موجودة</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            الرابط الذي طلبته غير موجود أو تمّ نقله.
          </p>
          <Button onClick={() => navigate("/")} className="mt-2">
            العودة إلى الرئيسية
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

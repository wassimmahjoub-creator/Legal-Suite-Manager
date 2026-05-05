import { Card, CardContent } from "@/components/ui/card";
import { Settings as SettingsIcon } from "lucide-react";

export default function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">الإعدادات</h1>
        <p className="text-muted-foreground mt-1">تفضيلات النظام وإدارة الحساب</p>
      </div>

      <Card className="border-none shadow-md">
        <CardContent className="p-24 text-center">
          <SettingsIcon className="mx-auto h-16 w-16 text-muted-foreground/20 mb-4" />
          <p className="text-xl font-medium text-muted-foreground">صفحة الإعدادات قيد التطوير</p>
        </CardContent>
      </Card>
    </div>
  );
}
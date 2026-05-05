import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function Documents() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">الوثائق</h1>
        <p className="text-muted-foreground mt-1">إدارة الملفات والوثائق الخاصة بالقضايا</p>
      </div>

      <Card className="border-none shadow-md">
        <CardContent className="p-24 text-center">
          <FileText className="mx-auto h-16 w-16 text-muted-foreground/20 mb-4" />
          <p className="text-xl font-medium text-muted-foreground">صفحة الوثائق قيد التطوير</p>
        </CardContent>
      </Card>
    </div>
  );
}
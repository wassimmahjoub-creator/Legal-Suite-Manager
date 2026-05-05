import { useState } from "react";
import { useListInvoices } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Download, Edit } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useKeypadInput } from "@/context/KeypadContext";
import { Label } from "@/components/ui/label";

export default function Billing() {
  const { data: invoices, isLoading } = useListInvoices();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const amountKeypadProps = useKeypadInput("new-invoice-amount");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">الفوترة</h1>
          <p className="text-muted-foreground mt-1">إدارة الفواتير والدفوعات</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full px-6 shadow-md hover:shadow-lg transition-shadow">
              <Plus className="ml-2 h-4 w-4" />
              فاتورة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]" dir="rtl">
            <DialogHeader>
              <DialogTitle>فاتورة جديدة</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="client-name">اسم الحريف</Label>
                <Input id="client-name" placeholder="أدخل اسم الحريف" className="h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-invoice-amount" className="text-primary font-medium flex items-center gap-2">
                  المبلغ (د.ت)
                  <span className="text-xs font-normal text-muted-foreground px-2 py-0.5 bg-muted rounded-md">استخدم اللوحة</span>
                </Label>
                <Input 
                  id="new-invoice-amount" 
                  type="text" 
                  inputMode="none" 
                  placeholder="0.00" 
                  className="h-14 text-xl font-bold font-mono tracking-wider focus-visible:ring-primary text-left bg-muted/30 border-primary/30" 
                  dir="ltr"
                  {...amountKeypadProps}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">الحالة</Label>
                <select id="status" className="flex h-11 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                  <option value="pending">في الانتظار</option>
                  <option value="paid">مدفوع</option>
                </select>
              </div>
              <Button className="w-full h-11" onClick={() => setIsDialogOpen(false)}>احفظ الفاتورة</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-md">
        <CardContent className="p-0">
          <div className="rounded-xl overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="text-right py-4 font-semibold">رقم</TableHead>
                  <TableHead className="text-right py-4 font-semibold">الحريف</TableHead>
                  <TableHead className="text-right py-4 font-semibold">القضية (اختياري)</TableHead>
                  <TableHead className="text-right py-4 font-semibold">المبلغ</TableHead>
                  <TableHead className="text-right py-4 font-semibold">الحالة</TableHead>
                  <TableHead className="text-right py-4 font-semibold">تاريخ الإصدار</TableHead>
                  <TableHead className="text-center py-4 font-semibold">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j} className="py-4"><Skeleton className="h-6 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : invoices?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      لا توجد فواتير
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices?.map((inv) => (
                    <TableRow key={inv.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium py-4 text-muted-foreground">#INV-{inv.id.toString().padStart(4, '0')}</TableCell>
                      <TableCell className="font-medium py-4">{inv.clientName}</TableCell>
                      <TableCell className="py-4 text-muted-foreground">{inv.caseName || "—"}</TableCell>
                      <TableCell className="py-4 font-bold font-mono tracking-tight" dir="ltr">{inv.amount.toFixed(2)} TND</TableCell>
                      <TableCell className="py-4">
                        <StatusBadge status={inv.status} />
                      </TableCell>
                      <TableCell className="py-4">{new Date(inv.createdAt).toLocaleDateString('ar-TN')}</TableCell>
                      <TableCell className="text-center py-4">
                        <div className="flex items-center justify-center gap-2">
                          <Button variant="ghost" size="icon" className="hover:bg-primary/10 hover:text-primary rounded-full h-8 w-8">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="hover:bg-primary/10 hover:text-primary rounded-full h-8 w-8">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
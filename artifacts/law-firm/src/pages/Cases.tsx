import { useState } from "react";
import { Link } from "wouter";
import { useListCases } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Eye, Filter } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Cases() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: cases, isLoading } = useListCases();

  const filteredCases = cases?.filter(c => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (search && !c.title.includes(search) && !c.clientName.includes(search)) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">القضايا</h1>
          <p className="text-muted-foreground mt-1">إدارة وتتبع جميع قضايا المكتب</p>
        </div>
        <Button className="rounded-full px-6 shadow-md hover:shadow-lg transition-shadow">
          <Plus className="ml-2 h-4 w-4" />
          قضية جديدة
        </Button>
      </div>

      <Card className="border-none shadow-md">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث باسم القضية أو الحريف..."
                className="pl-4 pr-10 bg-muted/50 border-transparent focus-visible:bg-background h-11 rounded-xl"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-48 flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-muted/50 border-transparent h-11 rounded-xl focus:ring-1 focus:ring-primary">
                  <SelectValue placeholder="الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="active">نشط</SelectItem>
                  <SelectItem value="pending">في الانتظار</SelectItem>
                  <SelectItem value="suspended">موقوفة</SelectItem>
                  <SelectItem value="closed">مغلقة</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-xl border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-right py-4">اسم القضية</TableHead>
                  <TableHead className="text-right py-4">الحريف</TableHead>
                  <TableHead className="text-right py-4">المحكمة</TableHead>
                  <TableHead className="text-right py-4">الحالة</TableHead>
                  <TableHead className="text-right py-4">الجلسة الجاية</TableHead>
                  <TableHead className="text-right py-4">المحامي</TableHead>
                  <TableHead className="text-center py-4">إجراءات</TableHead>
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
                ) : filteredCases?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      لم يتم العثور على قضايا
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCases?.map((c) => (
                    <TableRow key={c.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium py-4">{c.title}</TableCell>
                      <TableCell className="py-4">{c.clientName}</TableCell>
                      <TableCell className="py-4 text-muted-foreground">{c.court || "—"}</TableCell>
                      <TableCell className="py-4">
                        <StatusBadge status={c.status} />
                      </TableCell>
                      <TableCell className="py-4">{c.nextHearing ? new Date(c.nextHearing).toLocaleDateString('ar-TN') : "—"}</TableCell>
                      <TableCell className="py-4">{c.lawyer || "—"}</TableCell>
                      <TableCell className="text-center py-4">
                        <Link href={`/cases/${c.id}`}>
                          <Button variant="ghost" size="icon" className="hover:bg-primary/10 hover:text-primary rounded-full">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
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
import { useParams } from "wouter";
import { useGetCase } from "@workspace/api-client-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, MapPin, User, Calendar, FileText, CheckCircle2, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function CaseDetail() {
  const { id } = useParams();
  const { data: caseData, isLoading } = useGetCase(Number(id), { query: { enabled: !!id } });

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-32 w-full rounded-2xl" /><Skeleton className="h-96 w-full rounded-2xl" /></div>;
  }

  if (!caseData) return <div className="text-center p-12">القضية غير موجودة</div>;

  return (
    <div className="space-y-6">
      {/* Header Profile */}
      <div className="bg-card border-none shadow-md rounded-2xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-2 h-full bg-primary" />
        <div className="space-y-2 z-10">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{caseData.title}</h1>
            <StatusBadge status={caseData.status} />
          </div>
          <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground mt-4">
            <div className="flex items-center gap-2"><User className="h-4 w-4" /> {caseData.clientName}</div>
            {caseData.court && <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {caseData.court}</div>}
            {caseData.lawyer && <div className="flex items-center gap-2"><BriefcaseIcon className="h-4 w-4" /> {caseData.lawyer}</div>}
            <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /> أضيفت: {new Date(caseData.createdAt).toLocaleDateString('ar-TN')}</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto z-10">
          <Button variant="outline" className="rounded-full shadow-sm">عدِّل القضية</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full justify-start bg-transparent border-b rounded-none h-12 p-0 mb-6 gap-6">
              <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-1">نظرة عامة</TabsTrigger>
              <TabsTrigger value="docs" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-1">وثائق</TabsTrigger>
              <TabsTrigger value="tasks" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-1">مهام</TabsTrigger>
              <TabsTrigger value="calendar" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-1">رزنامة</TabsTrigger>
              <TabsTrigger value="billing" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-1">فوترة</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-6">
              <Card className="border-none shadow-md">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-4">الوصف</h3>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {caseData.description || "لا يوجد وصف لهذه القضية."}
                  </p>
                </CardContent>
              </Card>
              
              {caseData.notes && (
                <Card className="border-none shadow-md bg-muted/20">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-lg mb-4">ملاحظات</h3>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {caseData.notes}
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="docs">
              <Card className="border-none shadow-md">
                <CardContent className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
                  <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p>قائمة الوثائق (تحت الإنجاز)</p>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="tasks">
              <Card className="border-none shadow-md">
                <CardContent className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
                  <CheckCircle2 className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p>قائمة المهام (تحت الإنجاز)</p>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="calendar">
              <Card className="border-none shadow-md">
                <CardContent className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
                  <Calendar className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p>الجلسات والمواعيد (تحت الإنجاز)</p>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="billing">
              <Card className="border-none shadow-md">
                <CardContent className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
                  <Clock className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p>الفوترة والدفوعات (تحت الإنجاز)</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4">
          <Card className="border-none shadow-md overflow-hidden bg-primary text-primary-foreground">
            <CardContent className="p-6">
              <h3 className="font-bold text-lg mb-4 text-primary-foreground">إجراءات سريعة</h3>
              <div className="space-y-3">
                <Button className="w-full justify-start bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground border-none rounded-xl h-12">
                  <Plus className="ml-2 h-4 w-4" /> زيد وثيقة
                </Button>
                <Button className="w-full justify-start bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground border-none rounded-xl h-12">
                  <Plus className="ml-2 h-4 w-4" /> زيد مهمة
                </Button>
                <Button className="w-full justify-start bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground border-none rounded-xl h-12">
                  <Plus className="ml-2 h-4 w-4" /> زيد ملاحظة
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function BriefcaseIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  )
}
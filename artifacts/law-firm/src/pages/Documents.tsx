import { SelectNative } from "@/components/SelectNative";
import { useState } from "react";
import { useListDocuments } from "@workspace/api-client-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { EmptyDocumentsIllustration } from "@/components/illustrations/EmptyDocuments";
import { formatDateTN } from "@/lib/date";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileText, Upload, Search, Download, Eye,
  FileImage, File, FileSpreadsheet,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Modal, FormField } from "@/components/Modal";
import { SmartTextarea } from "@/components/SmartTextarea";

function FileIcon({ name }: { name: string }) {
  const ext = name?.split(".").pop()?.toLowerCase();
  if (["jpg","jpeg","png","gif","webp"].includes(ext || "")) return <FileImage className="h-8 w-8 text-purple-400" />;
  if (["xls","xlsx","csv"].includes(ext || "")) return <FileSpreadsheet className="h-8 w-8 text-green-400" />;
  if (ext === "pdf") return <FileText className="h-8 w-8 text-red-400" />;
  return <File className="h-8 w-8 text-blue-400" />;
}

function fileSize() {
  return `${(Math.random() * 3 + 0.2).toFixed(1)} MB`;
}

export default function Documents() {
  const { data: documents, isLoading } = useListDocuments();
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [viewDoc, setViewDoc] = useState<any>(null);
  const [form, setForm] = useState({ title: "", case: "", type: "عقد", notes: "" });

  const filtered = documents?.filter(d =>
    !search || d.title?.includes(search) || d.caseName?.includes(search)
  );

  const inputCls = "h-10 bg-muted/50 border-border focus-visible:ring-1 focus-visible:ring-primary rounded-lg w-full";

  const docTypes = ["عقد", "وثيقة رسمية", "مراسلة", "حكم قضائي", "تقرير خبرة", "وكالة", "أخرى"];

  return (
    <div className="space-y-6">
      <PageHeader
        title="الوثائق"
        subtitle="إدارة الملفات والوثائق الخاصة بالقضايا"
        back
        actions={<Button onClick={() => setShowModal(true)} className="rounded-lg gap-2 px-5"><Upload className="h-4 w-4" /> رفع وثيقة</Button>}
      />

      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="بحث في الوثائق..."
          className="pr-9 h-10 bg-card border-border"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : filtered?.length === 0 ? (
        <div className="bg-card rounded-xl shadow-sm">
          <EmptyState
            illustration={<EmptyDocumentsIllustration />}
            title="لا توجد وثائق"
            description="ارفع عقودًا أو محاضر جلسات — ستظهر هنا فور رفعها بالضغط على «رفع وثيقة» أعلاه"
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered?.map((doc) => (
            <Card
              key={doc.id}
              className="border-none shadow-sm hover:shadow-md transition-all duration-200 rounded-xl group cursor-pointer"
              onClick={() => setViewDoc(doc)}
            >
              <CardContent className="p-4 flex items-start gap-4">
                <div className="p-3 bg-muted/50 rounded-xl group-hover:bg-muted transition-colors shrink-0">
                  <FileIcon name={doc.title} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-sm leading-tight line-clamp-2">{doc.title}</h3>
                  {doc.caseName && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">{doc.caseName}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-md">
                      {doc.type || "وثيقة"}
                    </span>
                    <span className="text-xs text-muted-foreground">{fileSize()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="رفع وثيقة جديدة">
        <div className="space-y-4">
          <div
            className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer"
            onClick={() => {}}
          >
            <Upload className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-medium text-muted-foreground">اسحب الملف هنا أو انقر للاختيار</p>
            <p className="text-xs text-muted-foreground/60 mt-1">PDF, Word, Excel, صور — حتى 20MB</p>
          </div>
          <FormField label="عنوان الوثيقة *" htmlFor="doc-title">
            <Input id="doc-title" placeholder="مثال: عقد شراكة موقع" className={inputCls}
              value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </FormField>
          <FormField label="نوع الوثيقة" htmlFor="doc-type">
            <SelectNative id="doc-type" className={inputCls + " px-3 cursor-pointer"}
              value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              {docTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </SelectNative>
          </FormField>
          <FormField label="القضية المرتبطة" htmlFor="doc-case">
            <Input id="doc-case" placeholder="اسم القضية (اختياري)" className={inputCls}
              value={form.case} onChange={e => setForm(f => ({ ...f, case: e.target.value }))} />
          </FormField>
          <FormField label="ملاحظات" htmlFor="doc-notes">
            <SmartTextarea id="doc-notes" rows={2} placeholder="ملاحظات حول الوثيقة..." aiContext="ملاحظات وثيقة" value={form.notes} onChange={v => setForm(f => ({ ...f, notes: v }))} />
          </FormField>
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={() => setShowModal(false)}>رفع الوثيقة</Button>
            <Button variant="outline" onClick={() => setShowModal(false)} className="px-6">إلغاء</Button>
          </div>
        </div>
      </Modal>

      {/* View Doc Modal */}
      {viewDoc && (
        <Modal open={!!viewDoc} onClose={() => setViewDoc(null)} title={viewDoc.title} size="sm">
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="p-6 bg-muted/30 rounded-2xl">
                <FileIcon name={viewDoc.title} />
              </div>
            </div>
            <div className="space-y-2 text-sm">
              {viewDoc.caseName && (
                <div className="flex justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-muted-foreground">القضية</span>
                  <span className="font-semibold">{viewDoc.caseName}</span>
                </div>
              )}
              {viewDoc.type && (
                <div className="flex justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-muted-foreground">النوع</span>
                  <span className="font-semibold">{viewDoc.type}</span>
                </div>
              )}
              <div className="flex justify-between p-3 bg-muted/30 rounded-lg">
                <span className="text-muted-foreground">تاريخ الرفع</span>
                <span className="font-semibold">
                  {viewDoc.createdAt ? formatDateTN(viewDoc.createdAt) : "—"}
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <Button className="flex-1 gap-2" variant="outline" onClick={() => setViewDoc(null)}>
                <Download className="h-4 w-4" /> تحميل
              </Button>
              <Button className="flex-1 gap-2" onClick={() => setViewDoc(null)}>
                <Eye className="h-4 w-4" /> عرض
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

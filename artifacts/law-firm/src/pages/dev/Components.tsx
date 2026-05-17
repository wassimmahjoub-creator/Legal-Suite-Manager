import { Button } from "@/components/ui/button";
import { Loader2, Plus, Trash2, Download, ArrowRight } from "lucide-react";

const VARIANTS = ["default", "outline", "secondary", "destructive", "ghost"] as const;
const SIZES   = ["sm", "default", "lg"] as const;

const VARIANT_LABELS: Record<string, string> = {
  default:     "primary (default)",
  outline:     "outline / secondary",
  secondary:   "secondary",
  destructive: "destructive",
  ghost:       "ghost",
};

const SIZE_LABELS: Record<string, string> = {
  sm:      "sm — h-8 px-3",
  default: "md — h-9 px-4",
  lg:      "lg — h-10 px-8",
};

export default function ComponentsDevPage() {
  return (
    <div className="space-y-10 p-8 max-w-5xl mx-auto" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold mb-1">مكتبة المكوّنات</h1>
        <p className="text-muted-foreground text-sm">
          صفحة مرجعية للمطورين — متاحة فقط في بيئة التطوير.
          تعرض جميع تركيبات <code className="bg-muted px-1 rounded">variant × size</code> لمكوّن{" "}
          <code className="bg-muted px-1 rounded">&lt;Button /&gt;</code>.
        </p>
      </div>

      {/* Variant × Size grid */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">Variant × Size</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right">
                <th className="py-2 px-3 text-muted-foreground font-medium w-48">Variant</th>
                {SIZES.map(s => (
                  <th key={s} className="py-2 px-3 text-muted-foreground font-medium">{SIZE_LABELS[s]}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {VARIANTS.map(v => (
                <tr key={v}>
                  <td className="py-3 px-3 text-xs text-muted-foreground font-mono">{VARIANT_LABELS[v]}</td>
                  {SIZES.map(s => (
                    <td key={s} className="py-3 px-3">
                      <Button variant={v} size={s}>زر {SIZE_LABELS[s].split("—")[0].trim()}</Button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* States */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">الحالات — States</h2>
        <div className="flex flex-wrap gap-3 items-center">
          <Button>عادي</Button>
          <Button disabled>معطّل</Button>
          <Button disabled>
            <Loader2 className="h-4 w-4 animate-spin" /> جارٍ التحميل...
          </Button>
          <Button variant="outline" disabled>معطّل outline</Button>
          <Button variant="destructive" disabled>معطّل destructive</Button>
        </div>
      </section>

      {/* With icons */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">مع أيقونات — With Icons</h2>
        <div className="flex flex-wrap gap-3 items-center">
          <Button><Plus className="h-4 w-4" />إضافة</Button>
          <Button variant="outline"><Download className="h-4 w-4" />تصدير</Button>
          <Button variant="destructive"><Trash2 className="h-4 w-4" />حذف</Button>
          <Button variant="ghost"><ArrowRight className="h-4 w-4" />رجوع</Button>
          <Button size="icon" variant="ghost"><Plus className="h-4 w-4" /></Button>
          <Button size="icon" variant="outline"><Trash2 className="h-4 w-4" /></Button>
        </div>
      </section>

      {/* Full width */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">عرض كامل — Full Width</h2>
        <div className="max-w-sm space-y-2">
          <Button className="w-full">حفظ</Button>
          <Button variant="outline" className="w-full">إلغاء</Button>
          <Button variant="destructive" className="w-full"><Trash2 className="h-4 w-4" />حذف نهائي</Button>
        </div>
      </section>

      {/* Mapping reference */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">جدول التطابق — Variant Mapping</h2>
        <div className="bg-muted/30 rounded-xl p-4 text-sm space-y-2 font-mono">
          <p><span className="text-primary">default</span>     → action principale (حفظ، إضافة، تأكيد)</p>
          <p><span className="text-muted-foreground">outline</span>     → action secondaire (تعديل، تصدير، رجوع)</p>
          <p><span className="text-muted-foreground">secondary</span>   → action tertiaire neutre</p>
          <p><span className="text-destructive">destructive</span> → suppression / action irréversible (حذف)</p>
          <p><span className="text-muted-foreground">ghost</span>       → bouton icône, nav, lien inline</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Règle : une seule action <code className="bg-muted px-1 rounded">default</code> par écran.
          Voir <code className="bg-muted px-1 rounded">MIGRATION_NOTES.md</code> pour les violations identifiées.
        </p>
      </section>
    </div>
  );
}

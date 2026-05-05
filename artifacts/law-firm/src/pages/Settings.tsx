import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Building2, Bell, Shield, Palette, Save } from "lucide-react";
import { FormField } from "@/components/Modal";

const tabs = [
  { id: "profile", label: "الملف الشخصي", icon: User },
  { id: "office", label: "معلومات المكتب", icon: Building2 },
  { id: "notifications", label: "الإشعارات", icon: Bell },
  { id: "security", label: "الأمان", icon: Shield },
  { id: "display", label: "العرض", icon: Palette },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState("profile");
  const [saved, setSaved] = useState(false);

  const inputCls = "h-10 bg-muted/50 border-border focus-visible:ring-1 focus-visible:ring-primary rounded-lg";

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">الإعدادات</h1>
        <p className="text-muted-foreground text-sm mt-0.5">إدارة إعدادات المكتب والحساب</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-56 shrink-0">
          <Card className="border-none shadow-sm">
            <CardContent className="p-2">
              <nav className="space-y-1">
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-right ${
                        activeTab === tab.id
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === "profile" && (
            <Card className="border-none shadow-sm">
              <CardHeader className="border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" /> الملف الشخصي
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-4 pb-4 border-b">
                  <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold">م</div>
                  <div>
                    <p className="font-semibold">المحامي سامي الغربي</p>
                    <p className="text-sm text-muted-foreground">محامٍ لدى التعقيب</p>
                    <Button variant="outline" size="sm" className="mt-2 h-8 text-xs">تغيير الصورة</Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="الاسم" htmlFor="s-name">
                    <Input id="s-name" defaultValue="سامي الغربي" className={inputCls} />
                  </FormField>
                  <FormField label="البريد الإلكتروني" htmlFor="s-email">
                    <Input id="s-email" defaultValue="sami.gharbi@avocat.tn" className={inputCls} dir="ltr" />
                  </FormField>
                  <FormField label="الهاتف" htmlFor="s-phone">
                    <Input id="s-phone" defaultValue="71 234 567" className={inputCls} dir="ltr" />
                  </FormField>
                  <FormField label="الرتبة المهنية" htmlFor="s-role">
                    <Input id="s-role" defaultValue="محامٍ لدى التعقيب" className={inputCls} />
                  </FormField>
                </div>
                <Button onClick={handleSave} className="gap-2">
                  <Save className="h-4 w-4" />
                  {saved ? "تم الحفظ ✓" : "حفظ التغييرات"}
                </Button>
              </CardContent>
            </Card>
          )}

          {activeTab === "office" && (
            <Card className="border-none shadow-sm">
              <CardHeader className="border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" /> معلومات المكتب
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <FormField label="اسم المكتب" htmlFor="o-name">
                  <Input id="o-name" defaultValue="مكتب الغربي للمحاماة" className={inputCls} />
                </FormField>
                <FormField label="العنوان" htmlFor="o-address">
                  <Input id="o-address" defaultValue="شارع الحبيب بورقيبة، تونس العاصمة" className={inputCls} />
                </FormField>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="الهاتف" htmlFor="o-phone">
                    <Input id="o-phone" defaultValue="71 234 567" className={inputCls} dir="ltr" />
                  </FormField>
                  <FormField label="الفاكس" htmlFor="o-fax">
                    <Input id="o-fax" defaultValue="71 234 568" className={inputCls} dir="ltr" />
                  </FormField>
                </div>
                <FormField label="البريد الإلكتروني" htmlFor="o-email">
                  <Input id="o-email" defaultValue="contact@gharbi-law.tn" className={inputCls} dir="ltr" />
                </FormField>
                <FormField label="الترقيم الجبائي" htmlFor="o-tax">
                  <Input id="o-tax" defaultValue="1234567A/P/M/000" className={inputCls} dir="ltr" />
                </FormField>
                <Button onClick={handleSave} className="gap-2">
                  <Save className="h-4 w-4" />
                  {saved ? "تم الحفظ ✓" : "حفظ التغييرات"}
                </Button>
              </CardContent>
            </Card>
          )}

          {activeTab === "notifications" && (
            <Card className="border-none shadow-sm">
              <CardHeader className="border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" /> الإشعارات
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                {[
                  { label: "تذكير بالجلسات", desc: "48 ساعة قبل موعد الجلسة", on: true },
                  { label: "فواتير معلقة", desc: "تنبيه عند تأخر الدفع", on: true },
                  { label: "آجال قريبة", desc: "تنبيه بمواعيد التقديم", on: true },
                  { label: "تقارير أسبوعية", desc: "ملخص نشاط المكتب كل أسبوع", on: false },
                ].map((item, i) => (
                  <label key={i} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl cursor-pointer hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="font-medium text-sm">{item.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                    <input type="checkbox" defaultChecked={item.on} className="h-4 w-4 accent-primary cursor-pointer" />
                  </label>
                ))}
                <Button onClick={handleSave} className="gap-2 mt-2">
                  <Save className="h-4 w-4" />
                  {saved ? "تم الحفظ ✓" : "حفظ الإعدادات"}
                </Button>
              </CardContent>
            </Card>
          )}

          {activeTab === "security" && (
            <Card className="border-none shadow-sm">
              <CardHeader className="border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" /> الأمان
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <FormField label="كلمة المرور الحالية" htmlFor="pass-current">
                  <Input id="pass-current" type="password" placeholder="••••••••" className={inputCls} />
                </FormField>
                <FormField label="كلمة المرور الجديدة" htmlFor="pass-new">
                  <Input id="pass-new" type="password" placeholder="••••••••" className={inputCls} />
                </FormField>
                <FormField label="تأكيد كلمة المرور" htmlFor="pass-confirm">
                  <Input id="pass-confirm" type="password" placeholder="••••••••" className={inputCls} />
                </FormField>
                <Button onClick={handleSave} className="gap-2">
                  <Shield className="h-4 w-4" />
                  {saved ? "تم التحديث ✓" : "تحديث كلمة المرور"}
                </Button>
              </CardContent>
            </Card>
          )}

          {activeTab === "display" && (
            <Card className="border-none shadow-sm">
              <CardHeader className="border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Palette className="h-5 w-5 text-primary" /> إعدادات العرض
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div>
                  <p className="text-sm font-medium mb-3">المظهر</p>
                  <div className="grid grid-cols-2 gap-3 max-w-xs">
                    <button className="p-4 rounded-xl border-2 border-primary bg-primary/10 text-primary text-sm font-medium">
                      داكن (الافتراضي)
                    </button>
                    <button className="p-4 rounded-xl border-2 border-border hover:border-muted-foreground text-sm font-medium transition-colors">
                      فاتح
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-3">اللغة</p>
                  <select className={inputCls + " px-3 cursor-pointer max-w-xs"}>
                    <option value="ar">العربية (الدارجة التونسية)</option>
                    <option value="fr">Français</option>
                  </select>
                </div>
                <Button onClick={handleSave} className="gap-2">
                  <Save className="h-4 w-4" />
                  {saved ? "تم الحفظ ✓" : "حفظ التغييرات"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

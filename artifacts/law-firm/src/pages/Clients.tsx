import { useState } from "react";
import { useListClients } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Phone, Mail, MapPin, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Modal, FormField } from "@/components/Modal";

export default function Clients() {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", notes: "" });
  const { data: clients, isLoading } = useListClients();

  const filteredClients = clients?.filter(c =>
    !search || c.name.includes(search) || (c.phone && c.phone.includes(search))
  );

  const inputCls = "h-10 bg-muted/50 border-border focus-visible:ring-1 focus-visible:ring-primary rounded-lg w-full";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">الحرفاء</h1>
          <p className="text-muted-foreground text-sm mt-0.5">إدارة معلومات وبيانات الحرفاء</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="rounded-lg gap-2 px-5">
          <Plus className="h-4 w-4" />
          حريف جديد
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="بحث بالاسم أو الهاتف..."
          className="pr-9 h-10 bg-card border-border"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-44 rounded-xl" />)}
        </div>
      ) : filteredClients?.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-xl shadow-sm flex flex-col items-center gap-3">
          <Users className="h-12 w-12 text-muted-foreground/20" />
          <p className="text-muted-foreground">لم يتم العثور على حرفاء</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredClients?.map((client) => (
            <Card
              key={client.id}
              className="border-none shadow-md hover:shadow-lg transition-all duration-200 rounded-xl overflow-hidden cursor-pointer group"
              onClick={() => setSelectedClient(client as any)}
            >
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-11 w-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    {client.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold truncate">{client.name}</h3>
                    <p className="text-xs text-muted-foreground">حريف نشط</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  {client.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <span dir="ltr" className="truncate">{client.phone}</span>
                    </div>
                  )}
                  {client.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{client.email}</span>
                    </div>
                  )}
                  {client.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{client.address}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New Client Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="إضافة حريف جديد">
        <div className="space-y-4">
          <FormField label="الاسم الكامل *" htmlFor="client-name">
            <Input id="client-name" placeholder="مثال: محمد بن علي" className={inputCls}
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </FormField>
          <FormField label="رقم الهاتف" htmlFor="client-phone">
            <Input id="client-phone" placeholder="مثال: 22 123 456" className={inputCls} dir="ltr"
              value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </FormField>
          <FormField label="البريد الإلكتروني" htmlFor="client-email">
            <Input id="client-email" type="email" placeholder="example@email.com" className={inputCls} dir="ltr"
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </FormField>
          <FormField label="العنوان" htmlFor="client-address">
            <Input id="client-address" placeholder="مثال: شارع الحبيب بورقيبة، تونس" className={inputCls}
              value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          </FormField>
          <FormField label="ملاحظات" htmlFor="client-notes">
            <textarea id="client-notes" rows={3} placeholder="ملاحظات إضافية..."
              className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </FormField>
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={() => setShowModal(false)}>حفظ الحريف</Button>
            <Button variant="outline" onClick={() => setShowModal(false)} className="px-6">إلغاء</Button>
          </div>
        </div>
      </Modal>

      {/* Client Detail Modal */}
      {selectedClient && (
        <Modal open={!!selectedClient} onClose={() => setSelectedClient(null)} title={(selectedClient as any).name} size="sm">
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <div className="h-20 w-20 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-3xl">
                {(selectedClient as any).name?.charAt(0)}
              </div>
            </div>
            <div className="space-y-3 text-sm">
              {(selectedClient as any).phone && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Phone className="h-4 w-4 text-primary shrink-0" />
                  <span dir="ltr">{(selectedClient as any).phone}</span>
                </div>
              )}
              {(selectedClient as any).email && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Mail className="h-4 w-4 text-primary shrink-0" />
                  <span>{(selectedClient as any).email}</span>
                </div>
              )}
              {(selectedClient as any).address && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  <span>{(selectedClient as any).address}</span>
                </div>
              )}
            </div>
            <Button variant="outline" className="w-full" onClick={() => setSelectedClient(null)}>إغلاق</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

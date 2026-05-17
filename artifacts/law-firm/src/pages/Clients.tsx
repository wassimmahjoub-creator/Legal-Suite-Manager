import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { authFetch } from "@/lib/authFetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Phone, Mail, MapPin, Users, Pencil, Trash2, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonCard } from "@/components/ui/skeletons";
import { Modal, FormField } from "@/components/Modal";
import { SmartTextarea } from "@/components/SmartTextarea";
import { EmptyState } from "@/components/ui/EmptyState";
import { EmptyClientsIllustration } from "@/components/illustrations/EmptyClients";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

interface Client {
  id: number;
  name: string;
  clientType: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  cin: string | null;
  taxId: string | null;
  officeSeq: string | null;
  notes: string | null;
  createdAt: string;
}

const EMPTY = { name: "", clientType: "individual", phone: "", email: "", address: "", cin: "", taxId: "", notes: "" };
const inputCls = "h-10 bg-muted/50 border-border focus-visible:ring-1 focus-visible:ring-primary rounded-lg w-full";

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [, navigate] = useLocation();

  async function load() {
    setLoading(true);
    const r = await authFetch(`${BASE}/api/clients`);
    if (r.ok) setClients(await r.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openNew() {
    setEditing(null);
    setForm(EMPTY);
    setModal(true);
  }

  function openEdit(c: Client) {
    setEditing(c);
    setForm({
      name:       c.name,
      clientType: c.clientType ?? "individual",
      phone:      c.phone ?? "",
      email:      c.email ?? "",
      address:    c.address ?? "",
      cin:        c.cin ?? "",
      taxId:      c.taxId ?? "",
      notes:      c.notes ?? "",
    });
    setModal(true);
  }

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    const url = editing
      ? `${BASE}/api/clients/${editing.id}`
      : `${BASE}/api/clients`;
    await authFetch(url, {
      method: editing ? "PUT" : "POST",
      body: JSON.stringify({
        name:       form.name,
        clientType: form.clientType || "individual",
        phone:      form.phone || null,
        email:      form.email || null,
        address:    form.address || null,
        cin:        form.cin || null,
        taxId:      form.taxId || null,
        notes:      form.notes || null,
      }),
    });
    await load();
    setSaving(false);
    setModal(false);
  }

  async function remove(id: number) {
    if (!confirm("حذف هذا الحريف؟")) return;
    await authFetch(`${BASE}/api/clients/${id}`, { method: "DELETE" });
    await load();
  }

  const filtered = clients.filter(c =>
    !search ||
    c.name.includes(search) ||
    (c.phone && c.phone.includes(search)) ||
    (c.email && c.email.includes(search))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">الحرفاء</h1>
          <p className="text-muted-foreground text-sm mt-0.5">إدارة معلومات وبيانات الحرفاء</p>
        </div>
        <Button onClick={openNew} className="rounded-lg gap-2 px-5">
          <Plus className="h-4 w-4" /> حريف جديد
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="بحث بالاسم أو الهاتف..."
          className="pr-9 h-10 bg-card border-border"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-xl shadow-sm">
          <EmptyState
            illustration={<EmptyClientsIllustration />}
            title="لا حرفاء بعد"
            description="أضف حرفاءك واحدًا واحدًا وتتبع ملفاتهم وفواتيرهم من مكان واحد"
            primaryAction={{ label: "+ إضافة حريف", onClick: openNew }}
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(client => (
            <Card
              key={client.id}
              className="border-none shadow-md hover:shadow-lg transition-all duration-200 rounded-xl overflow-hidden cursor-pointer group"
              onClick={() => navigate(`/clients/${client.id}`)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-11 w-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      {client.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold truncate group-hover:underline">{client.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {client.clientType === "company" ? "شخص معنوي" : "شخص طبيعي"}
                        {client.officeSeq && <span className="mr-1 font-mono text-primary/70"> · {client.officeSeq}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={e => { e.stopPropagation(); openEdit(client); }}
                      className="p-1.5 hover:bg-muted rounded-lg">
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <button onClick={e => { e.stopPropagation(); remove(client.id); }}
                      className="p-1.5 hover:bg-destructive/10 rounded-lg">
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </button>
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

      {/* New / Edit Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? `تعديل: ${editing.name}` : "إضافة حريف جديد"} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="نوع الحريف" htmlFor="cl-type">
              <select id="cl-type" className={inputCls + " px-3 cursor-pointer"}
                value={form.clientType} onChange={e => setForm(f => ({ ...f, clientType: e.target.value }))}>
                <option value="individual">شخص طبيعي</option>
                <option value="company">شخص معنوي / شركة</option>
              </select>
            </FormField>
            <FormField label="الاسم الكامل *" htmlFor="cl-name">
              <Input id="cl-name" placeholder="مثال: محمد بن علي" className={inputCls}
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="رقم بطاقة التعريف (CIN)" htmlFor="cl-cin">
              <Input id="cl-cin" placeholder="مثال: 12345678" className={inputCls} dir="ltr"
                value={form.cin} onChange={e => setForm(f => ({ ...f, cin: e.target.value }))} />
            </FormField>
            <FormField label="المعرف الجبائي" htmlFor="cl-taxid">
              <Input id="cl-taxid" placeholder="مثال: 1234567A/P/M/000" className={inputCls} dir="ltr"
                value={form.taxId} onChange={e => setForm(f => ({ ...f, taxId: e.target.value }))} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="رقم الهاتف" htmlFor="cl-phone">
              <Input id="cl-phone" placeholder="مثال: 22 123 456" className={inputCls} dir="ltr"
                value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </FormField>
            <FormField label="البريد الإلكتروني" htmlFor="cl-email">
              <Input id="cl-email" type="email" placeholder="example@email.com" className={inputCls} dir="ltr"
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </FormField>
          </div>
          <FormField label="العنوان" htmlFor="cl-address">
            <Input id="cl-address" placeholder="مثال: شارع الحبيب بورقيبة، تونس" className={inputCls}
              value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          </FormField>
          <FormField label="ملاحظات" htmlFor="cl-notes">
            <SmartTextarea id="cl-notes" rows={2} placeholder="ملاحظات إضافية حول الحريف..." aiContext="ملاحظات حريف" value={form.notes} onChange={v => setForm(f => ({ ...f, notes: v }))} />
          </FormField>
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={save} disabled={saving || !form.name.trim()}>
              {saving ? "جارٍ الحفظ..." : editing ? "حفظ التعديلات" : "حفظ الحريف"}
            </Button>
            <Button variant="outline" onClick={() => setModal(false)} className="px-6">إلغاء</Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}

import { useState } from "react";
import { useListClients } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Phone, Mail, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function Clients() {
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data: clients, isLoading } = useListClients();

  const filteredClients = clients?.filter(c =>
    !search || c.name.includes(search) || (c.phone && c.phone.includes(search))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">الحرفاء</h1>
          <p className="text-muted-foreground mt-1">إدارة معلومات وبيانات الحرفاء</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full px-6 shadow-md hover:shadow-lg transition-shadow">
              <Plus className="ml-2 h-4 w-4" />
              حريف جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[440px]" dir="rtl">
            <DialogHeader>
              <DialogTitle>حريف جديد</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="client-name">الاسم الكامل</Label>
                <Input id="client-name" placeholder="مثال: محمد بن علي" className="h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-phone">رقم الهاتف</Label>
                <Input id="client-phone" placeholder="مثال: 22 123 456" className="h-11" dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-email">البريد الإلكتروني</Label>
                <Input id="client-email" type="email" placeholder="example@email.com" className="h-11" dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-address">العنوان</Label>
                <Input id="client-address" placeholder="مثال: شارع الحبيب بورقيبة، تونس" className="h-11" />
              </div>
              <Button className="w-full h-11" onClick={() => setIsDialogOpen(false)}>
                احفظ الحريف
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="بحث بالاسم أو الهاتف..."
          className="pl-4 pr-10 bg-card border-none shadow-sm focus-visible:ring-primary h-12 rounded-2xl"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-48 rounded-2xl" />)}
        </div>
      ) : filteredClients?.length === 0 ? (
        <div className="text-center py-24 bg-card rounded-2xl shadow-sm">
          <p className="text-muted-foreground text-lg">لم يتم العثور على حرفاء</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredClients?.map((client) => (
            <Card key={client.id} className="border-none shadow-md hover:shadow-lg transition-all duration-300 rounded-2xl overflow-hidden group cursor-pointer relative">
              <div className="absolute top-0 right-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors" />
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xl">
                    {client.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg leading-tight">{client.name}</h3>
                  </div>
                </div>

                <div className="space-y-3 text-sm text-muted-foreground">
                  {client.phone && (
                    <div className="flex items-center gap-3">
                      <div className="bg-muted p-1.5 rounded-md text-foreground"><Phone className="h-3.5 w-3.5" /></div>
                      <span dir="ltr">{client.phone}</span>
                    </div>
                  )}
                  {client.email && (
                    <div className="flex items-center gap-3">
                      <div className="bg-muted p-1.5 rounded-md text-foreground"><Mail className="h-3.5 w-3.5" /></div>
                      <span className="truncate">{client.email}</span>
                    </div>
                  )}
                  {client.address && (
                    <div className="flex items-start gap-3">
                      <div className="bg-muted p-1.5 rounded-md text-foreground"><MapPin className="h-3.5 w-3.5" /></div>
                      <span className="truncate">{client.address}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

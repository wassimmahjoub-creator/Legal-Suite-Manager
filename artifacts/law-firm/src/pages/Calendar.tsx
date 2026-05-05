import { useListEvents } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar as CalendarIcon, Clock, MapPin, Briefcase } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarView() {
  const { data: events, isLoading } = useListEvents();

  // Group events by date
  const groupedEvents = events?.reduce((acc, event) => {
    const date = new Date(event.date).toLocaleDateString('ar-TN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    if (!acc[date]) acc[date] = [];
    acc[date].push(event);
    return acc;
  }, {} as Record<string, typeof events>);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">الرزنامة</h1>
          <p className="text-muted-foreground mt-1">مواعيد الجلسات والاجتماعات</p>
        </div>
      </div>

      <div className="space-y-8">
        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-8 w-48" />
            <div className="space-y-4">
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-24 w-full rounded-2xl" />
            </div>
          </div>
        ) : !groupedEvents || Object.keys(groupedEvents).length === 0 ? (
          <div className="text-center py-24 bg-card rounded-2xl shadow-sm border-none">
            <CalendarIcon className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-lg">لا توجد مواعيد قادمة</p>
          </div>
        ) : (
          Object.entries(groupedEvents).map(([date, dayEvents]) => (
            <div key={date} className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
              <h2 className="text-xl font-bold flex items-center gap-2 text-primary border-b border-border/50 pb-2">
                <CalendarIcon className="h-5 w-5" />
                {date}
              </h2>
              <div className="grid gap-4">
                {dayEvents.map(event => (
                  <Card key={event.id} className="border-none shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-1.5 h-full bg-primary" />
                    <CardContent className="p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <h3 className="font-bold text-lg">{event.title}</h3>
                          {event.caseName && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Briefcase className="h-3.5 w-3.5" />
                              {event.caseName}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm font-medium bg-muted/30 px-4 py-2 rounded-xl w-fit">
                          {event.time && (
                            <div className="flex items-center gap-1.5 text-primary">
                              <Clock className="h-4 w-4" />
                              <span dir="ltr">{event.time}</span>
                            </div>
                          )}
                          {event.location && (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span>{event.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {event.notes && (
                        <p className="mt-4 text-sm text-muted-foreground bg-muted/20 p-3 rounded-lg border border-border/50">
                          {event.notes}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
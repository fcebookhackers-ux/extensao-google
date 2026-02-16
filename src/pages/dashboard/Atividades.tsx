 import { useState, useEffect } from "react";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Separator } from "@/components/ui/separator";
 import { useWorkspaceActivity, useGroupedActivities } from "@/hooks/useWorkspaceActivity";
 import { ActivityItem } from "@/components/activity/ActivityItem";
 import { ActivityFiltersBar } from "@/components/activity/ActivityFilters";
 import { SkeletonCard } from "@/components/common/loading/SkeletonCard";
 import { EmptyState } from "@/components/empty-states/EmptyState";
 import { Activity } from "lucide-react";
 import { format } from "date-fns";
 import { ptBR } from "date-fns/locale";
 import type { ActivityFilters } from "@/types/activity";
 import { toast } from "@/hooks/use-toast";
 import { ACTIVITY_TEMPLATES } from "@/types/activity";
 import { useNavigate } from "react-router-dom";
 
 const RELEVANT_EVENTS = [
   "automation.created",
   "automation.published",
   "webhook.failed",
   "member.invited",
   "member.joined",
   "comment.added",
 ];
 
 export default function Atividades() {
   const navigate = useNavigate();
   const [filters, setFilters] = useState<ActivityFilters>({});
   const workspaceId = localStorage.getItem("selected-workspace-id");
 
   const { data: events = [], isLoading } = useWorkspaceActivity(workspaceId, filters);
   const groupedEvents = useGroupedActivities(events);
 
   // Toast para novos eventos relevantes
   useEffect(() => {
     if (!events.length) return;
     const latestEvent = events[0];
     const isRecent = Date.now() - new Date(latestEvent.created_at).getTime() < 5000;
 
     if (isRecent && RELEVANT_EVENTS.includes(latestEvent.action)) {
       const template = ACTIVITY_TEMPLATES[latestEvent.action] || "{user} realizou {action}";
       const message = template
         .replace("{user}", latestEvent.metadata?.user_name || "Usuário")
         .replace("{entity_name}", latestEvent.metadata?.entity_name || "")
         .replace("{count}", latestEvent.metadata?.count || "0")
         .replace("{invited_email}", latestEvent.metadata?.invited_email || "");
 
       let link: string | null = null;
       if (latestEvent.action.startsWith("automation.") && latestEvent.entity_id) {
         link = `/dashboard/automacoes/editor?id=${latestEvent.entity_id}`;
       } else if (latestEvent.action.startsWith("webhook.")) {
         link = `/dashboard/configuracoes?tab=integrations`;
       }
 
       toast({
         title: "Nova atividade",
         description: message,
        action: link ? (
          <button
            onClick={() => navigate(link)}
            className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium"
          >
            Ver
          </button>
        ) : undefined,
       });
     }
   }, [events, navigate]);
 
   if (isLoading) {
     return (
       <div className="space-y-6">
         <div>
           <h1 className="text-3xl font-bold tracking-tight">Atividades</h1>
           <p className="text-muted-foreground">Feed de atividades do workspace em tempo real</p>
         </div>
         <SkeletonCard />
       </div>
     );
   }
 
   return (
     <div className="space-y-6">
       <div>
         <h1 className="text-3xl font-bold tracking-tight">Atividades</h1>
         <p className="text-muted-foreground">Feed de atividades do workspace em tempo real</p>
       </div>
 
       <ActivityFiltersBar filters={filters} onFiltersChange={setFilters} />
 
       {events.length === 0 ? (
         <EmptyState
           icon={Activity}
           title="Nenhuma atividade encontrada"
           description="Ainda não há atividades registradas neste workspace ou nos filtros selecionados."
         />
       ) : (
         <div className="space-y-6">
           {Object.entries(groupedEvents)
             .sort(([a], [b]) => b.localeCompare(a))
             .map(([date, dayEvents]) => (
               <Card key={date}>
                 <CardHeader>
                   <CardTitle className="text-lg">
                     {format(new Date(date), "EEEE, d 'de' MMMM", { locale: ptBR })}
                   </CardTitle>
                   <CardDescription>{dayEvents.length} eventos</CardDescription>
                 </CardHeader>
                 <CardContent className="p-0">
                   {dayEvents.map((event, idx) => (
                     <div key={event.id}>
                       {idx > 0 && <Separator />}
                       <ActivityItem event={event} />
                     </div>
                   ))}
                 </CardContent>
               </Card>
             ))}
         </div>
       )}
     </div>
   );
 }
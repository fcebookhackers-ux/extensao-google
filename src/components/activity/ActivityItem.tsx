 import { Avatar, AvatarFallback } from "@/components/ui/avatar";
 import { formatDistanceToNow } from "date-fns";
 import { ptBR } from "date-fns/locale";
 import type { ActivityEvent } from "@/types/activity";
 import { ACTIVITY_TEMPLATES } from "@/types/activity";
 import {
   Rocket,
   Webhook,
   UserPlus,
   MessageSquare,
   User,
   FileText,
   AlertCircle,
 } from "lucide-react";
 import { cn } from "@/lib/utils";
 import { Link } from "react-router-dom";
 
 const ACTION_ICONS: Record<string, React.ElementType> = {
   "automation.created": Rocket,
   "automation.published": Rocket,
   "automation.edited": FileText,
   "webhook.created": Webhook,
   "webhook.failed": AlertCircle,
   "member.invited": UserPlus,
   "member.joined": User,
   "comment.added": MessageSquare,
   "contact.created": User,
   "contact.imported": User,
 };
 
 const ACTION_COLORS: Record<string, string> = {
   "automation.created": "text-brand-primary-light",
   "automation.published": "text-green-600",
   "automation.edited": "text-blue-600",
   "webhook.created": "text-purple-600",
   "webhook.failed": "text-destructive",
   "member.invited": "text-amber-600",
   "member.joined": "text-emerald-600",
   "comment.added": "text-cyan-600",
   "contact.created": "text-indigo-600",
   "contact.imported": "text-violet-600",
 };
 
 function getEntityLink(event: ActivityEvent): string | null {
   if (event.action.startsWith("automation.") && event.entity_id) {
     return `/dashboard/automacoes/editor?id=${event.entity_id}`;
   }
   if (event.action.startsWith("webhook.")) {
     return `/dashboard/configuracoes?tab=integrations`;
   }
   if (event.action.startsWith("contact.")) {
     return `/dashboard/contatos`;
   }
   return null;
 }
 
 export function ActivityItem({ event }: { event: ActivityEvent }) {
   const template = ACTIVITY_TEMPLATES[event.action] || "{user} realizou {action}";
   const message = template
     .replace("{user}", event.metadata?.user_name || "Usuário")
     .replace("{entity_name}", event.metadata?.entity_name || "")
     .replace("{count}", event.metadata?.count || "0")
     .replace("{invited_email}", event.metadata?.invited_email || "")
     .replace("{action}", event.action);
 
   const Icon = ACTION_ICONS[event.action] || FileText;
   const iconColor = ACTION_COLORS[event.action] || "text-muted-foreground";
   const entityLink = getEntityLink(event);
 
   const content = (
     <div className="flex gap-3 py-3 px-4 rounded-lg hover:bg-accent/50 transition-colors">
       <Avatar className="h-9 w-9">
         <AvatarFallback className="text-xs">
           {(event.metadata?.user_name || "U")[0].toUpperCase()}
         </AvatarFallback>
       </Avatar>
       <div className="flex-1 min-w-0">
         <p className="text-sm text-foreground">{message}</p>
         <time className="text-xs text-muted-foreground">
           {formatDistanceToNow(new Date(event.created_at), {
             addSuffix: true,
             locale: ptBR,
           })}
         </time>
       </div>
       <div className={cn("flex-shrink-0", iconColor)}>
         <Icon className="h-5 w-5" />
       </div>
     </div>
   );
 
   if (entityLink) {
     return (
       <Link to={entityLink} className="block">
         {content}
       </Link>
     );
   }
 
   return content;
 }
 import { useWebhookLogs } from '@/hooks/useWebhooks';
import { CircuitBreakerIndicator } from './CircuitBreakerIndicator';
 import { Badge } from '@/components/ui/badge';
 import { ScrollArea } from '@/components/ui/scroll-area';
 import { Skeleton } from '@/components/ui/skeleton';
 import { CheckCircle, XCircle, Clock } from 'lucide-react';
 import { formatDistanceToNow } from 'date-fns';
 import { ptBR } from 'date-fns/locale';
 
 interface WebhookLogsProps {
   webhookId: string;
 }
 
 export function WebhookLogs({ webhookId }: WebhookLogsProps) {
   const { data: logs, isLoading } = useWebhookLogs(webhookId);
 
   if (isLoading) {
     return (
       <div className="space-y-3">
         {[1, 2, 3].map(i => (
           <Skeleton key={i} className="h-24" />
         ))}
       </div>
     );
   }
 
   if (!logs || logs.length === 0) {
     return (
       <div className="text-center py-8 text-muted-foreground">
         <Clock className="mx-auto h-12 w-12 mb-4" />
         <p>Nenhum log disponível</p>
       </div>
     );
   }
 
   return (
    <div className="space-y-4">
      {/* Circuit Breaker Status */}
      <CircuitBreakerIndicator webhookId={webhookId} />

     <ScrollArea className="h-[500px]">
       <div className="space-y-3">
         {logs.map((log) => (
           <div
             key={log.id}
             className="p-4 rounded-lg border bg-card space-y-3"
           >
             <div className="flex items-start justify-between gap-3">
               <div className="flex items-center gap-2">
                 {log.success ? (
                   <CheckCircle className="h-5 w-5 text-green-600" />
                 ) : (
                   <XCircle className="h-5 w-5 text-destructive" />
                 )}
                 <div>
                   <p className="font-medium">{log.event_type}</p>
                   <p className="text-sm text-muted-foreground">
                     {formatDistanceToNow(new Date(log.executed_at), {
                       addSuffix: true,
                       locale: ptBR
                     })}
                   </p>
                 </div>
               </div>
 
               <div className="flex items-center gap-2">
                 {log.response_status && (
                   <Badge variant={log.success ? 'default' : 'destructive'}>
                     {log.response_status}
                   </Badge>
                 )}
                 <Badge variant="outline">
                   Tentativa {log.attempt_number}
                 </Badge>
               </div>
             </div>
 
             {log.error_message && (
               <div className="rounded bg-destructive/10 p-3 text-sm text-destructive">
                 {log.error_message}
               </div>
             )}
 
             <details className="text-sm">
               <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                 Ver payload
               </summary>
               <pre className="mt-2 rounded bg-muted p-3 overflow-x-auto text-xs">
                 {JSON.stringify(log.payload, null, 2)}
               </pre>
             </details>
 
             {log.response_body && (
               <details className="text-sm">
                 <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                   Ver resposta
                 </summary>
                 <pre className="mt-2 rounded bg-muted p-3 overflow-x-auto text-xs">
                   {log.response_body}
                 </pre>
               </details>
             )}
           </div>
         ))}
       </div>
     </ScrollArea>
    </div>
   );
 }
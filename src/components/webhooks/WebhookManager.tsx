 import { useCallback, useEffect, useState } from 'react';
 import { useQueryClient } from '@tanstack/react-query';
 import { useWebhooks, useDeleteWebhook, useTestWebhook } from '@/hooks/useWebhooks';
 import { WebhookForm } from './WebhookForm';
 import { WebhookLogs } from './WebhookLogs';
import { CircuitBreakerIndicator } from './CircuitBreakerIndicator';
import { WebhookWizard } from './WebhookWizard';
 import type { Webhook } from '@/types/webhooks';
 import { supabase } from '@/integrations/supabase/client';
 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Skeleton } from '@/components/ui/skeleton';
 import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
 } from '@/components/ui/dialog';
 import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
 } from '@/components/ui/dropdown-menu';
 import {
   Webhook as WebhookIcon,
   Plus,
   MoreVertical,
   Edit,
   Trash2,
   Play,
    Eye,
   Link as LinkIcon
 } from 'lucide-react';
 import { formatDistanceToNow } from 'date-fns';
 import { ptBR } from 'date-fns/locale';
 import { CommentsPanel, CommentsTrigger } from "@/components/comments/CommentsPanel";
import { WebhookSecretBadge } from "./WebhookSecretBadge";
import { EmptyState } from "@/components/empty-states/EmptyState";
 
 export function WebhookManager() {
   const { data: webhooks, isLoading } = useWebhooks();
   const { mutate: deleteWebhook } = useDeleteWebhook();
   const { mutate: testWebhook } = useTestWebhook();

    const queryClient = useQueryClient();
   
   const [showForm, setShowForm] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
   const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
   const [viewingLogs, setViewingLogs] = useState<string | null>(null);

    const prefetchLogs = useCallback((webhookId: string) => {
      return queryClient.prefetchQuery({
        queryKey: ["webhook-logs", webhookId],
        queryFn: async () => {
          const { data: authData, error: authError } = await supabase.auth.getUser();
          if (authError) throw authError;
          if (!authData.user) throw new Error("Você precisa estar autenticado");

          const { data, error } = await supabase
            .from("webhook_logs")
            .select("*")
            .eq("webhook_id", webhookId)
            .order("executed_at", { ascending: false })
            .limit(25);
          if (error) throw error;
          return data;
        },
        staleTime: 30_000,
      });
    }, [queryClient]);

    // Prefetch leve: logs dos 3 primeiros webhooks (melhora a abertura do modal de logs)
    useEffect(() => {
      if (!webhooks?.length) return;

      const top = webhooks.slice(0, 3);
      top.forEach((w) => {
        void prefetchLogs(w.id);
      });
    }, [prefetchLogs, webhooks]);
 
   return (
     <div className="space-y-6">
       <div className="flex items-center justify-between">
         <div>
           <h2 className="text-3xl font-bold tracking-tight">Webhooks</h2>
           <p className="text-muted-foreground">
             Integre com sistemas externos em tempo real
           </p>
         </div>
 
          <div className="flex items-center gap-2">
            <Button onClick={() => setShowWizard(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar com Template
            </Button>
            <Button variant="outline" onClick={() => setShowForm(true)}>
              Criar Manualmente
            </Button>
          </div>
       </div>
 
       {isLoading ? (
         <div className="grid gap-4">
           {[1, 2, 3].map(i => (
             <Skeleton key={i} className="h-32" />
           ))}
         </div>
       ) : webhooks && webhooks.length > 0 ? (
         <div className="grid gap-4">
            {webhooks.map(webhook => (
              <Card
                key={webhook.id}
                onMouseEnter={() => {
                  // Prefetch sob demanda (hover) para reduzir custo e manter UX rápida.
                  void prefetchLogs(webhook.id);
                }}
              >
               <CardHeader>
                 <div className="flex items-start justify-between">
                   <div className="flex items-start gap-3 flex-1">
                     <div className="p-2 rounded-lg bg-primary/10">
                       <WebhookIcon className="h-5 w-5 text-primary" />
                     </div>
                     <div className="flex-1 min-w-0">
                       <div className="flex items-center gap-2 mb-1">
                         <CardTitle className="truncate">{webhook.name}</CardTitle>
                         <Badge variant={webhook.is_active ? 'default' : 'secondary'}>
                           {webhook.is_active ? 'Ativo' : 'Inativo'}
                         </Badge>
                       </div>
                       <div className="flex items-center gap-2 text-sm text-muted-foreground">
                         <LinkIcon className="h-3 w-3" />
                         {webhook.url}
                       </div>
                     </div>
                   </div>
 
                   <DropdownMenu>
                     <DropdownMenuTrigger asChild>
                       <Button variant="ghost" size="icon">
                         <MoreVertical className="h-4 w-4" />
                       </Button>
                     </DropdownMenuTrigger>
                     <DropdownMenuContent align="end">
                       <DropdownMenuItem onClick={() => testWebhook(webhook.id)}>
                         <Play className="h-4 w-4 mr-2" />
                         Enviar Teste
                       </DropdownMenuItem>
                       <DropdownMenuItem onClick={() => setViewingLogs(webhook.id)}>
                         <Eye className="h-4 w-4 mr-2" />
                         Ver Logs
                       </DropdownMenuItem>
                       <DropdownMenuItem onClick={() => setEditingWebhook(webhook)}>
                         <Edit className="h-4 w-4 mr-2" />
                         Editar
                       </DropdownMenuItem>
                       <DropdownMenuItem
                         onClick={() => deleteWebhook(webhook.id)}
                         className="text-destructive"
                       >
                         <Trash2 className="h-4 w-4 mr-2" />
                         Excluir
                       </DropdownMenuItem>
                     </DropdownMenuContent>
                   </DropdownMenu>
                 </div>
               </CardHeader>
 
               <CardContent>
                 <div className="space-y-3">
                    {/* Circuit Breaker Status */}
                    <CircuitBreakerIndicator webhookId={webhook.id} compact />

                   <div>
                     <p className="text-sm font-medium mb-2">Eventos:</p>
                     <div className="flex flex-wrap gap-2">
                       {webhook.events.map(event => (
                         <Badge key={event} variant="outline">
                           {event}
                         </Badge>
                       ))}
                     </div>
                   </div>
 
                   <div className="flex items-center gap-4 text-sm text-muted-foreground">
                     <span>
                       Criado {formatDistanceToNow(new Date(webhook.created_at), {
                         addSuffix: true,
                         locale: ptBR
                       })}
                     </span>
                      <WebhookSecretBadge webhookId={webhook.id} />
                   </div>
                 </div>
               </CardContent>
             </Card>
           ))}
         </div>
       ) : (
         <Card>
            <CardContent className="py-2">
              <EmptyState
                icon={WebhookIcon}
                title="Configure seu primeiro webhook"
                description="Webhooks enviam eventos em tempo real para sistemas externos. Crie um agora para começar a receber notificações."
                action={{
                  label: "Adicionar webhook",
                  onClick: () => setShowForm(true),
                  icon: Plus,
                }}
                secondaryAction={{
                  label: "Criar com template",
                  onClick: () => setShowWizard(true),
                  variant: "outline",
                }}
                variant="centered"
              />
            </CardContent>
         </Card>
       )}
 
       <Dialog
         open={showForm || !!editingWebhook}
         onOpenChange={(open) => {
           if (!open) {
             setShowForm(false);
             setEditingWebhook(null);
           }
         }}
       >
         <DialogContent className="max-w-2xl">
           <DialogHeader>
             <DialogTitle>
               {editingWebhook ? 'Editar Webhook' : 'Novo Webhook'}
             </DialogTitle>
             <DialogDescription>
               Configure um endpoint para receber eventos em tempo real
             </DialogDescription>
           </DialogHeader>
           <WebhookForm
             webhook={editingWebhook || undefined}
             onSuccess={() => {
               setShowForm(false);
               setEditingWebhook(null);
             }}
           />
         </DialogContent>
       </Dialog>

        <Dialog
          open={showWizard}
          onOpenChange={(open) => {
            if (!open) setShowWizard(false);
          }}
        >
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Novo Webhook com Template</DialogTitle>
              <DialogDescription>
                Escolha um provedor (Zapier, Make, n8n, Slack, Discord...) e crie com eventos e headers sugeridos.
              </DialogDescription>
            </DialogHeader>
            <WebhookWizard
              onComplete={() => setShowWizard(false)}
              onCancel={() => setShowWizard(false)}
            />
          </DialogContent>
        </Dialog>
 
       {viewingLogs && (
         <Dialog open={!!viewingLogs} onOpenChange={() => setViewingLogs(null)}>
           <DialogContent className="max-w-3xl">
             <DialogHeader>
               <DialogTitle>Logs do Webhook</DialogTitle>
             </DialogHeader>
             <WebhookLogs webhookId={viewingLogs} />
           </DialogContent>
         </Dialog>
       )}
     </div>
   );
 }
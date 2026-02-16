 import * as React from "react";
 import { useParams, useNavigate } from "react-router-dom";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Label } from "@/components/ui/label";
 import { Input } from "@/components/ui/input";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
 import { Textarea } from "@/components/ui/textarea";
 import { Badge } from "@/components/ui/badge";
 import { Separator } from "@/components/ui/separator";
 import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
 import { toast } from "@/components/ui/use-toast";
 import { ArrowLeft, Play, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
 import { useQuery } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { useSimulateAutomation } from "@/hooks/useSimulateAutomation";
 import type { SimulableEventType, SimulableEventData } from "@/types/simulator";
 import { z } from "zod";
 
 const eventSchemas = {
   message_received: z.object({
     contact_id: z.string().uuid({ message: "ID de contato inv\u00e1lido" }),
     message_body: z.string().min(1, "Mensagem n\u00e3o pode estar vazia"),
     media_url: z.string().url().optional().or(z.literal("")),
   }),
   contact_created: z.object({
     contact_id: z.string().uuid({ message: "ID de contato inv\u00e1lido" }),
     name: z.string().min(1, "Nome obrigat\u00f3rio"),
     phone: z.string().min(10, "Telefone inv\u00e1lido (m\u00edn 10 d\u00edgitos)"),
   }),
   webhook_triggered: z.object({
     webhook_id: z.string().uuid({ message: "ID de webhook inv\u00e1lido" }),
     payload: z.string().min(1, "Payload JSON obrigat\u00f3rio"),
   }),
   scheduled_time: z.object({
     timestamp: z.string().min(1, "Timestamp obrigat\u00f3rio (ISO 8601)"),
   }),
 };
 
 export default function AutomationSimulator() {
   const { id } = useParams<{ id: string }>();
   const navigate = useNavigate();
 
   const [selectedEvent, setSelectedEvent] = React.useState<SimulableEventType>("message_received");
   const [formData, setFormData] = React.useState<Record<string, string>>({
     contact_id: "",
     message_body: "Ol\u00e1, preciso de ajuda!",
     media_url: "",
   });
 
   const { data: automation, isLoading: loadingAutomation } = useQuery({
     queryKey: ["automation", id],
     queryFn: async () => {
       const { data, error } = await supabase.from("automations").select("id, name, doc").eq("id", id).single();
       if (error) throw error;
       return data;
     },
     enabled: !!id,
   });
 
   const simulateMutation = useSimulateAutomation();
 
   const handleEventChange = (newEvent: SimulableEventType) => {
     setSelectedEvent(newEvent);
     // Reset form
     if (newEvent === "message_received") {
       setFormData({ contact_id: "", message_body: "Ol\u00e1, preciso de ajuda!", media_url: "" });
     } else if (newEvent === "contact_created") {
       setFormData({ contact_id: "", name: "Novo Contato", phone: "+5511999999999" });
     } else if (newEvent === "webhook_triggered") {
       setFormData({ webhook_id: "", payload: '{\n  "test": true\n}' });
     } else if (newEvent === "scheduled_time") {
       setFormData({ timestamp: new Date().toISOString() });
     }
   };
 
   const handleSimulate = () => {
     if (!id) {
       toast({ title: "Erro", description: "ID da automa\u00e7\u00e3o ausente", variant: "destructive" });
       return;
     }
 
     const schema = eventSchemas[selectedEvent];
     let parsed: z.infer<typeof schema>;
 
     try {
       // Parse webhook payload if needed
       if (selectedEvent === "webhook_triggered" && formData.payload) {
         const payloadObj = JSON.parse(formData.payload);
         parsed = schema.parse({ ...formData, payload: payloadObj });
       } else {
         parsed = schema.parse(formData);
       }
     } catch (err) {
       if (err instanceof z.ZodError) {
         toast({
           title: "Valida\u00e7\u00e3o falhou",
           description: err.errors.map((e) => e.message).join(", "),
           variant: "destructive",
         });
       } else {
         toast({ title: "Erro", description: "Formato inv\u00e1lido (webhook payload deve ser JSON)", variant: "destructive" });
       }
       return;
     }
 
     const eventData: SimulableEventData = { event_type: selectedEvent, ...parsed } as SimulableEventData;
 
     simulateMutation.mutate({
       automation_id: id,
       event_data: eventData,
     });
   };
 
   if (loadingAutomation) {
     return (
       <div className="flex h-[60vh] items-center justify-center">
         <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
       </div>
     );
   }
 
   if (!automation) {
     return (
       <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
         <p className="text-muted-foreground">Automa\u00e7\u00e3o n\u00e3o encontrada.</p>
         <Button variant="outline" onClick={() => navigate("/dashboard/automacoes")}>
           Voltar para Automa\u00e7\u00f5es
         </Button>
       </div>
     );
   }
 
   return (
     <div className="space-y-4">
       <div className="flex items-center gap-2">
         <Button variant="ghost" size="icon" onClick={() => navigate(`/dashboard/automacoes/editor/${id}`)}>
           <ArrowLeft className="h-4 w-4" />
         </Button>
         <div>
           <h1 className="text-2xl font-bold">Simulador de Eventos</h1>
           <p className="text-sm text-muted-foreground">
             Automa\u00e7\u00e3o: <strong>{automation.name}</strong>
           </p>
         </div>
       </div>
 
       <div className="grid gap-4 lg:grid-cols-2">
         {/* Formul\u00e1rio */}
         <Card>
           <CardHeader>
             <CardTitle>Evento e Par\u00e2metros</CardTitle>
             <CardDescription>Escolha o evento trigger e preencha os dados para simula\u00e7\u00e3o</CardDescription>
           </CardHeader>
           <CardContent className="space-y-4">
             <div className="space-y-2">
               <Label htmlFor="event-type">Tipo de Evento</Label>
               <Select value={selectedEvent} onValueChange={(v) => handleEventChange(v as SimulableEventType)}>
                 <SelectTrigger id="event-type">
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="message_received">Mensagem Recebida</SelectItem>
                   <SelectItem value="contact_created">Contato Criado</SelectItem>
                   <SelectItem value="webhook_triggered">Webhook Disparado</SelectItem>
                   <SelectItem value="scheduled_time">Hor\u00e1rio Agendado</SelectItem>
                 </SelectContent>
               </Select>
             </div>
 
             <Separator />
 
             {/* Campos din\u00e2micos por tipo */}
             {selectedEvent === "message_received" && (
               <>
                 <div className="space-y-2">
                   <Label htmlFor="contact_id">ID do Contato (UUID)</Label>
                   <Input
                     id="contact_id"
                     value={formData.contact_id}
                     onChange={(e) => setFormData((prev) => ({ ...prev, contact_id: e.target.value }))}
                     placeholder="e.g., 123e4567-e89b-12d3-a456-426614174000"
                   />
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="message_body">Corpo da Mensagem</Label>
                   <Textarea
                     id="message_body"
                     value={formData.message_body}
                     onChange={(e) => setFormData((prev) => ({ ...prev, message_body: e.target.value }))}
                     rows={3}
                   />
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="media_url">URL de M\u00eddia (opcional)</Label>
                   <Input
                     id="media_url"
                     value={formData.media_url}
                     onChange={(e) => setFormData((prev) => ({ ...prev, media_url: e.target.value }))}
                     placeholder="https://..."
                   />
                 </div>
               </>
             )}
 
             {selectedEvent === "contact_created" && (
               <>
                 <div className="space-y-2">
                   <Label htmlFor="contact_id">ID do Contato (UUID)</Label>
                   <Input
                     id="contact_id"
                     value={formData.contact_id}
                     onChange={(e) => setFormData((prev) => ({ ...prev, contact_id: e.target.value }))}
                     placeholder="e.g., 123e4567-e89b-12d3-a456-426614174000"
                   />
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="name">Nome</Label>
                   <Input
                     id="name"
                     value={formData.name}
                     onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                   />
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="phone">Telefone</Label>
                   <Input
                     id="phone"
                     value={formData.phone}
                     onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                     placeholder="+5511999999999"
                   />
                 </div>
               </>
             )}
 
             {selectedEvent === "webhook_triggered" && (
               <>
                 <div className="space-y-2">
                   <Label htmlFor="webhook_id">ID do Webhook (UUID)</Label>
                   <Input
                     id="webhook_id"
                     value={formData.webhook_id}
                     onChange={(e) => setFormData((prev) => ({ ...prev, webhook_id: e.target.value }))}
                     placeholder="e.g., 123e4567-e89b-12d3-a456-426614174000"
                   />
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="payload">Payload JSON</Label>
                   <Textarea
                     id="payload"
                     value={formData.payload}
                     onChange={(e) => setFormData((prev) => ({ ...prev, payload: e.target.value }))}
                     rows={6}
                     className="font-mono text-xs"
                   />
                 </div>
               </>
             )}
 
             {selectedEvent === "scheduled_time" && (
               <div className="space-y-2">
                 <Label htmlFor="timestamp">Timestamp (ISO 8601)</Label>
                 <Input
                   id="timestamp"
                   value={formData.timestamp}
                   onChange={(e) => setFormData((prev) => ({ ...prev, timestamp: e.target.value }))}
                   placeholder="2026-01-31T10:00:00Z"
                 />
               </div>
             )}
 
             <Separator />
 
             <Button
               onClick={handleSimulate}
               disabled={simulateMutation.isPending}
               className="w-full bg-brand-primary-light text-primary-foreground hover:bg-brand-primary-light/90"
             >
               {simulateMutation.isPending ? (
                 <>
                   <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                   Simulando...
                 </>
               ) : (
                 <>
                   <Play className="mr-2 h-4 w-4" />
                   Simular Execu\u00e7\u00e3o
                 </>
               )}
             </Button>
           </CardContent>
         </Card>
 
         {/* Resultado */}
         <Card>
           <CardHeader>
             <CardTitle>Log de Execu\u00e7\u00e3o</CardTitle>
             <CardDescription>Timeline visual e detalhes de cada step (dry-run, sem a\u00e7\u00f5es reais)</CardDescription>
           </CardHeader>
           <CardContent>
             {!simulateMutation.data && !simulateMutation.error && (
               <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                 Clique em "Simular Execu\u00e7\u00e3o" para ver o resultado
               </div>
             )}
 
             {simulateMutation.error && (
               <div className="rounded-md border border-destructive bg-destructive/10 p-4">
                 <p className="text-sm font-semibold text-destructive">Erro na simula\u00e7\u00e3o</p>
                 <p className="mt-1 text-xs text-destructive/80">{String(simulateMutation.error)}</p>
               </div>
             )}
 
             {simulateMutation.data && (
               <Tabs defaultValue="timeline" className="w-full">
                 <TabsList className="grid w-full grid-cols-2">
                   <TabsTrigger value="timeline">Timeline</TabsTrigger>
                   <TabsTrigger value="summary">Resumo</TabsTrigger>
                 </TabsList>
 
                 <TabsContent value="timeline" className="space-y-3 pt-4">
                   <div className="space-y-2">
                     {simulateMutation.data.execution_log.map((step, idx) => (
                       <div
                         key={idx}
                         className={
                           "rounded-md border p-3 " +
                           (step.status === "success"
                            ? "bg-green-500/10 border-green-500/30"
                             : step.status === "error"
                              ? "bg-destructive/10 border-destructive/30"
                               : "border-muted bg-muted/30")
                         }
                       >
                         <div className="flex items-start gap-2">
                          {step.status === "success" && <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600 dark:text-green-400" />}
                          {step.status === "error" && <XCircle className="mt-0.5 h-4 w-4 text-destructive" />}
                           {step.status === "skipped" && <Clock className="mt-0.5 h-4 w-4 text-muted-foreground" />}
                           <div className="flex-1 space-y-1">
                             <div className="flex items-center justify-between">
                               <p className="text-sm font-semibold">
                                 Step {step.step_index + 1}: {step.block_title}
                               </p>
                               <Badge variant="outline" className="text-xs">
                                 {step.duration_ms}ms
                               </Badge>
                             </div>
                             <p className="text-xs text-muted-foreground">Tipo: {step.block_type}</p>
                             {step.transformations_applied.length > 0 && (
                               <p className="text-xs text-muted-foreground">
                                 Transforma\u00e7\u00f5es: {step.transformations_applied.join(", ")}
                               </p>
                             )}
                             {step.error_message && (
                               <p className="text-xs text-red-600 dark:text-red-400">{step.error_message}</p>
                             )}
                           </div>
                         </div>
                       </div>
                     ))}
                   </div>
                 </TabsContent>
 
                 <TabsContent value="summary" className="space-y-3 pt-4">
                   <div className="space-y-2 text-sm">
                     <div className="flex justify-between">
                       <span className="text-muted-foreground">Automa\u00e7\u00e3o:</span>
                       <span className="font-medium">{simulateMutation.data.automation_name}</span>
                     </div>
                     <div className="flex justify-between">
                       <span className="text-muted-foreground">Evento:</span>
                       <span className="font-medium">{simulateMutation.data.event_type}</span>
                     </div>
                     <div className="flex justify-between">
                       <span className="text-muted-foreground">Steps executados:</span>
                       <span className="font-medium">{simulateMutation.data.execution_log.length}</span>
                     </div>
                     <div className="flex justify-between">
                       <span className="text-muted-foreground">Dura\u00e7\u00e3o total:</span>
                       <span className="font-medium">{simulateMutation.data.total_duration_ms}ms</span>
                     </div>
                     <div className="flex justify-between">
                       <span className="text-muted-foreground">Status final:</span>
                       <Badge variant={simulateMutation.data.final_status === "completed" ? "default" : "destructive"}>
                         {simulateMutation.data.final_status}
                       </Badge>
                     </div>
                     <div className="flex justify-between">
                       <span className="text-muted-foreground">Dry-run:</span>
                       <Badge variant="secondary">Sim (sem a\u00e7\u00f5es reais)</Badge>
                     </div>
                   </div>
                 </TabsContent>
               </Tabs>
             )}
           </CardContent>
         </Card>
       </div>
     </div>
   );
 }
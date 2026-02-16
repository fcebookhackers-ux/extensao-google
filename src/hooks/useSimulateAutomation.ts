 import { useMutation } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import type { SimulableEventData, SimulationResult } from "@/types/simulator";
 import { toast } from "@/components/ui/use-toast";
 
 type SimulateAutomationParams = {
   automation_id: string;
   event_data: SimulableEventData;
 };
 
 export function useSimulateAutomation() {
   return useMutation({
     mutationFn: async (params: SimulateAutomationParams): Promise<SimulationResult> => {
       const { data, error } = await supabase.functions.invoke<SimulationResult>("simulate-automation", {
         body: params,
       });
 
       if (error) throw error;
       if (!data) throw new Error("Nenhum dado retornado pela edge function");
 
       return data;
     },
     onSuccess: (data) => {
       toast({
         title: "\u2705 Simula\u00e7\u00e3o conclu\u00edda",
         description: `${data.execution_log.length} steps executados em ${data.total_duration_ms}ms (dry-run)`,
       });
     },
     onError: (error) => {
       console.error("Erro na simula\u00e7\u00e3o:", error);
       toast({
         title: "Erro ao simular automa\u00e7\u00e3o",
         description: String(error),
         variant: "destructive",
       });
     },
   });
 }
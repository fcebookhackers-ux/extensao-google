 import { Button } from "@/components/ui/button";
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from "@/components/ui/select";
 import { Calendar } from "@/components/ui/calendar";
 import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
 import { CalendarIcon } from "lucide-react";
 import { format } from "date-fns";
 import { ptBR } from "date-fns/locale";
 import { cn } from "@/lib/utils";
 import type { ActivityFilters } from "@/types/activity";
 
 interface ActivityFiltersProps {
   filters: ActivityFilters;
   onFiltersChange: (filters: ActivityFilters) => void;
 }
 
 export function ActivityFiltersBar({ filters, onFiltersChange }: ActivityFiltersProps) {
   return (
     <div className="flex flex-wrap gap-3 mb-6">
       <Select
         value={filters.eventType || "all"}
         onValueChange={(value) =>
           onFiltersChange({ ...filters, eventType: value === "all" ? undefined : value })
         }
       >
         <SelectTrigger className="w-[200px]">
           <SelectValue placeholder="Tipo de evento" />
         </SelectTrigger>
         <SelectContent>
           <SelectItem value="all">Todos os eventos</SelectItem>
           <SelectItem value="automation.created">Automação criada</SelectItem>
           <SelectItem value="automation.published">Automação publicada</SelectItem>
           <SelectItem value="webhook.created">Webhook criado</SelectItem>
           <SelectItem value="webhook.failed">Webhook falhou</SelectItem>
           <SelectItem value="member.invited">Membro convidado</SelectItem>
           <SelectItem value="member.joined">Membro entrou</SelectItem>
           <SelectItem value="comment.added">Comentário adicionado</SelectItem>
         </SelectContent>
       </Select>
 
       <Popover>
         <PopoverTrigger asChild>
           <Button
             variant="outline"
             className={cn("w-[200px] justify-start text-left font-normal", !filters.startDate && "text-muted-foreground")}
           >
             <CalendarIcon className="mr-2 h-4 w-4" />
             {filters.startDate ? format(new Date(filters.startDate), "PPP", { locale: ptBR }) : "Data inicial"}
           </Button>
         </PopoverTrigger>
         <PopoverContent className="w-auto p-0">
           <Calendar
             mode="single"
             selected={filters.startDate ? new Date(filters.startDate) : undefined}
             onSelect={(date) =>
               onFiltersChange({ ...filters, startDate: date ? date.toISOString() : undefined })
             }
             initialFocus
           />
         </PopoverContent>
       </Popover>
 
       <Popover>
         <PopoverTrigger asChild>
           <Button
             variant="outline"
             className={cn("w-[200px] justify-start text-left font-normal", !filters.endDate && "text-muted-foreground")}
           >
             <CalendarIcon className="mr-2 h-4 w-4" />
             {filters.endDate ? format(new Date(filters.endDate), "PPP", { locale: ptBR }) : "Data final"}
           </Button>
         </PopoverTrigger>
         <PopoverContent className="w-auto p-0">
           <Calendar
             mode="single"
             selected={filters.endDate ? new Date(filters.endDate) : undefined}
             onSelect={(date) =>
               onFiltersChange({ ...filters, endDate: date ? date.toISOString() : undefined })
             }
             initialFocus
           />
         </PopoverContent>
       </Popover>
 
       {(filters.eventType || filters.startDate || filters.endDate) && (
         <Button
           variant="ghost"
           onClick={() => onFiltersChange({})}
         >
           Limpar filtros
         </Button>
       )}
     </div>
   );
 }
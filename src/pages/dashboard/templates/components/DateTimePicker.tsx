import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function DateTimePicker({
  value,
  onChange,
}: {
  value?: Date;
  onChange: (next?: Date) => void;
}) {
  const date = value;
  const time = date ? format(date, "HH:mm") : "";

  const setDatePart = (d?: Date) => {
    if (!d) return onChange(undefined);
    const hours = date ? date.getHours() : 12;
    const minutes = date ? date.getMinutes() : 0;
    const next = new Date(d);
    next.setHours(hours, minutes, 0, 0);
    onChange(next);
  };

  const setTimePart = (t: string) => {
    if (!date) {
      const base = new Date();
      base.setSeconds(0, 0);
      const [hh, mm] = t.split(":").map((x) => Number(x));
      if (Number.isFinite(hh) && Number.isFinite(mm)) base.setHours(hh, mm, 0, 0);
      onChange(base);
      return;
    }
    const [hh, mm] = t.split(":").map((x) => Number(x));
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return;
    const next = new Date(date);
    next.setHours(hh, mm, 0, 0);
    onChange(next);
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Data</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
            >
              <CalendarIcon className="h-4 w-4" />
              {date ? format(date, "dd/MM/yyyy") : <span>Selecionar</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={date} onSelect={setDatePart} initialFocus className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Hora</label>
        <Input type="time" value={time} onChange={(e) => setTimePart(e.target.value)} />
      </div>
    </div>
  );
}

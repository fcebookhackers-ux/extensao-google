import * as React from "react";
import type { DateRange } from "react-day-picker";
import { CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function formatRange(range: DateRange | undefined) {
  if (!range?.from && !range?.to) return "Selecionar";
  const from = range.from ? range.from.toLocaleDateString() : "";
  const to = range.to ? range.to.toLocaleDateString() : "";
  return to ? `${from} – ${to}` : from;
}

export function DateRangePicker({
  value,
  onChange,
  className,
}: {
  value: DateRange | undefined;
  onChange: (v: DateRange | undefined) => void;
  className?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("justify-start", className)}>
          <CalendarDays className="h-4 w-4" />
          <span className="truncate">{formatRange(value)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="range" selected={value} onSelect={onChange} numberOfMonths={2} />
      </PopoverContent>
    </Popover>
  );
}

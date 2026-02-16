import * as React from "react";
import type { DateRange } from "react-day-picker";
import { CalendarDays, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

type PresetKey = "today" | "last7" | "last30" | "thisMonth" | "lastMonth" | "last3" | "custom";

const presets: Array<{ key: PresetKey; label: string }> = [
  { key: "today", label: "Hoje" },
  { key: "last7", label: "Últimos 7 dias" },
  { key: "last30", label: "Últimos 30 dias" },
  { key: "thisMonth", label: "Este mês" },
  { key: "lastMonth", label: "Mês passado" },
  { key: "last3", label: "Últimos 3 meses" },
  { key: "custom", label: "Personalizado" },
];

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function computeRange(key: PresetKey): DateRange | undefined {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (key === "today") return { from: today, to: today };
  if (key === "last7") return { from: new Date(today.getTime() - 6 * 86400000), to: today };
  if (key === "last30") return { from: new Date(today.getTime() - 29 * 86400000), to: today };
  if (key === "thisMonth") return { from: startOfMonth(today), to: endOfMonth(today) };
  if (key === "lastMonth") {
    const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    return { from: startOfMonth(prev), to: endOfMonth(prev) };
  }
  if (key === "last3") {
    const from = new Date(today.getFullYear(), today.getMonth() - 2, 1);
    return { from, to: today };
  }
  return undefined;
}

function formatRangeLabel(range: DateRange | undefined, fallback: string) {
  if (!range?.from && !range?.to) return fallback;
  const from = range.from ? range.from.toLocaleDateString() : "";
  const to = range.to ? range.to.toLocaleDateString() : "";
  return to ? `${from} – ${to}` : from;
}

export function DateRangePresetPicker() {
  const [preset, setPreset] = React.useState<PresetKey>("last7");
  const [range, setRange] = React.useState<DateRange | undefined>(computeRange("last7"));

  const label = preset === "custom" ? formatRangeLabel(range, "Personalizado") : presets.find((p) => p.key === preset)?.label ?? "Período";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2">
          <CalendarDays className="h-4 w-4" />
          <span className="max-w-[180px] truncate">{label}</span>
          <ChevronDown className="h-4 w-4 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-2">
        <div className="space-y-2">
          <div className="grid gap-1">
            {presets.map((p) => (
              <button
                key={p.key}
                type="button"
                className={cn(
                  "rounded-md px-2 py-2 text-left text-sm hover:bg-muted",
                  p.key === preset && "bg-muted",
                )}
                onClick={() => {
                  setPreset(p.key);
                  if (p.key !== "custom") setRange(computeRange(p.key));
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {preset === "custom" ? (
            <>
              <Separator />
              <Calendar
                mode="range"
                selected={range}
                onSelect={setRange}
                numberOfMonths={2}
                className="p-2 pointer-events-auto"
              />
            </>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

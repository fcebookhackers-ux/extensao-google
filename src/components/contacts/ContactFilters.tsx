import * as React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Filter, Search, Tag, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ContactFilters as ContactFiltersType } from "@/types/contacts";
import { useAvailableTags } from "@/hooks/useContacts";

interface ContactFiltersProps {
  filters: ContactFiltersType;
  onChange: (filters: ContactFiltersType) => void;
}

export function ContactFilters({ filters, onChange }: ContactFiltersProps) {
  const { data: availableTags } = useAvailableTags();
  const [showFilters, setShowFilters] = React.useState(false);

  const activeFiltersCount = [
    filters.tags?.length ? 1 : 0,
    filters.status ? 1 : 0,
    filters.createdAfter ? 1 : 0,
    filters.createdBefore ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-[520px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.query ?? ""}
            onChange={(e) => onChange({ ...filters, query: e.target.value })}
            placeholder="Buscar por nome, telefone, email ou tags..."
            className="pl-9"
          />
        </div>

        <Button type="button" variant="outline" onClick={() => setShowFilters((v) => !v)} className="gap-2">
          <Filter className="h-4 w-4" />
          Filtros
          {activeFiltersCount > 0 ? <Badge variant="secondary">{activeFiltersCount}</Badge> : null}
        </Button>
      </div>

      {/* Advanced Filters */}
      {showFilters ? (
        <div className="rounded-lg border bg-background p-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Tags */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Tag className="h-4 w-4" />
                  <span className="truncate">
                    {filters.tags?.length ? `${filters.tags.length} tags` : "Selecionar tags"}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-72 p-2">
                <div className="px-2 pb-2 text-xs font-medium text-muted-foreground">Tags</div>
                <div className="max-h-64 space-y-1 overflow-auto">
                  {(availableTags ?? []).length ? (
                    (availableTags ?? []).map((tag) => {
                      const checked = !!filters.tags?.includes(tag);
                      return (
                        <label
                          key={tag}
                          className={cn(
                            "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                            "hover:bg-muted/60",
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const nextTags = e.target.checked
                                ? [...(filters.tags ?? []), tag]
                                : (filters.tags ?? []).filter((t) => t !== tag);
                              onChange({ ...filters, tags: nextTags.length ? nextTags : undefined });
                            }}
                            className="h-4 w-4"
                          />
                          <span className="truncate">{tag}</span>
                        </label>
                      );
                    })
                  ) : (
                    <div className="px-2 py-2 text-sm text-muted-foreground">Nenhuma tag cadastrada ainda.</div>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* Status */}
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">Status</div>
              <Select
                value={filters.status ?? "all"}
                onValueChange={(value) => onChange({ ...filters, status: value === "all" ? undefined : (value as any) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="blocked">Bloqueado</SelectItem>
                  <SelectItem value="unsubscribed">Descadastrado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Created After */}
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">Criado após</div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    <span className="truncate">
                      {filters.createdAfter ? format(filters.createdAfter, "PP", { locale: ptBR }) : "Selecionar"}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.createdAfter}
                    onSelect={(date) => onChange({ ...filters, createdAfter: date ?? undefined })}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Created Before */}
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">Criado antes</div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    <span className="truncate">
                      {filters.createdBefore ? format(filters.createdBefore, "PP", { locale: ptBR }) : "Selecionar"}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.createdBefore}
                    onSelect={(date) => onChange({ ...filters, createdBefore: date ?? undefined })}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Active Filters */}
          {activeFiltersCount > 0 || (filters.tags?.length ?? 0) > 0 ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {(filters.tags ?? []).map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}
                  <button
                    type="button"
                    className="ml-1 inline-flex"
                    onClick={() => onChange({ ...filters, tags: (filters.tags ?? []).filter((t) => t !== tag) })}
                    aria-label={`Remover tag ${tag}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => onChange({})} className="h-7 px-2 text-xs">
                Limpar todos
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

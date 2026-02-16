import * as React from "react";
import { Filter, Save, Search, Star, X } from "lucide-react";

import type { MediaSearchFilters } from "@/types/search";
import { useDebounce } from "@/hooks/useDebounce";
import { useCreateSavedSearch, useMediaSearch, useSavedSearches } from "@/hooks/useSearch";
import { useMediaFolders } from "@/hooks/useMediaFolders";
import { useMediaTags } from "@/hooks/useMediaTags";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function AdvancedMediaSearch({ className }: { className?: string }) {
  const [showFilters, setShowFilters] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [searchName, setSearchName] = React.useState("");

  const [filters, setFilters] = React.useState<MediaSearchFilters>({
    limit: 50,
    offset: 0,
  });

  const debouncedQuery = useDebounce(filters.query ?? "", 250);
  const effectiveFilters = React.useMemo(() => ({ ...filters, query: debouncedQuery }), [filters, debouncedQuery]);

  const { data: results, isLoading } = useMediaSearch(effectiveFilters);
  const { data: folders } = useMediaFolders();
  const { data: tags } = useMediaTags();
  const { data: savedSearches } = useSavedSearches("media");
  const createSavedSearch = useCreateSavedSearch();

  const activeFiltersCount = React.useMemo(() => {
    const f = effectiveFilters;
    const keys = Object.keys(f) as (keyof MediaSearchFilters)[];
    return keys.filter((k) => {
      if (k === "limit" || k === "offset") return false;
      const v = f[k];
      if (v === undefined || v === null) return false;
      if (Array.isArray(v)) return v.length > 0;
      if (typeof v === "string") return v.trim().length > 0;
      return true;
    }).length;
  }, [effectiveFilters]);

  const onClear = () => {
    setFilters({ limit: 50, offset: 0 });
  };

  const onSave = async () => {
    if (!searchName.trim()) return;
    await createSavedSearch.mutateAsync({
      name: searchName.trim(),
      searchType: "media",
      filters: effectiveFilters,
    });
    setSaving(false);
    setSearchName("");
  };

  return (
    <div className={cn("space-y-4", className)}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4 text-muted-foreground" /> Busca avançada de mídia
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant={showFilters ? "secondary" : "outline"} onClick={() => setShowFilters((v) => !v)}>
              <Filter className="h-4 w-4" /> Filtros
              {activeFiltersCount > 0 ? <Badge variant="secondary">{activeFiltersCount}</Badge> : null}
            </Button>
            {activeFiltersCount > 0 ? (
              <Button variant="ghost" onClick={onClear}>
                <X className="h-4 w-4" /> Limpar
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.query ?? ""}
              onChange={(e) => setFilters((prev) => ({ ...prev, query: e.target.value, offset: 0 }))}
              placeholder="Buscar por nome de arquivo…"
              className="pl-9"
            />
          </div>

          {savedSearches && savedSearches.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Buscas salvas:</span>
              {savedSearches.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setFilters({ ...(s.filters as MediaSearchFilters), limit: 50, offset: 0 });
                    setShowFilters(true);
                  }}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs text-foreground hover:bg-accent"
                >
                  {s.isFavorite ? <Star className="h-3 w-3 text-muted-foreground" /> : null}
                  {s.name}
                </button>
              ))}
            </div>
          ) : null}

          {showFilters ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-medium">Tipo de arquivo</p>
                <div className="flex flex-wrap gap-2">
                  {(["image", "video", "document", "audio"] as const).map((t) => {
                    const active = (filters.fileTypes ?? []).includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs transition-colors",
                          active ? "bg-accent text-accent-foreground" : "bg-background hover:bg-accent",
                        )}
                        onClick={() => {
                          setFilters((prev) => {
                            const cur = prev.fileTypes ?? [];
                            const next = cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t];
                            return { ...prev, fileTypes: next, offset: 0 };
                          });
                        }}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Pasta</p>
                <select
                  multiple
                  size={4}
                  value={filters.folderIds ?? []}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
                    setFilters((prev) => ({ ...prev, folderIds: selected, offset: 0 }));
                  }}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value={""}>Sem pasta</option>
                  {(folders ?? []).map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">Dica: use Ctrl/⌘ para selecionar várias.</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Tags</p>
                <select
                  multiple
                  size={4}
                  value={filters.tagIds ?? []}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
                    setFilters((prev) => ({ ...prev, tagIds: selected, offset: 0 }));
                  }}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  {(tags ?? []).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Tamanho (MB)</p>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    inputMode="decimal"
                    placeholder="Mín"
                    onChange={(e) => {
                      const mb = parseFloat(e.target.value);
                      setFilters((prev) => ({ ...prev, minSize: mb ? mb * 1024 * 1024 : undefined, offset: 0 }));
                    }}
                  />
                  <Input
                    inputMode="decimal"
                    placeholder="Máx"
                    onChange={(e) => {
                      const mb = parseFloat(e.target.value);
                      setFilters((prev) => ({ ...prev, maxSize: mb ? mb * 1024 * 1024 : undefined, offset: 0 }));
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <p className="text-sm font-medium">Salvar busca</p>
                {!saving ? (
                  <Button variant="outline" onClick={() => setSaving(true)}>
                    <Save className="h-4 w-4" /> Salvar esta busca
                  </Button>
                ) : (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input value={searchName} onChange={(e) => setSearchName(e.target.value)} placeholder="Nome da busca…" />
                    <div className="flex gap-2">
                      <Button onClick={onSave} disabled={createSavedSearch.isPending}>
                        Salvar
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSaving(false);
                          setSearchName("");
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resultados</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Buscando…</p>
          ) : !results || results.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum resultado encontrado</p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {results.length} resultado{results.length !== 1 ? "s" : ""}
              </p>

              <div className="grid gap-2 md:grid-cols-2">
                {results.map((file: any) => (
                  <div key={file.id} className="flex items-center gap-3 rounded-md border bg-card p-3">
                    {file.thumbnail_url ? (
                      <img
                        src={file.thumbnail_url}
                        alt={file.file_name}
                        className="h-10 w-10 rounded object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="grid h-10 w-10 place-items-center rounded bg-muted text-muted-foreground">
                        <Search className="h-4 w-4" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{file.file_name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatBytes(file.file_size)} • {file.file_type}
                      </p>
                    </div>

                    {typeof file.match_score === "number" ? (
                      <Badge variant="secondary" className="shrink-0">
                        {Math.round(file.match_score * 100)}%
                      </Badge>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

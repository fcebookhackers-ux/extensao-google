import * as React from "react";
import {
  Folder,
  Image as ImageIcon,
  Loader2,
  Search,
  Tag,
  Webhook,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useGlobalSearch } from "@/hooks/useSearch";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const typeIcons = {
  media: ImageIcon,
  webhook: Webhook,
  folder: Folder,
  tag: Tag,
} as const;

const typeLabels: Record<keyof typeof typeIcons, string> = {
  media: "Mídia",
  webhook: "Webhook",
  folder: "Pasta",
  tag: "Tag",
};

export function GlobalSearchBar({ className }: { className?: string }) {
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  const { data: results, isLoading } = useGlobalSearch(debouncedQuery);

  const allResults = React.useMemo(() => {
    if (!results) return [];
    return [...results.media, ...results.webhooks, ...results.folders, ...results.tags].sort(
      (a, b) => b.score - a.score,
    );
  }, [results]);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  React.useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const canShow = open && query.trim().length >= 2;

  const onSelect = (url: string) => {
    navigate(url);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar em tudo… (Ctrl/⌘ K)"
          className="pl-9 pr-20"
        />

        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
          {query ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              aria-label="Limpar busca"
            >
              <X className="h-4 w-4" />
            </Button>
          ) : (
            <kbd className="hidden rounded border bg-muted px-2 py-1 text-[10px] text-muted-foreground md:inline">
              ⌘K
            </kbd>
          )}
        </div>
      </div>

      {canShow ? (
        <Card className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden p-0 shadow-lg">
          <div className="border-b bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {isLoading
              ? "Buscando…"
              : allResults.length === 0
                ? `Nenhum resultado para “${query.trim()}”`
                : `${allResults.length} resultado${allResults.length !== 1 ? "s" : ""}`}
          </div>

          <div className="max-h-[320px] overflow-auto">
            {allResults.slice(0, 10).map((r) => {
              const Icon = typeIcons[r.type];
              return (
                <button
                  key={`${r.type}:${r.id}`}
                  type="button"
                  onClick={() => onSelect(r.url)}
                  className="flex w-full items-start gap-3 px-3 py-2 text-left transition-colors hover:bg-accent"
                >
                  <div className="mt-0.5 grid h-8 w-8 place-items-center rounded-md bg-muted text-muted-foreground">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{r.title}</p>
                      <span className="shrink-0 rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                        {typeLabels[r.type]}
                      </span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{r.subtitle}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {allResults.length > 10 ? (
            <div className="border-t bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              Mostrando 10 de {allResults.length} resultados
            </div>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}

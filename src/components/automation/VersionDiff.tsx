import { useMemo } from "react";
import type { AutomationVersion } from "@/types/versioning";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Edit, Minus, Plus } from "lucide-react";

interface VersionDiffProps {
  oldVersion: AutomationVersion;
  newVersion: AutomationVersion;
}

export function VersionDiff({ oldVersion, newVersion }: VersionDiffProps) {
  const diff = useMemo(() => {
    const oldBlocks = oldVersion.doc?.blocks || [];
    const newBlocks = newVersion.doc?.blocks || [];

    const oldBlockIds = new Set(oldBlocks.map((b: any) => b.id));
    const newBlockIds = new Set(newBlocks.map((b: any) => b.id));

    const added = newBlocks.filter((b: any) => !oldBlockIds.has(b.id));
    const removed = oldBlocks.filter((b: any) => !newBlockIds.has(b.id));

    const modified = newBlocks.filter((newBlock: any) => {
      const oldBlock = oldBlocks.find((b: any) => b.id === newBlock.id);
      if (!oldBlock) return false;
      return JSON.stringify(oldBlock) !== JSON.stringify(newBlock);
    });

    return { added, removed, modified };
  }, [oldVersion, newVersion]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">
          Comparação: v{oldVersion.version_number} → v{newVersion.version_number}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="gap-1">
            <Plus className="h-3.5 w-3.5" />
            {diff.added.length} adicionado{diff.added.length !== 1 ? "s" : ""}
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <Minus className="h-3.5 w-3.5" />
            {diff.removed.length} removido{diff.removed.length !== 1 ? "s" : ""}
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <Edit className="h-3.5 w-3.5" />
            {diff.modified.length} modificado{diff.modified.length !== 1 ? "s" : ""}
          </Badge>
        </div>

        <div className="space-y-3">
          {diff.added.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold">Blocos adicionados</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {diff.added.map((block: any) => (
                  <li key={block.id} className="rounded-md border bg-background px-2 py-1">
                    {block.type}: {block.data?.text?.slice(0, 50) || block.data?.question?.slice(0, 50) || "Sem título"}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {diff.removed.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold">Blocos removidos</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {diff.removed.map((block: any) => (
                  <li key={block.id} className="rounded-md border bg-background px-2 py-1">
                    {block.type}: {block.data?.text?.slice(0, 50) || block.data?.question?.slice(0, 50) || "Sem título"}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {diff.modified.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold">Blocos modificados</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {diff.modified.map((block: any) => (
                  <li key={block.id} className="rounded-md border bg-background px-2 py-1">
                    {block.type}: {block.data?.text?.slice(0, 50) || block.data?.question?.slice(0, 50) || "Sem título"}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

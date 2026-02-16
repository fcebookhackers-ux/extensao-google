import * as React from "react";
import ReactDiffViewer from "react-diff-viewer-continued";

import type { AutomationVersion } from "@/types/versioning";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  versionA: AutomationVersion;
  versionB: AutomationVersion;
};

export function VersionDiffDialog({ open, onOpenChange, versionA, versionB }: Props) {
  const oldValue = React.useMemo(() => JSON.stringify(versionA.doc ?? {}, null, 2), [versionA.doc]);
  const newValue = React.useMemo(() => JSON.stringify(versionB.doc ?? {}, null, 2), [versionB.doc]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            Diff: v{versionA.version_number} → v{versionB.version_number}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[70vh] rounded-md border">
          <div className="p-3">
            <ReactDiffViewer
              oldValue={oldValue}
              newValue={newValue}
              splitView={true}
              useDarkTheme={true}
            />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";

export function SkeletonTable({ rows = 5, cols = 3 }: { rows?: number; cols?: number }) {
  return (
    <Table>
      <TableBody>
        {Array.from({ length: rows }).map((_, r) => (
          <TableRow key={r}>
            {Array.from({ length: cols }).map((__, c) => (
              <TableCell key={c}>
                <Skeleton className="h-4 w-full" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

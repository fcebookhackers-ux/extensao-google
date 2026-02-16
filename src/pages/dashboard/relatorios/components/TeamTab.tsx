import * as React from "react";
import { Circle } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { teamMock } from "@/pages/dashboard/relatorios/mockData";
import { TeamDistributionStackedBar } from "@/pages/dashboard/relatorios/components/charts/TeamDistributionStackedBar";

export function TeamTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tabela de Performance</CardTitle>
          <div className="text-sm text-muted-foreground">Produtividade e qualidade por membro (mock)</div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Membro</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Conversas</TableHead>
                <TableHead className="text-right">Tempo Resp.</TableHead>
                <TableHead className="text-right">Resolução</TableHead>
                <TableHead className="text-right">NPS</TableHead>
                <TableHead className="text-right">Msgs Enviadas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamMock.rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{r.initials}</AvatarFallback>
                      </Avatar>
                      <div className="text-sm font-medium">{r.name}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-2">
                      <Circle className={r.online ? "h-2.5 w-2.5 fill-primary text-primary" : "h-2.5 w-2.5 fill-muted-foreground text-muted-foreground"} />
                      {r.online ? "Online" : "Offline"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{r.conversations}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.avgResponse}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.resolutionRatePct}%</TableCell>
                  <TableCell className="text-right tabular-nums">{r.nps.toFixed(1)}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.sentMessages.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <TeamDistributionStackedBar />
    </div>
  );
}

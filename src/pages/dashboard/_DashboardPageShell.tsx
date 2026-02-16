import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DashboardPageShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </header>

      {children ? (
        <main className="space-y-4">{children}</main>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{description}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Tela inicial (stub) — pronta para você conectar ao banco e à API do WhatsApp.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

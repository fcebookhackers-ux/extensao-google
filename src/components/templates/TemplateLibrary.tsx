import * as React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TEMPLATE_CATEGORIES: Record<
  string,
  Array<{ name: string; template: string }>
> = {
  welcome: [
    {
      name: "Boas-vindas simples",
      template: "Olá {{nome}}!\n\nSeja bem-vindo(a) à {{empresa}}!",
    },
    {
      name: "Boas-vindas com CTA",
      template: "Oi {{nome}}!\n\nQue bom ter você aqui!\n\nPara começar, conheça nossos serviços: {{link_catalogo}}",
    },
  ],
  follow_up: [
    {
      name: "Carrinho abandonado",
      template:
        "Oi {{nome}}, notamos que você deixou {{produto}} no carrinho.\n\nAinda tem interesse? Posso ajudar com alguma dúvida?",
    },
  ],
  support: [
    {
      name: "Confirmação de atendimento",
      template:
        "Olá {{nome}}, seu chamado #{{ticket_id}} foi recebido.\n\nEstamos trabalhando nisso e em breve retornaremos!",
    },
  ],
};

function formatCategory(cat: string) {
  if (cat === "welcome") return "Boas-vindas";
  if (cat === "follow_up") return "Follow-up";
  if (cat === "support") return "Suporte";
  return cat;
}

export function TemplateLibrary({ onSelect }: { onSelect: (template: string) => void }) {
  const defaultValue = "welcome";

  return (
    <Tabs defaultValue={defaultValue}>
      <TabsList className="w-full justify-start">
        {Object.keys(TEMPLATE_CATEGORIES).map((category) => (
          <TabsTrigger key={category} value={category}>
            {formatCategory(category)}
          </TabsTrigger>
        ))}
      </TabsList>

      {Object.entries(TEMPLATE_CATEGORIES).map(([category, templates]) => (
        <TabsContent key={category} value={category} className="mt-4">
          <div className="grid gap-3">
            {templates.map((t) => (
              <Card
                key={t.name}
                role="button"
                tabIndex={0}
                className="cursor-pointer transition-colors hover:bg-muted/30"
                onClick={() => onSelect(t.template)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onSelect(t.template);
                }}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{t.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-xs text-muted-foreground">{t.template}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}

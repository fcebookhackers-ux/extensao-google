import * as React from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

import type { TemplateButton } from "../templatesMock";

const ButtonTextSchema = z
  .string()
  .trim()
  .min(1, "Informe o texto")
  .max(25, "Máximo 25 caracteres")
  .regex(/^[^\n\r]+$/, "Sem quebras de linha");

function makeId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function TemplateButtonsEditor({
  type,
  ctaButtons,
  setCtaButtons,
  qrButtons,
  setQrButtons,
}: {
  type: "none" | "cta" | "quick_reply";
  ctaButtons: TemplateButton[];
  setCtaButtons: (next: TemplateButton[]) => void;
  qrButtons: TemplateButton[];
  setQrButtons: (next: TemplateButton[]) => void;
}) {
  if (type === "none") return null;

  if (type === "cta") {
    const items = ctaButtons;
    const add = () => {
      if (items.length >= 2) return;
      setCtaButtons([
        ...items,
        {
          id: makeId("cta"),
          kind: "cta_url",
          text: "",
          urlType: "static",
          url: "",
        },
      ]);
    };

    const update = (id: string, patch: Partial<TemplateButton>) => {
      setCtaButtons(items.map((b) => (b.id === id ? ({ ...b, ...patch } as any) : b)));
    };

    const remove = (id: string) => setCtaButtons(items.filter((b) => b.id !== id));

    return (
      <div className="space-y-3 rounded-md border bg-muted/20 p-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">Call to Action (máx 2)</p>
          <Button type="button" variant="outline" size="sm" onClick={add} disabled={items.length >= 2}>
            + Adicionar
          </Button>
        </div>

        <div className="grid gap-3">
          {items.map((b, idx) => {
            const isUrl = b.kind === "cta_url";
            const isPhone = b.kind === "cta_phone";
            const textError = ButtonTextSchema.safeParse(b.text).success ? null : "Texto do botão inválido";

            return (
              <div key={b.id} className="rounded-md border bg-background p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">Botão {idx + 1}</p>
                  <Button type="button" variant="ghost" size="sm" onClick={() => remove(b.id)}>
                    Remover
                  </Button>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Tipo</label>
                    <Select
                      value={b.kind}
                      onValueChange={(v) => {
                        if (v === "cta_url") {
                          update(b.id, { kind: "cta_url", urlType: "static", url: "" } as any);
                        } else {
                          update(b.id, { kind: "cta_phone", phoneNumber: "" } as any);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cta_url">Visitar URL</SelectItem>
                        <SelectItem value="cta_phone">Ligar Número</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Texto (máx 25)</label>
                    <Input
                      value={b.text}
                      onChange={(e) => update(b.id, { text: e.target.value } as any)}
                      placeholder="ex: Finalizar"
                    />
                    {textError ? <p className="text-xs font-medium text-destructive">{textError}</p> : null}
                  </div>
                </div>

                {isUrl ? (
                  <div className="mt-3 space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">URL</label>
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="md:col-span-1">
                        <Select value={(b as any).urlType} onValueChange={(v) => update(b.id, { urlType: v } as any)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="static">Estático</SelectItem>
                            <SelectItem value="dynamic">Dinâmico ({"{{1}}"})</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="md:col-span-2">
                        <Input
                          value={(b as any).url ?? ""}
                          onChange={(e) => update(b.id, { url: e.target.value } as any)}
                          placeholder="https://exemplo.com"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Se dinâmico, use variáveis no final da URL (ex: https://site.com/{"{{1}}"}).
                    </p>
                  </div>
                ) : null}

                {isPhone ? (
                  <div className="mt-3 space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Número (com DDI)</label>
                    <Input
                      value={(b as any).phoneNumber ?? ""}
                      onChange={(e) => update(b.id, { phoneNumber: e.target.value } as any)}
                      placeholder="+55 11 99999-9999"
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // quick_reply
  {
    const items = qrButtons;
    const add = () => {
      if (items.length >= 3) return;
      setQrButtons([...items, { id: makeId("qr"), kind: "quick_reply", text: "" }]);
    };

    const update = (id: string, text: string) => {
      setQrButtons(items.map((b) => (b.id === id ? { ...b, text } : b)));
    };

    const remove = (id: string) => setQrButtons(items.filter((b) => b.id !== id));

    return (
      <div className="space-y-3 rounded-md border bg-muted/20 p-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">Quick Reply (máx 3)</p>
          <Button type="button" variant="outline" size="sm" onClick={add} disabled={items.length >= 3}>
            + Adicionar
          </Button>
        </div>

        <div className="grid gap-3">
          {items.map((b, idx) => {
            const ok = ButtonTextSchema.safeParse(b.text).success;
            return (
              <div key={b.id} className="rounded-md border bg-background p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Botão {idx + 1}</p>
                  <Button type="button" variant="ghost" size="sm" onClick={() => remove(b.id)}>
                    Remover
                  </Button>
                </div>

                <div className="mt-3 space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Texto (máx 25)</label>
                  <Input value={b.text} onChange={(e) => update(b.id, e.target.value)} placeholder="ex: Confirmar" />
                  {!ok && b.text ? <p className="text-xs font-medium text-destructive">Texto do botão inválido</p> : null}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">quick_reply</Badge>
                    <span>Respostas rápidas sem URL.</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <Separator />
        <div className="text-xs text-muted-foreground">Dica: mantenha textos curtos e objetivos.</div>
      </div>
    );
  }
}

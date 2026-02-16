import { useMemo } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { ConditionOperator, LogicOperator, WebhookCondition } from "@/types/webhook-transformation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface ConditionBuilderProps {
  conditions: WebhookCondition[];
  onChange: (conditions: WebhookCondition[]) => void;
}

const OPERATORS: Array<{ value: ConditionOperator; label: string }> = [
  { value: "equals", label: "Igual a" },
  { value: "not_equals", label: "Diferente de" },
  { value: "greater_than", label: "Maior que" },
  { value: "less_than", label: "Menor que" },
  { value: "greater_or_equal", label: "Maior ou igual a" },
  { value: "less_or_equal", label: "Menor ou igual a" },
  { value: "contains", label: "Contém" },
  { value: "not_contains", label: "Não contém" },
  { value: "starts_with", label: "Começa com" },
  { value: "ends_with", label: "Termina com" },
  { value: "matches_regex", label: "Regex" },
  { value: "is_empty", label: "Está vazio" },
  { value: "is_not_empty", label: "Não está vazio" },
];

const COMMON_FIELDS = [
  { value: "data.amount", label: "Valor (data.amount)" },
  { value: "data.status", label: "Status (data.status)" },
  { value: "data.contact.name", label: "Nome do contato" },
  { value: "data.contact.email", label: "Email do contato" },
  { value: "data.message", label: "Mensagem" },
];

export function ConditionBuilder({ conditions, onChange }: ConditionBuilderProps) {
  const withPositions = useMemo(() => {
    return [...conditions].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }, [conditions]);

  const setAt = (index: number, patch: Partial<WebhookCondition>) => {
    const updated = withPositions.map((c, i) => (i === index ? { ...c, ...patch } : c));
    onChange(updated.map((c, i) => ({ ...c, position: i })));
  };

  const add = () => {
    const next: WebhookCondition = {
      id: crypto.randomUUID(),
      webhookId: conditions[0]?.webhookId ?? "",
      fieldPath: "data.",
      operator: "equals",
      value: "",
      logicOperator: "AND",
      position: withPositions.length,
    };
    onChange([...withPositions, next].map((c, i) => ({ ...c, position: i })));
  };

  const remove = (index: number) => {
    onChange(withPositions.filter((_, i) => i !== index).map((c, i) => ({ ...c, position: i })));
  };

  const move = (index: number, dir: -1 | 1) => {
    const to = index + dir;
    if (to < 0 || to >= withPositions.length) return;
    const copy = [...withPositions];
    const [item] = copy.splice(index, 1);
    copy.splice(to, 0, item);
    onChange(copy.map((c, i) => ({ ...c, position: i })));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">Condições</p>
          <p className="text-sm text-muted-foreground">Só enviar o webhook se as condições forem verdadeiras.</p>
        </div>
        <Button type="button" variant="outline" onClick={add}>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar
        </Button>
      </div>

      {withPositions.length === 0 ? (
        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
          Nenhuma condição configurada. O webhook será enviado para todos os eventos.
        </div>
      ) : (
        <div className="grid gap-3">
          {withPositions.map((c, idx) => (
            <div key={c.id} className="rounded-lg border p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start">
                <div className="flex items-center gap-2 md:pt-6">
                  <Button type="button" variant="ghost" size="icon" onClick={() => move(idx, -1)} disabled={idx === 0}>
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => move(idx, 1)}
                    disabled={idx === withPositions.length - 1}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid flex-1 gap-3 md:grid-cols-3">
                  {idx > 0 ? (
                    <div className="grid gap-2">
                      <p className="text-sm font-medium">Lógica</p>
                      <select
                        value={c.logicOperator}
                        onChange={(e) => setAt(idx, { logicOperator: e.target.value as LogicOperator })}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="AND">E</option>
                        <option value="OR">OU</option>
                      </select>
                    </div>
                  ) : (
                    <div className="hidden md:block" />
                  )}

                  <div className="grid gap-2">
                    <p className="text-sm font-medium">Campo</p>
                    <Input
                      value={c.fieldPath}
                      onChange={(e) => setAt(idx, { fieldPath: e.target.value })}
                      placeholder="data.amount"
                      list={`webhook-fields-${idx}`}
                    />
                    <datalist id={`webhook-fields-${idx}`}>
                      {COMMON_FIELDS.map((f) => (
                        <option key={f.value} value={f.value} />
                      ))}
                    </datalist>
                  </div>

                  <div className="grid gap-2">
                    <p className="text-sm font-medium">Operador</p>
                    <select
                      value={c.operator}
                      onChange={(e) => setAt(idx, { operator: e.target.value as ConditionOperator })}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {OPERATORS.map((op) => (
                        <option key={op.value} value={op.value}>
                          {op.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-2 md:col-span-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Valor</p>
                      <Badge variant="outline" className="text-xs">
                        path: {c.fieldPath}
                      </Badge>
                    </div>
                    <Input
                      value={c.value}
                      onChange={(e) => setAt(idx, { value: e.target.value })}
                      placeholder={c.operator.includes("empty") ? "(desativado)" : "valor"}
                      disabled={c.operator === "is_empty" || c.operator === "is_not_empty"}
                    />
                  </div>
                </div>

                <div className="md:pt-6">
                  <Button type="button" variant="ghost" size="icon" onClick={() => remove(idx)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

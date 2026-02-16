import { useMemo, useState } from "react";
import { Play, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { transformPayloadFromJsonTemplate, type WebhookEnvelope } from "@/lib/webhook-transform";

interface PayloadTransformerProps {
  template: string;
  onChange: (template: string) => void;
  sampleEnvelope?: WebhookEnvelope;
}

const DEFAULT_TEMPLATE = `{
  "event": "{{event_type}}",
  "timestamp": "{{timestamp}}",
  "data": {{data}}
}`;

const EXAMPLES: Array<{ name: string; template: string }> = [
  {
    name: "Formato simples",
    template: `{
  "event": "{{event_type}}",
  "when": "{{timestamp}}",
  "details": {{data}}
}`,
  },
  {
    name: "Discord (embeds)",
    template: `{
  "content": null,
  "embeds": [
    {
      "title": "{{event_type}}",
      "description": "{{data.message}}",
      "timestamp": "{{timestamp}}"
    }
  ]
}`,
  },
  {
    name: "Slack (text)",
    template: `{
  "text": "Evento: {{event_type}} | {{data.message}}"
}`,
  },
];

export function PayloadTransformer({ template, onChange, sampleEnvelope }: PayloadTransformerProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any>(null);

  const envelope = useMemo<WebhookEnvelope>(() => {
    return (
      sampleEnvelope ?? {
        event_type: "test.event",
        timestamp: new Date().toISOString(),
        data: { message: "Test message", amount: 123 },
      }
    );
  }, [sampleEnvelope]);

  const runTest = () => {
    setTestError(null);
    setTestResult(null);
    try {
      const raw = (template?.trim() || DEFAULT_TEMPLATE).trim();
      const out = transformPayloadFromJsonTemplate(raw, envelope);
      setTestResult(out);
      setShowPreview(true);
    } catch (e: any) {
      setTestError(e?.message || "Falha ao executar template");
      setShowPreview(true);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">Transformação (template JSON)</p>
          <p className="text-sm text-muted-foreground">
            Use placeholders como <code>{"{{data.amount}}"}</code>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            defaultValue=""
            onChange={(e) => {
              const ex = EXAMPLES.find((x) => x.name === e.target.value);
              if (ex) onChange(ex.template);
            }}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Exemplos…</option>
            {EXAMPLES.map((ex) => (
              <option key={ex.name} value={ex.name}>
                {ex.name}
              </option>
            ))}
          </select>

          <Button type="button" variant="outline" onClick={runTest}>
            <Play className="mr-2 h-4 w-4" />
            Testar
          </Button>

          <Button type="button" variant="outline" onClick={() => setShowPreview((v) => !v)}>
            {showPreview ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
            {showPreview ? "Ocultar" : "Preview"}
          </Button>
        </div>
      </div>

      <Textarea
        value={template}
        onChange={(e) => onChange(e.target.value)}
        placeholder={DEFAULT_TEMPLATE}
        className="min-h-[180px] font-mono text-sm"
      />

      {showPreview && (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium">Input</p>
              <Badge variant="outline">envelope</Badge>
            </div>
            <pre className="max-h-64 overflow-auto text-xs text-muted-foreground">{JSON.stringify(envelope, null, 2)}</pre>
          </div>
          <div className="rounded-lg border p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium">Output</p>
              <Badge variant="outline">transformado</Badge>
            </div>
            {testError ? (
              <Alert variant="destructive">
                <AlertDescription>{testError}</AlertDescription>
              </Alert>
            ) : (
              <pre className="max-h-64 overflow-auto text-xs text-muted-foreground">{JSON.stringify(testResult, null, 2)}</pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import * as React from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { useDropzone } from "react-dropzone";
import { AlertCircle, Download, Upload, X } from "lucide-react";

import type { ContactRow, ContactTag, ContactOrigin } from "@/pages/dashboard/contactsMock";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  BR_PHONE_REGEX,
  formatBrazilPhone,
  isDuplicatePhone,
  makeInitials,
  normalizePhoneDigits,
  parseTags,
} from "@/components/contacts/contact-utils";
import { useOnboarding } from "@/hooks/useOnboarding";

type Step = 1 | 2 | 3;

type SystemField =
  | "ignore"
  | "name"
  | "phone"
  | "email"
  | "tags"
  | "cpfCnpj"
  | "birthDate"
  | "address"
  | "notes";

type ParsedTable = {
  headers: string[];
  rows: Record<string, string>[];
};

function normalizeHeader(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function guessField(header: string): SystemField {
  const h = normalizeHeader(header);
  if (/(^| )nome( |$)/.test(h) || h.includes("name")) return "name";
  if (h.includes("telefone") || h.includes("celular") || h.includes("whatsapp") || h.includes("phone")) return "phone";
  if (h.includes("e-mail") || h.includes("email")) return "email";
  if (h.includes("tag") || h.includes("categoria")) return "tags";
  if (h.includes("cpf") || h.includes("cnpj")) return "cpfCnpj";
  if (h.includes("nascimento") || h.includes("anivers")) return "birthDate";
  if (h.includes("endereco") || h.includes("logradouro") || h.includes("rua")) return "address";
  if (h.includes("obs") || h.includes("observacao") || h.includes("nota")) return "notes";
  return "ignore";
}

function toCsvDownloadUrl(rows: Array<Record<string, string>>) {
  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  return URL.createObjectURL(blob);
}

function safeParseBirthDate(value: string): string | undefined {
  const v = value.trim();
  if (!v) return undefined;
  // aceita YYYY-MM-DD ou DD/MM/YYYY
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(v);
  if (iso) return v;
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return undefined;
}

export function ImportContactsDialog({
  open,
  onOpenChange,
  existingRows,
  onImport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingRows: ContactRow[];
  onImport: (contacts: ContactRow[]) => void;
}) {
  const { completeStep } = useOnboarding();
  const [step, setStep] = React.useState<Step>(1);
  const [file, setFile] = React.useState<File | null>(null);
  const [parsed, setParsed] = React.useState<ParsedTable | null>(null);
  const [mapping, setMapping] = React.useState<Record<string, SystemField>>({});
  const [ignoreHeader, setIgnoreHeader] = React.useState(true);
  const [skipDuplicates, setSkipDuplicates] = React.useState(true);

  const [validation, setValidation] = React.useState<{
    total: number;
    valid: number;
    invalid: number;
    duplicates: number;
    errors: Array<{ row: number; message: string }>;
    validRows: ContactRow[];
  } | null>(null);

  const [importMode, setImportMode] = React.useState<"validOnly" | "cancel">("validOnly");
  const [addImportTag, setAddImportTag] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [progress, setProgress] = React.useState(0);

  const [errorReportUrl, setErrorReportUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setStep(1);
      setFile(null);
      setParsed(null);
      setMapping({});
      setIgnoreHeader(true);
      setSkipDuplicates(true);
      setValidation(null);
      setImportMode("validOnly");
      setAddImportTag(false);
      setImporting(false);
      setProgress(0);
      if (errorReportUrl) URL.revokeObjectURL(errorReportUrl);
      setErrorReportUrl(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onDrop = React.useCallback((accepted: File[]) => {
    const f = accepted[0];
    if (!f) return;
    setFile(f);
    setParsed(null);
    setValidation(null);
    setMapping({});
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
  });

  const parseFile = async () => {
    if (!file) return;
    const ext = file.name.toLowerCase().endsWith(".xlsx") ? "xlsx" : "csv";

    try {
      if (ext === "csv") {
        const text = await file.text();
        const res = Papa.parse<Record<string, string>>(text, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (h) => h.trim(),
          encoding: "utf-8",
        });

        const headers = (res.meta.fields ?? []).filter(Boolean);
        const rows = (res.data ?? []).map((r) => {
          const out: Record<string, string> = {};
          for (const h of headers) out[h] = String((r as any)?.[h] ?? "");
          return out;
        });

        setParsed({ headers, rows });
        const nextMapping: Record<string, SystemField> = {};
        headers.forEach((h) => (nextMapping[h] = guessField(h)));
        setMapping(nextMapping);
        setStep(2);
        return;
      }

      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });
      const headers = Object.keys(json[0] ?? {});
      const rows = json.map((r) => {
        const out: Record<string, string> = {};
        for (const h of headers) out[h] = String((r as any)?.[h] ?? "");
        return out;
      });
      setParsed({ headers, rows });
      const nextMapping: Record<string, SystemField> = {};
      headers.forEach((h) => (nextMapping[h] = guessField(h)));
      setMapping(nextMapping);
      setStep(2);
    } catch (e: any) {
      toast({ title: "Erro ao ler arquivo", description: e?.message ?? "Tente novamente.", variant: "destructive" });
    }
  };

  const validateData = () => {
    if (!parsed) return;
    const dataRows = parsed.rows;
    const startAt = ignoreHeader ? 0 : 0; // header já tratado pelo parser (MVP)

    const errors: Array<{ row: number; message: string }> = [];
    const validRows: ContactRow[] = [];
    let duplicates = 0;

    const importTag: ContactTag = `Importação ${new Date().toLocaleDateString("pt-BR")}` as ContactTag;
    const localPhoneSet = new Set<string>();

    for (let i = startAt; i < dataRows.length; i++) {
      const raw = dataRows[i];
      const line = i + 2; // visualmente: cabeçalho + 1

      const get = (field: SystemField) => {
        const key = Object.entries(mapping).find(([, v]) => v === field)?.[0];
        return key ? String(raw[key] ?? "") : "";
      };

      const name = get("name").trim();
      const phoneMasked = formatBrazilPhone(get("phone"));
      const email = get("email").trim();
      const tags = parseTags(get("tags"));
      const cpfCnpj = get("cpfCnpj").trim() || undefined;
      const birthDate = safeParseBirthDate(get("birthDate"));
      const address = get("address").trim() || undefined;
      const notes = get("notes").trim() || undefined;

      if (!name || name.length < 3) {
        errors.push({ row: line, message: "Nome inválido" });
        continue;
      }
      if (!BR_PHONE_REGEX.test(phoneMasked)) {
        errors.push({ row: line, message: `Telefone inválido "${get("phone")}"` });
        continue;
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push({ row: line, message: "Email mal formatado" });
        continue;
      }

      const phoneDigits = normalizePhoneDigits(phoneMasked);
      if (localPhoneSet.has(phoneDigits)) {
        duplicates++;
        if (skipDuplicates) continue;
      }
      localPhoneSet.add(phoneDigits);

      if (isDuplicatePhone(existingRows, phoneMasked)) {
        duplicates++;
        if (skipDuplicates) continue;
      }

      const now = new Date();
      validRows.push({
        id: `ct-${now.getTime()}-${i}`,
        name,
        initials: makeInitials(name),
        phone: phoneMasked,
        email,
        tags: addImportTag ? ([...tags, importTag] as ContactTag[]) : (tags as ContactTag[]),
        favorite: false,
        lastMessage: "—",
        lastInteractionText: "Agora",
        lastInteractionBucket: "today",
        origin: "csv" as ContactOrigin,
        cpfCnpj,
        birthDate,
        address,
        notes,
      });
    }

    const total = dataRows.length;
    const invalid = errors.length;
    const valid = validRows.length;
    const summary = { total, valid, invalid, duplicates, errors, validRows };
    setValidation(summary);

    if (errorReportUrl) URL.revokeObjectURL(errorReportUrl);
    if (errors.length > 0) {
      const url = toCsvDownloadUrl(errors.map((e) => ({ linha: String(e.row), erro: e.message })));
      setErrorReportUrl(url);
    } else {
      setErrorReportUrl(null);
    }

    setStep(3);
  };

  const startImport = async () => {
    if (!validation) return;
    if (importMode === "cancel") {
      toast({ title: "Importação cancelada" });
      onOpenChange(false);
      return;
    }
    const toImport = validation.validRows;
    if (toImport.length === 0) {
      toast({ title: "Nada para importar", description: "Nenhuma linha válida encontrada.", variant: "destructive" });
      return;
    }
    setImporting(true);
    setProgress(0);
    const total = toImport.length;
    for (let i = 1; i <= total; i++) {
      // simulação
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => window.setTimeout(r, 12));
      setProgress(Math.round((i / total) * 100));
    }
    onImport(toImport);
    completeStep("contacts_imported", { count: toImport.length });
    toast({
      title: `✅ ${toImport.length} contatos importados com sucesso! ${validation.invalid} com erro.`,
    });
    onOpenChange(false);
  };

  const stepLabel = (n: Step) => {
    const active = step === n;
    const done = step > n;
    return (
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full border text-xs",
            active && "bg-primary text-primary-foreground",
            done && "bg-secondary text-secondary-foreground",
          )}
        >
          {n}
        </div>
        <span className={cn("text-sm", active ? "font-semibold" : "text-muted-foreground")}>Passo {n}</span>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar Contatos via CSV</DialogTitle>
          <DialogDescription>Importe contatos via .csv ou .xlsx.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-4">{stepLabel(1)}{stepLabel(2)}{stepLabel(3)}</div>

        {step === 1 && (
          <div className="mt-4 space-y-4">
            <div className="rounded-lg border bg-background p-4">
              <p className="text-sm">Faça upload do arquivo CSV com seus contatos.</p>
              <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
                <li>Formato: .csv ou .xlsx</li>
                <li>Máximo: 10.000 linhas</li>
                <li>Colunas mínimas: Nome, Telefone</li>
              </ul>
              <a
                href="/contatos-modelo.csv"
                download
                className="mt-3 inline-flex items-center gap-2 text-sm text-primary underline-offset-4 hover:underline"
              >
                <Download className="h-4 w-4" />
                Baixar modelo CSV de exemplo
              </a>
            </div>

            <div
              {...getRootProps()}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-background p-8 text-center",
                isDragActive && "bg-muted/40",
              )}
            >
              <input {...getInputProps()} />
              <Upload className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm font-medium">Arraste o arquivo ou clique para selecionar</p>
              <p className="text-xs text-muted-foreground">Aceita .csv, .xlsx • Máx 5MB</p>
            </div>

            {file && (
              <div className="flex items-center justify-between rounded-lg border bg-background p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{Math.round(file.size / 1024)} KB</p>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => setFile(null)} aria-label="Remover">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="button" onClick={parseFile} disabled={!file}>
                Próximo Passo
              </Button>
            </div>
          </div>
        )}

        {step === 2 && parsed && (
          <div className="mt-4 space-y-4">
            <div className="rounded-lg border bg-background p-4">
              <p className="text-sm font-medium">Mapeie as colunas do seu arquivo para os campos do sistema</p>
              <p className="mt-1 text-sm text-muted-foreground">Preview (primeiras 5 linhas)</p>
              <div className="mt-3 rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {parsed.headers.slice(0, 4).map((h) => (
                        <TableHead key={h}>{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsed.rows.slice(0, 5).map((r, idx) => (
                      <TableRow key={idx}>
                        {parsed.headers.slice(0, 4).map((h) => (
                          <TableCell key={h} className="max-w-[200px] truncate">
                            {String(r[h] ?? "")}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="rounded-lg border bg-background p-4">
              <p className="text-sm font-medium">Mapeamento</p>
              <div className="mt-3 space-y-3">
                {parsed.headers.map((h) => (
                  <div key={h} className="grid gap-2 sm:grid-cols-[1fr_240px] sm:items-center">
                    <div className="min-w-0">
                      <p className="truncate text-sm">{h}</p>
                      <p className="text-xs text-muted-foreground">→ Campo do sistema</p>
                    </div>
                    <Select
                      value={mapping[h] ?? "ignore"}
                      onValueChange={(v) => setMapping((prev) => ({ ...prev, [h]: v as SystemField }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ignore">Ignorar</SelectItem>
                        <SelectItem value="name">Nome *</SelectItem>
                        <SelectItem value="phone">Telefone *</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="tags">Tags</SelectItem>
                        <SelectItem value="cpfCnpj">CPF/CNPJ</SelectItem>
                        <SelectItem value="birthDate">Nascimento</SelectItem>
                        <SelectItem value="address">Endereço</SelectItem>
                        <SelectItem value="notes">Observações</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={ignoreHeader} onCheckedChange={(v) => setIgnoreHeader(Boolean(v))} />
                  Ignorar primeira linha (cabeçalho)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={skipDuplicates} onCheckedChange={(v) => setSkipDuplicates(Boolean(v))} />
                  Pular linhas duplicadas
                </label>
              </div>

              <div className="mt-4 flex justify-between gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  Voltar
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    const hasName = Object.values(mapping).includes("name");
                    const hasPhone = Object.values(mapping).includes("phone");
                    if (!hasName || !hasPhone) {
                      toast({
                        title: "Mapeamento incompleto",
                        description: "Mapeie pelo menos Nome* e Telefone*.",
                        variant: "destructive",
                      });
                      return;
                    }
                    validateData();
                  }}
                >
                  Validar Dados
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && validation && (
          <div className="mt-4 space-y-4">
            <div className="rounded-lg border bg-background p-4">
              <p className="text-sm font-medium">Resumo</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-4">
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-lg font-semibold">{validation.total}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Válidos</p>
                  <p className="text-lg font-semibold">{validation.valid}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Inválidos</p>
                  <p className="text-lg font-semibold">{validation.invalid}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Duplicados</p>
                  <p className="text-lg font-semibold">{validation.duplicates}</p>
                </div>
              </div>

              {validation.errors.length > 0 && (
                <div className="mt-4 rounded-lg border bg-muted/30 p-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">Erros</p>
                    <Badge variant="outline" className="ml-auto">{validation.errors.length}</Badge>
                  </div>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {validation.errors.slice(0, 5).map((e) => (
                      <li key={`${e.row}-${e.message}`}>Linha {e.row}: {e.message}</li>
                    ))}
                  </ul>
                  {errorReportUrl && (
                    <a
                      href={errorReportUrl}
                      download="relatorio-erros.csv"
                      className="mt-3 inline-flex items-center gap-2 text-sm text-primary underline-offset-4 hover:underline"
                    >
                      <Download className="h-4 w-4" />
                      Baixar relatório de erros
                    </a>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-lg border bg-background p-4">
              <p className="text-sm font-medium">Opções</p>
              <RadioGroup value={importMode} onValueChange={(v) => setImportMode(v as any)} className="mt-3 space-y-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="validOnly" id="opt-valid" />
                  <Label htmlFor="opt-valid">Importar apenas válidos (recomendado)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="cancel" id="opt-cancel" />
                  <Label htmlFor="opt-cancel">Cancelar e corrigir arquivo</Label>
                </div>
              </RadioGroup>

              <label className="mt-4 flex items-center gap-2 text-sm">
                <Checkbox checked={addImportTag} onCheckedChange={(v) => setAddImportTag(Boolean(v))} />
                Adicionar tag <span className="font-medium">"Importação {new Date().toLocaleDateString("pt-BR")}"</span> a todos
              </label>

              {importing && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm text-muted-foreground">Importando... {Math.round((progress / 100) * Math.max(1, validation.valid))}/{validation.valid}</p>
                  <Progress value={progress} />
                </div>
              )}

              <div className="mt-4 flex justify-between gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(2)} disabled={importing}>
                  Voltar
                </Button>
                <Button type="button" onClick={startImport} disabled={importing}>
                  Importar {validation.valid} Contatos
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

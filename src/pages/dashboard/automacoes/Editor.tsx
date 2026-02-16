import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Clock,
  CornerDownRight,
  GripVertical,
  HelpCircle,
  MessageSquare,
  MoreHorizontal,
  Play,
  Plus,
  Trash,
  Zap,
  GitBranch,
  Wand2,
  Copy,
  Pause,
  CheckCircle2,
  StopCircle,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import type {
  ActionBlock,
  AutomationEditorDoc,
  AutomationStatus,
  ConditionBlock,
  LoopBlock,
  DelayBlock,
  DelayUnit,
  EndBlock,
  EditorBlock,
  JumpBlock,
  MessageBlock,
  QuestionBlock,
  SwitchBlock,
  VariableBlock,
  TriggerType,
} from "./editorTypes";
import { getAutomationStorageKey, loadAutomationDoc, saveAutomationDoc } from "./editorStorage";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { editorDocToAutomationFlow } from "@/lib/automation-validator-adapters";
import { groupValidationByBlockId, validateAutomationFlow } from "@/lib/automation-validator";
import { FlowValidator } from "@/components/automation/FlowValidator";
import { PublishButton } from "@/components/automation/PublishButton";
import { VersionHistory } from "@/components/automation/VersionHistory";
import { useAutomationVersions } from "@/hooks/useAutomationVersions";
import { GuidedTour } from "@/components/help/GuidedTour";
import { useTour } from "@/hooks/useTour";
import { AUTOMATION_EDITOR_TOUR } from "@/config/tours";
import { useAuth } from "@/providers/AuthProvider";
 import { CommentsPanel, CommentsTrigger } from "@/components/comments/CommentsPanel";

const VARIABLES = ["{{nome}}", "{{telefone}}", "{{email}}", "{{empresa}}", "{{tag}}", "{{data_atual}}", "{{hora_atual}}", "{{resposta_1}}"];
const EMOJIS = ["😀", "😉", "😍", "🙏", "🔥", "✅", "🎉", "📌", "💬", "⚡️"];

const DEFAULT_TAGS = ["VIP", "Cliente", "Lead Quente", "Lead", "Pós-venda"];
const TEAM_MEMBERS = [
  { id: "maria", name: "Maria" },
  { id: "joao", name: "João" },
  { id: "suporte", name: "Suporte" },
];

function uid(prefix = "b") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function defaultDoc(id: string): AutomationEditorDoc {
  return {
    id,
    name: `ZapFllow ${id}`,
    status: "draft",
    updatedAt: new Date().toISOString(),
    trigger: {
      type: "message_received",
      timezone: "América/São Paulo",
      scheduledDays: ["seg", "ter", "qua", "qui", "sex"],
      scheduledTime: "09:00",
      keywordIgnoreCase: true,
      keywordVariations: true,
    },
    blocks: [
      {
        id: uid("m"),
        type: "message",
        title: "Enviar Mensagem",
        kind: "text",
        text: "Olá {{nome}}! Como posso ajudar?",
        waitForReply: false,
        listItems: [],
        buttons: [],
        collapsed: true,
      } satisfies MessageBlock,
    ],
  };
}

function normalizeLegacyConditionBlock(block: ConditionBlock): ConditionBlock {
  // Compat: docs antigos tinham apenas (field/operator/value) e branches sem metadata.
  const hasKind = block.branches?.every((b: any) => typeof b?.kind === "string");
  if (hasKind) return block;

  const nextBranches = (block.branches ?? []).map((b, idx) => {
    const kind = idx === 0 ? "if" : idx === 1 ? "else" : "elseif";
    const when = kind === "else" ? undefined : { field: block.field, operator: block.operator, value: block.value };
    return { ...b, kind, when } as any;
  });

  // garante ao menos IF + ELSE
  if (nextBranches.length === 0) {
    nextBranches.push({ id: uid("br"), label: "SE", kind: "if", when: { field: block.field, operator: block.operator, value: block.value }, blocks: [] });
    nextBranches.push({ id: uid("br"), label: "SENÃO", kind: "else", blocks: [] });
  }
  if (!nextBranches.some((b: any) => b.kind === "else")) nextBranches.push({ id: uid("br"), label: "SENÃO", kind: "else", blocks: [] });

  return { ...block, branches: nextBranches as any };
}

function normalizeDoc(doc: AutomationEditorDoc): AutomationEditorDoc {
  return {
    ...doc,
    blocks: (doc.blocks ?? []).map((b) => {
      if (b.type === "condition") return normalizeLegacyConditionBlock(b as any);
      return b;
    }),
  };
}

function statusBadge(status: AutomationStatus) {
  if (status === "active") return { label: "Ativo", icon: <CheckCircle2 className="h-3.5 w-3.5" /> };
  if (status === "paused") return { label: "Pausado", icon: <Pause className="h-3.5 w-3.5" /> };
  return { label: "Rascunho", icon: <Wand2 className="h-3.5 w-3.5" /> };
}

export default function AutomationEditor() {
  const { id = "1" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { completeStep } = useOnboarding();
  const [doc, setDoc] = React.useState<AutomationEditorDoc>(() => normalizeDoc(loadAutomationDoc(id) ?? defaultDoc(id)));
  const [nameEditing, setNameEditing] = React.useState(false);
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<"blocks" | "settings" | "test" | "history">("blocks");
  const [saving, setSaving] = React.useState(false);
  const [changeSummary, setChangeSummary] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(() => new Set());
  const dragIdRef = React.useRef<string | null>(null);

  const versions = useAutomationVersions(id);
  const { run: tourRun, startTour, isCompleted: isTourCompleted } = useTour("automation-editor");

  React.useEffect(() => {
    if (!user) return;
    if (isTourCompleted) return;
    const createdAt = (user as any).created_at as string | undefined;
    if (!createdAt) return;
    const accountAge = Date.now() - new Date(createdAt).getTime();
    const isNewUser = accountAge < 24 * 60 * 60 * 1000;
    if (!isNewUser) return;
    const t = window.setTimeout(() => startTour(), 800);
    return () => window.clearTimeout(t);
  }, [user, isTourCompleted, startTour]);

  React.useEffect(() => {
    // sempre que trocar de id
    setDoc(normalizeDoc(loadAutomationDoc(id) ?? defaultDoc(id)));
    setSelectedIds(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const persist = React.useCallback(
    (next: AutomationEditorDoc) => {
      const withTs = { ...next, updatedAt: new Date().toISOString() };
      setDoc(withTs);
      saveAutomationDoc(withTs);
    },
    [setDoc],
  );

  const badge = statusBadge(doc.status);
  const tagOptions = doc.tagsLibrary ?? DEFAULT_TAGS;

  async function onSave() {
    setSaving(true);
    try {
      // Mantém o save local (MVP) + cria versão no backend
      await versions.createVersionAsync({ doc, changeSummary: changeSummary.trim() || undefined });
      toast({ title: "✅ ZapFllow salvo", description: "Salvo localmente e versionado no histórico." });
      setChangeSummary("");
    } catch {
      // toast do hook já cobre a falha; mantemos feedback mínimo aqui
      toast({ title: "Erro ao salvar", description: "Não foi possível criar uma versão agora.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  function onPublish() {
    persist({ ...doc, status: "active" });
    completeStep("automation_activated", { id: doc.id });
    toast({ title: "✅ Publicada", description: "ZapFllow ativado com sucesso." });
  }

  function onTest() {
    setActiveTab("test");
    toast({ title: "▶️ Teste iniciado", description: "Simulação do fluxo (MVP)." });
  }

  function toggleCollapse(blockId: string) {
    persist({
      ...doc,
      blocks: doc.blocks.map((b) => (b.id === blockId ? ({ ...b, collapsed: !b.collapsed } as EditorBlock) : b)),
    });
  }

  function updateBlock(blockId: string, patch: Partial<EditorBlock>) {
    persist({
      ...doc,
      blocks: doc.blocks.map((b) => (b.id === blockId ? ({ ...b, ...patch } as EditorBlock) : b)),
    });
  }

  function duplicateBlock(blockId: string) {
    const idx = doc.blocks.findIndex((b) => b.id === blockId);
    if (idx < 0) return;
    const original = doc.blocks[idx];
    const clone = { ...original, id: uid(original.type[0]), title: original.title } as EditorBlock;
    persist({ ...doc, blocks: [...doc.blocks.slice(0, idx + 1), clone, ...doc.blocks.slice(idx + 1)] });
    toast({ title: "📄 Bloco duplicado" });
  }

  function removeBlock(blockId: string) {
    persist({ ...doc, blocks: doc.blocks.filter((b) => b.id !== blockId) });
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(blockId);
      return next;
    });
    toast({ title: "Bloco excluído" });
  }

  function defaultWebhook() {
    return { url: "", method: "POST" as const, headers: [{ id: uid("h"), key: "", value: "" }], bodyJson: "{}" };
  }

  function createBlock(type: EditorBlock["type"] | "goto"): EditorBlock {
    if (type === "message") {
      return {
        id: uid("m"),
        type: "message",
        title: "Enviar Mensagem",
        kind: "text",
        text: "",
        waitForReply: false,
        listItems: [],
        buttons: [],
        collapsed: false,
      } satisfies MessageBlock;
    }

    if (type === "question") {
      return {
        id: uid("q"),
        type: "question",
        title: "Fazer Pergunta",
        prompt: "",
        responseType: "free_text",
        saveToVariable: "{{resposta_1}}",
        repeatOnInvalid: false,
        errorMessage: "Resposta inválida. Tente novamente.",
        collapsed: false,
      } satisfies QuestionBlock;
    }

    if (type === "condition") {
      return {
        id: uid("c"),
        type: "condition",
        title: "Condição",
        field: "{{resposta_1}}",
        operator: "contains",
        value: "sim",
        branches: [
          {
            id: uid("br"),
            label: "SE",
            kind: "if",
            when: { field: "{{resposta_1}}", operator: "contains", value: "sim" },
            blocks: [],
          },
          { id: uid("br"), label: "SENÃO", kind: "else", blocks: [] },
        ],
        collapsed: false,
      } satisfies ConditionBlock;
    }

    if (type === "switch") {
      return {
        id: uid("s"),
        type: "switch",
        title: "Switch",
        expression: "{{resposta_1}}",
        cases: [
          { id: uid("sc"), label: "CASO 1", equals: "A", blocks: [] },
          { id: uid("sc"), label: "CASO 2", equals: "B", blocks: [] },
        ],
        defaultBlocks: [],
        collapsed: false,
      } satisfies SwitchBlock;
    }

    if (type === "loop") {
      return {
        id: uid("l"),
        type: "loop",
        title: "For Each",
        source: { kind: "variable", variable: "{{itens}}" },
        itemVar: "{{item}}",
        maxIterations: 50,
        blocks: [],
        collapsed: false,
      } satisfies LoopBlock;
    }

    if (type === "variable") {
      return {
        id: uid("v"),
        type: "variable",
        title: "Definir Variável",
        name: "{{var}}",
        value: "",
        collapsed: false,
      } satisfies VariableBlock;
    }

    if (type === "delay") {
      return {
        id: uid("d"),
        type: "delay",
        title: "Aguardar",
        amount: 5,
        unit: "minutes",
        collapsed: false,
      } satisfies DelayBlock;
    }

    // action / goto
    const actionType = type === "goto" ? "goto" : "add_tag";
    return {
      id: uid("a"),
      type: "action",
      title: type === "goto" ? "Ir Para…" : "Executar Ação",
      actionType,
      tags: [],
      notify: { memberId: TEAM_MEMBERS[0]?.id ?? "", message: "" },
      webhook: defaultWebhook(),
      gotoStepId: "",
      collapsed: false,
    } satisfies ActionBlock;
  }

  function insertBlockAt(index: number, type: EditorBlock["type"] | "goto") {
    const block = createBlock(type);
    persist({ ...doc, blocks: [...doc.blocks.slice(0, index), block, ...doc.blocks.slice(index)] });
  }

  function addBlock(type: EditorBlock["type"] | "goto") {
    insertBlockAt(doc.blocks.length, type);
  }

  function addTagToLibrary(tag: string) {
    const clean = tag.trim();
    if (!clean) return;
    if (tagOptions.some((t) => t.toLowerCase() === clean.toLowerCase())) return;
    persist({ ...doc, tagsLibrary: [...tagOptions, clean] });
  }

  function onDragStart(blockId: string) {
    dragIdRef.current = blockId;
  }

  function onDrop(targetId: string) {
    const from = dragIdRef.current;
    dragIdRef.current = null;
    if (!from || from === targetId) return;
    const fromIdx = doc.blocks.findIndex((b) => b.id === from);
    const toIdx = doc.blocks.findIndex((b) => b.id === targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    const moving = doc.blocks[fromIdx];
    const next = [...doc.blocks];
    next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moving);
    persist({ ...doc, blocks: next });
  }

  function setSelection(blockId: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(blockId);
      else next.delete(blockId);
      return next;
    });
  }

  function moveBlock(blockId: string, dir: "up" | "down") {
    const idx = doc.blocks.findIndex((b) => b.id === blockId);
    if (idx < 0) return;
    const target = dir === "up" ? idx - 1 : idx + 1;
    if (target < 0 || target >= doc.blocks.length) return;
    const next = [...doc.blocks];
    const [it] = next.splice(idx, 1);
    next.splice(target, 0, it);
    persist({ ...doc, blocks: next });
  }

  const hasSelection = selectedIds.size > 0;

  const flow = React.useMemo(() => editorDocToAutomationFlow(doc), [doc]);
  const debouncedFlow = useDebouncedValue(flow, 250);
  const validation = React.useMemo(() => validateAutomationFlow(debouncedFlow), [debouncedFlow]);
  const grouped = React.useMemo(() => groupValidationByBlockId(validation), [validation]);

  const scrollToBlock = React.useCallback((blockId: string) => {
    const el = document.getElementById(`block-${blockId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  return (
    <div className="space-y-4" data-tour="automation-editor">
      <GuidedTour tourId="automation-editor" steps={AUTOMATION_EDITOR_TOUR} run={tourRun} />
      {/* Editor topbar (fica abaixo do Topbar global) */}
      <div className="sticky top-14 z-10 border-b bg-background/80 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2 px-3 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-sm text-muted-foreground">ZapFllow</span>
            <span className="text-sm text-muted-foreground">›</span>
            <span className="text-sm text-muted-foreground">Editor</span>
            <span className="text-sm text-muted-foreground">›</span>
            {nameEditing ? (
              <Input
                autoFocus
                value={doc.name}
                onChange={(e) => persist({ ...doc, name: e.target.value })}
                onBlur={() => setNameEditing(false)}
                className="h-8 w-[240px]"
              />
            ) : (
              <button
                type="button"
                onDoubleClick={() => setNameEditing(true)}
                className="max-w-[320px] truncate text-sm font-semibold"
                title="Dê double-click para editar"
              >
                {doc.name}
              </button>
            )}
            <Badge className="inline-flex items-center gap-1" variant="secondary">
              {badge.icon}
              {badge.label}
            </Badge>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" onClick={onSave} disabled={saving}>
              {saving ? "Salvando…" : "Salvar"}
            </Button>
            <Button variant="outline" onClick={onTest}>
              <Play className="h-4 w-4" />
              Testar Fluxo
            </Button>
            <PublishButton
              flow={debouncedFlow}
              onPublish={onPublish}
              isLoading={saving}
              className="bg-brand-primary-light text-primary-foreground hover:bg-brand-primary-light/90"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Mais ações">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-50">
                <DropdownMenuItem onClick={() => toast({ title: "Duplicado (MVP)" })}>Duplicar</DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    navigator.clipboard?.writeText(JSON.stringify(doc, null, 2));
                    toast({ title: "JSON copiado" });
                  }}
                >
                  Exportar JSON
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => {
                    localStorage.removeItem(getAutomationStorageKey(doc.id));
                    toast({ title: "ZapFllow excluído (local)" });
                    navigate("/dashboard/automacoes");
                  }}
                >
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {hasSelection ? (
          <div className="border-t bg-muted/30 px-3 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">{selectedIds.size} bloco(s) selecionado(s)</span>
              <div className="ml-auto flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => toast({ title: "Exportar seleção (MVP)" })}>
                  Exportar
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    persist({ ...doc, blocks: doc.blocks.filter((b) => !selectedIds.has(b.id)) });
                    setSelectedIds(new Set());
                    toast({ title: "Seleção removida" });
                  }}
                >
                  Excluir
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
                  Cancelar seleção
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* 70/30 */}
      <div className="grid gap-4 lg:grid-cols-[7fr_3fr]">
        {/* Canvas */}
        <div className="min-h-[calc(100vh-220px)] overflow-hidden rounded-lg border bg-muted/30" data-tour="automation-canvas">
          <div
            className={cn(
              "relative h-[calc(100vh-220px)] overflow-y-auto p-6",
              "[background-image:linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)]",
              "[background-size:32px_32px] [background-position:0_0]",
            )}
          >
            <div className="mx-auto max-w-3xl space-y-4">
              <TriggerBlock doc={doc} onChange={(trigger) => persist({ ...doc, trigger })} />

              <InsertBetweenButton onInsert={(t) => insertBlockAt(0, t)} />

              {doc.blocks.map((b, idx) => (
                <React.Fragment key={b.id}>
                  <StepConnector step={idx + 1} />
                  <EditorBlockCard
                    block={b}
                    checked={selectedIds.has(b.id)}
                    onCheckedChange={(v) => setSelection(b.id, v)}
                    onToggleCollapse={() => toggleCollapse(b.id)}
                    onUpdate={(patch) => updateBlock(b.id, patch)}
                    onDuplicate={() => duplicateBlock(b.id)}
                    onDelete={() => removeBlock(b.id)}
                    onMoveUp={() => moveBlock(b.id, "up")}
                    onMoveDown={() => moveBlock(b.id, "down")}
                    onDragStart={() => onDragStart(b.id)}
                    onDrop={() => onDrop(b.id)}
                    draggable={idx > 0}
                    tagOptions={tagOptions}
                    onCreateTag={addTagToLibrary}
                    allBlocks={doc.blocks}
                    validationStatus={
                      grouped.errorIds.includes(b.id) ? "error" : grouped.warningIds.includes(b.id) ? "warning" : null
                    }
                  />
                  <InsertBetweenButton onInsert={(t) => insertBlockAt(idx + 1, t)} />
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <Collapsible open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <div className="rounded-lg border bg-card">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <p className="text-sm font-semibold">Configurações</p>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm">
                  {sidebarOpen ? "Recolher" : "Expandir"}
                  <ChevronDown className={cn("h-4 w-4 transition-transform", sidebarOpen ? "rotate-180" : "rotate-0")} />
                </Button>
              </CollapsibleTrigger>
            </div>

            <CollapsibleContent>
              <div className="p-4">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                    <div data-tour="flow-validator">
                      <FlowValidator
                        flow={debouncedFlow}
                        validation={validation}
                        onBlockClick={scrollToBlock}
                        className="mb-4"
                      />
                    </div>
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="blocks">Blocos</TabsTrigger>
                    <TabsTrigger value="settings">Configurações</TabsTrigger>
                    <TabsTrigger value="test">Teste</TabsTrigger>
                    <TabsTrigger value="history">Histórico</TabsTrigger>
                  </TabsList>

                  <TabsContent value="blocks" className="mt-4 space-y-3" data-tour="blocks-library">
                    <SidebarAddButton icon={<MessageSquare className="h-4 w-4" />} label="Mensagem" onClick={() => addBlock("message")} />
                    <SidebarAddButton icon={<HelpCircle className="h-4 w-4" />} label="Pergunta" onClick={() => addBlock("question")} />
                    <SidebarAddButton icon={<GitBranch className="h-4 w-4" />} label="Condição" onClick={() => addBlock("condition")} />
                    <SidebarAddButton icon={<GitBranch className="h-4 w-4" />} label="Switch" onClick={() => addBlock("switch")} />
                    <SidebarAddButton icon={<CornerDownRight className="h-4 w-4" />} label="Loop" onClick={() => addBlock("loop")} />
                    <SidebarAddButton icon={<Zap className="h-4 w-4" />} label="Variável" onClick={() => addBlock("variable")} />
                    <SidebarAddButton icon={<Zap className="h-4 w-4" />} label="Ação" onClick={() => addBlock("action")} />
                  </TabsContent>

                  <TabsContent value="settings" className="mt-4 space-y-4">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={doc.status} onValueChange={(v) => persist({ ...doc, status: v as AutomationStatus })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Rascunho</SelectItem>
                          <SelectItem value="active">Ativo</SelectItem>
                          <SelectItem value="paused">Pausado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Última atualização</Label>
                      <p className="text-sm text-muted-foreground">{new Date(doc.updatedAt).toLocaleString()}</p>
                    </div>
                  </TabsContent>

                  <TabsContent value="test" className="mt-4 space-y-3">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Simulador (MVP)</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm text-muted-foreground">
                        <p>Disparador: {triggerLabel(doc.trigger.type)}</p>
                        <p>Blocos: {doc.blocks.length}</p>
                        <Button
                          variant="outline"
                          onClick={() => toast({ title: "Simulação", description: "Executando do topo para baixo (MVP)." })}
                        >
                          <Play className="h-4 w-4" /> Executar teste
                        </Button>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="history" className="mt-4 space-y-3">
                    <div className="space-y-2">
                      <Label>Descrição da mudança (opcional)</Label>
                      <Input
                        value={changeSummary}
                        onChange={(e) => setChangeSummary(e.target.value)}
                        placeholder="Ex: Ajustei a mensagem inicial e adicionei condição"
                      />
                      <Button variant="outline" className="w-full" onClick={onSave} disabled={saving}>
                        {saving ? "Salvando…" : "Salvar versão"}
                      </Button>
                    </div>

                    <VersionHistory automationId={id} />
                  </TabsContent>
                </Tabs>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      </div>
    </div>
  );
}

function SidebarAddButton({
  icon,
  label,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  description?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-start justify-between rounded-md border bg-background px-3 py-2 text-left transition-colors hover:bg-muted/40",
        description ? "" : "items-center",
      )}
    >
      <span className={cn("grid", description ? "gap-1" : "")}
      >
        <span className="inline-flex items-center gap-2 text-sm font-medium">
          {icon}
          {label}
        </span>
        {description ? <span className="text-xs text-muted-foreground">{description}</span> : null}
      </span>
      <Plus className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}

function StepConnector({ step }: { step: number }) {
  return (
    <div className="relative flex justify-center py-2">
      <div className="relative flex w-full max-w-3xl items-center justify-center">
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-[hsl(var(--brand-primary-light))]" aria-hidden />
        <div className="relative z-10 grid h-7 w-7 place-items-center rounded-full border bg-background text-xs font-semibold">
          {step}
        </div>
        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1" aria-hidden>
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[hsl(var(--brand-primary-light))]" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[hsl(var(--brand-primary-light))] [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[hsl(var(--brand-primary-light))] [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

function InsertBetweenButton({ onInsert }: { onInsert: (type: EditorBlock["type"] | "goto") => void }) {
  const items = [
    { key: "message" as const, label: "Mensagem", icon: MessageSquare, desc: "Enviar mensagem" },
    { key: "question" as const, label: "Pergunta", icon: HelpCircle, desc: "Coletar resposta" },
    { key: "condition" as const, label: "Condição", icon: GitBranch, desc: "Regra" },
    { key: "switch" as const, label: "Switch", icon: GitBranch, desc: "Cases" },
    { key: "loop" as const, label: "Loop", icon: CornerDownRight, desc: "For each" },
    { key: "variable" as const, label: "Variável", icon: Zap, desc: "SET" },
    { key: "delay" as const, label: "Atraso", icon: Clock, desc: "Aguardar" },
    { key: "action" as const, label: "Ação", icon: Zap, desc: "Executar ação" },
    { key: "goto" as const, label: "Ir Para…", icon: ArrowDown, desc: "Pular etapa" },
  ];

  return (
    <div className="flex justify-center">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Inserir bloco">
            <Plus className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[360px]">
          <div className="space-y-2">
            <p className="text-sm font-semibold">Adicionar bloco</p>
            <div className="grid grid-cols-2 gap-2">
              {items.map((it) => (
                <button
                  key={it.key}
                  type="button"
                  className="rounded-md border bg-background p-3 text-left transition-colors hover:bg-muted/40"
                  onClick={() => onInsert(it.key)}
                >
                  <div className="flex items-center gap-2">
                    <it.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{it.label}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{it.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function triggerLabel(t: TriggerType) {
  switch (t) {
    case "message_received":
      return "Mensagem Recebida";
    case "keyword":
      return "Palavra-chave Específica";
    case "scheduled_time":
      return "Horário Agendado";
    case "tag_added":
      return "Tag Adicionada";
    case "new_contact":
      return "Novo Contato";
    case "integration_event":
      return "Evento de Integração";
  }
}

function TriggerBlock({
  doc,
  onChange,
}: {
  doc: AutomationEditorDoc;
  onChange: (trigger: AutomationEditorDoc["trigger"]) => void;
}) {
  const t = doc.trigger;
  const days = [
    { id: "seg", label: "Seg" },
    { id: "ter", label: "Ter" },
    { id: "qua", label: "Qua" },
    { id: "qui", label: "Qui" },
    { id: "sex", label: "Sex" },
    { id: "sab", label: "Sáb" },
    { id: "dom", label: "Dom" },
  ] as const;

  return (
    <Card className="border-secondary/40 bg-secondary/10">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-secondary" />
          <CardTitle className="text-base">Disparador</CardTitle>
          <Badge variant="secondary" className="ml-auto">
            Único
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select
            value={t.type}
            onValueChange={(v) =>
              onChange({
                ...t,
                type: v as TriggerType,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Escolha" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="message_received">Mensagem Recebida</SelectItem>
              <SelectItem value="keyword">Palavra-chave Específica</SelectItem>
              <SelectItem value="scheduled_time">Horário Agendado</SelectItem>
              <SelectItem value="tag_added">Tag Adicionada</SelectItem>
              <SelectItem value="new_contact">Novo Contato</SelectItem>
              <SelectItem value="integration_event">Evento de Integração</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {t.type === "keyword" ? (
          <div className="grid gap-3">
            <div className="space-y-2">
              <Label>Palavra-chave</Label>
              <Input value={t.keyword ?? ""} onChange={(e) => onChange({ ...t, keyword: e.target.value })} placeholder="Ex: oi, menu, ajuda" />
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={!!t.keywordIgnoreCase}
                  onCheckedChange={(v) => onChange({ ...t, keywordIgnoreCase: Boolean(v) })}
                />
                Ignorar maiúsculas/minúsculas
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={!!t.keywordVariations}
                  onCheckedChange={(v) => onChange({ ...t, keywordVariations: Boolean(v) })}
                />
                Aceitar variações
              </label>
            </div>
          </div>
        ) : null}

        {t.type === "scheduled_time" ? (
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Hora</Label>
                <Input type="time" value={t.scheduledTime ?? "09:00"} onChange={(e) => onChange({ ...t, scheduledTime: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Input value={t.timezone ?? "América/São Paulo"} onChange={(e) => onChange({ ...t, timezone: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Dias</Label>
              <div className="flex flex-wrap gap-2">
                {days.map((d) => {
                  const checked = (t.scheduledDays ?? []).includes(d.id);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs transition-colors",
                        checked ? "bg-secondary text-secondary-foreground" : "bg-background hover:bg-muted/40",
                      )}
                      onClick={() => {
                        const cur = new Set(t.scheduledDays ?? []);
                        if (cur.has(d.id)) cur.delete(d.id);
                        else cur.add(d.id);
                        onChange({ ...t, scheduledDays: Array.from(cur) as any });
                      }}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function EditorBlockCard({
  block,
  checked,
  onCheckedChange,
  onToggleCollapse,
  onUpdate,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDrop,
  draggable,
  tagOptions,
  onCreateTag,
  allBlocks,
  validationStatus,
}: {
  block: EditorBlock;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  onToggleCollapse: () => void;
  onUpdate: (patch: Partial<EditorBlock>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDragStart: () => void;
  onDrop: () => void;
  draggable: boolean;
  tagOptions: string[];
  onCreateTag: (tag: string) => void;
  allBlocks: EditorBlock[];
  validationStatus: "error" | "warning" | null;
}) {
  const icon =
    block.type === "message" ? (
      <MessageSquare className="h-5 w-5 text-muted-foreground" />
    ) : block.type === "question" ? (
      <HelpCircle className="h-5 w-5 text-muted-foreground" />
    ) : block.type === "condition" ? (
      <GitBranch className="h-5 w-5 text-muted-foreground" />
    ) : block.type === "switch" ? (
      <GitBranch className="h-5 w-5 text-muted-foreground" />
    ) : block.type === "loop" ? (
      <CornerDownRight className="h-5 w-5 text-muted-foreground" />
    ) : block.type === "variable" ? (
      <Zap className="h-5 w-5 text-muted-foreground" />
    ) : block.type === "delay" ? (
      <Clock className="h-5 w-5 text-muted-foreground" />
    ) : block.type === "jump" ? (
      <CornerDownRight className="h-5 w-5 text-muted-foreground" />
    ) : block.type === "end" ? (
      <StopCircle className="h-5 w-5 text-muted-foreground" />
    ) : (
      <Zap className="h-5 w-5 text-muted-foreground" />
    );

  const surface =
    block.type === "condition"
      ? "bg-muted/40"
      : block.type === "switch"
        ? "bg-muted/40"
        : block.type === "loop"
          ? "bg-[hsl(var(--automation-jump-surface))]"
          : block.type === "variable"
            ? "bg-[hsl(var(--automation-action-surface))]"
      : block.type === "delay"
        ? "bg-[hsl(var(--automation-delay-surface))]"
        : block.type === "jump"
          ? "bg-[hsl(var(--automation-jump-surface))]"
          : block.type === "end"
            ? "bg-[hsl(var(--automation-end-surface))]"
        : block.type === "action"
          ? "bg-[hsl(var(--automation-action-surface))]"
          : "bg-card";

  return (
    <Card
      id={`block-${block.id}`}
      className={cn("shadow-sm", surface)}
      draggable={draggable}
      onDragStart={() => onDragStart()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => onDrop()}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Checkbox checked={checked} onCheckedChange={(v) => onCheckedChange(Boolean(v))} aria-label="Selecionar bloco" />
          {icon}
          <button type="button" className="min-w-0 flex-1 text-left" onClick={onToggleCollapse}>
            <p className="truncate text-sm font-semibold">{block.title}</p>
          </button>

          {validationStatus ? (
            <Badge
              variant={validationStatus === "error" ? "destructive" : "secondary"}
              className="gap-1"
              title={validationStatus === "error" ? "Este bloco tem erros" : "Este bloco tem avisos"}
            >
              {validationStatus === "error" ? <XCircle className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
              {validationStatus === "error" ? "Erro" : "Aviso"}
            </Badge>
          ) : null}

          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={onMoveUp} aria-label="Mover para cima">
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={onMoveDown} aria-label="Mover para baixo">
              <ArrowDown className="h-4 w-4" />
            </Button>
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-md border bg-background" aria-hidden>
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Ações do bloco">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-50">
                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onToggleCollapse}>{block.collapsed ? "Expandir" : "Recolher"}</DropdownMenuItem>
                <DropdownMenuItem onClick={onDuplicate}>
                  <Copy className="h-4 w-4" /> Duplicar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                  <Trash className="h-4 w-4" /> Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      {!block.collapsed ? (
        <CardContent className="space-y-4">
          {block.type === "message" ? (
            <MessageBlockEditor block={block} onUpdate={(patch) => onUpdate(patch as any)} />
          ) : block.type === "question" ? (
            <QuestionBlockEditor block={block} onUpdate={(patch) => onUpdate(patch as any)} />
          ) : block.type === "condition" ? (
            <ConditionBlockEditor block={block} onUpdate={(patch) => onUpdate(patch as any)} />
          ) : block.type === "switch" ? (
            <SwitchBlockEditor block={block} onUpdate={(patch) => onUpdate(patch as any)} />
          ) : block.type === "loop" ? (
            <LoopBlockEditor block={block} onUpdate={(patch) => onUpdate(patch as any)} />
          ) : block.type === "variable" ? (
            <VariableBlockEditor block={block} onUpdate={(patch) => onUpdate(patch as any)} />
          ) : block.type === "delay" ? (
            <DelayBlockEditor block={block} onUpdate={(patch) => onUpdate(patch as any)} />
          ) : block.type === "jump" ? (
            <JumpBlockEditor block={block} allBlocks={allBlocks} onUpdate={(patch) => onUpdate(patch as any)} />
          ) : block.type === "end" ? (
            <EndBlockEditor block={block} onUpdate={(patch) => onUpdate(patch as any)} />
          ) : (
            <ActionBlockEditor
              block={block as ActionBlock}
              tagOptions={tagOptions}
              onCreateTag={onCreateTag}
              members={TEAM_MEMBERS}
              onUpdate={(patch) => onUpdate(patch as any)}
            />
          )}
        </CardContent>
      ) : null}
    </Card>
  );
}

function JumpBlockEditor({
  block,
  allBlocks,
  onUpdate,
}: {
  block: JumpBlock;
  allBlocks: EditorBlock[];
  onUpdate: (patch: Partial<JumpBlock>) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Pula para outro bloco do fluxo (loops/atalhos).</p>
      <div className="space-y-2">
        <Label>Destino</Label>
        <Select value={block.toBlockId} onValueChange={(v) => onUpdate({ toBlockId: v })}>
          <SelectTrigger>
            <SelectValue placeholder="Escolha o bloco" />
          </SelectTrigger>
          <SelectContent>
            {allBlocks.map((b, idx) => (
              <SelectItem key={b.id} value={b.id}>
                {idx + 1}. {b.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function EndBlockEditor({ block, onUpdate }: { block: EndBlock; onUpdate: (patch: Partial<EndBlock>) => void }) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>Mensagem de despedida (opcional)</Label>
        <Textarea
          value={block.farewellMessage ?? ""}
          onChange={(e) => onUpdate({ farewellMessage: e.target.value })}
          placeholder="Ex: Obrigado! Se precisar, é só chamar."
        />
      </div>

      <div className="grid gap-2">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={block.handoffToHuman} onCheckedChange={(v) => onUpdate({ handoffToHuman: Boolean(v) })} />
          Transferir para atendimento humano
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={block.markResolved} onCheckedChange={(v) => onUpdate({ markResolved: Boolean(v) })} />
          Marcar conversa como resolvida
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={block.sendSatisfactionSurvey} onCheckedChange={(v) => onUpdate({ sendSatisfactionSurvey: Boolean(v) })} />
          Enviar pesquisa de satisfação
        </label>
      </div>
    </div>
  );
}

function DelayBlockEditor({ block, onUpdate }: { block: DelayBlock; onUpdate: (patch: Partial<DelayBlock>) => void }) {
  const unitLabels: Record<DelayUnit, string> = {
    seconds: "segundos",
    minutes: "minutos",
    hours: "horas",
    days: "dias",
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
        <div className="space-y-2">
          <Label>Tempo</Label>
          <Input
            type="number"
            value={block.amount}
            onChange={(e) => onUpdate({ amount: Math.max(0, Number(e.target.value)) })}
            min={0}
          />
        </div>
        <div className="space-y-2">
          <Label>Unidade</Label>
          <Select value={block.unit} onValueChange={(v) => onUpdate({ unit: v as DelayUnit })}>
            <SelectTrigger>
              <SelectValue placeholder="Unidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="seconds">Segundos</SelectItem>
              <SelectItem value="minutes">Minutos</SelectItem>
              <SelectItem value="hours">Horas</SelectItem>
              <SelectItem value="days">Dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="rounded-md border bg-background p-3 text-sm">
        <p className="text-muted-foreground">Exemplo:</p>
        <p className="mt-1 font-medium">
          Aguardar {block.amount} {unitLabels[block.unit]} antes de continuar
        </p>
      </div>
    </div>
  );
}

function MessageBlockEditor({ block, onUpdate }: { block: MessageBlock; onUpdate: (patch: Partial<MessageBlock>) => void }) {
  return (
    <div className="space-y-3">
      <Tabs value={block.kind} onValueChange={(v) => onUpdate({ kind: v as any })}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="text">Texto</TabsTrigger>
          <TabsTrigger value="image">Imagem</TabsTrigger>
          <TabsTrigger value="file">Arquivo</TabsTrigger>
          <TabsTrigger value="list">Lista</TabsTrigger>
          <TabsTrigger value="buttons">Botões</TabsTrigger>
        </TabsList>

        <TabsContent value="text" className="mt-3 space-y-3">
          <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Mensagem</Label>
                <span className="text-xs text-muted-foreground">{block.text.length}/4096</span>
              </div>
              <Textarea
                value={block.text}
                onChange={(e) => onUpdate({ text: e.target.value })}
                placeholder="Digite sua mensagem..."
                className="min-h-[140px]"
              />
              <div className="flex flex-wrap items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Inserir Variável
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="z-50">
                    {VARIABLES.map((v) => (
                      <DropdownMenuItem key={v} onClick={() => onUpdate({ text: block.text + v })}>
                        {v}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Emojis
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="z-50">
                    <div className="grid grid-cols-5 gap-1 p-2">
                      {EMOJIS.map((e) => (
                        <button
                          key={e}
                          type="button"
                          className="grid h-9 w-9 place-items-center rounded-md hover:bg-muted"
                          onClick={() => onUpdate({ text: block.text + e })}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <WhatsappPreview title="Prévia" text={block.text || "(vazio)"} />
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={block.waitForReply} onCheckedChange={(v) => onUpdate({ waitForReply: Boolean(v) })} />
              Aguardar resposta do usuário antes de continuar
            </label>
            {block.waitForReply ? (
              <div className="flex items-center gap-2">
                <Label className="text-sm">Tempo máximo (s)</Label>
                <Input
                  type="number"
                  value={block.waitSeconds ?? 60}
                  onChange={(e) => onUpdate({ waitSeconds: Number(e.target.value) })}
                  className="h-9 w-24"
                />
              </div>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="image" className="mt-3 space-y-3">
          <p className="text-sm text-muted-foreground">Uploads estão como placeholder nesta versão.</p>
          <div className="space-y-2">
            <Label>URL da imagem</Label>
            <Input value={block.imageUrl ?? ""} onChange={(e) => onUpdate({ imageUrl: e.target.value })} placeholder="https://..." />
          </div>
          <div className="space-y-2">
            <Label>Legenda (opcional)</Label>
            <Textarea value={block.imageCaption ?? ""} onChange={(e) => onUpdate({ imageCaption: e.target.value })} />
          </div>
        </TabsContent>

        <TabsContent value="file" className="mt-3 space-y-3">
          <p className="text-sm text-muted-foreground">Uploads estão como placeholder nesta versão.</p>
          <div className="space-y-2">
            <Label>Nome do arquivo</Label>
            <Input value={block.fileName ?? ""} onChange={(e) => onUpdate({ fileName: e.target.value })} placeholder="ex: proposta.pdf" />
          </div>
          <div className="space-y-2">
            <Label>Legenda (opcional)</Label>
            <Textarea value={block.fileCaption ?? ""} onChange={(e) => onUpdate({ fileCaption: e.target.value })} />
          </div>
        </TabsContent>

        <TabsContent value="list" className="mt-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={block.listTitle ?? ""} onChange={(e) => onUpdate({ listTitle: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Texto do botão</Label>
              <Input value={block.listButtonText ?? "Ver Opções"} onChange={(e) => onUpdate({ listButtonText: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea value={block.listDescription ?? ""} onChange={(e) => onUpdate({ listDescription: e.target.value })} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Itens (até 10)</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if ((block.listItems ?? []).length >= 10) return;
                  onUpdate({ listItems: [...(block.listItems ?? []), { id: uid("li"), title: "", description: "" }] });
                }}
              >
                <Plus className="h-4 w-4" /> Adicionar Item
              </Button>
            </div>
            <div className="space-y-2">
              {(block.listItems ?? []).map((it, idx) => (
                <div key={it.id} className="rounded-md border bg-background p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Item {idx + 1}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onUpdate({ listItems: (block.listItems ?? []).filter((x) => x.id !== it.id) })}
                    >
                      Remover
                    </Button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input
                      value={it.title}
                      onChange={(e) =>
                        onUpdate({
                          listItems: (block.listItems ?? []).map((x) => (x.id === it.id ? { ...x, title: e.target.value } : x)),
                        })
                      }
                      placeholder="Título"
                    />
                    <Input
                      value={it.description}
                      onChange={(e) =>
                        onUpdate({
                          listItems: (block.listItems ?? []).map((x) => (x.id === it.id ? { ...x, description: e.target.value } : x)),
                        })
                      }
                      placeholder="Descrição"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="buttons" className="mt-3 space-y-3">
          <div className="space-y-2">
            <Label>Texto da mensagem</Label>
            <Textarea value={block.buttonsText ?? ""} onChange={(e) => onUpdate({ buttonsText: e.target.value })} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Botões (até 3)</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if ((block.buttons ?? []).length >= 3) return;
                  onUpdate({ buttons: [...(block.buttons ?? []), { id: uid("bt"), kind: "quick_reply", text: "" }] as any });
                }}
              >
                <Plus className="h-4 w-4" /> Adicionar Botão
              </Button>
            </div>

            <div className="space-y-2">
              {(block.buttons ?? []).map((b) => (
                <div key={b.id} className="rounded-md border bg-background p-3">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Select
                      value={b.kind}
                      onValueChange={(v) =>
                        onUpdate({
                          buttons: (block.buttons ?? []).map((x) => (x.id === b.id ? ({ ...x, kind: v } as any) : x)) as any,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="quick_reply">Resposta Rápida</SelectItem>
                        <SelectItem value="url">Visitar URL</SelectItem>
                        <SelectItem value="call">Ligar</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      value={b.text}
                      onChange={(e) =>
                        onUpdate({
                          buttons: (block.buttons ?? []).map((x) => (x.id === b.id ? ({ ...x, text: e.target.value } as any) : x)) as any,
                        })
                      }
                      placeholder="Texto do botão"
                    />
                    <Button variant="outline" onClick={() => onUpdate({ buttons: (block.buttons ?? []).filter((x) => x.id !== b.id) as any })}>
                      Remover
                    </Button>
                  </div>

                  {b.kind === "url" ? (
                    <div className="mt-2">
                      <Input
                        value={(b as any).url ?? ""}
                        onChange={(e) =>
                          onUpdate({
                            buttons: (block.buttons ?? []).map((x) =>
                              x.id === b.id ? ({ ...(x as any), url: e.target.value } as any) : x,
                            ) as any,
                          })
                        }
                        placeholder="https://..."
                      />
                    </div>
                  ) : null}

                  {b.kind === "call" ? (
                    <div className="mt-2">
                      <Input
                        value={(b as any).phone ?? ""}
                        onChange={(e) =>
                          onUpdate({
                            buttons: (block.buttons ?? []).map((x) =>
                              x.id === b.id ? ({ ...(x as any), phone: e.target.value } as any) : x,
                            ) as any,
                          })
                        }
                        placeholder="(11) 98765-4321"
                      />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function QuestionBlockEditor({ block, onUpdate }: { block: QuestionBlock; onUpdate: (patch: Partial<QuestionBlock>) => void }) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>Pergunta</Label>
        <Textarea value={block.prompt} onChange={(e) => onUpdate({ prompt: e.target.value })} placeholder="Ex: Qual seu email?" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Tipo de resposta esperada</Label>
          <Select value={block.responseType} onValueChange={(v) => onUpdate({ responseType: v as any })}>
            <SelectTrigger>
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="free_text">Texto livre</SelectItem>
              <SelectItem value="number">Número</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="phone">Telefone</SelectItem>
              <SelectItem value="date">Data</SelectItem>
              <SelectItem value="single_choice">Opção única (botões)</SelectItem>
              <SelectItem value="multiple_choice">Múltipla escolha</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Salvar resposta na variável</Label>
          <Input value={block.saveToVariable} onChange={(e) => onUpdate({ saveToVariable: e.target.value })} placeholder="{{resposta_1}}" />
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={block.repeatOnInvalid} onCheckedChange={(v) => onUpdate({ repeatOnInvalid: Boolean(v) })} />
          Repetir pergunta se resposta inválida
        </label>
      </div>

      {block.repeatOnInvalid ? (
        <div className="space-y-2">
          <Label>Mensagem de erro</Label>
          <Input value={block.errorMessage} onChange={(e) => onUpdate({ errorMessage: e.target.value })} />
        </div>
      ) : null}
    </div>
  );
}

function ConditionBlockEditor({ block, onUpdate }: { block: ConditionBlock; onUpdate: (patch: Partial<ConditionBlock>) => void }) {
  const normalized = normalizeLegacyConditionBlock(block);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Divida o fluxo baseado em regras.</p>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Ramificações</Label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const branches = normalized.branches;
              const elseIdx = branches.findIndex((b) => b.kind === "else");
              const insertAt = elseIdx >= 0 ? elseIdx : branches.length;

              // limita a depth/complexidade visual por enquanto
              if (branches.filter((b) => b.kind !== "else").length >= 5) return;

              const next = [...branches];
              next.splice(insertAt, 0, {
                id: uid("br"),
                label: "SENÃO SE",
                kind: "elseif",
                when: { field: "{{resposta_1}}", operator: "contains", value: "" },
                blocks: [],
              } as any);

              onUpdate({ branches: next } as any);
            }}
          >
            <Plus className="h-4 w-4" /> Adicionar Condição
          </Button>
        </div>

        <div className="grid gap-2">
          {normalized.branches.map((br) => (
            <div key={br.id} className="rounded-md border bg-background p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {br.kind === "if" ? "SE" : br.kind === "elseif" ? "SENÃO SE" : "SENÃO"}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toast({
                    title: "DnD",
                    description: "Arraste e solte blocos para dentro do branch (suporte completo em seguida nesta etapa).",
                  })}
                >
                  <Plus className="h-4 w-4" /> Adicionar bloco
                </Button>
              </div>
              {br.kind !== "else" ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Campo</Label>
                    <Select
                      value={br.when?.field ?? "{{resposta_1}}"}
                      onValueChange={(v) => {
                        const next = normalized.branches.map((x) =>
                          x.id === br.id ? ({ ...x, when: { ...(x.when ?? { operator: "contains", value: "" }), field: v } } as any) : x,
                        );
                        onUpdate({ branches: next } as any);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Campo" />
                      </SelectTrigger>
                      <SelectContent>
                        {VARIABLES.map((v) => (
                          <SelectItem key={v} value={v}>
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Operador</Label>
                    <Select
                      value={(br.when?.operator ?? "contains") as any}
                      onValueChange={(v) => {
                        const next = normalized.branches.map((x) =>
                          x.id === br.id ? ({ ...x, when: { ...(x.when ?? { field: "{{resposta_1}}", value: "" }), operator: v as any } } as any) : x,
                        );
                        onUpdate({ branches: next } as any);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Operador" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="equals">É igual a</SelectItem>
                        <SelectItem value="contains">Contém</SelectItem>
                        <SelectItem value="gt">Maior que</SelectItem>
                        <SelectItem value="lt">Menor que</SelectItem>
                        <SelectItem value="is_empty">Está vazio</SelectItem>
                        <SelectItem value="is_not_empty">Não está vazio</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Valor</Label>
                    <Input
                      value={br.when?.value ?? ""}
                      onChange={(e) => {
                        const next = normalized.branches.map((x) =>
                          x.id === br.id ? ({ ...x, when: { ...(x.when ?? { field: "{{resposta_1}}", operator: "contains" }), value: e.target.value } } as any) : x,
                        );
                        onUpdate({ branches: next } as any);
                      }}
                      placeholder="Valor"
                    />
                  </div>
                </div>
              ) : null}

              <p className="mt-2 text-xs text-muted-foreground">Blocos no branch: {br.blocks.length}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SwitchBlockEditor({ block, onUpdate }: { block: SwitchBlock; onUpdate: (patch: Partial<SwitchBlock>) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Roteia para um case com base no valor de uma variável.</p>
      <div className="space-y-2">
        <Label>Expressão (variável)</Label>
        <Select value={block.expression} onValueChange={(v) => onUpdate({ expression: v })}>
          <SelectTrigger>
            <SelectValue placeholder="{{variavel}}" />
          </SelectTrigger>
          <SelectContent>
            {VARIABLES.map((v) => (
              <SelectItem key={v} value={v}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Cases</Label>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onUpdate({ cases: [...block.cases, { id: uid("sc"), label: `CASO ${block.cases.length + 1}`, equals: "", blocks: [] }] })}
          >
            <Plus className="h-4 w-4" /> Adicionar case
          </Button>
        </div>
        <div className="grid gap-2">
          {block.cases.map((c) => (
            <div key={c.id} className="rounded-md border bg-background p-3">
              <div className="grid gap-2 sm:grid-cols-[1fr_160px]">
                <div className="space-y-1">
                  <Label className="text-xs">Rótulo</Label>
                  <Input
                    value={c.label}
                    onChange={(e) => onUpdate({ cases: block.cases.map((x) => (x.id === c.id ? { ...x, label: e.target.value } : x)) })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Equals</Label>
                  <Input
                    value={c.equals}
                    onChange={(e) => onUpdate({ cases: block.cases.map((x) => (x.id === c.id ? { ...x, equals: e.target.value } : x)) })}
                    placeholder="Ex: preço"
                  />
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Blocos no case: {c.blocks.length}</p>
            </div>
          ))}
          <div className="rounded-md border bg-background p-3">
            <p className="text-sm font-medium">DEFAULT</p>
            <p className="mt-1 text-xs text-muted-foreground">Blocos no default: {block.defaultBlocks.length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoopBlockEditor({ block, onUpdate }: { block: LoopBlock; onUpdate: (patch: Partial<LoopBlock>) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Itera um array (de variável ou do evento) e executa blocos internos.</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Fonte</Label>
          <Select
            value={block.source.kind}
            onValueChange={(v) =>
              onUpdate({
                source: v === "event" ? ({ kind: "event", path: "message.items" } as any) : ({ kind: "variable", variable: "{{itens}}" } as any),
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="variable">Variável</SelectItem>
              <SelectItem value="event">Evento</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Variável do item</Label>
          <Input value={block.itemVar} onChange={(e) => onUpdate({ itemVar: e.target.value })} placeholder="{{item}}" />
        </div>
      </div>

      {block.source.kind === "variable" ? (
        <div className="space-y-2">
          <Label>Array (variável)</Label>
          <Input value={block.source.variable} onChange={(e) => onUpdate({ source: { kind: "variable", variable: e.target.value } as any })} />
        </div>
      ) : (
        <div className="space-y-2">
          <Label>Path do evento</Label>
          <Input value={block.source.path} onChange={(e) => onUpdate({ source: { kind: "event", path: e.target.value } as any })} placeholder="message.items" />
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Máx. iterações</Label>
          <Input
            type="number"
            min={1}
            value={block.maxIterations}
            onChange={(e) => onUpdate({ maxIterations: Math.max(1, Number(e.target.value)) })}
          />
        </div>
        <div className="rounded-md border bg-background p-3 text-sm">
          <p className="text-muted-foreground">Dentro do loop, use:</p>
          <p className="mt-1 font-medium">{block.itemVar}</p>
        </div>
      </div>

      <div className="rounded-md border bg-background p-3 text-sm">
        <p className="text-muted-foreground">Blocos no loop:</p>
        <p className="mt-1 font-medium">{block.blocks.length}</p>
      </div>
    </div>
  );
}

function VariableBlockEditor({ block, onUpdate }: { block: VariableBlock; onUpdate: (patch: Partial<VariableBlock>) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Define uma variável (SET) para ser usada em mensagens/condições.</p>
      <div className="space-y-2">
        <Label>Nome (variável)</Label>
        <Input value={block.name} onChange={(e) => onUpdate({ name: e.target.value })} placeholder="{{minha_var}}" />
      </div>
      <div className="space-y-2">
        <Label>Valor</Label>
        <Textarea value={block.value} onChange={(e) => onUpdate({ value: e.target.value })} rows={3} placeholder="Ex: {{resposta_1}}" />
      </div>
    </div>
  );
}

function ActionBlockEditor({
  block,
  tagOptions,
  onCreateTag,
  members,
  onUpdate,
}: {
  block: ActionBlock;
  tagOptions: string[];
  onCreateTag: (tag: string) => void;
  members: Array<{ id: string; name: string }>;
  onUpdate: (patch: Partial<ActionBlock>) => void;
}) {
  const [newTag, setNewTag] = React.useState("");

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>Tipo de ação</Label>
        <Select value={block.actionType} onValueChange={(v) => onUpdate({ actionType: v as any })}>
          <SelectTrigger>
            <SelectValue placeholder="Ação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="add_tag">Adicionar Tag</SelectItem>
            <SelectItem value="remove_tag">Remover Tag</SelectItem>
            <SelectItem value="notify_human">Notificar Humano</SelectItem>
            <SelectItem value="webhook">Enviar Webhook</SelectItem>
            <SelectItem value="assign_contact">Atribuir Contato (placeholder)</SelectItem>
            <SelectItem value="update_contact_field">Atualizar Campo (placeholder)</SelectItem>
            <SelectItem value="external_integration">Integração Externa (placeholder)</SelectItem>
            <SelectItem value="goto">Ir Para… (placeholder)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {(block.actionType === "add_tag" || block.actionType === "remove_tag") ? (
        <div className="space-y-3">
          <Label>Tags</Label>
          <div className="grid gap-2">
            {tagOptions.map((t) => {
              const checked = (block.tags ?? []).includes(t);
              return (
                <label key={t} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(v) => {
                      const cur = new Set(block.tags ?? []);
                      if (Boolean(v)) cur.add(t);
                      else cur.delete(t);
                      onUpdate({ tags: Array.from(cur) });
                    }}
                  />
                  {t}
                </label>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <Input value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="+ Criar nova tag" />
            <Button
              variant="outline"
              onClick={() => {
                onCreateTag(newTag);
                setNewTag("");
              }}
            >
              Criar
            </Button>
          </div>
        </div>
      ) : null}

      {block.actionType === "notify_human" ? (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Membro da equipe</Label>
            <Select
              value={block.notify?.memberId ?? members[0]?.id ?? ""}
              onValueChange={(v) => onUpdate({ notify: { memberId: v, message: block.notify?.message ?? "" } })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Mensagem</Label>
            <Textarea
              value={block.notify?.message ?? ""}
              onChange={(e) =>
                onUpdate({
                  notify: {
                    memberId: block.notify?.memberId ?? members[0]?.id ?? "",
                    message: e.target.value,
                  },
                })
              }
              placeholder="Ex: Contato pediu falar com humano."
            />
          </div>
        </div>
      ) : null}

      {block.actionType === "webhook" ? (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>URL</Label>
            <Input
              value={block.webhook?.url ?? ""}
              onChange={(e) =>
                onUpdate({
                  webhook: {
                    url: e.target.value,
                    method: block.webhook?.method ?? "POST",
                    headers: block.webhook?.headers ?? [],
                    bodyJson: block.webhook?.bodyJson ?? "{}",
                  },
                })
              }
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label>Método</Label>
            <Select
              value={block.webhook?.method ?? "POST"}
              onValueChange={(v) =>
                onUpdate({
                  webhook: {
                    url: block.webhook?.url ?? "",
                    method: v as any,
                    headers: block.webhook?.headers ?? [],
                    bodyJson: block.webhook?.bodyJson ?? "{}",
                  },
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Método" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="GET">GET</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Headers</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const cur = block.webhook?.headers ?? [];
                  onUpdate({
                    webhook: {
                      url: block.webhook?.url ?? "",
                      method: block.webhook?.method ?? "POST",
                      bodyJson: block.webhook?.bodyJson ?? "{}",
                      headers: [...cur, { id: uid("h"), key: "", value: "" }],
                    },
                  });
                }}
              >
                <Plus className="h-4 w-4" /> Adicionar
              </Button>
            </div>
            <div className="space-y-2">
              {(block.webhook?.headers ?? []).map((h) => (
                <div key={h.id} className="grid gap-2 sm:grid-cols-[1fr_1fr_90px]">
                  <Input
                    value={h.key}
                    onChange={(e) =>
                      onUpdate({
                        webhook: {
                          url: block.webhook?.url ?? "",
                          method: block.webhook?.method ?? "POST",
                          bodyJson: block.webhook?.bodyJson ?? "{}",
                          headers: (block.webhook?.headers ?? []).map((x) => (x.id === h.id ? { ...x, key: e.target.value } : x)),
                        },
                      })
                    }
                    placeholder="X-Header"
                  />
                  <Input
                    value={h.value}
                    onChange={(e) =>
                      onUpdate({
                        webhook: {
                          url: block.webhook?.url ?? "",
                          method: block.webhook?.method ?? "POST",
                          bodyJson: block.webhook?.bodyJson ?? "{}",
                          headers: (block.webhook?.headers ?? []).map((x) => (x.id === h.id ? { ...x, value: e.target.value } : x)),
                        },
                      })
                    }
                    placeholder="valor"
                  />
                  <Button
                    variant="outline"
                    onClick={() =>
                      onUpdate({
                        webhook: {
                          url: block.webhook?.url ?? "",
                          method: block.webhook?.method ?? "POST",
                          bodyJson: block.webhook?.bodyJson ?? "{}",
                          headers: (block.webhook?.headers ?? []).filter((x) => x.id !== h.id),
                        },
                      })
                    }
                  >
                    Remover
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Body (JSON)</Label>
            <Textarea
              value={block.webhook?.bodyJson ?? "{}"}
              onChange={(e) =>
                onUpdate({
                  webhook: {
                    url: block.webhook?.url ?? "",
                    method: block.webhook?.method ?? "POST",
                    headers: block.webhook?.headers ?? [],
                    bodyJson: e.target.value,
                  },
                })
              }
              className="min-h-[120px] font-mono"
            />
          </div>
        </div>
      ) : null}

      {block.actionType === "goto" ? (
        <div className="space-y-2">
          <Label>Etapa destino (ID)</Label>
          <Input value={block.gotoStepId ?? ""} onChange={(e) => onUpdate({ gotoStepId: e.target.value })} placeholder="ex: b_..." />
          <p className="text-xs text-muted-foreground">Placeholder: nesta versão só salva no fluxo.</p>
        </div>
      ) : null}

      {block.actionType === "assign_contact" || block.actionType === "update_contact_field" || block.actionType === "external_integration" ? (
        <p className="text-sm text-muted-foreground">Placeholder: UI completa entra numa próxima etapa.</p>
      ) : null}
    </div>
  );
}

function WhatsappPreview({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="mb-2 text-xs font-medium text-muted-foreground">{title}</p>
      <div className="rounded-xl bg-background p-3 shadow-sm">
        <div className="max-w-[220px] rounded-2xl bg-secondary/20 p-3 text-sm">
          <p className="whitespace-pre-wrap break-words">{text}</p>
        </div>
      </div>
    </div>
  );
}

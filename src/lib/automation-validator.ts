import type {
  AutomationBlock,
  AutomationFlow,
  ValidationError,
  ValidationResult,
} from "@/types/automation-validation";

const PRIVATE_HOST_RE = /(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)/;

function extractVarsFromText(text: string): string[] {
  const matches = text.match(/\{\{([^}]+)\}\}/g);
  if (!matches) return [];
  return matches.map((m) => m.slice(2, -2).trim()).filter(Boolean);
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export class AutomationValidator {
  private flow: AutomationFlow;
  private errors: ValidationError[] = [];
  private warnings: ValidationError[] = [];
  private infos: ValidationError[] = [];

  constructor(flow: AutomationFlow) {
    this.flow = flow;
  }

  validate(): ValidationResult {
    this.errors = [];
    this.warnings = [];
    this.infos = [];

    this.validateBlockCount();
    this.validateStartBlock();
    this.validateOrphanBlocks();
    this.validateConnections();
    this.validateVariables();
    this.validateLoops();
    this.validateBlockContent();
    this.validateWebhooks();

    return {
      isValid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      infos: this.infos,
    };
  }

  private validateBlockCount() {
    const MAX_BLOCKS = 100;

    if (this.flow.blocks.length === 0) {
      this.errors.push({
        type: "missing_start_block",
        severity: "error",
        message: "O fluxo precisa ter pelo menos 1 bloco",
        suggestion: "Adicione blocos ao seu fluxo de automação",
      });
    }

    if (this.flow.blocks.length > MAX_BLOCKS) {
      this.errors.push({
        type: "max_blocks_exceeded",
        severity: "error",
        message: `Máximo de ${MAX_BLOCKS} blocos excedido (${this.flow.blocks.length} blocos)`,
        suggestion: "Divida sua automação em múltiplos fluxos menores",
      });
    }
  }

  private validateStartBlock() {
    const startBlocks = this.flow.blocks.filter((b) => b.type === "start");

    if (startBlocks.length === 0) {
      this.errors.push({
        type: "missing_start_block",
        severity: "error",
        message: "Fluxo precisa ter um bloco de início",
        suggestion: "Adicione um bloco START ao seu fluxo",
      });
    }

    if (startBlocks.length > 1) {
      this.errors.push({
        type: "missing_start_block",
        severity: "error",
        message: "Fluxo não pode ter múltiplos blocos de início",
        suggestion: "Mantenha apenas um bloco START",
      });
    }
  }

  private validateOrphanBlocks() {
    const connectedBlocks = new Set<string>();
    this.flow.connections.forEach((conn) => {
      connectedBlocks.add(conn.from);
      connectedBlocks.add(conn.to);
    });

    this.flow.blocks.forEach((block) => {
      if (block.type !== "start" && !connectedBlocks.has(block.id)) {
        this.warnings.push({
          type: "orphan_block",
          severity: "warning",
          blockId: block.id,
          message: `Bloco "${this.getBlockLabel(block)}" não está conectado ao fluxo`,
          suggestion: "Conecte este bloco ao fluxo ou remova-o",
        });
      }
    });
  }

  private validateConnections() {
    const blockIds = new Set(this.flow.blocks.map((b) => b.id));

    this.flow.connections.forEach((conn) => {
      if (!blockIds.has(conn.from)) {
        this.errors.push({
          type: "invalid_connection",
          severity: "error",
          message: "Conexão aponta para bloco de origem inexistente",
          suggestion: "Remova conexões quebradas",
        });
      }

      if (!blockIds.has(conn.to)) {
        this.errors.push({
          type: "invalid_connection",
          severity: "error",
          message: "Conexão aponta para bloco de destino inexistente",
          suggestion: "Remova conexões quebradas",
        });
      }

      if (conn.from === conn.to) {
        this.errors.push({
          type: "invalid_connection",
          severity: "error",
          blockId: conn.from,
          message: "Bloco não pode se conectar a si mesmo",
          suggestion: "Remova a conexão circular",
        });
      }
    });
  }

  private validateVariables() {
    const declared = new Set<string>();

    for (const block of this.flow.blocks) {
      if (block.type === "question") {
        const raw = block.data?.variableName ?? block.data?.saveToVariable;
        if (typeof raw === "string" && raw.trim()) {
          const cleaned = raw.trim().startsWith("{{") ? raw.trim().slice(2, -2).trim() : raw.trim();
          if (cleaned) declared.add(cleaned);
        }
      }

      // Treat variable-set blocks (from editor) as declarations too.
      // In the normalized flow they usually come as type "action" with data.name.
      const maybeVarName = block.data?.name;
      if (typeof maybeVarName === "string" && maybeVarName.trim()) {
        const cleaned = maybeVarName.trim().startsWith("{{") ? maybeVarName.trim().slice(2, -2).trim() : maybeVarName.trim();
        if (cleaned) declared.add(cleaned);
      }
    }

    for (const block of this.flow.blocks) {
      const candidateStrings: string[] = [];
      if (typeof block.data?.text === "string") candidateStrings.push(block.data.text);
      if (typeof block.data?.question === "string") candidateStrings.push(block.data.question);
      if (typeof block.data?.prompt === "string") candidateStrings.push(block.data.prompt);
      if (typeof block.data?.field === "string") candidateStrings.push(block.data.field);
      if (typeof block.data?.value === "string") candidateStrings.push(block.data.value);

      for (const str of candidateStrings) {
        for (const varName of extractVarsFromText(str)) {
          if (!declared.has(varName)) {
            this.errors.push({
              type: "missing_variable",
              severity: "error",
              blockId: block.id,
              message: `Variável {{${varName}}} não foi declarada`,
              suggestion: `Crie um bloco de pergunta que declare a variável "${varName}"`,
            });
          }
        }
      }
    }
  }

  private validateLoops() {
    const startBlock = this.flow.blocks.find((b) => b.type === "start");
    if (!startBlock) return;

    const visited = new Set<string>();
    const recStack = new Set<string>();

    const hasCycle = (blockId: string): boolean => {
      if (recStack.has(blockId)) return true;
      if (visited.has(blockId)) return false;

      visited.add(blockId);
      recStack.add(blockId);

      const outgoing = this.flow.connections.filter((c) => c.from === blockId);
      for (const conn of outgoing) {
        if (hasCycle(conn.to)) return true;
      }

      recStack.delete(blockId);
      return false;
    };

    if (hasCycle(startBlock.id)) {
      this.warnings.push({
        type: "infinite_loop",
        severity: "warning",
        message: "Possível loop infinito detectado no fluxo",
        suggestion: "Adicione condições de saída ou limite de iterações",
      });
    }
  }

  private validateBlockContent() {
    for (const block of this.flow.blocks) {
      switch (block.type) {
        case "message": {
          const text = block.data?.text;
          if (typeof text !== "string" || text.trim().length === 0) {
            this.errors.push({
              type: "empty_message",
              severity: "error",
              blockId: block.id,
              message: "Bloco de mensagem não pode estar vazio",
              suggestion: "Adicione conteúdo à mensagem",
            });
          } else if (text.length > 4096) {
            this.errors.push({
              type: "empty_message",
              severity: "error",
              blockId: block.id,
              message: "Mensagem muito longa (máx 4096 caracteres)",
              suggestion: "Divida a mensagem em múltiplos blocos",
            });
          }
          break;
        }

        case "delay": {
          const duration = block.data?.duration ?? block.data?.amount;
          const unit = block.data?.unit;
          const seconds = normalizeDelayToSeconds(duration, unit);

          if (seconds == null || seconds < 1) {
            this.errors.push({
              type: "invalid_delay",
              severity: "error",
              blockId: block.id,
              message: "Delay precisa ser maior que 0",
              suggestion: "Configure um tempo de espera válido",
            });
          } else if (seconds > 86400) {
            this.warnings.push({
              type: "invalid_delay",
              severity: "warning",
              blockId: block.id,
              message: "Delay muito longo (mais de 24 horas)",
              suggestion: "Considere reduzir o tempo de espera",
            });
          }
          break;
        }

        case "question": {
          const q = block.data?.question ?? block.data?.prompt;
          if (typeof q !== "string" || q.trim().length === 0) {
            this.errors.push({
              type: "empty_message",
              severity: "error",
              blockId: block.id,
              message: "Pergunta não pode estar vazia",
              suggestion: "Adicione o texto da pergunta",
            });
          }

          const varName = block.data?.variableName ?? block.data?.saveToVariable;
          if (typeof varName !== "string" || varName.trim().length === 0) {
            this.errors.push({
              type: "missing_variable",
              severity: "error",
              blockId: block.id,
              message: "Nome da variável é obrigatório",
              suggestion: "Defina um nome para armazenar a resposta",
            });
          }
          break;
        }
      }
    }
  }

  private validateWebhooks() {
    for (const block of this.flow.blocks) {
      if (block.type !== "webhook" && block.data?.actionType !== "webhook") continue;

      const url = block.data?.url ?? block.data?.webhook?.url;
      if (typeof url !== "string" || !url.trim()) {
        this.errors.push({
          type: "invalid_webhook",
          severity: "error",
          blockId: block.id,
          message: "URL do webhook é obrigatória",
          suggestion: "Configure a URL de destino",
        });
        continue;
      }

      try {
        const urlObj = new URL(url);
        if (urlObj.protocol !== "https:") {
          this.errors.push({
            type: "invalid_webhook",
            severity: "error",
            blockId: block.id,
            message: "Webhook deve usar HTTPS",
            suggestion: "Utilize uma URL segura (https://)",
          });
        }

        if (PRIVATE_HOST_RE.test(urlObj.hostname)) {
          this.errors.push({
            type: "invalid_webhook",
            severity: "error",
            blockId: block.id,
            message: "URLs locais não são permitidas",
            suggestion: "Use um endpoint público acessível",
          });
        }
      } catch {
        this.errors.push({
          type: "invalid_webhook",
          severity: "error",
          blockId: block.id,
          message: "URL do webhook inválida",
          suggestion: "Verifique o formato da URL",
        });
      }
    }
  }

  private getBlockLabel(block: AutomationBlock): string {
    const txt =
      (typeof block.data?.text === "string" && block.data.text) ||
      (typeof block.data?.question === "string" && block.data.question) ||
      (typeof block.data?.prompt === "string" && block.data.prompt) ||
      block.type;

    return String(txt).slice(0, 30);
  }
}

function normalizeDelayToSeconds(duration: unknown, unit: unknown): number | null {
  const d = typeof duration === "number" ? duration : typeof duration === "string" ? Number(duration) : NaN;
  if (!Number.isFinite(d)) return null;
  const u = typeof unit === "string" ? unit : "seconds";
  const mult = u === "minutes" ? 60 : u === "hours" ? 3600 : u === "days" ? 86400 : 1;
  return d * mult;
}

export function validateAutomationFlow(flow: AutomationFlow): ValidationResult {
  const validator = new AutomationValidator(flow);
  return validator.validate();
}

export function groupValidationByBlockId(result: ValidationResult) {
  const errorIds = uniq(result.errors.map((e) => e.blockId).filter(Boolean) as string[]);
  const warningIds = uniq(result.warnings.map((w) => w.blockId).filter(Boolean) as string[]);
  return { errorIds, warningIds };
}

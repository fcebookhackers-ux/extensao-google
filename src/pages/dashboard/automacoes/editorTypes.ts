export type AutomationStatus = "draft" | "active" | "paused";

export type TriggerType =
  | "message_received"
  | "keyword"
  | "scheduled_time"
  | "tag_added"
  | "new_contact"
  | "integration_event";

export type MessageKind = "text" | "image" | "file" | "list" | "buttons";

export type BlockType =
  | "message"
  | "question"
  | "condition"
  | "switch"
  | "loop"
  | "variable"
  | "delay"
  | "jump"
  | "end"
  | "action";

export type BlockBase = {
  id: string;
  type: BlockType;
  title: string;
  collapsed?: boolean;
};

export type MessageBlock = BlockBase & {
  type: "message";
  kind: MessageKind;
  text: string;
  waitForReply: boolean;
  waitSeconds?: number;
  imageUrl?: string;
  imageCaption?: string;
  fileName?: string;
  fileCaption?: string;
  listTitle?: string;
  listDescription?: string;
  listButtonText?: string;
  listItems: Array<{ id: string; title: string; description: string }>;
  buttonsText?: string;
  buttons: Array<
    | { id: string; kind: "quick_reply"; text: string }
    | { id: string; kind: "url"; text: string; url: string }
    | { id: string; kind: "call"; text: string; phone: string }
  >;
};

export type QuestionResponseType =
  | "free_text"
  | "number"
  | "email"
  | "phone"
  | "date"
  | "single_choice"
  | "multiple_choice";

export type QuestionBlock = BlockBase & {
  type: "question";
  prompt: string;
  responseType: QuestionResponseType;
  saveToVariable: string; // ex: {{resposta_1}}
  repeatOnInvalid: boolean;
  errorMessage: string;
};

export type ConditionOperator =
  | "equals"
  | "contains"
  | "gt"
  | "lt"
  | "is_empty"
  | "is_not_empty";

export type ConditionBranchKind = "if" | "elseif" | "else";

export type ConditionRule = {
  field: string;
  operator: ConditionOperator;
  value: string;
};

export type ConditionBranch = {
  id: string;
  label: string;
  kind: ConditionBranchKind;
  when?: ConditionRule; // obrigatório em IF/ELSEIF; omitido em ELSE
  blocks: EditorBlock[];
};

export type ConditionBlock = BlockBase & {
  type: "condition";
  /**
   * Compat: campos legados (primeiro IF). Mantidos para não quebrar docs antigos.
   * O renderer novo prefere `branches[].when`.
   */
  field: string;
  operator: ConditionOperator;
  value: string;
  branches: ConditionBranch[];
};

export type SwitchCase = {
  id: string;
  label: string;
  /** valor comparado via equals */
  equals: string;
  blocks: EditorBlock[];
};

export type SwitchBlock = BlockBase & {
  type: "switch";
  expression: string; // ex: {{resposta_1}}
  cases: SwitchCase[];
  defaultBlocks: EditorBlock[];
};

export type LoopSource =
  | { kind: "variable"; variable: string } // ex: {{itens}}
  | { kind: "event"; path: string }; // ex: message.items

export type LoopBlock = BlockBase & {
  type: "loop";
  source: LoopSource;
  itemVar: string; // ex: {{item}}
  maxIterations: number; // proteção
  blocks: EditorBlock[];
};

export type VariableBlock = BlockBase & {
  type: "variable";
  /** variável alvo, ex: {{nome_produto}} */
  name: string;
  /** valor (suporta template), ex: "{{resposta_1}}" */
  value: string;
};

export type ActionBlock = BlockBase & {
  type: "action";
  actionType:
    | "add_tag"
    | "remove_tag"
    | "assign_contact"
    | "notify_human"
    | "update_contact_field"
    | "webhook"
    | "external_integration"
    | "goto";

  // Configurações por tipo (MVP)
  tags?: string[];
  notify?: { memberId: string; message: string };
  webhook?: {
    url: string;
    method: "GET" | "POST";
    headers: Array<{ id: string; key: string; value: string }>;
    bodyJson: string;
  };
  gotoStepId?: string;
};

export type DelayUnit = "seconds" | "minutes" | "hours" | "days";

export type DelayBlock = BlockBase & {
  type: "delay";
  amount: number;
  unit: DelayUnit;
};

export type JumpBlock = BlockBase & {
  type: "jump";
  toBlockId: string;
};

export type EndBlock = BlockBase & {
  type: "end";
  farewellMessage?: string;
  handoffToHuman: boolean;
  markResolved: boolean;
  sendSatisfactionSurvey: boolean;
};

export type EditorBlock =
  | MessageBlock
  | QuestionBlock
  | ConditionBlock
  | SwitchBlock
  | LoopBlock
  | VariableBlock
  | DelayBlock
  | JumpBlock
  | EndBlock
  | ActionBlock;

export type AutomationEditorDoc = {
  id: string;
  name: string;
  description?: string;
  status: AutomationStatus;
  updatedAt: string;
  tagsLibrary?: string[];
  global?: {
    workingHours?: { start: string; end: string }; // HH:mm
    dailyLimit?: number;
    weekdaysOnly?: boolean;
    autoTags?: string[];
  };
  trigger: {
    type: TriggerType;
    keyword?: string;
    keywordIgnoreCase?: boolean;
    keywordVariations?: boolean;
    scheduledTime?: string; // HH:mm
    scheduledDays?: Array<"seg" | "ter" | "qua" | "qui" | "sex" | "sab" | "dom">;
    timezone?: string;
  };
  blocks: EditorBlock[];

  variables?: Array<{
    id: string;
    name: string; // ex: {{nome_produto}}
    type: "text" | "number" | "date" | "boolean";
    defaultValue?: string;
  }>;
};

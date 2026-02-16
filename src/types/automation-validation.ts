export type ValidationErrorType =
  | "orphan_block"
  | "invalid_connection"
  | "missing_variable"
  | "infinite_loop"
  | "invalid_webhook"
  | "empty_message"
  | "max_blocks_exceeded"
  | "invalid_delay"
  | "missing_start_block";

export type ValidationSeverity = "error" | "warning" | "info";

export interface ValidationError {
  type: ValidationErrorType;
  severity: ValidationSeverity;
  blockId?: string;
  message: string;
  suggestion?: string;
  line?: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  infos: ValidationError[];
}

export interface AutomationBlock {
  id: string;
  type: "start" | "message" | "question" | "condition" | "delay" | "webhook" | "action";
  data: any;
  position: { x: number; y: number };
}

export interface AutomationConnection {
  id: string;
  from: string;
  to: string;
  condition?: string;
}

export interface AutomationFlow {
  blocks: AutomationBlock[];
  connections: AutomationConnection[];
}

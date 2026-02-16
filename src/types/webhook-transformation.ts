export type ConditionOperator =
  | "equals"
  | "not_equals"
  | "greater_than"
  | "less_than"
  | "greater_or_equal"
  | "less_or_equal"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with"
  | "matches_regex"
  | "is_empty"
  | "is_not_empty";

export type LogicOperator = "AND" | "OR";

export interface WebhookCondition {
  id: string;
  webhookId: string;
  fieldPath: string;
  operator: ConditionOperator;
  value: string;
  logicOperator: LogicOperator;
  position: number;
  createdAt?: string;
}

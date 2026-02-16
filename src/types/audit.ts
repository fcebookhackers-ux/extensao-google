export type AuditAction =
  // Automações
  | "automation.created"
  | "automation.updated"
  | "automation.deleted"
  | "automation.published"
  | "automation.paused"
  | "automation.status_changed"
  // Contatos
  | "contacts.imported"
  | "contacts.exported"
  | "contacts.deleted"
  | "contact.created"
  | "contact.updated"
  | "contact.deleted"
  // Time
  | "team.member_invited"
  | "team.member_removed"
  | "team.role_changed"
  // Billing
  | "billing.plan_upgraded"
  | "billing.plan_downgraded"
  | "billing.subscription_cancelled"
  // Segurança
  | "auth.login"
  | "auth.logout"
  | "auth.password_changed"
  | "auth.2fa_enabled"
  | "auth.2fa_disabled"
  // Dados
  | "data.export_requested"
  | "data.deletion_requested";

export type EntityType =
  | "automation"
  | "contact"
  | "user"
  | "team"
  | "subscription"
  | "export";

export interface AuditEvent {
  id: string;
  created_at: string;
  user_id: string;
  action: AuditAction;
  entity_type: EntityType;
  entity_id?: string | null;
  metadata: Record<string, unknown>;
  ip_address?: string | null;
  user_agent?: string | null;
  session_id?: string | null;
}

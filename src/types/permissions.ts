export type Permission =
  | "automations.create"
  | "automations.edit"
  | "automations.delete"
  | "automations.publish"
  | "contacts.import"
  | "contacts.export"
  | "contacts.delete"
  | "team.invite"
  | "team.remove"
  | "billing.manage"
  | "billing.view"
  | "analytics.view"
  | "settings.manage";

export type AppRole = "admin" | "moderator" | "user";

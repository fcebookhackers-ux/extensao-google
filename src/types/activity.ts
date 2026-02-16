 export type ActivityEventAction =
   | "automation.created"
   | "automation.published"
   | "automation.edited"
   | "webhook.created"
   | "webhook.failed"
   | "member.invited"
   | "member.joined"
   | "comment.added"
   | "contact.created"
   | "contact.imported";
 
 export interface ActivityEvent {
   id: string;
   user_id: string;
   action: string;
   entity_type: string;
   entity_id: string | null;
   metadata: Record<string, any>;
   created_at: string;
   workspace_id: string | null;
   user_agent: string | null;
   ip_address: string | null;
   session_id: string | null;
 }
 
 export interface ActivityFilters {
   eventType?: string;
   userId?: string;
   startDate?: string;
   endDate?: string;
 }
 
 export const ACTIVITY_TEMPLATES: Record<string, string> = {
   "automation.created": "{user} criou a automação \"{entity_name}\"",
   "automation.published": "{user} publicou \"{entity_name}\"",
   "automation.edited": "{user} editou \"{entity_name}\"",
   "webhook.created": "{user} cadastrou webhook \"{entity_name}\"",
   "webhook.failed": "Webhook \"{entity_name}\" falhou {count} vezes",
   "member.invited": "{user} convidou {invited_email}",
   "member.joined": "{user} entrou no workspace",
   "comment.added": "{user} comentou em \"{entity_name}\"",
   "contact.created": "{user} criou o contato \"{entity_name}\"",
   "contact.imported": "{user} importou {count} contatos",
 };
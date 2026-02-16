 export type SimulableEventType =
   | "message_received"
   | "contact_created"
   | "webhook_triggered"
   | "scheduled_time";
 
 export type SimulableEventData =
   | { event_type: "message_received"; contact_id: string; message_body: string; media_url?: string }
   | { event_type: "contact_created"; contact_id: string; name: string; phone: string }
   | { event_type: "webhook_triggered"; webhook_id: string; payload: Record<string, unknown> }
   | { event_type: "scheduled_time"; timestamp: string };
 
 export type SimulationStepLog = {
   step_index: number;
   block_id: string;
   block_type: string;
   block_title: string;
   input: Record<string, unknown>;
   output: Record<string, unknown>;
   transformations_applied: string[];
   duration_ms: number;
   status: "success" | "error" | "skipped";
   error_message?: string;
 };
 
 export type SimulationResult = {
   automation_id: string;
   automation_name: string;
   event_type: SimulableEventType;
   event_data: Record<string, unknown>;
   execution_log: SimulationStepLog[];
   total_duration_ms: number;
   dry_run: true;
   final_status: "completed" | "error";
 };
import { Lock } from "lucide-react";
import { useWebhookSecretStatus } from "@/hooks/useWebhookSecrets";

export function WebhookSecretBadge({ webhookId }: { webhookId: string }) {
  const { data } = useWebhookSecretStatus(webhookId);

  if (!data?.configured) return null;

  return (
    <span className="flex items-center gap-1">
      <Lock className="h-3 w-3" />
      Secret ••••{data.last4 ?? ""}
    </span>
  );
}

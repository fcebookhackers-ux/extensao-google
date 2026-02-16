import type { ExportStatus, DeletionStatus } from "@/types/privacy";

export function exportStatusLabel(status: ExportStatus) {
  switch (status) {
    case "pending":
      return "Pendente";
    case "processing":
      return "Processando";
    case "completed":
      return "Concluída";
    case "failed":
      return "Falhou";
    case "expired":
      return "Expirada";
    default:
      return status;
  }
}

export function deletionStatusLabel(status: DeletionStatus) {
  switch (status) {
    case "pending":
      return "Pendente";
    case "scheduled":
      return "Agendada";
    case "processing":
      return "Processando";
    case "completed":
      return "Concluída";
    case "cancelled":
      return "Cancelada";
    default:
      return status;
  }
}

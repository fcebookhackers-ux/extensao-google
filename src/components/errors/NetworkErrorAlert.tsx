import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export function NetworkErrorAlert() {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Erro de Conexão</AlertTitle>
      <AlertDescription>Não foi possível conectar ao servidor. Verifique sua internet.</AlertDescription>
    </Alert>
  );
}

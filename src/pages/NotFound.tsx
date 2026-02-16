import * as React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FileQuestion } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  React.useEffect(() => {
    // Sem console logs em produção; se quiser auditoria, conectar a um logger (ex: Sentry) futuramente.
    void location.pathname;
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      <EmptyState
        icon={<FileQuestion />}
        title="Página não encontrada"
        description="A página que você procura não existe ou foi movida"
        action={{ label: "Voltar ao Dashboard", onClick: () => navigate("/dashboard") }}
      />
    </div>
  );
};

export default NotFound;

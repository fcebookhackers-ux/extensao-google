import * as React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";
import { LoadingScreen } from "@/components/LoadingScreen";

export function ProtectedRoute({
  children,
  redirectTo = "/login",
}: {
  children: React.ReactNode;
  redirectTo?: string;
}) {
  const { user, loading, sessionChecked } = useAuth();
  const location = useLocation();

  // Estado 1: Ainda verificando sessão inicial (evita flash de conteúdo)
  if (!sessionChecked || loading) {
    return <LoadingScreen message="Verificando autenticação..." />;
  }

  // Estado 2: Sessão verificada, mas usuário não autenticado
  if (!user) {
    return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />;
  }

  // Estado 3: Usuário autenticado
  return <>{children}</>;
}


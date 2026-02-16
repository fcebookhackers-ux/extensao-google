import * as React from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/providers/AuthProvider";

export function useRequireAuth(redirectTo = "/login") {
  const { user, sessionChecked } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (sessionChecked && !user) {
      navigate(redirectTo, { replace: true });
    }
  }, [user, sessionChecked, navigate, redirectTo]);

  return { user, isAuthenticated: !!user };
}

import { DashboardPageShell } from "@/pages/dashboard/_DashboardPageShell";

import { SettingsPage } from "@/pages/dashboard/configuracoes/SettingsPage";

export default function DashboardConfiguracoes() {
  // Mantém compatibilidade: se algo falhar, ainda temos o shell como fallback.
  try {
    return <SettingsPage />;
  } catch {
    return <DashboardPageShell title="Configurações" description="Preferências e integrações" />;
  }
}

export interface AutomationVersion {
  id: string;
  automation_id: string;
  version_number: number;
  doc: any;
  created_at: string;
  user_id: string;
  published_at: string | null;
  published_by: string | null;
  is_current: boolean;
  rollback_from: string | null;
  change_summary: string | null;
  metadata: Record<string, any>;
}

export interface VersionWithUser extends AutomationVersion {
  // Observação: no plano/free + RLS, não acessamos auth.users diretamente.
  // Estes campos podem ser preenchidos no futuro via tabela public.profiles.
  created_by?: {
    email: string;
    id: string;
  };
  published_by_user?: {
    email: string;
    id: string;
  };
}

export interface VersionDiff {
  added: number;
  removed: number;
  modified: number;
  summary: string;
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      alert_configs: {
        Row: {
          alert_type: string
          channels: Json
          conditions: Json
          created_at: string
          enabled: boolean
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_type: string
          channels?: Json
          conditions?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_type?: string
          channels?: Json
          conditions?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      alert_history: {
        Row: {
          alert_config_id: string | null
          id: string
          message: string
          metadata: Json | null
          severity: string
          triggered_at: string
          user_id: string
        }
        Insert: {
          alert_config_id?: string | null
          id?: string
          message: string
          metadata?: Json | null
          severity?: string
          triggered_at?: string
          user_id: string
        }
        Update: {
          alert_config_id?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          severity?: string
          triggered_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_history_alert_config_id_fkey"
            columns: ["alert_config_id"]
            isOneToOne: false
            referencedRelation: "alert_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          automation_id: string | null
          contact_id: string | null
          created_at: string
          event_properties: Json
          event_type: string
          id: string
          session_id: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          automation_id?: string | null
          contact_id?: string | null
          created_at?: string
          event_properties?: Json
          event_type: string
          id?: string
          session_id?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          automation_id?: string | null
          contact_id?: string | null
          created_at?: string
          event_properties?: Json
          event_type?: string
          id?: string
          session_id?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automation_metrics"
            referencedColumns: ["automation_id"]
          },
          {
            foreignKeyName: "analytics_events_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      app_encryption_keys: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          key_bytes: string
          key_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          key_bytes: string
          key_name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          key_bytes?: string
          key_name?: string
        }
        Relationships: []
      }
      audit_events: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown
          metadata: Json
          session_id: string | null
          user_agent: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown
          metadata?: Json
          session_id?: string | null
          user_agent?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown
          metadata?: Json
          session_id?: string | null
          user_agent?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_execution_events: {
        Row: {
          automation_id: string | null
          created_at: string
          duration_ms: number | null
          error_code: string | null
          id: string
          status: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          automation_id?: string | null
          created_at?: string
          duration_ms?: number | null
          error_code?: string | null
          id?: string
          status: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          automation_id?: string | null
          created_at?: string
          duration_ms?: number | null
          error_code?: string | null
          id?: string
          status?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      automation_templates: {
        Row: {
          category: string | null
          configuration: Json
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_public: boolean
          name: string
          rating_avg: number | null
          tags: string[]
          updated_at: string
          use_count: number
        }
        Insert: {
          category?: string | null
          configuration: Json
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_public?: boolean
          name: string
          rating_avg?: number | null
          tags?: string[]
          updated_at?: string
          use_count?: number
        }
        Update: {
          category?: string | null
          configuration?: Json
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name?: string
          rating_avg?: number | null
          tags?: string[]
          updated_at?: string
          use_count?: number
        }
        Relationships: []
      }
      automation_variables: {
        Row: {
          automation_id: string
          created_at: string
          default_value: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
          var_type: Database["public"]["Enums"]["flow_var_type"]
        }
        Insert: {
          automation_id: string
          created_at?: string
          default_value?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
          var_type: Database["public"]["Enums"]["flow_var_type"]
        }
        Update: {
          automation_id?: string
          created_at?: string
          default_value?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
          var_type?: Database["public"]["Enums"]["flow_var_type"]
        }
        Relationships: []
      }
      automation_versions: {
        Row: {
          automation_id: string
          change_summary: string | null
          created_at: string
          doc: Json
          id: string
          is_current: boolean
          label: string | null
          metadata: Json
          published_at: string | null
          published_by: string | null
          rollback_from: string | null
          user_id: string
          version_number: number
        }
        Insert: {
          automation_id: string
          change_summary?: string | null
          created_at?: string
          doc: Json
          id?: string
          is_current?: boolean
          label?: string | null
          metadata?: Json
          published_at?: string | null
          published_by?: string | null
          rollback_from?: string | null
          user_id: string
          version_number: number
        }
        Update: {
          automation_id?: string
          change_summary?: string | null
          created_at?: string
          doc?: Json
          id?: string
          is_current?: boolean
          label?: string | null
          metadata?: Json
          published_at?: string | null
          published_by?: string | null
          rollback_from?: string | null
          user_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "automation_versions_rollback_from_fkey"
            columns: ["rollback_from"]
            isOneToOne: false
            referencedRelation: "automation_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      automations: {
        Row: {
          created_at: string
          description: string | null
          doc: Json
          global_config: Json
          id: string
          name: string
          status: Database["public"]["Enums"]["automation_status"]
          tags_library: string[]
          trigger: Json
          updated_at: string
          user_id: string
          workspace_id: string | null
          yjs_state: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          doc?: Json
          global_config?: Json
          id?: string
          name: string
          status?: Database["public"]["Enums"]["automation_status"]
          tags_library?: string[]
          trigger?: Json
          updated_at?: string
          user_id: string
          workspace_id?: string | null
          yjs_state?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          doc?: Json
          global_config?: Json
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["automation_status"]
          tags_library?: string[]
          trigger?: Json
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
          yjs_state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      circuit_breaker_config: {
        Row: {
          created_at: string
          failure_threshold: number
          half_open_max_calls: number
          id: string
          open_timeout_seconds: number
          success_threshold: number
        }
        Insert: {
          created_at?: string
          failure_threshold?: number
          half_open_max_calls?: number
          id?: string
          open_timeout_seconds?: number
          success_threshold?: number
        }
        Update: {
          created_at?: string
          failure_threshold?: number
          half_open_max_calls?: number
          id?: string
          open_timeout_seconds?: number
          success_threshold?: number
        }
        Relationships: []
      }
      cleanup_logs: {
        Row: {
          cutoff_at: string
          deleted_count: number
          deletion_strategy: Database["public"]["Enums"]["retention_deletion_strategy"]
          entity_type: Database["public"]["Enums"]["retention_entity_type"]
          executed_at: string
          execution_time_ms: number | null
          id: string
          policy_id: string | null
          workspace_id: string | null
        }
        Insert: {
          cutoff_at: string
          deleted_count?: number
          deletion_strategy: Database["public"]["Enums"]["retention_deletion_strategy"]
          entity_type: Database["public"]["Enums"]["retention_entity_type"]
          executed_at?: string
          execution_time_ms?: number | null
          id?: string
          policy_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          cutoff_at?: string
          deleted_count?: number
          deletion_strategy?: Database["public"]["Enums"]["retention_deletion_strategy"]
          entity_type?: Database["public"]["Enums"]["retention_entity_type"]
          executed_at?: string
          execution_time_ms?: number | null
          id?: string
          policy_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cleanup_logs_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "data_retention_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      cleanup_metrics: {
        Row: {
          deleted_audit_events_count: number
          deleted_exports_count: number
          deleted_orphan_uploads_count: number
          deleted_rate_limit_events_count: number
          deleted_webhook_logs_count: number
          details: Json
          error_message: string | null
          freed_bytes: number
          id: string
          run_at: string
          status: string
        }
        Insert: {
          deleted_audit_events_count?: number
          deleted_exports_count?: number
          deleted_orphan_uploads_count?: number
          deleted_rate_limit_events_count?: number
          deleted_webhook_logs_count?: number
          details?: Json
          error_message?: string | null
          freed_bytes?: number
          id?: string
          run_at?: string
          status?: string
        }
        Update: {
          deleted_audit_events_count?: number
          deleted_exports_count?: number
          deleted_orphan_uploads_count?: number
          deleted_rate_limit_events_count?: number
          deleted_webhook_logs_count?: number
          details?: Json
          error_message?: string | null
          freed_bytes?: number
          id?: string
          run_at?: string
          status?: string
        }
        Relationships: []
      }
      cloud_integrations: {
        Row: {
          access_token_secret_id: string
          auto_sync_enabled: boolean
          created_at: string
          expires_at: string | null
          folder_id: string | null
          folder_name: string | null
          id: string
          last_sync_at: string | null
          provider: Database["public"]["Enums"]["cloud_provider"]
          refresh_token_secret_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token_secret_id: string
          auto_sync_enabled?: boolean
          created_at?: string
          expires_at?: string | null
          folder_id?: string | null
          folder_name?: string | null
          id?: string
          last_sync_at?: string | null
          provider: Database["public"]["Enums"]["cloud_provider"]
          refresh_token_secret_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token_secret_id?: string
          auto_sync_enabled?: boolean
          created_at?: string
          expires_at?: string | null
          folder_id?: string | null
          folder_name?: string | null
          id?: string
          last_sync_at?: string | null
          provider?: Database["public"]["Enums"]["cloud_provider"]
          refresh_token_secret_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cloud_sync_history: {
        Row: {
          bytes_synced: number
          completed_at: string | null
          error_message: string | null
          files_synced: number
          id: string
          integration_id: string
          started_at: string
          status: Database["public"]["Enums"]["sync_status"]
          sync_type: string
          user_id: string
        }
        Insert: {
          bytes_synced?: number
          completed_at?: string | null
          error_message?: string | null
          files_synced?: number
          id?: string
          integration_id: string
          started_at?: string
          status?: Database["public"]["Enums"]["sync_status"]
          sync_type: string
          user_id: string
        }
        Update: {
          bytes_synced?: number
          completed_at?: string | null
          error_message?: string | null
          files_synced?: number
          id?: string
          integration_id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["sync_status"]
          sync_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cloud_sync_history_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "cloud_integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_history: {
        Row: {
          consent_type: string
          granted: boolean
          granted_at: string
          id: string
          ip_address: unknown
          metadata: Json
          policy_version: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          consent_type: string
          granted: boolean
          granted_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json
          policy_version: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          consent_type?: string
          granted?: boolean
          granted_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json
          policy_version?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          ai_category_suggestion: string | null
          ai_enriched_at: string | null
          ai_name_suggestion: string | null
          ai_review_status: string
          ai_reviewed_at: string | null
          ai_sentiment_suggestion: string | null
          ai_summary_suggestion: string | null
          ai_tags_suggestion: string[]
          created_at: string
          custom_fields: Json
          email: string | null
          id: string
          name: string
          phone: string | null
          search_vector: unknown
          status: string
          tags: string[]
          updated_at: string
          user_id: string
          workspace_id: string | null
          yjs_state: string | null
        }
        Insert: {
          ai_category_suggestion?: string | null
          ai_enriched_at?: string | null
          ai_name_suggestion?: string | null
          ai_review_status?: string
          ai_reviewed_at?: string | null
          ai_sentiment_suggestion?: string | null
          ai_summary_suggestion?: string | null
          ai_tags_suggestion?: string[]
          created_at?: string
          custom_fields?: Json
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          search_vector?: unknown
          status?: string
          tags?: string[]
          updated_at?: string
          user_id: string
          workspace_id?: string | null
          yjs_state?: string | null
        }
        Update: {
          ai_category_suggestion?: string | null
          ai_enriched_at?: string | null
          ai_name_suggestion?: string | null
          ai_review_status?: string
          ai_reviewed_at?: string | null
          ai_sentiment_suggestion?: string | null
          ai_summary_suggestion?: string | null
          ai_tags_suggestion?: string[]
          created_at?: string
          custom_fields?: Json
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          search_vector?: unknown
          status?: string
          tags?: string[]
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
          yjs_state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      cookie_preferences: {
        Row: {
          analytics: boolean
          consent_version: string
          created_at: string
          decided_at: string
          essential: boolean
          functional: boolean
          id: string
          marketing: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          analytics?: boolean
          consent_version?: string
          created_at?: string
          decided_at?: string
          essential?: boolean
          functional?: boolean
          id?: string
          marketing?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          analytics?: boolean
          consent_version?: string
          created_at?: string
          decided_at?: string
          essential?: boolean
          functional?: boolean
          id?: string
          marketing?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      data_deletion_requests: {
        Row: {
          attempt_count: number
          backup_location: string | null
          cancelled_at: string | null
          completed_at: string | null
          error_message: string | null
          id: string
          last_attempt_at: string | null
          metadata: Json
          reason: string | null
          requested_at: string
          scheduled_for: string
          status: string
          user_id: string
        }
        Insert: {
          attempt_count?: number
          backup_location?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          error_message?: string | null
          id?: string
          last_attempt_at?: string | null
          metadata?: Json
          reason?: string | null
          requested_at?: string
          scheduled_for: string
          status: string
          user_id: string
        }
        Update: {
          attempt_count?: number
          backup_location?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          error_message?: string | null
          id?: string
          last_attempt_at?: string | null
          metadata?: Json
          reason?: string | null
          requested_at?: string
          scheduled_for?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      data_export_requests: {
        Row: {
          completed_at: string | null
          download_url: string | null
          error_message: string | null
          expires_at: string | null
          file_path: string | null
          file_size_bytes: number | null
          id: string
          metadata: Json
          requested_at: string
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          download_url?: string | null
          error_message?: string | null
          expires_at?: string | null
          file_path?: string | null
          file_size_bytes?: number | null
          id?: string
          metadata?: Json
          requested_at?: string
          status: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          download_url?: string | null
          error_message?: string | null
          expires_at?: string | null
          file_path?: string | null
          file_size_bytes?: number | null
          id?: string
          metadata?: Json
          requested_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      data_retention_policies: {
        Row: {
          apply_to_workspace_id: string | null
          created_at: string
          deletion_strategy: Database["public"]["Enums"]["retention_deletion_strategy"]
          entity_type: Database["public"]["Enums"]["retention_entity_type"]
          id: string
          is_global: boolean
          retention_days: number
          updated_at: string
        }
        Insert: {
          apply_to_workspace_id?: string | null
          created_at?: string
          deletion_strategy?: Database["public"]["Enums"]["retention_deletion_strategy"]
          entity_type: Database["public"]["Enums"]["retention_entity_type"]
          id?: string
          is_global?: boolean
          retention_days: number
          updated_at?: string
        }
        Update: {
          apply_to_workspace_id?: string | null
          created_at?: string
          deletion_strategy?: Database["public"]["Enums"]["retention_deletion_strategy"]
          entity_type?: Database["public"]["Enums"]["retention_entity_type"]
          id?: string
          is_global?: boolean
          retention_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      entity_comment_reads: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          last_read_at: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          last_read_at?: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          last_read_at?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_comment_reads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_comments: {
        Row: {
          comment_text: string
          created_at: string
          deleted_at: string | null
          entity_id: string
          entity_type: string
          id: string
          parent_comment_id: string | null
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          comment_text: string
          created_at?: string
          deleted_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          parent_comment_id?: string | null
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          comment_text?: string
          created_at?: string
          deleted_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          parent_comment_id?: string | null
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "entity_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_comments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      export_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          expires_at: string | null
          export_type: string
          file_size: number | null
          file_url: string | null
          filters: Json | null
          format: Database["public"]["Enums"]["export_format"]
          id: string
          records_count: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["export_status"]
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          expires_at?: string | null
          export_type: string
          file_size?: number | null
          file_url?: string | null
          filters?: Json | null
          format: Database["public"]["Enums"]["export_format"]
          id?: string
          records_count?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["export_status"]
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          expires_at?: string | null
          export_type?: string
          file_size?: number | null
          file_url?: string | null
          filters?: Json | null
          format?: Database["public"]["Enums"]["export_format"]
          id?: string
          records_count?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["export_status"]
          user_id?: string
        }
        Relationships: []
      }
      immutable_audit_log: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: unknown
          metadata: Json
          user_agent: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json
          user_agent?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json
          user_agent?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "immutable_audit_log_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      media_folders: {
        Row: {
          color: string
          created_at: string
          icon: string | null
          id: string
          name: string
          parent_id: string | null
          position: number
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          parent_id?: string | null
          position?: number
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          position?: number
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "media_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_folders_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      media_library: {
        Row: {
          created_at: string | null
          duration: number | null
          file_name: string
          file_size: number
          file_type: string
          folder_id: string | null
          height: number | null
          id: string
          metadata: Json | null
          mime_type: string
          public_url: string
          storage_path: string
          tags: string[] | null
          thumbnail_url: string | null
          updated_at: string | null
          user_id: string
          width: number | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          duration?: number | null
          file_name: string
          file_size: number
          file_type: string
          folder_id?: string | null
          height?: number | null
          id?: string
          metadata?: Json | null
          mime_type: string
          public_url: string
          storage_path: string
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string | null
          user_id: string
          width?: number | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          duration?: number | null
          file_name?: string
          file_size?: number
          file_type?: string
          folder_id?: string | null
          height?: number | null
          id?: string
          metadata?: Json | null
          mime_type?: string
          public_url?: string
          storage_path?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string | null
          user_id?: string
          width?: number | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_library_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "media_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_library_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      media_tag_assignments: {
        Row: {
          created_at: string
          id: string
          media_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          media_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          id?: string
          media_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_tag_assignments_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "media_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      media_tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_tags_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          body: string
          created_at: string
          description: string | null
          id: string
          name: string
          status: string
          updated_at: string
          user_id: string
          variables: string[]
          workspace_id: string | null
        }
        Insert: {
          body: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          status?: string
          updated_at?: string
          user_id: string
          variables?: string[]
          workspace_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: string
          updated_at?: string
          user_id?: string
          variables?: string[]
          workspace_id?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          contact_id: string
          content: string
          created_at: string
          direction: string
          id: string
          metadata: Json
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_id: string
          content: string
          created_at?: string
          direction?: string
          id?: string
          metadata?: Json
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          contact_id?: string
          content?: string
          created_at?: string
          direction?: string
          id?: string
          metadata?: Json
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_contact_fk"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_digest_frequency: string
          email_notifications_enabled: boolean
          id: string
          media_processing_complete_enabled: boolean
          media_processing_failed_enabled: boolean
          security_alert_enabled: boolean
          storage_quota_critical_enabled: boolean
          storage_quota_warning_enabled: boolean
          system_announcement_enabled: boolean
          updated_at: string
          user_id: string
          webhook_circuit_open_enabled: boolean
          webhook_failure_enabled: boolean
        }
        Insert: {
          created_at?: string
          email_digest_frequency?: string
          email_notifications_enabled?: boolean
          id?: string
          media_processing_complete_enabled?: boolean
          media_processing_failed_enabled?: boolean
          security_alert_enabled?: boolean
          storage_quota_critical_enabled?: boolean
          storage_quota_warning_enabled?: boolean
          system_announcement_enabled?: boolean
          updated_at?: string
          user_id: string
          webhook_circuit_open_enabled?: boolean
          webhook_failure_enabled?: boolean
        }
        Update: {
          created_at?: string
          email_digest_frequency?: string
          email_notifications_enabled?: boolean
          id?: string
          media_processing_complete_enabled?: boolean
          media_processing_failed_enabled?: boolean
          security_alert_enabled?: boolean
          storage_quota_critical_enabled?: boolean
          storage_quota_warning_enabled?: boolean
          system_announcement_enabled?: boolean
          updated_at?: string
          user_id?: string
          webhook_circuit_open_enabled?: boolean
          webhook_failure_enabled?: boolean
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_label: string | null
          action_url: string | null
          archived: boolean
          archived_at: string | null
          created_at: string
          expires_at: string | null
          id: string
          message: string
          metadata: Json | null
          priority: Database["public"]["Enums"]["notification_priority"]
          read: boolean
          read_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          archived?: boolean
          archived_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          priority?: Database["public"]["Enums"]["notification_priority"]
          read?: boolean
          read_at?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          archived?: boolean
          archived_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          priority?: Database["public"]["Enums"]["notification_priority"]
          read?: boolean
          read_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: []
      }
      onboarding_progress: {
        Row: {
          completed_at: string
          id: string
          metadata: Json
          step_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          metadata?: Json
          step_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          metadata?: Json
          step_id?: string
          user_id?: string
        }
        Relationships: []
      }
      policy_versions: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          effective_from: string
          id: string
          policy_type: string
          version: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          effective_from?: string
          id?: string
          policy_type: string
          version: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          effective_from?: string
          id?: string
          policy_type?: string
          version?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          deleted_at: string | null
          email: string
          id: string
          is_deleted: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          email: string
          id?: string
          is_deleted?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          email?: string
          id?: string
          is_deleted?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rate_limit_config: {
        Row: {
          created_at: string
          description: string | null
          endpoint: string
          id: string
          max_requests: number
          updated_at: string
          window_seconds: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          endpoint: string
          id?: string
          max_requests?: number
          updated_at?: string
          window_seconds?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          endpoint?: string
          id?: string
          max_requests?: number
          updated_at?: string
          window_seconds?: number
        }
        Relationships: []
      }
      rate_limit_counters_v2: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          identifier: string
          request_count: number
          rule_id: string
          updated_at: string
          window_start: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          identifier: string
          request_count?: number
          rule_id: string
          updated_at?: string
          window_start: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          identifier?: string
          request_count?: number
          rule_id?: string
          updated_at?: string
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "rate_limit_counters_v2_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "rate_limit_rules_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_events: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          ip_address: unknown
          metadata: Json
          user_id: string | null
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          ip_address?: unknown
          metadata?: Json
          user_id?: string | null
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          ip_address?: unknown
          metadata?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      rate_limit_rules_v2: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          is_active: boolean
          limit_type: string
          max_requests: number
          tier: string | null
          updated_at: string
          window_seconds: number
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          is_active?: boolean
          limit_type: string
          max_requests: number
          tier?: string | null
          updated_at?: string
          window_seconds: number
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          is_active?: boolean
          limit_type?: string
          max_requests?: number
          tier?: string | null
          updated_at?: string
          window_seconds?: number
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission: Database["public"]["Enums"]["permission_type"]
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          id?: string
          permission: Database["public"]["Enums"]["permission_type"]
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          id?: string
          permission?: Database["public"]["Enums"]["permission_type"]
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      saved_searches: {
        Row: {
          created_at: string
          description: string | null
          filters: Json
          id: string
          is_favorite: boolean
          last_used_at: string | null
          name: string
          search_type: string
          updated_at: string
          use_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          filters: Json
          id?: string
          is_favorite?: boolean
          last_used_at?: string | null
          name: string
          search_type: string
          updated_at?: string
          use_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          filters?: Json
          id?: string
          is_favorite?: boolean
          last_used_at?: string | null
          name?: string
          search_type?: string
          updated_at?: string
          use_count?: number
          user_id?: string
        }
        Relationships: []
      }
      scheduled_automations: {
        Row: {
          automation_id: string
          created_at: string
          enabled: boolean
          id: string
          last_run_at: string | null
          next_run_at: string | null
          schedule_config: Json
          schedule_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          automation_id: string
          created_at?: string
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          next_run_at?: string | null
          schedule_config?: Json
          schedule_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          automation_id?: string
          created_at?: string
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          next_run_at?: string | null
          schedule_config?: Json
          schedule_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_automations_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automation_metrics"
            referencedColumns: ["automation_id"]
          },
          {
            foreignKeyName: "scheduled_automations_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
        ]
      }
      signed_url_cache: {
        Row: {
          created_at: string
          expires_at: string
          file_path: string
          id: string
          signed_url: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          file_path: string
          id?: string
          signed_url: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          file_path?: string
          id?: string
          signed_url?: string
        }
        Relationships: []
      }
      sli_metrics: {
        Row: {
          created_at: string
          domain: string
          id: string
          metric_name: string
          target: number
          value: number
          window_end: string
          window_start: string
        }
        Insert: {
          created_at?: string
          domain: string
          id?: string
          metric_name: string
          target: number
          value: number
          window_end: string
          window_start: string
        }
        Update: {
          created_at?: string
          domain?: string
          id?: string
          metric_name?: string
          target?: number
          value?: number
          window_end?: string
          window_start?: string
        }
        Relationships: []
      }
      sync_events: {
        Row: {
          created_at: string
          duration_ms: number | null
          entity_type: string
          error_code: string | null
          id: string
          status: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          entity_type: string
          error_code?: string | null
          id?: string
          status: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          entity_type?: string
          error_code?: string | null
          id?: string
          status?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      template_installs: {
        Row: {
          automation_id: string | null
          id: string
          installed_at: string
          template_id: string
          user_id: string
        }
        Insert: {
          automation_id?: string | null
          id?: string
          installed_at?: string
          template_id: string
          user_id: string
        }
        Update: {
          automation_id?: string | null
          id?: string
          installed_at?: string
          template_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_installs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "automation_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_ratings: {
        Row: {
          created_at: string
          id: string
          rating: number
          review: string | null
          template_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          rating: number
          review?: string | null
          template_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          rating?: number
          review?: string | null
          template_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_ratings_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "automation_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      trial_access: {
        Row: {
          created_at: string
          id: string
          override_unlimited: boolean
          subscribed_until: string | null
          trial_days: number
          trial_started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          override_unlimited?: boolean
          subscribed_until?: string | null
          trial_days?: number
          trial_started_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          override_unlimited?: boolean
          subscribed_until?: string | null
          trial_days?: number
          trial_started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      upload_events: {
        Row: {
          created_at: string
          error_code: string | null
          id: string
          status: string
          user_id: string
          validation_duration_ms: number | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          error_code?: string | null
          id?: string
          status: string
          user_id: string
          validation_duration_ms?: number | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          error_code?: string | null
          id?: string
          status?: string
          user_id?: string
          validation_duration_ms?: number | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      user_consents: {
        Row: {
          consent_type: string
          created_at: string
          granted: boolean
          granted_at: string | null
          id: string
          ip_address: string | null
          metadata: Json
          revoked_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          consent_type: string
          created_at?: string
          granted: boolean
          granted_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json
          revoked_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          consent_type?: string
          created_at?: string
          granted?: boolean
          granted_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json
          revoked_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_storage_quotas: {
        Row: {
          created_at: string
          file_count: number
          id: string
          max_file_count: number
          max_size_bytes: number
          total_size_bytes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_count?: number
          id?: string
          max_file_count?: number
          max_size_bytes?: number
          total_size_bytes?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_count?: number
          id?: string
          max_file_count?: number
          max_size_bytes?: number
          total_size_bytes?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      webhook_circuit_breaker: {
        Row: {
          consecutive_failures: number
          consecutive_successes: number
          created_at: string
          failure_count: number
          half_opened_at: string | null
          id: string
          last_failure_at: string | null
          last_success_at: string | null
          opened_at: string | null
          state: Database["public"]["Enums"]["circuit_breaker_state"]
          success_count: number
          updated_at: string
          webhook_id: string
        }
        Insert: {
          consecutive_failures?: number
          consecutive_successes?: number
          created_at?: string
          failure_count?: number
          half_opened_at?: string | null
          id?: string
          last_failure_at?: string | null
          last_success_at?: string | null
          opened_at?: string | null
          state?: Database["public"]["Enums"]["circuit_breaker_state"]
          success_count?: number
          updated_at?: string
          webhook_id: string
        }
        Update: {
          consecutive_failures?: number
          consecutive_successes?: number
          created_at?: string
          failure_count?: number
          half_opened_at?: string | null
          id?: string
          last_failure_at?: string | null
          last_success_at?: string | null
          opened_at?: string | null
          state?: Database["public"]["Enums"]["circuit_breaker_state"]
          success_count?: number
          updated_at?: string
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_circuit_breaker_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: true
            referencedRelation: "webhook_analytics_summary"
            referencedColumns: ["webhook_id"]
          },
          {
            foreignKeyName: "webhook_circuit_breaker_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: true
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_conditions: {
        Row: {
          created_at: string
          field_path: string
          id: string
          logic_operator: string
          operator: string
          position: number
          value: string
          webhook_id: string
        }
        Insert: {
          created_at?: string
          field_path: string
          id?: string
          logic_operator?: string
          operator: string
          position?: number
          value?: string
          webhook_id: string
        }
        Update: {
          created_at?: string
          field_path?: string
          id?: string
          logic_operator?: string
          operator?: string
          position?: number
          value?: string
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_conditions_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhook_analytics_summary"
            referencedColumns: ["webhook_id"]
          },
          {
            foreignKeyName: "webhook_conditions_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_domain_allowlist: {
        Row: {
          created_at: string
          created_by: string
          domain: string
          id: string
          is_active: boolean
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          domain: string
          id?: string
          is_active?: boolean
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          domain?: string
          id?: string
          is_active?: boolean
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_domain_allowlist_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          event_type: string
          id: string
          last_error: string | null
          max_retries: number
          next_retry_at: string | null
          payload: Json
          retry_count: number
          started_at: string | null
          status: string
          webhook_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          event_type: string
          id?: string
          last_error?: string | null
          max_retries?: number
          next_retry_at?: string | null
          payload: Json
          retry_count?: number
          started_at?: string | null
          status?: string
          webhook_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          event_type?: string
          id?: string
          last_error?: string | null
          max_retries?: number
          next_retry_at?: string | null
          payload?: Json
          retry_count?: number
          started_at?: string | null
          status?: string
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_jobs_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhook_analytics_summary"
            referencedColumns: ["webhook_id"]
          },
          {
            foreignKeyName: "webhook_jobs_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_logs: {
        Row: {
          attempt_number: number | null
          duration_ms: number | null
          error_message: string | null
          event_type: string
          executed_at: string | null
          id: string
          payload: Json
          request_headers: Json | null
          response_body: string | null
          response_headers: Json | null
          response_status: number | null
          status_text: string | null
          success: boolean | null
          webhook_id: string
        }
        Insert: {
          attempt_number?: number | null
          duration_ms?: number | null
          error_message?: string | null
          event_type: string
          executed_at?: string | null
          id?: string
          payload: Json
          request_headers?: Json | null
          response_body?: string | null
          response_headers?: Json | null
          response_status?: number | null
          status_text?: string | null
          success?: boolean | null
          webhook_id: string
        }
        Update: {
          attempt_number?: number | null
          duration_ms?: number | null
          error_message?: string | null
          event_type?: string
          executed_at?: string | null
          id?: string
          payload?: Json
          request_headers?: Json | null
          response_body?: string | null
          response_headers?: Json | null
          response_status?: number | null
          status_text?: string | null
          success?: boolean | null
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhook_analytics_summary"
            referencedColumns: ["webhook_id"]
          },
          {
            foreignKeyName: "webhook_logs_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_rate_limit: {
        Row: {
          created_at: string
          id: string
          max_requests: number
          request_count: number
          webhook_id: string
          window_duration_seconds: number
          window_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_requests?: number
          request_count?: number
          webhook_id: string
          window_duration_seconds?: number
          window_start: string
        }
        Update: {
          created_at?: string
          id?: string
          max_requests?: number
          request_count?: number
          webhook_id?: string
          window_duration_seconds?: number
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_rate_limit_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhook_analytics_summary"
            referencedColumns: ["webhook_id"]
          },
          {
            foreignKeyName: "webhook_rate_limit_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_retry_config: {
        Row: {
          backoff_multiplier: number
          created_at: string
          id: string
          initial_delay_seconds: number
          max_attempts: number
          max_delay_seconds: number
          retry_on_status_codes: number[]
          stop_on_status_codes: number[]
          updated_at: string
          webhook_id: string
        }
        Insert: {
          backoff_multiplier?: number
          created_at?: string
          id?: string
          initial_delay_seconds?: number
          max_attempts?: number
          max_delay_seconds?: number
          retry_on_status_codes?: number[]
          stop_on_status_codes?: number[]
          updated_at?: string
          webhook_id: string
        }
        Update: {
          backoff_multiplier?: number
          created_at?: string
          id?: string
          initial_delay_seconds?: number
          max_attempts?: number
          max_delay_seconds?: number
          retry_on_status_codes?: number[]
          stop_on_status_codes?: number[]
          updated_at?: string
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_retry_config_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: true
            referencedRelation: "webhook_analytics_summary"
            referencedColumns: ["webhook_id"]
          },
          {
            foreignKeyName: "webhook_retry_config_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: true
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_retry_queue: {
        Row: {
          attempt_number: number
          created_at: string
          event_type: string
          id: string
          last_error: string | null
          max_attempts: number
          next_retry_at: string | null
          payload: Json
          status: Database["public"]["Enums"]["retry_status"]
          updated_at: string
          webhook_id: string
          webhook_log_id: string | null
        }
        Insert: {
          attempt_number?: number
          created_at?: string
          event_type: string
          id?: string
          last_error?: string | null
          max_attempts?: number
          next_retry_at?: string | null
          payload: Json
          status?: Database["public"]["Enums"]["retry_status"]
          updated_at?: string
          webhook_id: string
          webhook_log_id?: string | null
        }
        Update: {
          attempt_number?: number
          created_at?: string
          event_type?: string
          id?: string
          last_error?: string | null
          max_attempts?: number
          next_retry_at?: string | null
          payload?: Json
          status?: Database["public"]["Enums"]["retry_status"]
          updated_at?: string
          webhook_id?: string
          webhook_log_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_retry_queue_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhook_analytics_summary"
            referencedColumns: ["webhook_id"]
          },
          {
            foreignKeyName: "webhook_retry_queue_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_retry_queue_webhook_log_id_fkey"
            columns: ["webhook_log_id"]
            isOneToOne: false
            referencedRelation: "webhook_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_secrets: {
        Row: {
          active: boolean
          claimed_at: string | null
          created_at: string
          encrypted_value: string
          expires_at: string
          grace_expires_at: string
          id: string
          rotated_at: string
          secret_last4: string
          user_id: string
          webhook_id: string
        }
        Insert: {
          active?: boolean
          claimed_at?: string | null
          created_at?: string
          encrypted_value: string
          expires_at?: string
          grace_expires_at?: string
          id?: string
          rotated_at?: string
          secret_last4: string
          user_id: string
          webhook_id: string
        }
        Update: {
          active?: boolean
          claimed_at?: string | null
          created_at?: string
          encrypted_value?: string
          expires_at?: string
          grace_expires_at?: string
          id?: string
          rotated_at?: string
          secret_last4?: string
          user_id?: string
          webhook_id?: string
        }
        Relationships: []
      }
      webhook_signature_nonces: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          signature_hex: string
          timestamp_ms: number
          webhook_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          signature_hex: string
          timestamp_ms: number
          webhook_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          signature_hex?: string
          timestamp_ms?: number
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_signature_nonces_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhook_analytics_summary"
            referencedColumns: ["webhook_id"]
          },
          {
            foreignKeyName: "webhook_signature_nonces_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_templates: {
        Row: {
          auth_type: string | null
          config_schema: Json | null
          created_at: string
          default_events: string[]
          default_headers: Json
          description: string | null
          documentation_url: string | null
          example_url: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          payload_template: Json | null
          provider: Database["public"]["Enums"]["webhook_provider"]
          requires_auth: boolean
          updated_at: string
        }
        Insert: {
          auth_type?: string | null
          config_schema?: Json | null
          created_at?: string
          default_events?: string[]
          default_headers?: Json
          description?: string | null
          documentation_url?: string | null
          example_url?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          payload_template?: Json | null
          provider: Database["public"]["Enums"]["webhook_provider"]
          requires_auth?: boolean
          updated_at?: string
        }
        Update: {
          auth_type?: string | null
          config_schema?: Json | null
          created_at?: string
          default_events?: string[]
          default_headers?: Json
          description?: string | null
          documentation_url?: string | null
          example_url?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          payload_template?: Json | null
          provider?: Database["public"]["Enums"]["webhook_provider"]
          requires_auth?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      webhook_validation_blocks: {
        Row: {
          blocked_reason: string
          created_at: string
          id: string
          ip_address: unknown
          resolved_ips: string[] | null
          url: string
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          blocked_reason: string
          created_at?: string
          id?: string
          ip_address?: unknown
          resolved_ips?: string[] | null
          url: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          blocked_reason?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          resolved_ips?: string[] | null
          url?: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      webhooks: {
        Row: {
          conditions: Json | null
          created_at: string | null
          enable_conditions: boolean
          enable_transformation: boolean
          events: string[]
          headers: Json | null
          id: string
          is_active: boolean | null
          metadata: Json
          name: string
          payload_template: Json | null
          rate_limit_per_minute: number
          retry_config: Json | null
          secret: string | null
          template_id: string | null
          template_provider:
            | Database["public"]["Enums"]["webhook_provider"]
            | null
          timeout_seconds: number
          transformation_script: string | null
          updated_at: string | null
          url: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          conditions?: Json | null
          created_at?: string | null
          enable_conditions?: boolean
          enable_transformation?: boolean
          events: string[]
          headers?: Json | null
          id?: string
          is_active?: boolean | null
          metadata?: Json
          name: string
          payload_template?: Json | null
          rate_limit_per_minute?: number
          retry_config?: Json | null
          secret?: string | null
          template_id?: string | null
          template_provider?:
            | Database["public"]["Enums"]["webhook_provider"]
            | null
          timeout_seconds?: number
          transformation_script?: string | null
          updated_at?: string | null
          url: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          conditions?: Json | null
          created_at?: string | null
          enable_conditions?: boolean
          enable_transformation?: boolean
          events?: string[]
          headers?: Json | null
          id?: string
          is_active?: boolean | null
          metadata?: Json
          name?: string
          payload_template?: Json | null
          rate_limit_per_minute?: number
          retry_config?: Json | null
          secret?: string | null
          template_id?: string | null
          template_provider?:
            | Database["public"]["Enums"]["webhook_provider"]
            | null
          timeout_seconds?: number
          transformation_script?: string | null
          updated_at?: string | null
          url?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "webhook_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversations: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          last_message_at: string | null
          last_message_content: string | null
          last_message_from_me: boolean | null
          status: string
          unread_count: number
          updated_at: string
          whatsapp_instance_id: string
          workspace_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_content?: string | null
          last_message_from_me?: boolean | null
          status?: string
          unread_count?: number
          updated_at?: string
          whatsapp_instance_id: string
          workspace_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_content?: string | null
          last_message_from_me?: boolean | null
          status?: string
          unread_count?: number
          updated_at?: string
          whatsapp_instance_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_whatsapp_instance_id_fkey"
            columns: ["whatsapp_instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_instances: {
        Row: {
          connected_at: string | null
          created_at: string
          error_message: string | null
          evolution_instance_id: string | null
          id: string
          instance_name: string
          last_seen_at: string | null
          phone_number: string | null
          profile_name: string | null
          profile_picture_url: string | null
          qr_code: string | null
          status: string
          updated_at: string
          webhook_events: string[]
          webhook_url: string | null
          workspace_id: string
        }
        Insert: {
          connected_at?: string | null
          created_at?: string
          error_message?: string | null
          evolution_instance_id?: string | null
          id?: string
          instance_name: string
          last_seen_at?: string | null
          phone_number?: string | null
          profile_name?: string | null
          profile_picture_url?: string | null
          qr_code?: string | null
          status?: string
          updated_at?: string
          webhook_events?: string[]
          webhook_url?: string | null
          workspace_id: string
        }
        Update: {
          connected_at?: string | null
          created_at?: string
          error_message?: string | null
          evolution_instance_id?: string | null
          id?: string
          instance_name?: string
          last_seen_at?: string | null
          phone_number?: string | null
          profile_name?: string | null
          profile_picture_url?: string | null
          qr_code?: string | null
          status?: string
          updated_at?: string
          webhook_events?: string[]
          webhook_url?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_instances_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          automation_triggered: boolean
          contact_id: string | null
          content: string | null
          created_at: string
          from_number: string
          id: string
          is_from_me: boolean
          media_mime_type: string | null
          media_url: string | null
          message_id: string
          message_type: string
          processed: boolean
          processed_at: string | null
          timestamp: string
          to_number: string
          whatsapp_instance_id: string
          workspace_id: string
        }
        Insert: {
          automation_triggered?: boolean
          contact_id?: string | null
          content?: string | null
          created_at?: string
          from_number: string
          id?: string
          is_from_me?: boolean
          media_mime_type?: string | null
          media_url?: string | null
          message_id: string
          message_type: string
          processed?: boolean
          processed_at?: string | null
          timestamp: string
          to_number: string
          whatsapp_instance_id: string
          workspace_id: string
        }
        Update: {
          automation_triggered?: boolean
          contact_id?: string | null
          content?: string | null
          created_at?: string
          from_number?: string
          id?: string
          is_from_me?: boolean
          media_mime_type?: string | null
          media_url?: string | null
          message_id?: string
          message_type?: string
          processed?: boolean
          processed_at?: string | null
          timestamp?: string
          to_number?: string
          whatsapp_instance_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_whatsapp_instance_id_fkey"
            columns: ["whatsapp_instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: string
          token: string
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by: string
          role: string
          token: string
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: string
          token?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invitations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          id: string
          invited_by: string | null
          joined_at: string
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          id?: string
          invited_by?: string | null
          joined_at?: string
          role: string
          user_id: string
          workspace_id: string
        }
        Update: {
          id?: string
          invited_by?: string | null
          joined_at?: string
          role?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          plan_type: string
          settings: Json
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
          plan_type?: string
          settings?: Json
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          plan_type?: string
          settings?: Json
          slug?: string
        }
        Relationships: []
      }
    }
    Views: {
      automation_metrics: {
        Row: {
          automation_id: string | null
          created_at: string | null
          last_activity_at: string | null
          messages_delivered: number | null
          messages_failed: number | null
          messages_read: number | null
          messages_replied: number | null
          messages_sent: number | null
          name: string | null
          status: Database["public"]["Enums"]["automation_status"] | null
          unique_contacts_reached: number | null
          user_id: string | null
        }
        Insert: {
          automation_id?: string | null
          created_at?: string | null
          last_activity_at?: never
          messages_delivered?: never
          messages_failed?: never
          messages_read?: never
          messages_replied?: never
          messages_sent?: never
          name?: string | null
          status?: Database["public"]["Enums"]["automation_status"] | null
          unique_contacts_reached?: never
          user_id?: string | null
        }
        Update: {
          automation_id?: string | null
          created_at?: string | null
          last_activity_at?: never
          messages_delivered?: never
          messages_failed?: never
          messages_read?: never
          messages_replied?: never
          messages_sent?: never
          name?: string | null
          status?: Database["public"]["Enums"]["automation_status"] | null
          unique_contacts_reached?: never
          user_id?: string | null
        }
        Relationships: []
      }
      media_analytics_summary: {
        Row: {
          audio_count: number | null
          audio_size_bytes: number | null
          compressed_files: number | null
          document_count: number | null
          document_size_bytes: number | null
          first_upload_at: string | null
          image_count: number | null
          image_size_bytes: number | null
          last_updated_at: string | null
          last_upload_at: string | null
          total_files: number | null
          total_savings_bytes: number | null
          total_size_bytes: number | null
          user_id: string | null
          video_count: number | null
          video_size_bytes: number | null
        }
        Relationships: []
      }
      user_funnel_metrics: {
        Row: {
          active_automations_count: number | null
          automation_activated: boolean | null
          automation_activated_at: string | null
          automation_created: boolean | null
          automation_created_at: string | null
          contacts_imported: boolean | null
          contacts_imported_at: string | null
          email: string | null
          first_message_sent: boolean | null
          first_message_sent_at: string | null
          signup_date: string | null
          total_messages_sent: number | null
          user_id: string | null
          whatsapp_connected: boolean | null
          whatsapp_connected_at: string | null
        }
        Insert: {
          active_automations_count?: never
          automation_activated?: never
          automation_activated_at?: never
          automation_created?: never
          automation_created_at?: never
          contacts_imported?: never
          contacts_imported_at?: never
          email?: string | null
          first_message_sent?: never
          first_message_sent_at?: never
          signup_date?: string | null
          total_messages_sent?: never
          user_id?: string | null
          whatsapp_connected?: never
          whatsapp_connected_at?: never
        }
        Update: {
          active_automations_count?: never
          automation_activated?: never
          automation_activated_at?: never
          automation_created?: never
          automation_created_at?: never
          contacts_imported?: never
          contacts_imported_at?: never
          email?: string | null
          first_message_sent?: never
          first_message_sent_at?: never
          signup_date?: string | null
          total_messages_sent?: never
          user_id?: string | null
          whatsapp_connected?: never
          whatsapp_connected_at?: never
        }
        Relationships: []
      }
      webhook_analytics_summary: {
        Row: {
          avg_response_time_ms: number | null
          circuit_breaker_state:
            | Database["public"]["Enums"]["circuit_breaker_state"]
            | null
          consecutive_failures: number | null
          failed_deliveries: number | null
          first_delivery_at: string | null
          last_delivery_at: string | null
          max_response_time_ms: number | null
          success_rate_percentage: number | null
          successful_deliveries: number | null
          total_deliveries: number | null
          url: string | null
          user_id: string | null
          webhook_id: string | null
          webhook_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_tag_to_media: {
        Args: { p_media_id: string; p_tag_id: string }
        Returns: undefined
      }
      archive_notification: {
        Args: { p_notification_id: string }
        Returns: undefined
      }
      calculate_next_retry: {
        Args: {
          p_attempt_number: number
          p_initial_delay: number
          p_max_delay: number
          p_multiplier: number
        }
        Returns: string
      }
      calculate_sli_automations: {
        Args: { p_window_hours?: number }
        Returns: {
          p95_latency: number
          success_rate: number
          total_events: number
        }[]
      }
      calculate_sli_sync: {
        Args: { p_window_hours?: number }
        Returns: {
          p95_latency: number
          success_rate: number
          total_events: number
        }[]
      }
      calculate_sli_uploads: {
        Args: { p_window_hours?: number }
        Returns: {
          p95_validation_time: number
          success_rate: number
          total_events: number
        }[]
      }
      calculate_sli_webhooks: {
        Args: { p_window_hours?: number }
        Returns: {
          p95_latency: number
          success_rate: number
          total_executions: number
        }[]
      }
      can_execute_webhook: { Args: { p_webhook_id: string }; Returns: Json }
      cancel_account_deletion: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      check_permission: {
        Args: {
          required_permission: Database["public"]["Enums"]["permission_type"]
        }
        Returns: boolean
      }
      check_rate_limit: {
        Args: {
          p_custom_max_requests?: number
          p_custom_window_seconds?: number
          p_endpoint: string
        }
        Returns: {
          allowed: boolean
          remaining: number
          reset_at: string
        }[]
      }
      check_rate_limit_v2: {
        Args: {
          p_endpoint: string
          p_identifier: string
          p_limit_type: string
          p_tier?: string
        }
        Returns: {
          allowed: boolean
          remaining: number
          reset_at: string
        }[]
      }
      check_webhook_rate_limit: {
        Args: { p_webhook_id: string }
        Returns: Json
      }
      claim_webhook_jobs: {
        Args: { p_limit?: number }
        Returns: {
          completed_at: string | null
          created_at: string
          event_type: string
          id: string
          last_error: string | null
          max_retries: number
          next_retry_at: string | null
          payload: Json
          retry_count: number
          started_at: string | null
          status: string
          webhook_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "webhook_jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      cleanup_expired_data: {
        Args: never
        Returns: {
          deleted_count: number
          entity_type: string
          execution_time_ms: number
          workspace_id: string
        }[]
      }
      cleanup_expired_exports: { Args: never; Returns: undefined }
      cleanup_expired_notifications: { Args: never; Returns: undefined }
      cleanup_old_rate_limit_events: { Args: never; Returns: number }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      cleanup_old_retries: { Args: never; Returns: number }
      cleanup_old_webhook_logs: { Args: never; Returns: number }
      complete_onboarding_step: {
        Args: { p_metadata?: Json; p_step_id: string }
        Returns: string
      }
      contacts_add_tags: {
        Args: { p_contact_ids: string[]; p_tags: string[] }
        Returns: number
      }
      contacts_change_status: {
        Args: { p_contact_ids: string[]; p_status: string }
        Returns: number
      }
      contacts_delete: { Args: { p_contact_ids: string[] }; Returns: number }
      contacts_remove_tags: {
        Args: { p_contact_ids: string[]; p_tags: string[] }
        Returns: number
      }
      create_automation_version: {
        Args: {
          p_automation_id: string
          p_change_summary?: string
          p_doc: Json
        }
        Returns: string
      }
      create_export_job: {
        Args: {
          p_export_type: string
          p_filters?: Json
          p_format: Database["public"]["Enums"]["export_format"]
        }
        Returns: string
      }
      create_notification: {
        Args: {
          p_action_label?: string
          p_action_url?: string
          p_expires_in_hours?: number
          p_message: string
          p_metadata?: Json
          p_priority?: Database["public"]["Enums"]["notification_priority"]
          p_title: string
          p_type: Database["public"]["Enums"]["notification_type"]
          p_user_id: string
        }
        Returns: string
      }
      create_webhook_secret_once: {
        Args: { p_webhook_id: string }
        Returns: Json
      }
      decrypt_webhook_secret: {
        Args: { p_encrypted_text: string }
        Returns: string
      }
      encrypt_webhook_secret: {
        Args: { p_secret_text: string }
        Returns: string
      }
      enqueue_webhook_job: {
        Args: {
          p_event_type: string
          p_max_retries?: number
          p_payload: Json
          p_webhook_id: string
        }
        Returns: string
      }
      enqueue_webhook_retry: {
        Args: {
          p_error_message?: string
          p_event_type: string
          p_payload: Json
          p_status_code?: number
          p_webhook_id: string
          p_webhook_log_id: string
        }
        Returns: string
      }
      ensure_user_storage_quota: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      evaluate_webhook_conditions: {
        Args: { p_payload: Json; p_webhook_id: string }
        Returns: boolean
      }
      get_active_master_key_bytes: {
        Args: { p_key_name: string }
        Returns: string
      }
      get_automation_performance_by_user: { Args: never; Returns: Json }
      get_cloud_integration_tokens: {
        Args: { p_provider: Database["public"]["Enums"]["cloud_provider"] }
        Returns: {
          access_token: string
          auto_sync_enabled: boolean
          expires_at: string
          folder_id: string
          folder_name: string
          integration_id: string
          last_sync_at: string
          provider: Database["public"]["Enums"]["cloud_provider"]
          refresh_token: string
        }[]
      }
      get_feature_adoption: {
        Args: { p_days?: number; p_limit?: number; p_workspace_id: string }
        Returns: {
          feature_name: string
          total_events: number
          users: number
        }[]
      }
      get_funnel_step_counts: {
        Args: { p_steps: string[]; p_workspace_id: string }
        Returns: {
          step: string
          users: number
        }[]
      }
      get_global_webhook_analytics: { Args: never; Returns: Json }
      get_media_analytics: { Args: never; Returns: Json }
      get_media_for_export: {
        Args: { p_filters?: Json }
        Returns: {
          created_at: string
          file_name: string
          file_size: number
          file_type: string
          folder_name: string
          id: string
          mime_type: string
          public_url: string
          storage_path: string
          tags: string[]
          updated_at: string
        }[]
      }
      get_media_largest_files: {
        Args: { p_limit?: number }
        Returns: {
          created_at: string
          file_name: string
          file_size: number
          file_type: string
          folder_id: string
          id: string
          mime_type: string
        }[]
      }
      get_media_top_tags: {
        Args: { p_limit?: number }
        Returns: {
          color: string
          tag_id: string
          tag_name: string
          total_size_bytes: number
          usage_count: number
        }[]
      }
      get_media_upload_trend: {
        Args: { p_days?: number }
        Returns: {
          audio: number
          documents: number
          file_count: number
          images: number
          total_size_bytes: number
          upload_date: string
          videos: number
        }[]
      }
      get_my_onboarding_status: {
        Args: never
        Returns: {
          automation_activated: boolean
          automation_created: boolean
          completed_at: string
          contacts_imported: boolean
          user_id: string
          whatsapp_connected: boolean
        }[]
      }
      get_pending_retries: {
        Args: { p_limit?: number }
        Returns: {
          attempt_number: number
          created_at: string
          event_type: string
          id: string
          last_error: string | null
          max_attempts: number
          next_retry_at: string | null
          payload: Json
          status: Database["public"]["Enums"]["retry_status"]
          updated_at: string
          webhook_id: string
          webhook_log_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "webhook_retry_queue"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_product_kpis: {
        Args: { p_days?: number; p_workspace_id: string }
        Returns: {
          dau: number
          mau: number
          ttfv_avg_minutes: number
          ttfv_median_minutes: number
          wau: number
          window_days: number
        }[]
      }
      get_retention_cohorts: {
        Args: { p_lookback_days?: number; p_workspace_id: string }
        Returns: {
          cohort_date: string
          cohort_size: number
          retained_d1: number
          retained_d30: number
          retained_d7: number
          retention_d1_pct: number
          retention_d30_pct: number
          retention_d7_pct: number
        }[]
      }
      get_slow_queries: {
        Args: { limit_rows?: number }
        Returns: {
          avg_rows: number
          avg_time_ms: number
          calls: number
          query: string
          total_exec_time: number
        }[]
      }
      get_storage_stats_by_user: { Args: never; Returns: Json }
      get_webhook_analytics: { Args: { p_webhook_id: string }; Returns: Json }
      get_webhook_analytics_summaries: {
        Args: never
        Returns: {
          avg_response_time_ms: number | null
          circuit_breaker_state:
            | Database["public"]["Enums"]["circuit_breaker_state"]
            | null
          consecutive_failures: number | null
          failed_deliveries: number | null
          first_delivery_at: string | null
          last_delivery_at: string | null
          max_response_time_ms: number | null
          success_rate_percentage: number | null
          successful_deliveries: number | null
          total_deliveries: number | null
          url: string | null
          user_id: string | null
          webhook_id: string | null
          webhook_name: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "webhook_analytics_summary"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_webhook_deliveries_by_day: {
        Args: { p_days?: number; p_webhook_id: string }
        Returns: {
          avg_response_time_ms: number
          delivery_date: string
          failed: number
          successful: number
          total_deliveries: number
        }[]
      }
      get_webhook_health_check: {
        Args: never
        Returns: {
          circuit_state: Database["public"]["Enums"]["circuit_breaker_state"]
          consecutive_failures: number
          deliveries_24h: number
          deliveries_7d: number
          failures_24h: number
          failures_7d: number
          health_status: string
          is_active: boolean
          name: string
          url: string
          webhook_id: string
        }[]
      }
      get_webhook_latency_percentiles: {
        Args: { p_minutes?: number }
        Returns: {
          p50_latency_ms: number
          p95_latency_ms: number
          p99_latency_ms: number
        }[]
      }
      get_webhook_secret_for_delivery: {
        Args: { p_webhook_id: string }
        Returns: string
      }
      get_webhook_secrets_for_delivery: {
        Args: { p_webhook_id: string }
        Returns: Json
      }
      get_webhook_stats_by_user: { Args: never; Returns: Json }
      get_webhook_status_code_distribution: {
        Args: { p_days?: number; p_webhook_id: string }
        Returns: {
          count: number
          percentage: number
          status_code: number
        }[]
      }
      get_webhook_top_events: {
        Args: { p_days?: number; p_limit?: number; p_webhook_id: string }
        Returns: {
          event_count: number
          event_type: string
          failed_count: number
          last_triggered_at: string
          successful_count: number
        }[]
      }
      get_webhook_uptime_daily: {
        Args: { p_days?: number }
        Returns: {
          day: string
          successful: number
          total: number
          uptime_pct: number
        }[]
      }
      get_webhook_uptime_hourly: {
        Args: { p_hours?: number }
        Returns: {
          hour: string
          successful: number
          total: number
          uptime_pct: number
        }[]
      }
      global_search: {
        Args: { p_limit?: number; p_query: string }
        Returns: Json
      }
      has_permission:
        | { Args: { permission_name: string }; Returns: boolean }
        | {
            Args: { permission_name: string; workspace_id: string }
            Returns: boolean
          }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_allowed_consent_type: { Args: { p_type: string }; Returns: boolean }
      is_workspace_member: {
        Args: { p_user_id: string; p_workspace_id: string }
        Returns: boolean
      }
      log_audit_event: {
        Args: {
          p_action: string
          p_entity_id?: string
          p_entity_type: string
          p_metadata?: Json
          p_session_id?: string
          p_user_agent?: string
        }
        Returns: string
      }
      mark_all_notifications_read: { Args: never; Returns: undefined }
      mark_conversation_as_read: {
        Args: { p_conversation_id: string }
        Returns: undefined
      }
      mark_notification_read: {
        Args: { p_notification_id: string }
        Returns: undefined
      }
      move_media_to_folder: {
        Args: { p_folder_id: string; p_media_ids: string[] }
        Returns: undefined
      }
      normalize_permission_name: { Args: { p: string }; Returns: string }
      process_data_deletion: { Args: { p_request_id: string }; Returns: Json }
      process_retry_result: {
        Args: {
          p_error_message?: string
          p_response_body?: string
          p_retry_id: string
          p_status_code?: number
          p_success: boolean
        }
        Returns: undefined
      }
      publish_automation_version: {
        Args: { p_automation_id: string; p_version_id: string }
        Returns: undefined
      }
      purge_dead_webhook_jobs: {
        Args: { p_older_than_days?: number }
        Returns: number
      }
      purge_expired_webhook_signature_nonces: { Args: never; Returns: number }
      record_consent: {
        Args: {
          p_consent_type: string
          p_granted: boolean
          p_policy_version: string
        }
        Returns: string
      }
      record_webhook_execution: {
        Args: { p_success: boolean; p_webhook_id: string }
        Returns: undefined
      }
      refresh_materialized_views: { Args: never; Returns: undefined }
      refresh_media_analytics: { Args: never; Returns: undefined }
      refresh_webhook_analytics: { Args: never; Returns: undefined }
      remove_tag_from_media: {
        Args: { p_media_id: string; p_tag_id: string }
        Returns: undefined
      }
      request_account_deletion: { Args: { p_reason?: string }; Returns: string }
      request_data_export: { Args: never; Returns: string }
      revoke_all_consents: { Args: never; Returns: Json }
      rollback_automation_version: {
        Args: { p_automation_id: string; p_target_version_id: string }
        Returns: string
      }
      rotate_due_webhook_secrets: {
        Args: { p_grace_days?: number; p_rotation_days?: number }
        Returns: number
      }
      search_contacts: {
        Args: {
          p_created_after?: string
          p_created_before?: string
          p_limit?: number
          p_offset?: number
          p_query?: string
          p_status?: string
          p_tags?: string[]
        }
        Returns: {
          created_at: string
          custom_fields: Json
          email: string
          id: string
          name: string
          phone: string
          relevance: number
          status: string
          tags: string[]
          updated_at: string
          user_id: string
        }[]
      }
      search_media: {
        Args: {
          p_date_from?: string
          p_date_to?: string
          p_file_types?: string[]
          p_folder_ids?: string[]
          p_limit?: number
          p_max_size?: number
          p_mime_types?: string[]
          p_min_size?: number
          p_offset?: number
          p_query?: string
          p_tag_ids?: string[]
        }
        Returns: {
          created_at: string
          file_name: string
          file_size: number
          file_type: string
          folder_id: string
          id: string
          match_score: number
          mime_type: string
          thumbnail_url: string
        }[]
      }
      search_webhooks: {
        Args: {
          p_circuit_state?: string
          p_events?: string[]
          p_has_failures?: boolean
          p_is_active?: boolean
          p_limit?: number
          p_offset?: number
          p_query?: string
        }
        Returns: {
          created_at: string
          events: string[]
          id: string
          is_active: boolean
          match_score: number
          name: string
          url: string
        }[]
      }
      track_analytics_event:
        | {
            Args: {
              p_automation_id?: string
              p_contact_id?: string
              p_event_type: string
              p_properties?: Json
              p_session_id?: string
            }
            Returns: string
          }
        | {
            Args: {
              p_automation_id?: string
              p_contact_id?: string
              p_event_type: string
              p_properties?: Json
              p_session_id?: string
              p_workspace_id?: string
            }
            Returns: undefined
          }
      trigger_webhook: {
        Args: { p_event_type: string; p_payload: Json; p_webhook_id: string }
        Returns: string
      }
      update_user_consent: {
        Args: { p_consent_type: string; p_granted: boolean; p_metadata?: Json }
        Returns: string
      }
      upsert_cloud_integration_tokens: {
        Args: {
          p_access_token: string
          p_expires_at: string
          p_folder_id: string
          p_folder_name: string
          p_provider: Database["public"]["Enums"]["cloud_provider"]
          p_refresh_token: string
        }
        Returns: string
      }
      upsert_contact_from_whatsapp: {
        Args: { p_name?: string; p_phone: string; p_workspace_id: string }
        Returns: string
      }
      upsert_whatsapp_conversation: {
        Args: {
          p_contact_id: string
          p_last_message_content: string
          p_last_message_from_me: boolean
          p_whatsapp_instance_id: string
          p_workspace_id: string
        }
        Returns: string
      }
      use_saved_search: { Args: { p_search_id: string }; Returns: undefined }
      workspace_has_permission: {
        Args: {
          p_permission: string
          p_user_id?: string
          p_workspace_id: string
        }
        Returns: boolean
      }
      workspace_user_role: {
        Args: { p_user_id: string; p_workspace_id: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      automation_status: "draft" | "active" | "paused"
      circuit_breaker_state: "closed" | "open" | "half_open"
      cloud_provider: "google_drive" | "dropbox" | "onedrive"
      export_format: "csv" | "json" | "pdf" | "xlsx"
      export_status: "pending" | "processing" | "completed" | "failed"
      flow_var_type: "text" | "number" | "date" | "boolean"
      notification_priority: "low" | "medium" | "high" | "critical"
      notification_type:
        | "webhook_failure"
        | "webhook_circuit_open"
        | "storage_quota_warning"
        | "storage_quota_critical"
        | "media_processing_complete"
        | "media_processing_failed"
        | "system_announcement"
        | "security_alert"
      permission_type:
        | "automations.create"
        | "automations.edit"
        | "automations.delete"
        | "automations.publish"
        | "contacts.import"
        | "contacts.export"
        | "contacts.delete"
        | "team.invite"
        | "team.remove"
        | "billing.manage"
        | "billing.view"
        | "analytics.view"
        | "settings.manage"
        | "whatsapp.manage"
      retention_deletion_strategy: "hard_delete" | "soft_delete" | "anonymize"
      retention_entity_type:
        | "data_exports"
        | "webhook_logs"
        | "rate_limit_events"
        | "audit_events"
        | "analytics_events"
      retry_status:
        | "pending"
        | "processing"
        | "succeeded"
        | "failed"
        | "exhausted"
      sync_status: "idle" | "syncing" | "completed" | "failed"
      webhook_provider:
        | "zapier"
        | "make"
        | "n8n"
        | "discord"
        | "slack"
        | "webhook_site"
        | "custom"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      automation_status: ["draft", "active", "paused"],
      circuit_breaker_state: ["closed", "open", "half_open"],
      cloud_provider: ["google_drive", "dropbox", "onedrive"],
      export_format: ["csv", "json", "pdf", "xlsx"],
      export_status: ["pending", "processing", "completed", "failed"],
      flow_var_type: ["text", "number", "date", "boolean"],
      notification_priority: ["low", "medium", "high", "critical"],
      notification_type: [
        "webhook_failure",
        "webhook_circuit_open",
        "storage_quota_warning",
        "storage_quota_critical",
        "media_processing_complete",
        "media_processing_failed",
        "system_announcement",
        "security_alert",
      ],
      permission_type: [
        "automations.create",
        "automations.edit",
        "automations.delete",
        "automations.publish",
        "contacts.import",
        "contacts.export",
        "contacts.delete",
        "team.invite",
        "team.remove",
        "billing.manage",
        "billing.view",
        "analytics.view",
        "settings.manage",
        "whatsapp.manage",
      ],
      retention_deletion_strategy: ["hard_delete", "soft_delete", "anonymize"],
      retention_entity_type: [
        "data_exports",
        "webhook_logs",
        "rate_limit_events",
        "audit_events",
        "analytics_events",
      ],
      retry_status: [
        "pending",
        "processing",
        "succeeded",
        "failed",
        "exhausted",
      ],
      sync_status: ["idle", "syncing", "completed", "failed"],
      webhook_provider: [
        "zapier",
        "make",
        "n8n",
        "discord",
        "slack",
        "webhook_site",
        "custom",
      ],
    },
  },
} as const

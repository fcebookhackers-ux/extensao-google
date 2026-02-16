export interface Contact {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  email: string | null;
  tags: string[];
  status: "active" | "blocked" | "unsubscribed";
  created_at: string;
  updated_at: string;
  custom_fields: Record<string, any>;
  relevance?: number;

  // AI enrichment (suggestions + review)
  ai_name_suggestion?: string | null;
  ai_category_suggestion?: string | null;
  ai_tags_suggestion?: string[];
  ai_sentiment_suggestion?: string | null;
  ai_summary_suggestion?: string | null;
  ai_review_status?: "pending" | "accepted" | "rejected" | string;
  ai_enriched_at?: string | null;
  ai_reviewed_at?: string | null;
}

export interface ContactFilters {
  query?: string;
  tags?: string[];
  status?: "active" | "blocked" | "unsubscribed";
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface ContactSearchParams extends ContactFilters {
  limit?: number;
  offset?: number;
}

export type BulkAction = "add_tags" | "remove_tags" | "change_status" | "delete" | "export";

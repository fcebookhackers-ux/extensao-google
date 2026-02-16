export interface MediaSearchFilters {
  query?: string;
  fileTypes?: ("image" | "video" | "document" | "audio")[];
  mimeTypes?: string[];
  folderIds?: string[];
  tagIds?: string[];
  minSize?: number;
  maxSize?: number;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

export interface WebhookSearchFilters {
  query?: string;
  isActive?: boolean;
  events?: string[];
  hasFailures?: boolean;
  circuitState?: "closed" | "open" | "half_open";
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  id: string;
  type: "media" | "webhook" | "folder" | "tag";
  title: string;
  subtitle: string;
  url: string;
  score: number;
}

export interface GlobalSearchResults {
  media: SearchResult[];
  webhooks: SearchResult[];
  folders: SearchResult[];
  tags: SearchResult[];
}

export interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  searchType: "media" | "webhooks" | "logs" | "global";
  filters: Record<string, any>;
  isFavorite: boolean;
  lastUsedAt: string | null;
  useCount: number;
  createdAt: string;
  updatedAt: string;
}

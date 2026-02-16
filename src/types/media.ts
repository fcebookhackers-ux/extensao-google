 export type MediaType = 'image' | 'video' | 'document' | 'audio';
 
 export interface MediaFile {
   id: string;
   user_id: string;
   file_name: string;
   file_type: MediaType;
   file_size: number;
   mime_type: string;
   storage_path: string;
   public_url: string;
   thumbnail_url?: string;
   width?: number;
   height?: number;
   duration?: number;
   tags: string[];
   metadata: Record<string, any>;
   created_at: string;
   updated_at: string;
 }
 
 export interface UploadProgress {
   fileName: string;
  originalSizeBytes?: number;
  finalSizeBytes?: number;
  compressed?: boolean;
   progress: number;
   status: 'uploading' | 'processing' | 'completed' | 'error';
   error?: string;
 }
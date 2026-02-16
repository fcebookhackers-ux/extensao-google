export interface MediaAnalyticsSummary {
  totalFiles: number;
  totalSizeBytes: number;
  compressedFiles: number;
  totalSavingsBytes: number;
  quota: {
    usedBytes: number;
    maxBytes: number;
    usedPercentage: number;
    fileCount: number;
    maxFileCount: number;
  };
  byType: {
    image: { count: number; sizeBytes: number };
    video: { count: number; sizeBytes: number };
    document: { count: number; sizeBytes: number };
    audio: { count: number; sizeBytes: number };
  };
  firstUploadAt: string | null;
  lastUploadAt: string | null;
}

export interface MediaUploadTrend {
  uploadDate: string;
  fileCount: number;
  totalSizeBytes: number;
  images: number;
  videos: number;
  documents: number;
  audio: number;
}

export interface TopTag {
  tagId: string;
  tagName: string;
  color: string;
  usageCount: number;
  totalSizeBytes: number;
}

export interface LargestFile {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  folderId: string | null;
}

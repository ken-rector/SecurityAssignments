export type VideoKind = 'testimonial' | 'instructional';

export interface VideoLink {
  featureId: number;
  title: string;
  videoUrl: string;
  posterUrl: string;
  transcriptText: string;
  kind: VideoKind;
  active: boolean;
}

export interface VideoLibrary {
  videoId: number;
  title: string;
  videoUrl: string;
  posterUrl?: string | null;
  transcriptUrl?: string | null;
  transcriptText?: string | null;
  summary?: string | null;
  tagsCsv?: string | null;
  videoKind: VideoKind;
  isActive: boolean;
  sortOrder: number;
  createdUtc: string;
  updatedUtc: string;
  createdBy?: string | null;
  updatedBy?: string | null;
}

export interface VideoLibraryRequest {
  videoId?: number;
  title: string;
  videoUrl: string;
  posterUrl?: string | null;
  transcriptUrl?: string | null;
  transcriptText?: string | null;
  summary?: string | null;
  tagsCsv?: string | null;
  videoKind: VideoKind;
  isActive: boolean;
  sortOrder: number;
}

export interface VideoLibraryBulkRequest {
  videos: VideoLibraryRequest[];
  replaceAll: boolean;
}

export interface VideoSearchResult {
  videoId: number;
  title: string;
  videoUrl: string;
  posterUrl?: string | null;
  transcriptUrl?: string | null;
  summary?: string | null;
  tagsCsv?: string | null;
  videoKind: VideoKind;
  isActive: boolean;
  sortOrder: number;
  transcriptText?: string | null;
  score: number;
}

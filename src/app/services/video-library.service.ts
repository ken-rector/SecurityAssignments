import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, switchMap } from 'rxjs';
import { API_CONFIG } from '../api.config';
import {
  VideoKind,
  VideoLibrary,
  VideoLibraryBulkRequest,
  VideoLibraryRequest,
  VideoLink,
  VideoSearchResult,
} from '../models/video-link.model';

@Injectable({ providedIn: 'root' })
export class VideoLibraryService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_CONFIG.apiUrl}api/videolibrary`;

  getManagedVideos(): Observable<VideoLink[]> {
    return this.getAll(false, null).pipe(map((items) => items.map((item) => this.toVideoLink(item))));
  }

  getPublicVideos(): Observable<VideoLink[]> {
    return this.getAll(true, null).pipe(
      map((items) => items.map((item) => this.toVideoLink(item))),
      catchError(() => this.getLocalVideos()),
      switchMap((videos) => videos.length > 0 ? of(videos) : this.getLocalVideos()),
    );
  }

  private getLocalVideos(): Observable<VideoLink[]> {
    return this.http.get(`data/videos.json?_=${Date.now()}`, { responseType: 'text' }).pipe(
      map((text) => {
        const parsed = JSON.parse(text);
        const vids: VideoLibrary[] = Array.isArray(parsed) ? parsed : (parsed.videos ?? []);
        return vids.map((item: VideoLibrary) => this.toVideoLink(item));
      }),
      catchError(() => of([])),
    );
  }

  saveVideos(videos: VideoLink[]): Observable<unknown> {
    const payload: VideoLibraryBulkRequest = {
      replaceAll: true,
      videos: this.normalizeVideos(videos).map((video, index) => ({
        videoId: video.featureId > 0 ? video.featureId : undefined,
        title: video.title,
        videoUrl: video.videoUrl,
        posterUrl: video.posterUrl || null,
        transcriptUrl: null,
        transcriptText: video.transcriptText || null,
        summary: null,
        tagsCsv: null,
        videoKind: video.kind,
        isActive: video.active,
        sortOrder: index + 1,
      } satisfies VideoLibraryRequest)),
    };

    return this.http.post<unknown>(`${this.baseUrl}/bulk`, payload);
  }

  saveVideo(video: VideoLink, sortOrder = 1): Observable<number> {
    const normalized = this.normalizeVideos([video])[0];

    const payload: VideoLibraryRequest = {
      videoId: normalized.featureId > 0 ? normalized.featureId : undefined,
      title: normalized.title,
      videoUrl: normalized.videoUrl,
      posterUrl: normalized.posterUrl || null,
      transcriptUrl: null,
      transcriptText: normalized.transcriptText || null,
      summary: null,
      tagsCsv: null,
      videoKind: normalized.kind,
      isActive: normalized.active,
      sortOrder,
    };

    return this.http.post<unknown>(this.baseUrl, payload).pipe(
      map((response) => {
        if (typeof response === 'number') {
          return response;
        }

        if (typeof response === 'string') {
          const parsed = Number(response);
          return Number.isFinite(parsed) ? parsed : 0;
        }

        return 0;
      }),
    );
  }

  deleteVideo(videoId: number): Observable<boolean> {
    return this.http.delete<unknown>(`${this.baseUrl}/${videoId}`).pipe(
      map((response) => {
        if (typeof response === 'boolean') {
          return response;
        }

        if (typeof response === 'string') {
          return response.toLowerCase() === 'true';
        }

        return false;
      }),
    );
  }

  searchVideos(query: string, top = 20): Observable<VideoSearchResult[]> {
    const params = new HttpParams().set('query', query).set('top', top);

    return this.http.get<unknown>(`${this.baseUrl}/search`, { params }).pipe(
      map((response) => this.parseArray<VideoSearchResult>(response)),
    );
  }

  private getAll(onlyActive: boolean, videoKind: VideoKind | null): Observable<VideoLibrary[]> {
    let params = new HttpParams().set('onlyActive', String(onlyActive));

    if (videoKind) {
      params = params.set('videoKind', videoKind);
    }

    return this.http.get<unknown>(this.baseUrl, { params }).pipe(
      map((response) => this.parseArray<VideoLibrary>(response)),
    );
  }

  private toVideoLink(video: VideoLibrary): VideoLink {
    return {
      featureId: video.videoId ?? 0,
      title: video.title ?? '',
      videoUrl: video.videoUrl ?? '',
      posterUrl: video.posterUrl ?? '',
      transcriptText: video.transcriptText ?? '',
      kind: video.videoKind === 'instructional' ? 'instructional' : 'testimonial',
      active: video.isActive ?? true,
    };
  }

  private normalizeVideos(videos: VideoLink[]): VideoLink[] {
    return videos.map((video) => {
      const featureId =
        Number.isFinite(video.featureId) && video.featureId > 0 ? video.featureId : 0;

      return {
        featureId,
        title: video.title?.trim() ?? '',
        videoUrl: video.videoUrl?.trim() ?? '',
        posterUrl: video.posterUrl?.trim() ?? '',
        transcriptText: video.transcriptText?.trim() ?? '',
        kind: video.kind === 'instructional' ? 'instructional' : 'testimonial',
        active: Boolean(video.active),
      };
    });
  }

  private parseArray<T>(response: unknown): T[] {
    if (typeof response === 'string') {
      try {
        const parsed = JSON.parse(response) as unknown;
        return Array.isArray(parsed) ? (parsed as T[]) : [];
      } catch {
        return [];
      }
    }

    return Array.isArray(response) ? (response as T[]) : [];
  }
}

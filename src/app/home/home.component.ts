import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { VideoLibraryService } from '../services/video-library.service';
import { VideoLink } from '../models/video-link.model';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  private readonly videoLibraryService = inject(VideoLibraryService);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly videos = signal<VideoLink[]>([]);
  protected readonly selectedTestimonialIndex = signal(0);
  protected readonly testimonialVideos = computed(() =>
    this.videos().filter((video) => video.kind === 'testimonial'),
  );
  protected readonly selectedTestimonial = computed(() => {
    const testimonials = this.testimonialVideos();

    if (testimonials.length === 0) {
      return null;
    }

    const index = this.selectedTestimonialIndex();
    return testimonials[index] ?? testimonials[0];
  });
  protected readonly instructionalVideos = computed(() =>
    this.videos().filter((video) => video.kind === 'instructional'),
  );

  constructor() {
    this.videoLibraryService
      .getPublicVideos()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (videos) => {
          this.videos.set(videos);
          this.selectedTestimonialIndex.set(0);
        },
        error: () => this.videos.set([]),
      });
  }

  protected selectTestimonial(index: number): void {
    this.selectedTestimonialIndex.set(index);
  }

  protected toYouTubeEmbedUrl(url: string): SafeResourceUrl | null {
    const trimmed = url?.trim() ?? '';

    if (!trimmed) {
      return null;
    }

    let videoId = '';

    try {
      const parsed = new URL(trimmed);
      const host = parsed.hostname.toLowerCase();

      if (host.includes('youtube.com')) {
        if (parsed.pathname === '/watch') {
          videoId = parsed.searchParams.get('v') ?? '';
        } else if (parsed.pathname.startsWith('/shorts/')) {
          videoId = parsed.pathname.split('/')[2] ?? '';
        } else if (parsed.pathname.startsWith('/embed/')) {
          videoId = parsed.pathname.split('/')[2] ?? '';
        }
      } else if (host.includes('youtu.be')) {
        videoId = parsed.pathname.replace('/', '');
      }
    } catch {
      return null;
    }

    if (!videoId) {
      return null;
    }

    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1`,
    );
  }
}

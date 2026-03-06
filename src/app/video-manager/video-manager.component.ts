import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { VideoLibraryService } from '../services/video-library.service';
import { VideoKind, VideoLink } from '../models/video-link.model';

@Component({
  selector: 'app-video-manager',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './video-manager.component.html',
  styleUrl: './video-manager.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VideoManagerComponent {
  private readonly fb = inject(FormBuilder);
  private readonly videoLibraryService = inject(VideoLibraryService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly saveMessage = signal('');
  protected readonly loading = signal(false);
  protected readonly isEditing = signal(false);
  protected readonly selectedIndex = signal<number | null>(null);

  protected readonly videosForm = this.fb.group({
    videos: this.fb.array([]),
  });

  constructor() {
    this.loadVideos();
  }

  protected get videosArray(): FormArray {
    return this.videosForm.controls.videos;
  }

  protected openEditor(index: number): void {
    this.selectedIndex.set(index);
    this.isEditing.set(true);
  }

  protected newVideo(): void {
    this.videosArray.push(this.createVideoGroup());
    this.selectedIndex.set(this.videosArray.length - 1);
    this.isEditing.set(true);
  }

  protected showList(refresh = false): void {
    this.isEditing.set(false);
    this.selectedIndex.set(null);
    this.saveMessage.set('');

    if (refresh) {
      this.loadVideos();
    }
  }

  protected selectedVideoGroup(): FormGroup | null {
    const index = this.selectedIndex();

    if (index === null || index < 0 || index >= this.videosArray.length) {
      return null;
    }

    return this.videosArray.at(index) as FormGroup;
  }

  protected removeSelectedVideo(): void {
    const index = this.selectedIndex();

    if (index === null || index < 0 || index >= this.videosArray.length) {
      return;
    }

    this.videosArray.removeAt(index);
    this.showList();
  }

  protected removeVideoRow(index: number): void {
    this.videosArray.removeAt(index);
  }

  protected saveVideos(): void {
    this.saveMessage.set('');
    if (!this.videosForm.valid) {
      this.saveMessage.set('Please complete required fields before saving.');
      return;
    }

    const videos = this.videosArray.controls.map((control) => {
      const value = control.value as {
        featureId: number;
        title: string;
        videoUrl: string;
        posterUrl: string;
        transcriptText: string;
        kind: VideoKind;
        active: boolean;
      };

      return {
        featureId: Number(value.featureId) || 0,
        title: value.title?.trim() ?? '',
        videoUrl: value.videoUrl?.trim() ?? '',
        posterUrl: value.posterUrl?.trim() ?? '',
        transcriptText: value.transcriptText?.trim() ?? '',
        kind: value.kind,
        active: Boolean(value.active),
      } satisfies VideoLink;
    });

    this.loading.set(true);
    this.videoLibraryService
      .saveVideos(videos)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saveMessage.set('Saved successfully.');
          this.loading.set(false);
          this.showList(true);
        },
        error: () => {
          this.saveMessage.set('Save failed. Verify API access and login token.');
          this.loading.set(false);
        },
      });
  }

  private loadVideos(): void {
    this.loading.set(true);
    this.videoLibraryService
      .getManagedVideos()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (videos) => {
          this.videosArray.clear();
          videos.forEach((video) => this.videosArray.push(this.createVideoGroup(video)));
          this.loading.set(false);
        },
        error: () => {
          this.videosArray.clear();
          this.loading.set(false);
        },
      });
  }

  private createVideoGroup(video?: VideoLink) {
    return this.fb.group({
      featureId: [video?.featureId ?? 0],
      title: [video?.title ?? '', [Validators.required]],
      videoUrl: [video?.videoUrl ?? '', [Validators.required]],
      posterUrl: [video?.posterUrl ?? ''],
      transcriptText: [video?.transcriptText ?? ''],
      kind: [video?.kind ?? 'testimonial', [Validators.required]],
      active: [video?.active ?? true],
    });
  }
}

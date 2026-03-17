import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-video-overview',
  imports: [RouterLink],
  templateUrl: './video-overview.component.html',
  styleUrl: './video-overview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VideoOverviewComponent {}

import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, DOCUMENT, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { environment } from '../environments/environment';
import { captureAttribution } from './attribution';
import { trackPageView } from './site-visit';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA], // for the shared <assignpros-chat> web component
})
export class App {
  protected readonly apiUrl = environment.apiUrl;

  constructor() {
    // Before the router runs, while the address still has the ad's UTM tags.
    captureAttribution();

    // One page-view note per page for Marketing Funnels > Site traffic in InternalAdmin.
    inject(Router)
      .events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => trackPageView(e.urlAfterRedirects));

    // The <assignpros-chat> widget is shared by every AssignPros app and served by InternalAdmin_API,
    // so updates to it reach every app without redeploying them.
    const document = inject(DOCUMENT);
    const script = document.createElement('script');
    script.src = `${environment.apiUrl}chat/assignpros-chat.js`;
    script.defer = true;
    document.body.appendChild(script);
  }
}

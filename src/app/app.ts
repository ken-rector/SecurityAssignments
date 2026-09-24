import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, DOCUMENT, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { environment } from '../environments/environment';

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
    // The <assignpros-chat> widget is shared by every AssignPros app and served by InternalAdmin_API,
    // so updates to it reach every app without redeploying them.
    const document = inject(DOCUMENT);
    const script = document.createElement('script');
    script.src = `${environment.apiUrl}chat/assignpros-chat.js`;
    script.defer = true;
    document.body.appendChild(script);
  }
}

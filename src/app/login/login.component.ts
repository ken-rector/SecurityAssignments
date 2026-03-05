import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthenticationService } from '../services/authentication.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authenticationService = inject(AuthenticationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly errorMessage = signal('');
  protected readonly loading = signal(false);

  protected readonly loginForm = this.fb.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  constructor() {
    if (this.authenticationService.isLoggedIn()) {
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/video_manager';
      void this.router.navigateByUrl(returnUrl);
    }
  }

  protected login(): void {
    this.errorMessage.set('');
    if (!this.loginForm.valid || this.loading()) {
      return;
    }

    const username = this.loginForm.controls.username.value?.trim() ?? '';
    const password = this.loginForm.controls.password.value ?? '';

    this.loading.set(true);
    this.authenticationService
      .login(username, password)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          if (!result.token) {
            this.errorMessage.set('Login failed. Invalid server response.');
            this.loading.set(false);
            return;
          }

          this.authenticationService.saveSession(result);
          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/video_manager';
          void this.router.navigateByUrl(returnUrl);
        },
        error: () => {
          this.errorMessage.set('Login failed. Check username/password and try again.');
          this.loading.set(false);
        },
      });
  }
}
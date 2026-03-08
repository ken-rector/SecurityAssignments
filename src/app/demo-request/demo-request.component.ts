import { AfterViewInit, ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EmailService } from '../services/email.service';
import { environment } from '../../environments/environment';

type Grecaptcha = {
  ready(callback: () => void): void;
  render(
    container: HTMLElement,
    parameters: {
      sitekey: string;
      callback: (token: string) => void;
      'expired-callback'?: () => void;
      'error-callback'?: () => void;
    },
  ): number;
  reset(widgetId?: number): void;
};

declare global {
  interface Window {
    grecaptcha?: Grecaptcha;
  }
}

@Component({
  selector: 'app-demo-request',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './demo-request.component.html',
  styleUrl: './demo-request.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DemoRequestComponent implements AfterViewInit {
  private readonly fb = inject(FormBuilder);
  private readonly emailService = inject(EmailService);
  private readonly phonePattern = /^\d{3}-\d{3}-\d{4}$/;
  private readonly captchaSiteKey = environment.captchaSiteKey;
  private readonly captchaScriptId = 'google-recaptcha-script';
  private readonly captchaContainerId = 'demo-recaptcha';

  private captchaWidgetId: number | null = null;

  protected readonly loading = signal(false);
  protected readonly successMessage = signal('');
  protected readonly errorMessage = signal('');

  protected readonly demoForm = this.fb.group({
    fullName: ['', [Validators.required]],
    company: [''],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(this.phonePattern)]],
    message: ['', [Validators.required, Validators.minLength(10)]],
    captchaToken: ['', [Validators.required]],
  });

  ngAfterViewInit(): void {
    this.initializeCaptcha();
  }

  protected formatPhoneInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const digits = target.value.replace(/\D/g, '').slice(0, 10);

    let formatted = digits;
    if (digits.length > 6) {
      formatted = `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else if (digits.length > 3) {
      formatted = `${digits.slice(0, 3)}-${digits.slice(3)}`;
    }

    this.demoForm.controls.phone.setValue(formatted, { emitEvent: false });
    target.value = formatted;
  }

  protected submit(): void {
    this.successMessage.set('');
    this.errorMessage.set('');

    if (this.demoForm.invalid || this.loading()) {
      this.demoForm.markAllAsTouched();
      return;
    }

    const value = this.demoForm.getRawValue();

    const emailData = {
      name: value.fullName?.trim() ?? '',
      email: value.email?.trim() ?? '',
      phone: value.phone?.trim() ?? '',
      company: value.company?.trim() ?? '',
      notes: value.message?.trim() ?? '',
      captchaToken: value.captchaToken ?? '',
      type: 'contact',
      companyName: '',
      contactInfo: '',
      addr1: '',
      addr2: '',
      city: '',
      state: '',
      zip: '',
      smsTitle: 'Demo Request Received'
    };

    this.loading.set(true);
    this.emailService.sendEmail(emailData).subscribe({
      next: () => {
        this.loading.set(false);
        this.successMessage.set(
          'Thank you for your demo request. We received your information and will contact you ASAP.',
        );
        this.demoForm.reset({ fullName: '', company: '', email: '', phone: '', message: '', captchaToken: '' });
        this.resetCaptcha();
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(this.buildSubmissionErrorMessage(error));
        this.resetCaptcha();
      },
    });
  }

  private initializeCaptcha(): void {
    if (!this.captchaSiteKey) {
      this.errorMessage.set('Captcha is not configured. Please contact support.');
      return;
    }

    const existingScript = document.getElementById(this.captchaScriptId);
    if (window.grecaptcha) {
      this.renderCaptcha();
      return;
    }

    if (existingScript) {
      existingScript.addEventListener('load', () => this.renderCaptcha(), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = this.captchaScriptId;
    script.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.addEventListener('load', () => this.renderCaptcha(), { once: true });
    script.addEventListener(
      'error',
      () => this.errorMessage.set('Captcha failed to load. Please refresh and try again.'),
      { once: true },
    );
    document.head.appendChild(script);
  }

  private renderCaptcha(): void {
    const grecaptcha = window.grecaptcha;
    const container = document.getElementById(this.captchaContainerId);
    if (!grecaptcha || !container || this.captchaWidgetId !== null) {
      return;
    }

    grecaptcha.ready(() => {
      this.captchaWidgetId = grecaptcha.render(container, {
        sitekey: this.captchaSiteKey,
        callback: (token: string) => {
          this.demoForm.controls.captchaToken.setValue(token);
          this.demoForm.controls.captchaToken.markAsTouched();
        },
        'expired-callback': () => this.demoForm.controls.captchaToken.setValue(''),
        'error-callback': () => this.demoForm.controls.captchaToken.setValue(''),
      });
    });
  }

  private resetCaptcha(): void {
    if (window.grecaptcha && this.captchaWidgetId !== null) {
      window.grecaptcha.reset(this.captchaWidgetId);
    }

    this.demoForm.controls.captchaToken.setValue('');
  }

  private buildSubmissionErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const rawBody = typeof error.error === 'string' ? error.error : '';
      const iisStyleError = rawBody.includes('500 - Internal server error') || rawBody.includes('Server Error');

      if (error.status === 0) {
        return 'The request could not reach the server. Please check your connection or CORS/server availability.';
      }

      if (error.status === 400) {
        if (rawBody) {
          return rawBody;
        }

        return 'Request rejected by the API (400). Most often this means captcha verification failed or captcha server keys are not configured.';
      }

      if (iisStyleError) {
        return 'The server returned an unclear error. Your request may have still been received. Please wait 2-3 minutes before trying again to avoid duplicate emails.';
      }

      if (rawBody.startsWith('Email send failed:')) {
        return rawBody;
      }
    }

    return 'Unable to send request right now. Please try again in a moment.';
  }
}
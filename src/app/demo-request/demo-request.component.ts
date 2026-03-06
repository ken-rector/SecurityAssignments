import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EmailService } from '../email.service';

@Component({
  selector: 'app-demo-request',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './demo-request.component.html',
  styleUrl: './demo-request.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DemoRequestComponent {
  private readonly fb = inject(FormBuilder);
  private readonly emailService = inject(EmailService);
  private readonly phonePattern = /^\d{3}-\d{3}-\d{4}$/;

  protected readonly loading = signal(false);
  protected readonly successMessage = signal('');
  protected readonly errorMessage = signal('');

  protected readonly demoForm = this.fb.group({
    fullName: ['', [Validators.required]],
    company: [''],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(this.phonePattern)]],
    message: ['', [Validators.required, Validators.minLength(10)]],
  });

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
      type: 'contact',
      companyName: '',
      contactInfo: '',
      addr1: '',
      addr2: '',
      city: '',
      state: '',
      zip: ''
    };

    this.loading.set(true);
    this.emailService.sendEmail(emailData).subscribe({
      next: () => {
        this.loading.set(false);
        this.successMessage.set(
          'Thank you for your demo request. We received your information and will contact you ASAP.',
        );
        this.demoForm.reset({ fullName: '', company: '', email: '', phone: '', message: '' });
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(this.buildSubmissionErrorMessage(error));
      },
    });
  }

  private buildSubmissionErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const rawBody = typeof error.error === 'string' ? error.error : '';
      const iisStyleError = rawBody.includes('500 - Internal server error') || rawBody.includes('Server Error');

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
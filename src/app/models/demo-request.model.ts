export interface DemoRequestSaveRequest {
  fullName: string;
  company?: string | null;
  email: string;
  phone: string;
  message?: string | null;
  source?: string | null; // 'Demo' or 'Contact' - picks the marketing funnel
  demoRequestedDate?: string | null; // yyyy-MM-dd
  landingPage?: string | null;
  timeZone?: string | null;
  smsConsent?: boolean;
  utmSource?: string | null;
  utmMedium?: string | null;
  campaign?: string | null;
  keyword?: string | null;
}

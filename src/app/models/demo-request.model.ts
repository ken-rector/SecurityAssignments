export interface DemoRequestSaveRequest {
  fullName: string;
  company?: string | null;
  email: string;
  phone: string;
  message?: string | null;
}

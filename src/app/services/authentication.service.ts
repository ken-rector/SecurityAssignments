import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_CONFIG } from '../api.config';

interface LoginResult {
  token: string;
  userID?: number;
  clientID?: number;
  agentID?: number;
  username?: string;
  name?: string;
  type?: string;
  passwordChangeRequired?: boolean;
}

interface LoginApiUser {
  userID?: number;
  username?: string;
  name?: string;
  type?: string;
  clientID?: number;
  agentID?: number;
}

interface LoginApiResponse {
  token?: string;
  Token?: string;
  user?: LoginApiUser;
  refreshToken?: string;
  expiresAt?: string;
  passwordChangeRequired?: boolean;

  UserID?: number;
  ClientID?: number;
  AgentID?: number;
  Username?: string;
  UserName?: string;
  Type?: string;
  Password?: string;
  IsActive?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthenticationService {
  private readonly http = inject(HttpClient);
  private readonly sessionFlagKey = 'isAuthenticatedSession';

  login(username: string, password: string): Observable<LoginResult> {
    sessionStorage.clear();
    const loginUrl = `${API_CONFIG.apiUrl}api/Auth/login`;

    return this.http.post<unknown>(loginUrl, { username, password }).pipe(
      map((response) => {
        const parsed = (typeof response === 'string'
          ? (JSON.parse(response) as LoginApiResponse)
          : (response as LoginApiResponse)) ?? {};
        const parsedRecord = parsed as Record<string, unknown>;

        const userCandidate = parsedRecord['user'] ?? parsedRecord['User'];
        const user =
          userCandidate && typeof userCandidate === 'object'
            ? (userCandidate as LoginApiUser)
            : undefined;
        const legacyName = typeof parsedRecord['User'] === 'string' ? parsedRecord['User'] : undefined;

        return {
          token: parsed.token ?? parsed.Token ?? '',
          userID: user?.userID ?? parsed.UserID,
          clientID: user?.clientID ?? parsed.ClientID,
          agentID: user?.agentID ?? parsed.AgentID,
          username: user?.username ?? parsed.Username ?? parsed.UserName,
          name: user?.name ?? (legacyName as string | undefined),
          type: user?.type ?? parsed.Type,
          passwordChangeRequired: parsed.passwordChangeRequired,
        } satisfies LoginResult;
      }),
    );
  }

  isLoggedIn(): boolean {
    const sessionFlag = sessionStorage.getItem(this.sessionFlagKey);
    const token = sessionStorage.getItem('token')?.trim() ?? '';

    if (sessionFlag !== 'true') {
      return false;
    }

    if (!token || token === 'null' || token === 'undefined') {
      return false;
    }

    return token.length > 20;
  }

  saveSession(data: LoginResult): void {
    sessionStorage.setItem('token', data.token ?? '');
    sessionStorage.setItem('UserId', String(data.userID ?? ''));
    sessionStorage.setItem('ClientId', String(data.clientID ?? ''));
    sessionStorage.setItem('AgentId', String(data.agentID ?? ''));
    sessionStorage.setItem('Username', data.username ?? '');
    sessionStorage.setItem('Name', data.name?.trim() ?? '');
    sessionStorage.setItem('Type', data.type?.trim() ?? '');
    sessionStorage.setItem(
      'PasswordChangeRequired',
      String(data.passwordChangeRequired ?? false),
    );
    sessionStorage.setItem(this.sessionFlagKey, 'true');
  }

  logout(): void {
    sessionStorage.clear();
  }
}

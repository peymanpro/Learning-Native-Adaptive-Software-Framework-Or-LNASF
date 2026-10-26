import { inject, Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { ApiService } from '../http/services/api.service';
import { AuthResponse } from './models/auth-response.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly api = inject(ApiService);

  private readonly accessTokenKey = 'admin-panel-access-token';

  login(username: string, password: string): Observable<AuthResponse> {
    return this.api
      .post<AuthResponse>('/auth/login', {
        username,
        password,
      })
      .pipe(tap((response) => this.storeAccessToken(response.accessToken)));
  }

  logout(): void {
    localStorage.removeItem(this.accessTokenKey);
  }

  isAuthenticated(): boolean {
    return Boolean(this.getAccessToken());
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.accessTokenKey);
  }

  private storeAccessToken(accessToken: string): void {
    localStorage.setItem(this.accessTokenKey, accessToken);
  }
}

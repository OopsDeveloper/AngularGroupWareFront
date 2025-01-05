import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { JwtHelperService } from '@auth0/angular-jwt';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'authToken';
  private readonly AUTH_TYPE_KEY = 'auth_type';
  private readonly ROLE_PREFIX = 'ROLE_';

  private isLoggedInSubject = new BehaviorSubject<boolean>(this.isAuthenticated());
  private returnUrl: string = '';

  constructor(private http: HttpClient, private router: Router, private jwtHelper: JwtHelperService) {}

  
  // 회원가입 요청 (필요한 경우)
  register(data: any): Observable<any> {
    return this.http.post(`/auth/register`, data);
  }

  login(credentials: { username: string; password: string }): Observable<any> {
    return this.http.post('/auth/login', credentials).pipe(
      tap((response: any) => {
        if (response.token) {
          this.setToken(response.token, 'form');
        }
      }),
    );
  }

  // 로그아웃
  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.AUTH_TYPE_KEY);
    this.isLoggedInSubject.next(false);
  }

  // 토큰 저장
  private setToken(token: string, authType: 'kerberos' | 'form'): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.AUTH_TYPE_KEY, authType);
    this.isLoggedInSubject.next(true);
  }

  // JWT 토큰 가져오기
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  refreshToken(): Observable<any> {
    return this.http.post('/auth/refresh', { token: this.getToken() }).pipe(
      tap((response: any) => {
        if (response.token) {
          this.setToken(response.token, 'form');
        }
      }),
    );
  }

  // 로그인 상태 확인
  isLoggedIn(): boolean {
    return this.isAuthenticated();
  }
  // Observable로 로그인 상태 확인
  isLoggedIn$(): Observable<boolean> {
    return this.isLoggedInSubject.asObservable();
  }

  // JWT 토큰에서 사용자 정보 가져오기
  getUserInfo(): any {
    const token = this.getToken();
    return token ? this.jwtHelper.decodeToken(token) : null;
  }
  // 권한(Role) 확인
  hasRole(role: string): boolean {
    const user = this.getUserInfo();
    if (!user || !user.authorities) return false;
    if (!role.startsWith(this.ROLE_PREFIX)) {
      role = this.ROLE_PREFIX + role;
    }
    return user.authorities.includes(role);
  }

  // 로그인 상태 확인 (토큰 만료 포함)
  isAuthenticated(): boolean {
    const token = this.getToken();
    return token ? !this.jwtHelper.isTokenExpired(token) : false;
  }

  // Kerberos 인증
  kerberos(): Observable<boolean> {
    return this.http.post('/auth/kerberos', null, { observe: 'response', responseType: 'text' }).pipe(
      map((response: HttpResponse<string>) => {
        const token = response.headers.get('Authorization');
        if (token) {
          this.setToken(token.replace('Bearer ', ''), 'kerberos');
          return true;
        }
        return false;
      }),
    );
  }

  // Return URL 설정 및 가져오기
  setReturnUrl(url: string): void {
    this.returnUrl = url;
  }

  getReturnUrl(): string {
    return this.returnUrl;
  }
}

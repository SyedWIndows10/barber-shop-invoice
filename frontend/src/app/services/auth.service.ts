import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';

interface AuthResponse {
    message: string;
    token?: string;
    user?: {
        id: number;
        username: string;
    };
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private apiUrl = 'http://localhost:3000/api/auth';
    private tokenKey = 'barbershop_token';
    private userKey = 'barbershop_user';

    private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasToken());
    public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

    constructor(private http: HttpClient) { }

    login(username: string, password: string): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { username, password })
            .pipe(
                tap(response => {
                    if (response.token) {
                        localStorage.setItem(this.tokenKey, response.token);
                        if (response.user) {
                            localStorage.setItem(this.userKey, JSON.stringify(response.user));
                        }
                        this.isAuthenticatedSubject.next(true);
                    }
                })
            );
    }

    register(username: string, password: string): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.apiUrl}/register`, { username, password });
    }

    logout(): void {
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.userKey);
        this.isAuthenticatedSubject.next(false);
    }

    getToken(): string | null {
        return localStorage.getItem(this.tokenKey);
    }

    getUser(): any {
        const userStr = localStorage.getItem(this.userKey);
        return userStr ? JSON.parse(userStr) : null;
    }

    isAuthenticated(): boolean {
        return this.hasToken();
    }

    private hasToken(): boolean {
        return !!this.getToken();
    }
}

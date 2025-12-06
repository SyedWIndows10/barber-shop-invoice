import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Appointment {
  id?: number;
  userId?: number;
  customerName: string;
  customerPhone?: string;
  appointmentDate: string;
  appointmentTime: string;
  services: any[];
  totalAmount: number;
  status?: string;
  barberId?: number;
  invoiceId?: number;
  createdAt?: string;
}

export interface Service {
  id: number;
  name: string;
  price: number;
  duration?: number;
}

export interface Barber {
  id: number;
  username: string;
}

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  // Public methods (no authentication required)
  getPublicServices(): Observable<{ data: Service[] }> {
    return this.http.get<{ data: Service[] }>(`${this.apiUrl}/public/services`);
  }

  getBarbers(): Observable<{ data: Barber[] }> {
    return this.http.get<{ data: Barber[] }>(`${this.apiUrl}/public/barbers`);
  }

  getAvailableSlots(date: string, barberId: number): Observable<{ data: string[] }> {
    return this.http.get<{ data: string[] }>(`${this.apiUrl}/public/available-slots`, {
      params: { date, barberId: barberId.toString() }
    });
  }

  createPublicAppointment(appointment: Appointment): Observable<any> {
    return this.http.post(`${this.apiUrl}/public/appointments`, appointment);
  }

  // Protected methods (authentication required)
  createAppointment(appointment: Appointment): Observable<any> {
    return this.http.post(`${this.apiUrl}/appointments`, appointment);
  }

  getAppointments(filters?: { status?: string, startDate?: string, endDate?: string }): Observable<{ data: Appointment[] }> {
    let params: any = {};
    if (filters) {
      if (filters.status) params.status = filters.status;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
    }
    return this.http.get<{ data: Appointment[] }>(`${this.apiUrl}/appointments`, { params });
  }

  getAppointment(id: number): Observable<{ data: Appointment }> {
    return this.http.get<{ data: Appointment }>(`${this.apiUrl}/appointments/${id}`);
  }

  confirmAppointment(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/appointments/${id}/confirm`, {});
  }

  rejectAppointment(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/appointments/${id}/reject`, {});
  }

  completeAppointment(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/appointments/${id}/complete`, {});
  }

  updateAppointmentStatus(id: number, status: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/appointments/${id}`, { status });
  }

  cancelAppointment(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/appointments/${id}`);
  }
}

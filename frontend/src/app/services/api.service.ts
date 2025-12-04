import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ServiceItem {
  id: number;
  name: string;
  price: number;
}

export interface InvoiceItem {
  serviceId: number;
  name: string;
  price: number;
}

export interface Invoice {
  id?: number;
  customerName: string;
  date: string;
  totalAmount: number;
  items: InvoiceItem[];
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  getServices(): Observable<{ data: ServiceItem[] }> {
    return this.http.get<{ data: ServiceItem[] }>(`${this.apiUrl}/services`);
  }

  createInvoice(invoice: Invoice): Observable<any> {
    return this.http.post(`${this.apiUrl}/invoices`, invoice);
  }

  getInvoices(startDate?: string, endDate?: string): Observable<{ data: Invoice[] }> {
    let params: any = {};
    if (startDate && endDate) {
      params = { startDate, endDate };
    }
    return this.http.get<{ data: Invoice[] }>(`${this.apiUrl}/invoices`, { params });
  }
}

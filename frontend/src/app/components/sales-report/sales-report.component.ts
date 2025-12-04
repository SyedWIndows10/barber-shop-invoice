import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Invoice } from '../../services/api.service';

@Component({
  selector: 'app-sales-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sales-report.component.html',
  styleUrl: './sales-report.component.css'
})
export class SalesReportComponent implements OnInit {
  invoices: Invoice[] = [];
  totalSales: number = 0;
  startDate: string = '';
  endDate: string = '';

  constructor(private apiService: ApiService) { }

  ngOnInit(): void {
    this.loadInvoices();
  }

  loadInvoices() {
    this.apiService.getInvoices(this.startDate, this.endDate).subscribe(response => {
      this.invoices = response.data;
      this.calculateTotal();
    });
  }

  filterSales() {
    this.loadInvoices();
  }

  calculateTotal() {
    this.totalSales = this.invoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
  }
}

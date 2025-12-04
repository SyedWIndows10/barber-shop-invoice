import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, ServiceItem, InvoiceItem } from '../../services/api.service';

@Component({
  selector: 'app-invoice-generator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './invoice-generator.component.html',
  styleUrl: './invoice-generator.component.css'
})
export class InvoiceGeneratorComponent implements OnInit {
  customerName: string = '';
  date: string = new Date().toISOString().split('T')[0];
  availableServices: ServiceItem[] = [];
  selectedServiceId: number | null = null;

  invoiceItems: InvoiceItem[] = [];

  constructor(private apiService: ApiService) { }

  ngOnInit(): void {
    this.loadServices();
  }

  loadServices() {
    this.apiService.getServices().subscribe(response => {
      this.availableServices = response.data;
      if (this.availableServices.length > 0) {
        this.selectedServiceId = this.availableServices[0].id;
      }
    });
  }

  addService() {
    if (!this.selectedServiceId) return;

    const service = this.availableServices.find(s => s.id == this.selectedServiceId);
    if (service) {
      this.invoiceItems.push({
        serviceId: service.id,
        name: service.name,
        price: service.price
      });
    }
  }

  removeItem(index: number) {
    this.invoiceItems.splice(index, 1);
  }

  get totalAmount(): number {
    return this.invoiceItems.reduce((sum, item) => sum + item.price, 0);
  }

  saveInvoice() {
    if (!this.customerName || this.invoiceItems.length === 0) {
      alert('Please fill in customer name and add at least one service.');
      return;
    }

    const invoice = {
      customerName: this.customerName,
      date: this.date,
      totalAmount: this.totalAmount,
      items: this.invoiceItems
    };

    this.apiService.createInvoice(invoice).subscribe({
      next: (res) => {
        alert('Invoice saved successfully!');
        this.resetForm();
      },
      error: (err) => {
        alert('Error saving invoice: ' + err.message);
      }
    });
  }

  resetForm() {
    this.customerName = '';
    this.invoiceItems = [];
    this.date = new Date().toISOString().split('T')[0];
  }
}

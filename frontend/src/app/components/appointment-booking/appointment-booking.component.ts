import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AppointmentService } from '../../services/appointment.service';
import { ApiService, ServiceItem, InvoiceItem } from '../../services/api.service';

@Component({
  selector: 'app-appointment-booking',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './appointment-booking.component.html',
  styleUrl: './appointment-booking.component.css'
})
export class AppointmentBookingComponent implements OnInit {
  customerName: string = '';
  appointmentDate: string = '';
  appointmentTime: string = '';
  availableServices: ServiceItem[] = [];
  selectedServiceId: number | null = null;
  appointmentServices: InvoiceItem[] = [];

  constructor(
    private appointmentService: AppointmentService,
    private apiService: ApiService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadServices();
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    this.appointmentDate = today;
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
      this.appointmentServices.push({
        serviceId: service.id,
        name: service.name,
        price: service.price
      });
    }
  }

  removeService(index: number) {
    this.appointmentServices.splice(index, 1);
  }

  get totalAmount(): number {
    return this.appointmentServices.reduce((sum, item) => sum + item.price, 0);
  }

  bookAppointment() {
    if (!this.customerName || !this.appointmentDate || !this.appointmentTime || this.appointmentServices.length === 0) {
      alert('Please fill in all fields and add at least one service.');
      return;
    }

    const appointment = {
      customerName: this.customerName,
      appointmentDate: this.appointmentDate,
      appointmentTime: this.appointmentTime,
      services: this.appointmentServices,
      totalAmount: this.totalAmount
    };

    this.appointmentService.createAppointment(appointment).subscribe({
      next: (res) => {
        alert('Appointment booked successfully!');
        this.router.navigate(['/appointments']);
      },
      error: (err) => {
        alert('Error booking appointment: ' + (err.error?.error || err.message));
      }
    });
  }

  resetForm() {
    this.customerName = '';
    this.appointmentServices = [];
    const today = new Date().toISOString().split('T')[0];
    this.appointmentDate = today;
    this.appointmentTime = '';
  }
}

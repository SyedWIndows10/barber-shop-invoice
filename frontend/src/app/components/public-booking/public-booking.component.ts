import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AppointmentService, Service, Barber } from '../../services/appointment.service';

@Component({
  selector: 'app-public-booking',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './public-booking.component.html',
  styleUrl: './public-booking.component.css'
})
export class PublicBookingComponent implements OnInit {
  services: Service[] = [];
  barbers: Barber[] = [];
  availableSlots: string[] = [];
  selectedServices: { service: Service, selected: boolean }[] = [];

  customerName: string = '';
  customerPhone: string = '';
  selectedBarberId: number | null = null;
  selectedDate: string = '';
  selectedTime: string = '';

  loading: boolean = false;
  success: boolean = false;
  error: string = '';
  minDate: string = '';

  constructor(
    private appointmentService: AppointmentService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    // Set minimum date to today
    const today = new Date();
    this.minDate = today.toISOString().split('T')[0];
  }

  ngOnInit(): void {
    console.log('PublicBookingComponent initialized');
    this.loadServices();
    this.loadBarbers();
  }

  loadServices(): void {
    console.log('Loading services...');
    this.appointmentService.getPublicServices().subscribe({
      next: (response) => {
        console.log('Services loaded:', response);
        this.services = response.data;
        this.selectedServices = this.services.map(service => ({
          service,
          selected: false
        }));
        console.log('Selected services:', this.selectedServices);
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading services:', error);
        this.error = 'Failed to load services';
      }
    });
  }

  loadBarbers(): void {
    console.log('Loading barbers...');
    this.appointmentService.getBarbers().subscribe({
      next: (response) => {
        console.log('Barbers loaded:', response);
        this.barbers = response.data;
        console.log('Barbers array:', this.barbers);
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading barbers:', error);
        this.error = 'Failed to load barbers';
      }
    });
  }

  onDateChange(): void {
    if (this.selectedDate && this.selectedBarberId) {
      this.loadAvailableSlots();
    }
  }

  onBarberChange(): void {
    if (this.selectedDate && this.selectedBarberId) {
      this.loadAvailableSlots();
    }
  }

  loadAvailableSlots(): void {
    if (!this.selectedDate || !this.selectedBarberId) return;

    this.loading = true;
    this.appointmentService.getAvailableSlots(this.selectedDate, this.selectedBarberId).subscribe({
      next: (response) => {
        this.availableSlots = response.data;
        this.loading = false;
        if (this.availableSlots.length === 0) {
          this.error = 'No available time slots for this date';
        }
      },
      error: (error) => {
        console.error('Error loading time slots:', error);
        this.error = 'Failed to load available time slots';
        this.loading = false;
      }
    });
  }

  getTotalAmount(): number {
    return this.selectedServices
      .filter(s => s.selected)
      .reduce((sum, s) => sum + s.service.price, 0);
  }

  getSelectedServicesArray(): any[] {
    return this.selectedServices
      .filter(s => s.selected)
      .map(s => ({
        id: s.service.id,
        name: s.service.name,
        price: s.service.price
      }));
  }

  isFormValid(): boolean {
    return !!(
      this.customerName.trim() &&
      this.customerPhone.trim() &&
      this.selectedBarberId &&
      this.selectedDate &&
      this.selectedTime &&
      this.getSelectedServicesArray().length > 0
    );
  }

  submitAppointment(): void {
    if (!this.isFormValid()) {
      this.error = 'Please fill in all required fields';
      return;
    }

    this.loading = true;
    this.error = '';

    const appointment = {
      customerName: this.customerName,
      customerPhone: this.customerPhone,
      appointmentDate: this.selectedDate,
      appointmentTime: this.selectedTime,
      services: this.getSelectedServicesArray(),
      totalAmount: this.getTotalAmount(),
      barberId: this.selectedBarberId!
    };

    this.appointmentService.createPublicAppointment(appointment).subscribe({
      next: (response) => {
        this.loading = false;
        this.success = true;
        setTimeout(() => {
          this.resetForm();
        }, 3000);
      },
      error: (error) => {
        this.loading = false;
        this.error = error.error?.error || 'Failed to book appointment. Please try again.';
      }
    });
  }

  resetForm(): void {
    this.customerName = '';
    this.customerPhone = '';
    this.selectedBarberId = null;
    this.selectedDate = '';
    this.selectedTime = '';
    this.selectedServices = this.services.map(service => ({
      service,
      selected: false
    }));
    this.availableSlots = [];
    this.success = false;
    this.error = '';
  }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AppointmentService, Appointment } from '../../services/appointment.service';

@Component({
  selector: 'app-appointments-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './appointments-list.component.html',
  styleUrl: './appointments-list.component.css'
})
export class AppointmentsListComponent implements OnInit {
  appointments: Appointment[] = [];
  filteredAppointments: Appointment[] = [];
  statusFilter: string = 'all';
  startDate: string = '';
  endDate: string = '';

  constructor(
    private appointmentService: AppointmentService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadAppointments();
  }

  loadAppointments() {
    const filters: any = {};

    if (this.statusFilter !== 'all') {
      filters.status = this.statusFilter;
    }

    if (this.startDate && this.endDate) {
      filters.startDate = this.startDate;
      filters.endDate = this.endDate;
    }

    this.appointmentService.getAppointments(filters).subscribe({
      next: (response) => {
        this.appointments = response.data;
        this.filteredAppointments = response.data;
      },
      error: (err) => {
        console.error('Error loading appointments:', err);
        alert('Error loading appointments: ' + (err.error?.error || err.message));
      }
    });
  }

  filterAppointments() {
    this.loadAppointments();
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'confirmed': return 'status-confirmed';
      case 'completed': return 'status-completed';
      case 'cancelled': return 'status-cancelled';
      default: return '';
    }
  }

  confirmAppointment(appointment: Appointment) {
    if (confirm(`Confirm appointment for ${appointment.customerName}?`)) {
      this.appointmentService.confirmAppointment(appointment.id!).subscribe({
        next: () => {
          alert('Appointment confirmed successfully');
          this.loadAppointments();
        },
        error: (err) => {
          alert('Error confirming appointment: ' + (err.error?.error || err.message));
        }
      });
    }
  }

  rejectAppointment(appointment: Appointment) {
    if (confirm(`Reject appointment for ${appointment.customerName}?`)) {
      this.appointmentService.rejectAppointment(appointment.id!).subscribe({
        next: () => {
          alert('Appointment rejected');
          this.loadAppointments();
        },
        error: (err) => {
          alert('Error rejecting appointment: ' + (err.error?.error || err.message));
        }
      });
    }
  }

  completeAppointment(appointment: Appointment) {
    if (confirm(`Mark appointment as completed? This will automatically generate an invoice for ${appointment.customerName}.`)) {
      this.appointmentService.completeAppointment(appointment.id!).subscribe({
        next: (response) => {
          alert(`Appointment completed! Invoice #${response.data.invoiceId} has been created.`);
          this.loadAppointments();
        },
        error: (err) => {
          alert('Error completing appointment: ' + (err.error?.error || err.message));
        }
      });
    }
  }

  cancelAppointment(appointment: Appointment) {
    if (confirm(`Cancel appointment for ${appointment.customerName}?`)) {
      this.appointmentService.cancelAppointment(appointment.id!).subscribe({
        next: () => {
          alert('Appointment cancelled successfully');
          this.loadAppointments();
        },
        error: (err) => {
          alert('Error cancelling appointment: ' + (err.error?.error || err.message));
        }
      });
    }
  }



  viewInvoice(invoiceId: number) {
    this.router.navigate(['/sales']);
  }

  bookNewAppointment() {
    this.router.navigate(['/appointments/book']);
  }
}

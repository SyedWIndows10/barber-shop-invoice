import { Routes } from '@angular/router';
import { InvoiceGeneratorComponent } from './components/invoice-generator/invoice-generator.component';
import { SalesReportComponent } from './components/sales-report/sales-report.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { AppointmentBookingComponent } from './components/appointment-booking/appointment-booking.component';
import { AppointmentsListComponent } from './components/appointments-list/appointments-list.component';
import { PublicBookingComponent } from './components/public-booking/public-booking.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
    { path: '', redirectTo: '/book', pathMatch: 'full' },
    { path: 'book', component: PublicBookingComponent },
    { path: 'login', component: LoginComponent },
    { path: 'register', component: RegisterComponent },
    { path: 'invoice', component: InvoiceGeneratorComponent, canActivate: [authGuard] },
    { path: 'sales', component: SalesReportComponent, canActivate: [authGuard] },
    { path: 'appointments', component: AppointmentsListComponent, canActivate: [authGuard] },
    { path: 'appointments/book', component: AppointmentBookingComponent, canActivate: [authGuard] }
];

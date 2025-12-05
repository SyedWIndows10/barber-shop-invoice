import { Routes } from '@angular/router';
import { InvoiceGeneratorComponent } from './components/invoice-generator/invoice-generator.component';
import { SalesReportComponent } from './components/sales-report/sales-report.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
    { path: '', redirectTo: '/login', pathMatch: 'full' },
    { path: 'login', component: LoginComponent },
    { path: 'register', component: RegisterComponent },
    { path: 'invoice', component: InvoiceGeneratorComponent, canActivate: [authGuard] },
    { path: 'sales', component: SalesReportComponent, canActivate: [authGuard] }
];

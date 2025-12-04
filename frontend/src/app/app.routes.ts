import { Routes } from '@angular/router';
import { InvoiceGeneratorComponent } from './components/invoice-generator/invoice-generator.component';
import { SalesReportComponent } from './components/sales-report/sales-report.component';

export const routes: Routes = [
    { path: '', redirectTo: '/invoice', pathMatch: 'full' },
    { path: 'invoice', component: InvoiceGeneratorComponent },
    { path: 'sales', component: SalesReportComponent }
];

import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../shared/navbar/navbar.component';
import { AdminService } from '../core/services/admin.service';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  templateUrl: './reportes.component.html',
  styleUrls: ['./reportes.component.css']
})
export class ReportesComponent {
  private adminService = inject(AdminService);

  mes = new Date().getMonth() + 1;
  anio = new Date().getFullYear();
  activeTab: 'ingresos' | 'retencion' = 'ingresos';
  isLoading = signal(false);
  errorMessage = signal('');
  ingresos = signal<any | null>(null);
  retencion = signal<any | null>(null);

  meses = [
    { value: 1, label: 'Enero' },
    { value: 2, label: 'Febrero' },
    { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Mayo' },
    { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' },
    { value: 11, label: 'Noviembre' },
    { value: 12, label: 'Diciembre' }
  ];

  generar(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    const request = this.activeTab === 'ingresos'
      ? this.adminService.getReporteIngresos(this.mes, this.anio)
      : this.adminService.getReporteRetencion(this.mes, this.anio);

    request.subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success) {
          if (this.activeTab === 'ingresos') this.ingresos.set(res.data);
          if (this.activeTab === 'retencion') this.retencion.set(res.data);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'No se pudo generar el reporte.');
      }
    });
  }

  print(): void {
    window.print();
  }
}

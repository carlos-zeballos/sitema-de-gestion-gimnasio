import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../shared/navbar/navbar.component';
import { AdminService } from '../core/services/admin.service';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  templateUrl: './configuracion.component.html',
  styleUrls: ['./configuracion.component.css']
})
export class ConfiguracionComponent implements OnInit {
  private adminService = inject(AdminService);
  private authService = inject(AuthService);

  backups = signal<any[]>([]);
  selectedFile = '';
  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  ngOnInit(): void {
    this.loadBackups();
  }

  loadBackups(): void {
    this.adminService.listBackups().subscribe({
      next: (res) => {
        if (res.success) this.backups.set(res.data);
      },
      error: (err) => this.errorMessage.set(err.error?.message || 'No se pudieron cargar los backups.')
    });
  }

  createBackup(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.adminService.createBackup().subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success) {
          this.successMessage.set(res.message);
          this.loadBackups();
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'No se pudo generar el backup.');
      }
    });
  }

  restore(): void {
    if (!this.selectedFile) {
      this.errorMessage.set('Selecciona un backup para restaurar.');
      return;
    }
    if (!confirm('Los datos actuales seran reemplazados por el backup seleccionado. Continuar?')) return;

    this.isLoading.set(true);
    this.adminService.restoreBackup(this.selectedFile).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success) this.successMessage.set(res.message);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'No se pudo restaurar el backup.');
      }
    });
  }

  async download(file: string): Promise<void> {
    try {
      const token = this.authService.getToken();
      const res = await fetch(this.adminService.getBackupDownloadUrl(file), {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error('download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      this.errorMessage.set('No se pudo descargar el backup.');
    }
  }
}

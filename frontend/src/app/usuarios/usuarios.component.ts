import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../shared/navbar/navbar.component';
import { AdminService, Rol, UsuarioSistema } from '../core/services/admin.service';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.css']
})
export class UsuariosComponent implements OnInit {
  private adminService = inject(AdminService);

  roles = signal<Rol[]>([]);
  usuarios = signal<UsuarioSistema[]>([]);
  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  editingId: number | null = null;

  form: UsuarioSistema = this.emptyForm();

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.adminService.getRoles().subscribe({
      next: (res) => {
        if (res.success) this.roles.set(res.data);
      }
    });

    this.adminService.getUsuarios().subscribe({
      next: (res) => {
        if (res.success) this.usuarios.set(res.data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'No se pudieron cargar los usuarios.');
        this.isLoading.set(false);
      }
    });
  }

  save(): void {
    if (!this.form.nombre || !this.form.username || !this.form.correo || !this.form.rol_id) {
      this.errorMessage.set('Nombre, usuario, correo y rol son obligatorios.');
      return;
    }

    if (!this.editingId && !this.form.password) {
      this.errorMessage.set('La contrasena inicial es obligatoria.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const request = this.editingId
      ? this.adminService.updateUsuario(this.editingId, this.form)
      : this.adminService.createUsuario(this.form);

    request.subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success) {
          this.successMessage.set(res.message);
          this.cancel();
          this.loadData();
        }
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'No se pudo guardar el usuario.');
        this.isLoading.set(false);
      }
    });
  }

  edit(usuario: UsuarioSistema): void {
    this.editingId = usuario.id || null;
    this.form = {
      nombre: usuario.nombre,
      username: usuario.username,
      correo: usuario.correo,
      rol_id: usuario.rol_id,
      estado: usuario.estado,
      password: ''
    };
    this.errorMessage.set('');
  }

  deactivate(usuario: UsuarioSistema): void {
    if (!usuario.id) return;
    if (!confirm(`Desactivar usuario ${usuario.username}?`)) return;

    this.adminService.deactivateUsuario(usuario.id).subscribe({
      next: (res) => {
        if (res.success) {
          this.successMessage.set(res.message);
          this.loadData();
        }
      },
      error: (err) => this.errorMessage.set(err.error?.message || 'No se pudo desactivar el usuario.')
    });
  }

  cancel(): void {
    this.editingId = null;
    this.form = this.emptyForm();
  }

  private emptyForm(): UsuarioSistema {
    return {
      nombre: '',
      username: '',
      correo: '',
      rol_id: 1,
      estado: 'Activo',
      password: ''
    };
  }
}

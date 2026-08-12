import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  username = '';
  password = '';
  showPassword = false;

  isLoading = signal(false);
  errorMessage = signal('');

  constructor(private authService: AuthService, private router: Router) {
    if (this.authService.isLoggedIn()) {
      const user = this.authService.getUser();
      this.router.navigate([user?.rol === 'admin' ? '/dashboard' : '/registro-asistencia']);
    }
  }

  onSubmit(): void {
    if (!this.username || !this.password) {
      this.errorMessage.set('Por favor, ingrese su nombre de usuario y contrasena.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.login(this.username.trim(), this.password).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        if (response.success && response.data) {
          const user = response.data.user;
          this.router.navigate([user.rol === 'admin' ? '/dashboard' : '/registro-asistencia']);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Error al conectar con el servidor.');
      }
    });
  }
}

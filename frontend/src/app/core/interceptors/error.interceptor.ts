import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Interceptor HTTP para capturar errores de respuesta (401/403) y desloguear al usuario
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error) => {
      // Si recibimos 401 (no autorizado / token expirado) deslogueamos y mandamos a login
      if (error.status === 401) {
        authService.logout();
        router.navigate(['/login']);
      }
      
      // Pasar el error capturado o un mensaje por defecto
      return throwError(() => error);
    })
  );
};

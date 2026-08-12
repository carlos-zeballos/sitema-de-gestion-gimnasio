import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard para proteger rutas restringidas por rol (ej: admin vs recepcion)
 */
export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const expectedRoles = route.data['expectedRoles'] as Array<string>;
  const user = authService.getUser();

  // Si no hay usuario o no se cumple el rol esperado, bloquear y redirigir
  if (!user || !expectedRoles || !expectedRoles.includes(user.rol)) {
    console.warn(`Acceso denegado a la ruta ${state.url} para el rol: ${user?.rol || 'No autenticado'}`);
    router.navigate(['/registro-asistencia']);
    return false;
  }

  return true;
};

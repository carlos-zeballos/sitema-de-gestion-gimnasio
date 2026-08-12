import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AsistenciasRegistroComponent } from './asistencias/registro/registro.component';
import { LoginComponent } from './auth/login/login.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { ClientesListComponent } from './clientes/clientes-list.component';
import { UsuariosComponent } from './usuarios/usuarios.component';
import { ReportesComponent } from './reportes/reportes.component';
import { ConfiguracionComponent } from './configuracion/configuracion.component';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

const routes: Routes = [
  { 
    path: 'login', 
    component: LoginComponent 
  },
  { 
    path: 'registro-asistencia', 
    component: AsistenciasRegistroComponent,
    canActivate: [authGuard]
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard, roleGuard],
    data: { expectedRoles: ['admin'] }
  },
  {
    path: 'clientes',
    component: ClientesListComponent,
    canActivate: [authGuard]
  },
  {
    path: 'usuarios',
    component: UsuariosComponent,
    canActivate: [authGuard, roleGuard],
    data: { expectedRoles: ['admin'] }
  },
  {
    path: 'reportes',
    component: ReportesComponent,
    canActivate: [authGuard, roleGuard],
    data: { expectedRoles: ['admin'] }
  },
  {
    path: 'configuracion',
    component: ConfiguracionComponent,
    canActivate: [authGuard, roleGuard],
    data: { expectedRoles: ['admin'] }
  },
  // Redirección por defecto
  { 
    path: '', 
    redirectTo: '/registro-asistencia', 
    pathMatch: 'full' 
  },
  // Captura de rutas no válidas
  { 
    path: '**', 
    redirectTo: '/registro-asistencia' 
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

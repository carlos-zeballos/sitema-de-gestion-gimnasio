import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { AsistenciasRegistroComponent } from './asistencias/registro/registro.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { ClientesListComponent } from './clientes/clientes-list.component';
import { UsuariosComponent } from './usuarios/usuarios.component';
import { ReportesComponent } from './reportes/reportes.component';
import { ConfiguracionComponent } from './configuracion/configuracion.component';
import { jwtInterceptor } from './core/interceptors/jwt.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    AsistenciasRegistroComponent,
    DashboardComponent,
    ClientesListComponent,
    UsuariosComponent,
    ReportesComponent,
    ConfiguracionComponent
  ],
  providers: [
    provideHttpClient(
      withInterceptors([jwtInterceptor, errorInterceptor])
    )
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }

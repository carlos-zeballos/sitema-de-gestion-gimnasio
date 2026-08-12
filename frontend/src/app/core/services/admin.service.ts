import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from './clientes.service';

export interface Rol {
  id: number;
  nombre_rol: 'Administrador' | 'Colaborador_Recepcion' | 'Entrenador';
  descripcion?: string;
}

export interface UsuarioSistema {
  id?: number;
  nombre: string;
  username: string;
  correo: string;
  rol_id: number;
  nombre_rol?: string;
  rol?: 'admin' | 'recepcion' | 'entrenador';
  estado: 'Activo' | 'Inactivo';
  password?: string;
  ultimo_login?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getRoles(): Observable<ApiResponse<Rol[]>> {
    return this.http.get<ApiResponse<Rol[]>>(`${this.apiUrl}/usuarios/roles`);
  }

  getUsuarios(): Observable<ApiResponse<UsuarioSistema[]>> {
    return this.http.get<ApiResponse<UsuarioSistema[]>>(`${this.apiUrl}/usuarios`);
  }

  createUsuario(usuario: UsuarioSistema): Observable<ApiResponse<UsuarioSistema>> {
    return this.http.post<ApiResponse<UsuarioSistema>>(`${this.apiUrl}/usuarios`, usuario);
  }

  updateUsuario(id: number, usuario: UsuarioSistema): Observable<ApiResponse<UsuarioSistema>> {
    return this.http.put<ApiResponse<UsuarioSistema>>(`${this.apiUrl}/usuarios/${id}`, usuario);
  }

  deactivateUsuario(id: number): Observable<ApiResponse<{ id: number }>> {
    return this.http.delete<ApiResponse<{ id: number }>>(`${this.apiUrl}/usuarios/${id}`);
  }

  getReporteIngresos(mes: number, anio: number): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/reportes/ingresos?mes=${mes}&anio=${anio}`);
  }

  getReporteRetencion(mes: number, anio: number): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/reportes/retencion?mes=${mes}&anio=${anio}`);
  }

  listBackups(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/seguridad/backups`);
  }

  createBackup(): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/seguridad/backups`, {});
  }

  restoreBackup(file: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/seguridad/restore`, { file });
  }

  getBackupDownloadUrl(file: string): string {
    return `${this.apiUrl}/seguridad/backups/${encodeURIComponent(file)}`;
  }
}

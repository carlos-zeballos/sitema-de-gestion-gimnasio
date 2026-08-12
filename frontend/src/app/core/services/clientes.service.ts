import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Cliente {
  id?: number;
  nombre_completo?: string;
  nombre: string;
  apellido: string;
  dni: string;
  telefono?: string;
  correo?: string;
  email?: string;
  fecha_inscripcion?: string;
  activo?: number;
  estado?: 'Activo' | 'Inactivo';
  membresia_id?: number;
  membresia_tipo?: 'semanal' | 'quincenal' | 'mensual';
  membresia_inicio?: string;
  membresia_fin?: string;
  membresia_vencimiento?: string;
  membresia_estado?: 'Activa' | 'Proxima_a_vencer' | 'Vencida';
  membresia_monto?: number;
}

export interface Asistencia {
  id?: number;
  cliente_id: number;
  fecha_hora?: string;
  registrado_por?: number;
  registrado_por_nombre?: string;
  observacion?: string;
  acceso_concedido: boolean | number;
}

export interface Pago {
  id?: number;
  cliente_id: number;
  membresia_id?: number;
  monto: number;
  fecha_pago?: string;
  metodo_pago: 'efectivo' | 'yape' | 'plin' | 'otro';
  tipo_membresia?: 'semanal' | 'quincenal' | 'mensual';
  membresia_tipo?: 'semanal' | 'quincenal' | 'mensual';
  registrado_por?: number;
  registrado_por_nombre?: string;
  observacion?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class ClientesService {
  private baseApiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // =================================================================
  // 1. ENDPOINTS: CLIENTES CRUD
  // =================================================================

  getAll(): Observable<ApiResponse<Cliente[]>> {
    return this.http.get<ApiResponse<Cliente[]>>(`${this.baseApiUrl}/clientes`);
  }

  getById(id: number): Observable<ApiResponse<Cliente>> {
    return this.http.get<ApiResponse<Cliente>>(`${this.baseApiUrl}/clientes/${id}`);
  }

  search(q: string): Observable<ApiResponse<Cliente[]>> {
    return this.http.get<ApiResponse<Cliente[]>>(`${this.baseApiUrl}/clientes/search?q=${q}`);
  }

  create(cliente: Cliente): Observable<ApiResponse<Cliente>> {
    return this.http.post<ApiResponse<Cliente>>(`${this.baseApiUrl}/clientes`, cliente);
  }

  update(id: number, cliente: Cliente): Observable<ApiResponse<Cliente>> {
    return this.http.put<ApiResponse<Cliente>>(`${this.baseApiUrl}/clientes/${id}`, cliente);
  }

  delete(id: number): Observable<ApiResponse<{ id: number }>> {
    return this.http.delete<ApiResponse<{ id: number }>>(`${this.baseApiUrl}/clientes/${id}`);
  }

  // =================================================================
  // 2. ENDPOINTS: ASISTENCIAS (Control de Accesos)
  // =================================================================

  registrarAsistencia(asistencia: { cliente_id: number; observacion?: string }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseApiUrl}/asistencias`, asistencia);
  }

  getAsistenciasCliente(clienteId: number): Observable<ApiResponse<Asistencia[]>> {
    return this.http.get<ApiResponse<Asistencia[]>>(`${this.baseApiUrl}/asistencias/${clienteId}`);
  }

  getAsistenciasPorFecha(fecha: string): Observable<ApiResponse<Asistencia[]>> {
    return this.http.get<ApiResponse<Asistencia[]>>(`${this.baseApiUrl}/asistencias?fecha=${fecha}`);
  }

  // =================================================================
  // 3. ENDPOINTS: PAGOS PRESENCIALES
  // =================================================================

  registrarPago(pago: Pago): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseApiUrl}/pagos`, pago);
  }

  getPagosCliente(clienteId: number, fechaInicio?: string, fechaFin?: string): Observable<ApiResponse<Pago[]>> {
    const params = new URLSearchParams();
    if (fechaInicio) params.set('fechaInicio', fechaInicio);
    if (fechaFin) params.set('fechaFin', fechaFin);
    const query = params.toString();
    return this.http.get<ApiResponse<Pago[]>>(`${this.baseApiUrl}/pagos/${clienteId}${query ? `?${query}` : ''}`);
  }

  cambiarEstado(id: number, estado: 'Activo' | 'Inactivo'): Observable<ApiResponse<{ id: number; estado: string }>> {
    return this.http.patch<ApiResponse<{ id: number; estado: string }>>(`${this.baseApiUrl}/clientes/${id}/estado`, { estado });
  }

  getPagosPorMes(mes: number, anio: number): Observable<ApiResponse<Pago[]>> {
    return this.http.get<ApiResponse<Pago[]>>(`${this.baseApiUrl}/pagos?mes=${mes}&anio=${anio}`);
  }

  // =================================================================
  // 4. ENDPOINTS: VIGENCIA DE MEMBRESÍAS
  // =================================================================

  getMembresiasActivas(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.baseApiUrl}/membresias/activas`);
  }

  getMembresiasVencidas(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.baseApiUrl}/membresias/vencidas`);
  }

  getMembresiasProntoVencer(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.baseApiUrl}/membresias/pronto-vencer`);
  }

  // =================================================================
  // 5. ENDPOINTS: REPORTES & DASHBOARD
  // =================================================================

  getReporteClientes(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseApiUrl}/reportes/clientes`);
  }

  getReportePagos(mes: number, anio: number): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseApiUrl}/reportes/pagos?mes=${mes}&anio=${anio}`);
  }

  getDashboardIndicadores(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseApiUrl}/reportes/dashboard/indicadores`);
  }
}

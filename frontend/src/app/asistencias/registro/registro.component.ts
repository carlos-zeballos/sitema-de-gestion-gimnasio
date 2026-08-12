import { Component, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClientesService, Cliente } from '../../core/services/clientes.service';
import { AuthService } from '../../core/services/auth.service';
import { NavbarComponent } from '../../shared/navbar/navbar.component';

interface ResultadoAcceso {
  permitido: boolean;
  mensaje: string;
  cliente: {
    nombre: string;
    apellido: string;
    dni: string;
    membresia_estado: string;
    membresia_fin?: string;
  };
}

@Component({
  selector: 'app-registro-asistencia',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  templateUrl: './registro.component.html',
  styleUrls: ['./registro.component.css']
})
export class AsistenciasRegistroComponent {
  // Término de búsqueda e inputs (usando señales o variables estándar)
  searchTerm = '';
  observacion = '';
  
  // Lista de resultados de búsqueda
  resultadosBusqueda: WritableSignal<Cliente[]> = signal([]);
  
  // Cliente seleccionado actualmente
  clienteSeleccionado: WritableSignal<Cliente | null> = signal(null);
  
  // Estado de la verificación de acceso para el banner
  resultadoAcceso: WritableSignal<ResultadoAcceso | null> = signal(null);
  
  // Cargando e indicadores
  isLoading = signal(false);
  errorMessage = signal('');

  constructor(
    private clientesService: ClientesService,
    private authService: AuthService
  ) {}

  /**
   * Buscar clientes en tiempo real por Nombre o DNI
   */
  buscarClientes(): void {
    if (this.searchTerm.trim().length < 2) {
      this.resultadosBusqueda.set([]);
      return;
    }

    this.clientesService.search(this.searchTerm).subscribe({
      next: (response) => {
        if (response.success) {
          this.resultadosBusqueda.set(response.data);
          this.errorMessage.set('');
        }
      },
      error: (err) => {
        console.error('Error al buscar clientes:', err);
        this.resultadosBusqueda.set([]);
      }
    });
  }

  /**
   * Seleccionar un cliente de la lista de búsqueda
   */
  seleccionarCliente(cliente: Cliente): void {
    this.clienteSeleccionado.set(cliente);
    this.resultadosBusqueda.set([]);
    this.searchTerm = `${cliente.nombre} ${cliente.apellido}`;
    this.resultadoAcceso.set(null); // Limpiar validación previa
  }

  /**
   * Limpiar la selección de cliente
   */
  limpiar(): void {
    this.clienteSeleccionado.set(null);
    this.resultadosBusqueda.set([]);
    this.searchTerm = '';
    this.observacion = '';
    this.resultadoAcceso.set(null);
    this.errorMessage.set('');
  }

  /**
   * Cerrar la sesión actual
   */
  logout(): void {
    this.authService.logout();
  }

  /**
   * Enviar validación de asistencia
   */
  procesarIngreso(): void {
    const cliente = this.clienteSeleccionado();
    if (!cliente || !cliente.id) {
      this.errorMessage.set('Debe seleccionar un cliente antes de procesar el ingreso.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.clientesService.registrarAsistencia({
      cliente_id: cliente.id,
      observacion: this.observacion
    }).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        if (response.success) {
          const resData = response.data;
          
          this.resultadoAcceso.set({
            permitido: resData.acceso_concedido,
            mensaje: resData.acceso_concedido 
              ? '¡ACCESO AUTORIZADO! Membresía vigente.' 
              : `¡ACCESO DENEGADO! ${resData.warning || 'Membresía vencida o inactiva'}`,
            cliente: {
              nombre: resData.cliente.nombre,
              apellido: resData.cliente.apellido,
              dni: resData.cliente.dni,
              membresia_estado: resData.membresia_estado,
              membresia_fin: cliente.membresia_fin
            }
          });

          // Reproducir alerta auditiva según acceso
          this.reproducirAlertaSonora(resData.acceso_concedido);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Error al procesar el acceso del cliente.');
        console.error('Error al registrar asistencia:', err);
      }
    });
  }

  /**
   * Reproduce una señal acústica utilizando la API de AudioContext del navegador
   */
  private reproducirAlertaSonora(concedido: boolean): void {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (concedido) {
        // Sonido de Acceso Concedido: Tono agradable de 880Hz (La) por 0.15 segundos
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else {
        // Sonido de Acceso Denegado: Tono bajo de advertencia de 180Hz que oscila por 0.4 segundos
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch (e) {
      console.warn('El navegador bloqueó la reproducción de audio hasta una interacción directa.', e);
    }
  }
}

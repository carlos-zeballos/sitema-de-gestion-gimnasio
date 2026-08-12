import { Component, OnDestroy, OnInit, inject, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClientesService, Cliente, Pago, Asistencia } from '../core/services/clientes.service';
import { AuthService } from '../core/services/auth.service';
import { NavbarComponent } from '../shared/navbar/navbar.component';
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { RealtimeService } from '../core/services/realtime.service';

@Component({
  selector: 'app-clientes-list',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  templateUrl: './clientes-list.component.html',
  styleUrls: ['./clientes-list.component.css']
})
export class ClientesListComponent implements OnInit, OnDestroy {
  private clientesService = inject(ClientesService);
  private authService = inject(AuthService);
  private realtime = inject(RealtimeService);
  private search$ = new Subject<string>();

  currentUser = this.authService.currentUser;

  // Data lists
  clientes = signal<Cliente[]>([]);
  filteredClientes = signal<Cliente[]>([]);

  // Search & Filter
  searchTerm = '';
  statusFilter = 'all'; // all, Activa, Proxima_a_vencer, Vencida, sin-membresia

  // Modals Visibility
  showCreateModal = false;
  showEditModal = false;
  showRenewModal = false;
  showDetailModal = false;

  // Selected Client & Histories
  selectedCliente: Cliente | null = null;
  clientPagos = signal<Pago[]>([]);
  clientAsistencias = signal<Asistencia[]>([]);

  // Forms Binding Models
  clientForm = {
    nombre: '',
    apellido: '',
    dni: '',
    telefono: '',
    email: ''
  };

  renewForm = {
    tipo_membresia: 'mensual' as 'semanal' | 'quincenal' | 'mensual',
    monto: 90.00,
    metodo_pago: 'yape' as 'efectivo' | 'yape' | 'plin' | 'otro',
    observacion: ''
  };

  // Prices mapping
  membresiaPrecios = {
    semanal: 30.00,
    quincenal: 50.00,
    mensual: 90.00
  };

  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  ngOnInit(): void {
    this.loadClientes();
    this.search$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(q => this.clientesService.search(q))
    ).subscribe({
      next: res => { this.filteredClientes.set(res.data); this.isLoading.set(false); },
      error: () => { this.filteredClientes.set([]); this.isLoading.set(false); }
    });
    this.realtime.connect()?.on('pago:registrado', () => this.loadClientes());
    this.realtime.connect()?.on('cliente:estado', () => this.loadClientes());
  }

  ngOnDestroy(): void {
    this.realtime.connect()?.off('pago:registrado');
    this.realtime.connect()?.off('cliente:estado');
  }

  onSearch(): void {
    const q = this.searchTerm.trim();
    if (!q) { this.applyFilter(); return; }
    if (q.length < 3) return;
    this.isLoading.set(true);
    this.search$.next(q);
  }

  loadClientes(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    
    this.clientesService.getAll().subscribe({
      next: (res) => {
        if (res.success) {
          this.clientes.set(res.data);
          this.applyFilter();
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error cargando clientes:', err);
        this.errorMessage.set('No se pudo establecer conexión con el servidor.');
        this.isLoading.set(false);
      }
    });
  }

  applyFilter(): void {
    let list = this.clientes();

    // 1. Aplicar término de búsqueda
    if (this.searchTerm.trim()) {
      const q = this.searchTerm.toLowerCase();
      list = list.filter(c => 
        c.nombre.toLowerCase().includes(q) || 
        c.apellido.toLowerCase().includes(q) || 
        c.dni.includes(q)
      );
    }

    // 2. Aplicar filtro de estado de membresía
    if (this.statusFilter !== 'all') {
      list = list.filter(c => {
        if (this.statusFilter === 'activa') {
          return c.membresia_estado === 'Activa';
        } else if (this.statusFilter === 'vencida') {
          return c.membresia_estado === 'Vencida';
        } else if (this.statusFilter === 'proxima') {
          return c.membresia_estado === 'Proxima_a_vencer';
        } else if (this.statusFilter === 'sin-membresia') {
          return !c.membresia_estado;
        }
        return true;
      });
    }

    this.filteredClientes.set(list);
  }

  // =================================================================
  // CRUD ACTIONS
  // =================================================================

  openCreateModal(): void {
    this.clientForm = { nombre: '', apellido: '', dni: '', telefono: '', email: '' };
    this.errorMessage.set('');
    this.showCreateModal = true;
  }

  saveNewCliente(): void {
    if (!this.clientForm.nombre || !this.clientForm.apellido || !this.clientForm.dni) {
      this.errorMessage.set('Los campos Nombre, Apellido y DNI son obligatorios.');
      return;
    }

    if (this.clientForm.dni.length !== 8 || isNaN(Number(this.clientForm.dni))) {
      this.errorMessage.set('El DNI debe ser un número de 8 dígitos.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const newCliente: Cliente = {
      nombre: this.clientForm.nombre.trim(),
      apellido: this.clientForm.apellido.trim(),
      nombre_completo: `${this.clientForm.nombre.trim()} ${this.clientForm.apellido.trim()}`.trim(),
      dni: this.clientForm.dni.trim(),
      telefono: this.clientForm.telefono.trim() || undefined,
      correo: this.clientForm.email.trim() || undefined,
      email: this.clientForm.email.trim() || undefined
    };

    this.clientesService.create(newCliente).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success) {
          this.showCreateModal = false;
          this.triggerSuccess('Cliente registrado exitosamente.');
          this.loadClientes();
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Error al guardar el cliente.');
      }
    });
  }

  openEditModal(cliente: Cliente): void {
    this.selectedCliente = cliente;
    this.clientForm = {
      nombre: cliente.nombre,
      apellido: cliente.apellido,
      dni: cliente.dni,
      telefono: cliente.telefono || '',
      email: cliente.email || ''
    };
    this.errorMessage.set('');
    this.showEditModal = true;
  }

  saveEditCliente(): void {
    if (!this.selectedCliente?.id) return;

    if (!this.clientForm.nombre || !this.clientForm.apellido) {
      this.errorMessage.set('Los campos Nombre y Apellido son obligatorios.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const updatedCliente: Cliente = {
      nombre: this.clientForm.nombre.trim(),
      apellido: this.clientForm.apellido.trim(),
      nombre_completo: `${this.clientForm.nombre.trim()} ${this.clientForm.apellido.trim()}`.trim(),
      dni: this.clientForm.dni, // El DNI no suele cambiarse para evitar duplicados
      telefono: this.clientForm.telefono.trim() || undefined,
      correo: this.clientForm.email.trim() || undefined,
      email: this.clientForm.email.trim() || undefined
    };

    this.clientesService.update(this.selectedCliente.id, updatedCliente).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success) {
          this.showEditModal = false;
          this.triggerSuccess('Datos del cliente actualizados.');
          this.loadClientes();
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Error al actualizar el cliente.');
      }
    });
  }

  deleteCliente(cliente: Cliente): void {
    if (!cliente.id) return;
    if (this.currentUser()?.rol !== 'admin') {
      alert('Acceso restringido: Solo administradores pueden eliminar socios.');
      return;
    }

    if (confirm(`¿Está seguro de que desea dar de baja al socio ${cliente.nombre} ${cliente.apellido}?`)) {
      this.isLoading.set(true);
      this.clientesService.delete(cliente.id).subscribe({
        next: (res) => {
          this.isLoading.set(false);
          if (res.success) {
            this.triggerSuccess('El socio ha sido dado de baja en el sistema.');
            this.loadClientes();
          }
        },
        error: (err) => {
          this.isLoading.set(false);
          alert(err.error?.message || 'Error al dar de baja al cliente.');
        }
      });
    }
  }

  // =================================================================
  // MEMBERSHIP RENEWALS & PAYMENTS
  // =================================================================

  openRenewModal(cliente: Cliente): void {
    this.selectedCliente = cliente;
    this.renewForm = {
      tipo_membresia: 'mensual',
      monto: 90.00,
      metodo_pago: 'yape',
      observacion: ''
    };
    this.errorMessage.set('');
    this.showRenewModal = true;
  }

  onRenewMembresiaChange(): void {
    const tipo = this.renewForm.tipo_membresia;
    this.renewForm.monto = this.membresiaPrecios[tipo];
  }

  saveRenew(): void {
    if (!this.selectedCliente?.id) return;

    if (this.renewForm.monto <= 0) {
      this.errorMessage.set('El monto debe ser un valor positivo.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const pagoData: Pago = {
      cliente_id: this.selectedCliente.id,
      monto: this.renewForm.monto,
      metodo_pago: this.renewForm.metodo_pago,
      tipo_membresia: this.renewForm.tipo_membresia,
      observacion: this.renewForm.observacion.trim() || undefined
    };

    this.clientesService.registrarPago(pagoData).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success) {
          this.showRenewModal = false;
          this.triggerSuccess('Membresía renovada y pago registrado correctamente.');
          this.loadClientes();
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Error al registrar la renovación.');
      }
    });
  }

  // =================================================================
  // SOCIO CARD / DETAILS
  // =================================================================

  openDetailModal(cliente: Cliente): void {
    if (!cliente.id) return;
    this.selectedCliente = cliente;
    this.clientPagos.set([]);
    this.clientAsistencias.set([]);
    this.showDetailModal = true;
    
    // Obtener historial de pagos
    this.clientesService.getPagosCliente(cliente.id).subscribe({
      next: (res) => {
        if (res.success) {
          this.clientPagos.set(res.data);
        }
      }
    });

    // Obtener historial de asistencias
    this.clientesService.getAsistenciasCliente(cliente.id).subscribe({
      next: (res) => {
        if (res.success) {
          this.clientAsistencias.set(res.data);
        }
      }
    });
  }

  // Helpers
  private triggerSuccess(msg: string): void {
    this.successMessage.set(msg);
    setTimeout(() => this.successMessage.set(''), 4000);
  }
}

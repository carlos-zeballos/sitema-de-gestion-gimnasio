# Auditoría funcional integral — Sprints 2 y 3

**Proyecto:** CRM Gimnasio GD Madrid S.A.  
**Corte de auditoría:** 12 de agosto de 2026  
**Sprint 2:** 1–15 de julio de 2026, PB/HU11–HU19  
**Sprint 3:** 8–12 de agosto de 2026, PB/HU20–HU21  
**Supuesto:** “898 de agosto” se interpreta como **8 de agosto**.  
**Estados:** ✅ conforme y probado; 🟡 implementado/parcial o requiere prueba manual; ❌ incumplido; ⚪ no ejecutado por riesgo/infraestructura externa.

## Resumen ejecutivo

Se revisaron **75 criterios de aceptación** de 11 historias, además de sus **55 subtareas**. La compilación Angular termina correctamente y el ciclo automatizado de API/BD/WebSocket termina con **33/33 verificaciones aprobadas**. No se declara el producto “100% terminado” porque aún existen criterios de interfaz de HU12, HU13, HU16 y pruebas operativas destructivas/no funcionales de HU18–HU19 que no tienen evidencia suficiente.

Hallazgos corregidos durante la auditoría:

- WebSocket autenticado con JWT entre Express y Angular; eventos `pago:registrado`, `dashboard:actualizar` y `cliente:estado`.
- Búsqueda parcial de nombre/DNI, mínimo 3 caracteres y debounce de 300 ms.
- Baja/reactivación por `PATCH /api/clientes/:id/estado`, sin `DELETE` físico.
- Pago con fecha elegida y rechazo de fechas futuras.
- Historial de pagos con rango inclusivo y rechazo de fechas invertidas.
- Contraseña centralizada con mínimo 8 caracteres, mayúscula, número y especial.
- CORS habilitado para PATCH y actualización del dashboard sin recarga.

## Sprint 2 — auditoría criterio por criterio

### HU11 — Búsqueda de clientes por nombre o DNI

1. ✅ Barra visible y etiqueta exacta “Buscar por nombre o DNI”.
2. ✅ Angular exige 3 caracteres y usa `debounceTime(300)`.
3. ✅ Backend usa coincidencia parcial `LIKE` para nombre y DNI, sin sensibilidad de mayúsculas en nombre.
4. 🟡 La consulta es parametrizada y respondió en milisegundos; falta ensayo formal con exactamente 1,000 clientes.
5. 🟡 La lista queda vacía; falta el texto exacto exigido para “sin resultados”.
6. ✅ Al limpiar se restaura la lista cargada sin recarga de página.
7. ❌ No existe una ruta de perfil persistente que conserve el término al volver; el detalle actual es modal.

**Subtareas:** 1 análisis ✅; 2 componente/debounce ✅; 3 endpoint de búsqueda ✅; 4 servicio reactivo ✅; 5 pruebas parcial/sin resultado/especiales 🟡 (parcial y sin resultado cubiertos; caracteres especiales pendientes).

### HU12 — Listado general de clientes

1. ✅ Tabla con identidad, DNI, teléfono y estados; la fecha de vencimiento está disponible.
2. ✅ Estado dinámico: activa >7 días, próxima 0–7 días, vencida antes de hoy.
3. ✅ Estados con color y texto.
4. 🟡 Orden alfabético inicial ✅; orden por encabezados ❌.
5. 🟡 Backend admite estado de cliente y membresía simultáneos; la UI solo expone membresía.
6. 🟡 Backend admite 20/50/100 y página; faltan controles de paginación en Angular.
7. ❌ El detalle modal no conserva formalmente página/filtros como estado navegable.

**Subtareas:** 1 ✅; 2 tabla ✅/orden y paginación 🟡; 3 endpoint con filtros/paginación ✅; 4 cálculo dinámico ✅; 5 datos de los tres estados ✅.

### HU13 — Baja lógica de clientes

1. 🟡 El botón de baja existe para activos; los inactivos no aparecen en la vista predeterminada.
2. ✅ Confirmación muestra nombre; debe añadirse el DNI para conformidad literal.
3. ✅ Cancelar `confirm()` no envía operación.
4. ✅ `PATCH /api/clientes/:id/estado`; no ejecuta DELETE.
5. ✅ Estado inactivo, `fecha_baja=NOW()` y desaparición de vista activa.
6. ✅ Pagos/asistencias conservan FK e historial; backend permite listar inactivos/todos.
7. 🟡 Endpoint de reactivación probado; falta botón de reactivación en la UI.

**Subtareas:** 1 ✅; 2 confirmación 🟡 (falta DNI); 3 PATCH ✅; 4 filtro activo ✅; 5 prueba baja/reactivación ✅.

### HU14 — Registro manual de pagos presenciales

1. ✅ Formulario de renovación incluye cliente seleccionado, monto, fecha efectiva, método y tipo.
2. 🟡 Registrar/Cancelar están presentes; “Nuevo” y “Retornar” no están como botones explícitos.
3. 🟡 El flujo parte del cliente existente seleccionado; no hay buscador embebido dentro del modal de pago.
4. ✅ Monto >0 validado en frontend y backend.
5. ✅ Fecha futura rechazada con HTTP 422 y mensaje requerido.
6. ✅ Se impide envío inválido por validación; revisar deshabilitado literal en todos los estados.
7. ✅ Inserción con ID y FK a cliente dentro de transacción.
8. ✅ Mensaje de éxito e historial actualizado.

**Subtareas:** 1 ✅; 2 🟡; 3 endpoint/validaciones ✅; 4 formulario reactivo 🟡 (template-driven); 5 transacción integrada ✅; 6 pruebas éxito/monto/fecha/cliente ✅.

### HU15 — Actualización automática de membresía

1. ✅ Se dispara automáticamente al confirmar pago.
2. ✅ Cálculo semanal +7, quincenal +15 y mensual +30.
3. ✅ Base de cálculo = fecha del pago actual.
4. ✅ `beginTransaction/commit/rollback` abarca membresía y pago.
5. ✅ Estado y perfil se actualizan; WebSocket fuerza sincronización inmediata.
6. 🟡 La respuesta contiene la fecha, pero el mensaje UI no usa aún el texto literal “Membresía activa hasta [fecha]”.
7. ✅ Rollback implementado; mensaje de error genérico seguro. Falta prueba deliberada de fallo DB.

**Subtareas:** 1 ✅; 2 servicio transaccional ✅; 3 cálculo ✅; 4 transacciones ✅; 5 prueba membresía nueva ✅ y preexistente 🟡.

### HU16 — Historial de pagos por cliente

1. ✅ Sección visible en ficha del cliente.
2. ✅ `ORDER BY fecha_pago DESC, id DESC`.
3. 🟡 Muestra plan, monto, fecha y método; falta mostrar ID y vencimiento en columnas.
4. 🟡 Backend acepta `fechaInicio`/`fechaFin` independientes; faltan campos de filtro en UI.
5. ✅ Rango invertido rechazado con mensaje y HTTP 422.
6. ✅ Rango inclusivo (`>=`, `<=`) probado.
7. 🟡 El estado vacío existe, pero falta el texto exacto específico del rango.

**Subtareas:** 1 ✅; 2 tabla ✅/filtros 🟡; 3 endpoint ✅; 4 validación frontend ❌ (backend sí); 5 pruebas sin filtros/rango/invertido/sin resultado ✅.

### HU17 — Cuentas y políticas de seguridad

1. ✅ Login cuenta intentos y bloquea al tercer fallo.
2. ✅ Gestión/desbloqueo restringido a administrador.
3. ✅ Política: 8+, mayúscula, número y especial.
4. ✅ Administrador activa/desactiva desde usuarios.
5. ✅ Auditoría registra cambios; revisar que bloqueo automático también escriba evento en todos los caminos.
6. 🟡 La expresión está centralizada en rutas de usuarios; conviene extraerla a `securityPolicy.js` compartido.

**Subtareas:** 1 ✅; 2 ✅; 3 ✅; 4 ✅; 5 🟡; 6 pruebas de contraseña débil/roles ✅, secuencia completa de tres fallos 🟡.

### HU18 — Backup de base de datos

1. ✅ Endpoint manual protegido por JWT + administrador.
2. ✅ SQL con fecha/hora en nombre y marcador propio.
3. 🟡 Implementación asíncrona, pero serializa tablas en memoria; falta prueba de concurrencia/carga.
4. ✅ Evento `BACKUP_BD` en auditoría con usuario y timestamp de tabla.
5. ✅ Crear/listar/descargar restringidos a administrador.

**Subtareas:** 1 ✅; 2 ✅ (generador SQL equivalente, no `mysqldump`); 3 ✅; 4 ✅; 5 generación validada ✅, descarga manual 🟡.

### HU19 — Restauración de base de datos

1. 🟡 UI selecciona un backup existente; no permite cargar un archivo local nuevo.
2. ✅ Advertencia explícita antes de ejecutar.
3. ✅ Solo administrador.
4. ✅ Extensión `.sql`, nombre saneado y marcador `CRM_GD_MADRID_BACKUP`.
5. ✅ Confirma resultado y registra `RESTORE_BD` al finalizar.

**Subtareas:** 1 ✅; 2 ✅; 3 ✅; 4 ✅; 5 ⚪ restauración integral no ejecutada sobre la BD compartida para evitar reemplazar datos. Debe hacerse en instancia QA desechable.

## Sprint 3 — auditoría criterio por criterio

### HU20 — Resumen de membresías en panel

1. ✅ Tres KPI claramente diferenciados con contadores.
2. ✅ Activas: cliente activo y vencimiento posterior a +7 días.
3. ✅ Próximas: hoy a +7 días inclusive.
4. ✅ Vencidas: fecha anterior; inactivos excluidos.
5. ✅ Verde/amarillo/rojo y texto.
6. ❌ Las tarjetas no navegan aún a Clientes con filtro aplicado.
7. ✅ Carga inicial y actualización WebSocket tras pago, sin refresh manual.
8. ✅ Valores inicializados en cero.

**Subtareas:** 1 ✅; 2 tarjetas ✅/navegación ❌; 3 endpoint ✅; 4 rango ✅; 5 prueba estados/cero ✅.

### HU21 — Reporte mensual de ingresos

1. ✅ Sección, meses enero–diciembre y año; acción de generar.
2. ✅ Filtra pagos por `MONTH` y `YEAR` parametrizados.
3. ✅ Total de pagos y monto S/.
4. ✅ Desglose tipo/cantidad/subtotal y fila total.
5. ✅ Prueba automática: suma de subtotales = total (180.00 = 180.00 en ejecución auditada).
6. ✅ Mensaje exacto funcional cuando no hay datos.
7. ✅ Respuesta local ~3 ms, muy por debajo de 5 s; falta dataset formal de 500 registros.
8. ✅ Gimnasio, título, período y timestamp ISO.

**Subtareas:** 1 ✅; 2 ✅; 3 ✅; 4 ✅; 5 período con datos/totales ✅ y período vacío 🟡.

## WebSocket backend–frontend

Flujo probado:

1. Angular abre Socket.IO con `auth.token` y transporte WebSocket.
2. Express valida firma/expiración JWT antes de aceptar la conexión.
3. La transacción de pago confirma primero en MySQL.
4. Solo después del `commit` se emiten `pago:registrado` y `dashboard:actualizar`.
5. Clientes y Dashboard recargan datos de la API protegida.
6. La prueba automatizada recibió el evento con el mismo `cliente_id` del pago creado.

Riesgo residual: no hay confirmación de entrega ni reintento de eventos; es correcto para invalidación de vista porque al reconectar la carga REST recompone el estado.

## Sprint Review — Sprint 2 (15 de julio de 2026)

**10:00–10:15:** objetivo y backlog HU11–19.  
**10:15–10:40:** demo búsqueda, listado, baja/reactivación.  
**10:40–11:10:** demo pago transaccional, membresía e historial.  
**11:10–11:30:** seguridad, backup y restauración en entorno QA.  
**11:30–11:45:** evidencias y defectos abiertos.  
**Resultado:** incremento funcional aceptable con deuda UI en paginación/filtros y restauración pendiente en entorno aislado.

## Retrospective — Sprint 2 (15 de julio de 2026, 16:00–17:00)

- **Mantener:** transacciones MySQL, RBAC, validación por capas y auditoría.
- **Mejorar:** trazabilidad de numeración HU/subtareas, pruebas automatizadas por criterio, evitar datos simulados en Dashboard.
- **Acciones:** matriz criterio–test obligatoria (Carlos, 16 julio); componentes UI de filtros/paginación (Kenny, 20 julio); restauración en BD efímera (Kepler QA, 22 julio).

## Preparación entre sprints (16 de julio–7 de agosto de 2026)

- 16–20 julio: cierre de deuda HU11–16.
- 21–25 julio: endurecimiento HU17–19 y pruebas de recuperación.
- 26–31 julio: endpoint/dashboard y dataset de estados frontera.
- 1–4 agosto: reporte HU21 y validación matemática.
- 5–7 agosto: pruebas integradas, WebSocket y preparación de demo.

## Sprint Review — Sprint 3 (12 de agosto de 2026)

**10:00–10:20:** demo Dashboard con activas/próximas/vencidas.  
**10:20–10:35:** registro de pago y actualización WebSocket sin recarga.  
**10:35–11:00:** reporte mensual, período vacío y verificación de totales.  
**11:00–11:20:** resultados QA, riesgos y aceptación.  
**Resultado:** HU21 conforme; HU20 requiere navegación desde tarjetas para cierre literal.

## Retrospective — Sprint 3 (12 de agosto de 2026, 16:00–17:00)

- **Funcionó:** eventos solo después de commit, consultas agregadas rápidas, reporte con totales reconciliados.
- **No funcionó:** backlog con referencias HU antiguas; criterios de UI sin pruebas E2E; fallback de Dashboard con datos simulados puede ocultar fallos.
- **Acciones:** eliminar fallbacks simulados (Carlos, 13 agosto); hacer tarjetas navegables con query params (Kenny, 13 agosto); ejecutar regresión E2E y recuperación en ambiente QA (Kepler, 14 agosto).

## Evidencia reproducible

- `cd backend && node acceptance-loop.js` → 33 verificaciones previstas.
- `cd frontend && npm run build` → compilación de producción correcta.
- La restauración positiva debe ejecutarse exclusivamente contra una instancia QA desechable.

## Criterio de salida recomendado

No cerrar definitivamente los Sprints hasta resolver los ❌ de HU11.7, HU12.4/6/7, HU13.7, HU16 filtros UI y HU20.6; después ejecutar una regresión E2E visual y una restauración completa en QA. Los criterios externos de 1,000 clientes, 500 pagos y concurrencia de backup requieren datasets controlados y acta de rendimiento.

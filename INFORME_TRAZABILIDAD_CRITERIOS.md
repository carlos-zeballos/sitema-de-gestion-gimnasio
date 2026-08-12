# Informe de trazabilidad por criterio de aceptación

Este anexo identifica **cómo se demuestra cada criterio** de HU11–HU21 dentro del proyecto. Una referencia de código demuestra implementación; `acceptance-loop.js` demuestra ejecución funcional. Los criterios manuales o incompletos no se presentan como aprobados.

## HU11 — Búsqueda por nombre o DNI

| CA | Estado | Demostración dentro del proyecto |
|---|---|---|
| 1 | Cumple | La etiqueta e input están en `frontend/src/app/clientes/clientes-list.component.html:24-31`. |
| 2 | Cumple | `onSearch()` exige 3 caracteres y el pipe aplica `debounceTime(300)` en `clientes-list.component.ts:72-98`. |
| 3 | Cumple | SQL con `LOWER(nombre) LIKE` y `dni LIKE` en `backend/src/controllers/clientes.controller.js`; prueba parcial en `backend/acceptance-loop.js:123-126`. |
| 4 | Parcial | La prueba real respondió en milisegundos, pero no se cargaron exactamente 1,000 clientes. Requiere prueba de rendimiento dedicada. |
| 5 | Parcial | La señal recibe arreglo vacío, pero la vista no contiene todavía el mensaje literal solicitado. |
| 6 | Cumple | `onSearch()` llama `applyFilter()` cuando el campo queda vacío, sin recarga del navegador. |
| 7 | No cumple | El perfil se abre como modal y no existe persistencia navegable del término de búsqueda. |

## HU12 — Listado general de clientes

| CA | Estado | Demostración dentro del proyecto |
|---|---|---|
| 1 | Cumple | Tabla y columnas en `clientes-list.component.html`; consulta compuesta `clienteSelect` en `clientes.controller.js`. |
| 2 | Cumple | Cálculo SQL reutilizable `membershipStatusSql` y sincronización por `CURDATE()`/+7 días. |
| 3 | Cumple | Badges por estado en HTML/CSS de Clientes, siempre acompañados por texto. |
| 4 | Parcial | Backend ordena `c.nombre_completo ASC`; no hay orden interactivo por encabezado. |
| 5 | Parcial | Backend recibe `estadoCliente` y `estadoMembresia` simultáneamente; la UI solo ofrece filtro de membresía. |
| 6 | Parcial | Backend valida `limit` 20/50/100, `page` y `OFFSET`; faltan controles visuales de página. |
| 7 | No cumple | El modal no conserva formalmente filtros y página como estado de navegación. |

## HU13 — Baja lógica

| CA | Estado | Demostración dentro del proyecto |
|---|---|---|
| 1 | Parcial | Botón “Baja” condicionado a administrador en `clientes-list.component.html:115-118`; la vista base solo carga activos. |
| 2 | Parcial | `confirm()` incluye el nombre en `deleteCliente()`; aún falta incluir DNI en el texto. |
| 3 | Cumple | La solicitud solo se ejecuta dentro de la rama afirmativa de `confirm()`. |
| 4 | Cumple | Ruta `PATCH /:id/estado` en `clientes.routes.js` y `changeStatus()` en `clientes.controller.js`; prueba en `acceptance-loop.js:153-155`. |
| 5 | Cumple | UPDATE asigna `Inactivo`, `activo=0`, `fecha_baja=NOW()`; la lista predeterminada filtra activos. |
| 6 | Cumple | No existe DELETE físico en el nuevo flujo; pagos y asistencias conservan sus relaciones. |
| 7 | Parcial | PATCH a `Activo` fue probado con HTTP 200, pero falta botón visible de reactivación. |

## HU14 — Registro manual de pagos

| CA | Estado | Demostración dentro del proyecto |
|---|---|---|
| 1 | Cumple | Modal de renovación/pago y modelo `renewForm` contienen cliente seleccionado, monto, método y tipo; backend admite `fecha_pago`. |
| 2 | Parcial | Registrar y Cancelar existen; no están los botones explícitos Nuevo y Retornar. |
| 3 | Parcial | El pago se inicia desde una fila de cliente existente; el modal no incorpora su propio buscador. |
| 4 | Cumple | Validación UI `monto <= 0` y backend `isFloat({min:0.01})`. |
| 5 | Cumple | Validador compara con fecha del servidor en `pagos.routes.js`; prueba HTTP 422 en `acceptance-loop.js:143-146`. |
| 6 | Cumple funcional | El método no envía con monto inválido y el backend vuelve a validar todos los obligatorios. El deshabilitado literal requiere revisión visual. |
| 7 | Cumple | INSERT en `pagos` usa ID autogenerado y `cliente_id`, dentro de transacción. |
| 8 | Cumple | Respuesta 201, mensaje de éxito y posterior recarga; prueba de pago en `acceptance-loop.js:134-139`. |

## HU15 — Actualización automática de membresía

| CA | Estado | Demostración dentro del proyecto |
|---|---|---|
| 1 | Cumple | `pagos.controller.crear` crea membresía automáticamente dentro del mismo request de pago. |
| 2 | Cumple | `calculateExpirationDate()` en `backend/src/utils/dateHelper.js` implementa +7/+15/+30. |
| 3 | Cumple | `fecha_inicio = fecha_pago`; no usa el vencimiento anterior como base. |
| 4 | Cumple | `beginTransaction`, `commit`, `rollback` y `release` en `pagos.controller.js`. |
| 5 | Cumple | Tras commit se emiten `pago:registrado` y `dashboard:actualizar`; Angular escucha ambos. |
| 6 | Parcial | La fecha calculada vuelve en `data.membresia.fecha_vencimiento`; el mensaje visual aún no reproduce el texto literal completo. |
| 7 | Cumple técnico | El catch ejecuta rollback y el interceptor evita detalles internos; falta una prueba controlada que fuerce una caída entre ambos INSERT. |

## HU16 — Historial de pagos

| CA | Estado | Demostración dentro del proyecto |
|---|---|---|
| 1 | Cumple | Sección “Historial de Pagos” dentro del modal de ficha en `clientes-list.component.html`. |
| 2 | Cumple | Consulta ordena `fecha_pago DESC, id DESC` en `pagos.controller.js`. |
| 3 | Parcial | Tabla muestra plan, monto, fecha, método y usuario; faltan columnas visibles de ID y vencimiento generado. |
| 4 | Parcial | Servicio y endpoint aceptan fechas opcionales; faltan inputs “desde/hasta” en el HTML. |
| 5 | Cumple | Validador de `fechaFin` rechaza inicio posterior; prueba HTTP 422 en `acceptance-loop.js:150-151`. |
| 6 | Cumple | SQL usa `DATE(fecha_pago) >=` y `<=`; prueba con ambos extremos en `acceptance-loop.js:148-149`. |
| 7 | Parcial | Existe estado vacío genérico; falta el mensaje literal específico para rango. |

## HU17 — Cuentas y seguridad

| CA | Estado | Demostración dentro del proyecto |
|---|---|---|
| 1 | Cumple | `auth.controller.js` incrementa `intentos_fallidos` y bloquea en el tercer fallo. |
| 2 | Cumple | Todas las rutas de usuarios aplican `verifyToken` y `requireAdmin`. |
| 3 | Cumple | `passwordPolicy` usa regex 8+, mayúscula, número y especial en `usuarios.routes.js`. |
| 4 | Cumple | `usuarios.controller.update/deactivate` actualiza estado; UI de Usuarios está protegida por `roleGuard`. |
| 5 | Parcial | Creación, actualización y desactivación escriben `auditoria`; debe comprobarse el log del bloqueo automático en todos los caminos. |
| 6 | Parcial | La regla está definida una vez en rutas de usuarios, pero conviene moverla a un módulo de política compartido con autenticación. |

## HU18 — Backup

| CA | Estado | Demostración dentro del proyecto |
|---|---|---|
| 1 | Cumple | `POST /api/seguridad/backups`, detrás de JWT y `requireAdmin`. Prueba 201 en `acceptance-loop.js:188-189`. |
| 2 | Cumple | Nombre `backup_crm_gd_madrid_YYYYMMDD_HHMMSS.sql` y contenido SQL en `seguridad.controller.js`. |
| 3 | Parcial | Usa APIs asíncronas, pero aún no existe prueba concurrente mientras usuarios operan. |
| 4 | Cumple | INSERT `BACKUP_BD` en `auditoria` con `req.user.id`; la tabla agrega fecha/hora. |
| 5 | Cumple | Crear, listar y descargar comparten protección de administrador en `seguridad.routes.js`. |

## HU19 — Restauración

| CA | Estado | Demostración dentro del proyecto |
|---|---|---|
| 1 | Parcial | La UI permite seleccionar `.sql` de la lista de backups; no permite subir un archivo local nuevo. |
| 2 | Cumple | `confirm('Los datos actuales seran reemplazados...')` en `configuracion.component.ts`. |
| 3 | Cumple | `/restore` hereda JWT y `requireAdmin`. |
| 4 | Cumple | `path.basename`, extensión `.sql` y marcador `-- CRM_GD_MADRID_BACKUP`; prueba de archivo inválido en `acceptance-loop.js:191-192`. |
| 5 | Cumple implementado | Respuesta de éxito y log `RESTORE_BD`; no se ejecutó restauración positiva en la BD compartida por ser destructiva. |

## HU20 — Dashboard de membresías

| CA | Estado | Demostración dentro del proyecto |
|---|---|---|
| 1 | Cumple | `DashboardComponent` genera KPI de activos, vencidos y próximos; HTML los renderiza como tarjetas. |
| 2 | Cumple | Sincronización marca Activa solo después de +7 días y consulta excluye clientes inactivos. |
| 3 | Cumple | Estado `Proxima_a_vencer` entre hoy y `DATE_ADD(CURDATE(), INTERVAL 7 DAY)`. |
| 4 | Cumple | Vencidos usa fecha anterior y `c.estado='Activo'`; contempla activos sin membresía vigente. |
| 5 | Cumple | KPI usan tipos `success`, `warning`, `danger` con texto descriptivo. |
| 6 | No cumple | Las tarjetas todavía no incluyen navegación a `/clientes` con query param del filtro. |
| 7 | Cumple | Carga en `ngOnInit`; WebSocket `dashboard:actualizar` vuelve a cargar tras el commit. Evento probado en `acceptance-loop.js:128-141`. |
| 8 | Cumple | Contadores inicializados en cero y `|| 0`; prueba de endpoint en `acceptance-loop.js:185-186`. |

## HU21 — Reporte mensual de ingresos

| CA | Estado | Demostración dentro del proyecto |
|---|---|---|
| 1 | Cumple | Select de 12 meses, año y botón Generar en `reportes.component.html`; backend valida ambos parámetros. |
| 2 | Cumple | Consultas filtran `MONTH(fecha_pago)=? AND YEAR(fecha_pago)=?` en `reportes.controller.js`. |
| 3 | Cumple | API devuelve `total_pagos` y `monto_total`; UI muestra ambos en soles. |
| 4 | Cumple | `GROUP BY tipo_membresia`; tabla Tipo/Cantidad/Subtotal y fila Total en HTML. |
| 5 | Cumple probado | `acceptance-loop.js:179-180` suma subtotales y compara con monto total; última ejecución: 270 = 270. |
| 6 | Cumple | Mensaje “No hay ingresos registrados para el periodo seleccionado” en `reportes.component.html:59-60`. |
| 7 | Cumple en entorno local | La consulta respondió alrededor de 3 ms; falta certificación con exactamente 500 pagos. |
| 8 | Cumple | API entrega gimnasio, título, período y `generado_en`; encabezado los renderiza con fecha/hora. |

## Evidencia de ejecución

1. `backend/acceptance-loop.js` levanta el servidor, autentica, crea cliente/pago, prueba búsqueda, WebSocket, rangos, baja/reactivación, reportes y backup.
2. Resultado final registrado durante la auditoría: **33 pruebas aprobadas de 33**.
3. `npm run build` en frontend finalizó correctamente y generó el bundle de producción.
4. La restauración positiva está deliberadamente pendiente para una base QA desechable, porque ejecutarla sobre la BD compartida reemplazaría datos.

## Conclusión

Los criterios marcados “Cumple” tienen código identificable y, cuando corresponde, prueba ejecutable. Los marcados “Parcial” tienen una porción funcional demostrable pero no satisfacen literalmente todo el criterio. Los marcados “No cumple” requieren desarrollo adicional y no deben incluirse como terminados en el acta de aceptación.

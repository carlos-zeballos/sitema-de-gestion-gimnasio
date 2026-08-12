# CRM Gimnasio GD Madrid

Sistema web Angular + Node.js/Express + MySQL con autenticación JWT, RBAC, clientes, asistencias, membresías, pagos, reportes, backups y actualización WebSocket.

## Ejecución local

1. Copiar `backend/.env.example` a `backend/.env` y configurar MySQL/JWT.
2. Ejecutar `database/schema.sql` en MySQL para una instalación nueva.
3. Backend: `cd backend`, `npm ci`, `npm start`.
4. Frontend desarrollo: `cd frontend`, `npm ci`, `npm start`.
5. Abrir `http://localhost:4200`.

## Escenarios QA de membresía

Ejecutar `npm run seed:scenarios` dentro de `backend`. Es idempotente y crea:

- DNI `80000001`: cliente recién creado, sin membresía.
- DNI `80000002`: membresía próxima a vencer en 3 días.
- DNI `80000003`: membresía vencida ayer.

Solo los clientes vencidos o próximos a vencer pueden registrar una renovación. La fecha de inicio se selecciona en el formulario y determina el nuevo vencimiento.

## Validación

- Backend/API/BD/WebSocket: `cd backend && node acceptance-loop.js`.
- Frontend: `cd frontend && npm run build`.
- Producción local: `cd frontend && BACKEND_URL=http://localhost:3000 npm run start:prod` (en PowerShell, definir primero `$env:BACKEND_URL`).

## Railway

Consultar [RAILWAY_DEPLOY.md](RAILWAY_DEPLOY.md). El repositorio está preparado para servicios separados con root directories `/backend` y `/frontend`, más MySQL administrado.

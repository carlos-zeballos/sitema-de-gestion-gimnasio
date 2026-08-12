# Despliegue en Railway desde GitHub

Crear un proyecto Railway y añadir tres servicios dentro del mismo proyecto.

## 1. MySQL

Añadir el template **MySQL**. Railway expone automáticamente `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD` y `MYSQLDATABASE`; el backend ya reconoce esos nombres.

## 2. Backend

Crear servicio desde el repositorio GitHub y configurar **Root Directory** como `/backend`.

Variables:

- `NODE_ENV=production`
- `JWT_SECRET=<valor aleatorio de al menos 32 caracteres>`
- `JWT_EXPIRES_IN=8h`
- `CORS_ORIGIN=https://<dominio-publico-del-frontend>`
- Referenciar las variables del servicio MySQL si Railway no las inyecta automáticamente.

Generar dominio público y configurar health check `/health`. Al arrancar, el backend crea la tabla incremental `clientes_bajas` sin borrar datos.

Para el primer despliegue sobre una base vacía, configurar temporalmente el Start Command como `npm run db:init && npm start`. Cuando el backend quede activo, cambiar inmediatamente el Start Command a `npm start` y redeployar. `db:init` usa `MYSQLDATABASE`, crea el esquema y usuarios semilla, pero es destructivo y no debe repetirse sobre una base con datos.

## 3. Frontend

Crear otro servicio desde el mismo repositorio y configurar **Root Directory** como `/frontend`.

Variable:

- `BACKEND_URL=https://<dominio-publico-del-backend>`

El servidor frontend compila Angular, sirve la SPA y actúa como proxy de `/api` y `/socket.io`; por eso el navegador no necesita conocer el dominio backend ni sufre CORS.

Generar dominio público. Después copiar ese dominio en `CORS_ORIGIN` del backend y redeployar backend.

## Verificación

1. `https://<backend>/health` responde HTTP 200.
2. `https://<frontend>/login` carga Angular.
3. Login con los usuarios semilla.
4. Registrar una renovación de cliente vencido/próximo y comprobar actualización WebSocket.
5. Abrir Reportes y pulsar total/fila para ver el detalle.

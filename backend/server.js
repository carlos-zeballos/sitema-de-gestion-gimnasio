const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Conexión inicial de la Base de Datos
require('./src/config/db');

// Importación de Middleware de errores
const { errorHandler } = require('./src/middlewares/errorHandler');

// Importación de Rutas
const authRoutes = require('./src/routes/auth.routes');
const clientesRoutes = require('./src/routes/clientes.routes');
const asistenciasRoutes = require('./src/routes/asistencias.routes');
const pagosRoutes = require('./src/routes/pagos.routes');
const membresiasRoutes = require('./src/routes/membresias.routes');
const reportesRoutes = require('./src/routes/reportes.routes');
const usuariosRoutes = require('./src/routes/usuarios.routes');
const seguridadRoutes = require('./src/routes/seguridad.routes');

const app = express();
const PORT = process.env.PORT || 3000;
const { runMigrations } = require('./src/config/migrations');
const allowedOrigins = `${process.env.CORS_ORIGIN || ''},http://localhost:4200,http://127.0.0.1:4200`
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const corsOrigin = (origin, callback) => {
  if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
  return callback(new Error('Origen no permitido por CORS'));
};

// 1. Middlewares Globales de Seguridad y Utilidades
app.use(helmet()); // Seguridad de Cabeceras HTTP
app.use(cors({
  origin: corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
})); // Configuración CORS para el frontend Angular

app.use(morgan('dev')); // Logger HTTP en consola
app.use(express.json()); // Parser de JSON en body
app.use(express.urlencoded({ extended: true })); // Parser de urlencoded

// 2. Ruta de Salud (Health Check) para Railway y Uptime Monitoring
const healthHandler = (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date(),
    service: 'CRM Gimnasio GD Madrid API'
  });
};
app.get('/api/health', healthHandler);
app.get('/health', healthHandler);

// 3. Montar Enrutadores de la API REST
app.use('/api/auth', authRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/asistencias', asistenciasRoutes);
app.use('/api/pagos', pagosRoutes);
app.use('/api/membresias', membresiasRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/seguridad', seguridadRoutes);

// Ruta de compatibilidad directa para Dashboard indicada en el Excel
const { getDashboardIndicadores } = require('./src/controllers/reportes.controller');
const { verifyToken } = require('./src/middlewares/auth.middleware');
app.get('/api/dashboard/indicadores', verifyToken, getDashboardIndicadores);

// 4. Captura de Rutas no encontradas (404)
app.use((req, res, next) => {
  const err = new Error(`Ruta no encontrada - ${req.originalUrl}`);
  err.status = 404;
  next(err);
});

// 5. Middleware Global para el manejo de Errores (debe ir al final)
app.use(errorHandler);

// WebSocket autenticado: sincroniza pagos, membresias, clientes y dashboard.
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: corsOrigin, methods: ['GET', 'POST'] }
});
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new Error('Token no valido'));
  }
});
io.on('connection', (socket) => socket.emit('conexion:lista', { conectado: true }));
app.set('io', io);

// Inicializar Servidor
runMigrations().then(() => httpServer.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`🚀 Servidor CRM Gimnasio GD Madrid iniciado exitosamente.`);
  console.log(`📡 Puerto: ${PORT}`);
  console.log(`⚙️  Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`===================================================`);
})).catch((err) => {
  console.error('No se pudieron aplicar las migraciones:', err.message);
  process.exit(1);
});

module.exports = { app, httpServer, io };

const { spawn } = require('child_process');
const path = require('path');
const db = require('./src/config/db');
const { io } = require('socket.io-client');

const API = 'http://127.0.0.1:3000/api';
const results = [];

const record = (story, criterion, ok, evidence, action = '') => {
  results.push({ story, criterion, ok, evidence, action });
  const mark = ok ? 'OK' : 'FAIL';
  console.log(`[${mark}] ${story} - ${criterion}: ${evidence}`);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const request = async (path, options = {}) => {
  const res = await fetch(`${API}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {})
    },
    method: options.method || 'GET',
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { res, body };
};

const waitForHealth = async () => {
  for (let i = 0; i < 20; i++) {
    try {
      const { res } = await request('/health');
      if (res.status === 200) return true;
    } catch {
      await sleep(500);
    }
  }
  return false;
};

const startServer = async () => {
  const server = spawn(process.execPath, ['server.js'], {
    cwd: __dirname,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: '3000' }
  });
  server.stdout.on('data', (chunk) => process.stdout.write(chunk));
  server.stderr.on('data', (chunk) => process.stderr.write(chunk));
  const ok = await waitForHealth();
  if (!ok) {
    server.kill();
    throw new Error('El backend no respondio /api/health');
  }
  return server;
};

const validateSchema = async () => {
  const required = {
    roles: ['id', 'nombre_rol', 'descripcion'],
    usuarios: ['id', 'nombre', 'username', 'correo', 'password_hash', 'rol_id', 'estado', 'intentos_fallidos', 'bloqueado_hasta', 'ultimo_login', 'creado_en'],
    clientes: ['id', 'nombre_completo', 'dni', 'telefono', 'correo', 'fecha_inscripcion', 'estado', 'fecha_baja', 'creado_en'],
    membresias: ['id', 'cliente_id', 'tipo', 'fecha_inicio', 'fecha_vencimiento', 'estado', 'creado_en'],
    pagos: ['id', 'cliente_id', 'membresia_id', 'monto', 'fecha_pago', 'metodo_pago', 'tipo_membresia', 'fecha_vencimiento_generada', 'registrado_por', 'creado_en'],
    asistencias: ['id', 'cliente_id', 'fecha_hora', 'registrado_por', 'estado_membresia_al_ingreso'],
    auditoria: ['id', 'usuario_id', 'accion', 'detalle', 'fecha_hora']
  };

  for (const [table, cols] of Object.entries(required)) {
    const [rows] = await db.query(`SHOW COLUMNS FROM ${table}`);
    const existing = rows.map((row) => row.Field);
    const missing = cols.filter((col) => !existing.includes(col));
    record('HU04', `Tabla ${table}`, missing.length === 0, missing.length ? `Faltan ${missing.join(', ')}` : 'Columnas requeridas presentes', missing.length ? 'Migrar BD' : '');
  }
};

const run = async () => {
  let server;
  try {
    await validateSchema();
    server = await startServer();

    const loginBad = await request('/auth/login', { method: 'POST', body: { username: 'admin', password: 'bad' } });
    record('HU01', 'Login invalido no revela campo incorrecto', loginBad.res.status === 401 && /Usuario o contrasena incorrectos/.test(loginBad.body?.message || ''), `HTTP ${loginBad.res.status}`);

    const login = await request('/auth/login', { method: 'POST', body: { username: 'admin', password: 'admin123' } });
    const token = login.body?.data?.token;
    record('HU01', 'Login valido devuelve JWT', login.res.status === 200 && !!token, `HTTP ${login.res.status}`);

    const noToken = await request('/clientes');
    record('HU03', 'Endpoint protegido rechaza sin token', noToken.res.status === 401, `HTTP ${noToken.res.status}`);

    const clientes = await request('/clientes', { token });
    record('HU07/HU08', 'Listar clientes activos', clientes.res.status === 200 && Array.isArray(clientes.body?.data), `HTTP ${clientes.res.status}, registros ${clientes.body?.data?.length ?? 0}`);

    const dni = String(Math.floor(10000000 + Math.random() * 89999999));
    const createCliente = await request('/clientes', {
      method: 'POST',
      token,
      body: { nombre_completo: 'Cliente QA Loop', dni, telefono: '999888777', correo: `qa${dni}@gym.com`, fecha_inscripcion: new Date().toISOString().slice(0, 10) }
    });
    const clienteId = createCliente.body?.data?.id;
    record('HU07', 'Registrar cliente nuevo', createCliente.res.status === 201 && !!clienteId, `HTTP ${createCliente.res.status}, id ${clienteId || '-'}`);

    const duplicateCliente = await request('/clientes', {
      method: 'POST',
      token,
      body: { nombre_completo: 'Cliente Duplicado', dni, telefono: '999888777', correo: `dup${dni}@gym.com` }
    });
    record('HU07', 'DNI duplicado bloqueado', duplicateCliente.res.status === 409, `HTTP ${duplicateCliente.res.status}`);

    const updateCliente = await request(`/clientes/${clienteId}`, {
      method: 'PUT',
      token,
      body: { nombre_completo: 'Cliente QA Loop Editado', dni, telefono: '999888777', correo: `qa${dni}@gym.com`, fecha_inscripcion: new Date().toISOString().slice(0, 10) }
    });
    record('HU08', 'Actualizar cliente', updateCliente.res.status === 200, `HTTP ${updateCliente.res.status}`);

    const partialSearch = await request(`/clientes/search?q=${dni.slice(2, 6)}`, { token });
    record('HU11', 'Busqueda parcial por DNI', partialSearch.res.status === 200 && partialSearch.body?.data?.some((c) => c.id === clienteId), `HTTP ${partialSearch.res.status}`);

    const socket = io('http://127.0.0.1:3000', { auth: { token }, transports: ['websocket'] });
    const websocketEvent = new Promise((resolve) => {
      const timer = setTimeout(() => resolve(null), 3000);
      socket.once('pago:registrado', (payload) => { clearTimeout(timer); resolve(payload); });
    });

    const pago = await request('/pagos', {
      method: 'POST',
      token,
      body: { cliente_id: clienteId, monto: 90, metodo_pago: 'yape', tipo_membresia: 'mensual' }
    });
    record('HU10/HU11/HU12', 'Registrar pago y generar membresia', pago.res.status === 201 && !!pago.body?.data?.membresia?.fecha_vencimiento, `HTTP ${pago.res.status}`);
    const wsPayload = await websocketEvent;
    record('HU15/HU20', 'WebSocket backend-frontend emite pago:registrado', wsPayload?.cliente_id === clienteId, wsPayload ? `Evento para cliente ${wsPayload.cliente_id}` : 'Sin evento');
    socket.close();

    const futureDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const futurePago = await request('/pagos', { method: 'POST', token, body: { cliente_id: clienteId, monto: 90, metodo_pago: 'yape', tipo_membresia: 'mensual', fecha_pago: futureDate } });
    record('HU14', 'Rechaza fecha de pago futura', [400, 422].includes(futurePago.res.status), `HTTP ${futurePago.res.status}`);

    const history = await request(`/pagos/${clienteId}?fechaInicio=${new Date().toISOString().slice(0, 10)}&fechaFin=${new Date().toISOString().slice(0, 10)}`, { token });
    record('HU16', 'Historial filtra rango inclusivo', history.res.status === 200 && history.body?.data?.length >= 1, `HTTP ${history.res.status}, registros ${history.body?.data?.length ?? 0}`);
    const invalidRange = await request(`/pagos/${clienteId}?fechaInicio=2026-08-12&fechaFin=2026-08-01`, { token });
    record('HU16', 'Rechaza rango de fechas invertido', [400, 422].includes(invalidRange.res.status), `HTTP ${invalidRange.res.status}`);

    const deactivate = await request(`/clientes/${clienteId}/estado`, { method: 'PATCH', token, body: { estado: 'Inactivo' } });
    const reactivate = await request(`/clientes/${clienteId}/estado`, { method: 'PATCH', token, body: { estado: 'Activo' } });
    record('HU13', 'Baja logica y reactivacion mediante PATCH', deactivate.res.status === 200 && reactivate.res.status === 200, `HTTP ${deactivate.res.status}/${reactivate.res.status}`);

    const asistencia = await request('/asistencias', {
      method: 'POST',
      token,
      body: { cliente_id: clienteId }
    });
    record('HU09', 'Registrar asistencia con membresia vigente', asistencia.res.status === 201 && asistencia.body?.data?.acceso_concedido === true, `HTTP ${asistencia.res.status}`);

    for (const endpoint of ['/membresias/activas', '/membresias/pronto-vencer', '/membresias/vencidas']) {
      const resp = await request(endpoint, { token });
      record('HU13/HU20', `Consultar ${endpoint}`, resp.res.status === 200 && Array.isArray(resp.body?.data), `HTTP ${resp.res.status}`);
    }

    const roles = await request('/usuarios/roles', { token });
    record('HU06', 'Listar roles del sistema', roles.res.status === 200 && roles.body?.data?.length >= 3, `HTTP ${roles.res.status}`);

    const usuarios = await request('/usuarios', { token });
    record('HU06', 'Listar usuarios como admin', usuarios.res.status === 200 && Array.isArray(usuarios.body?.data), `HTTP ${usuarios.res.status}`);

    const mes = new Date().getMonth() + 1;
    const anio = new Date().getFullYear();
    const ingresos = await request(`/reportes/ingresos?mes=${mes}&anio=${anio}`, { token });
    record('HU21', 'Reporte mensual de ingresos', ingresos.res.status === 200 && Array.isArray(ingresos.body?.data?.desglose), `HTTP ${ingresos.res.status}`);
    const sum = (ingresos.body?.data?.desglose || []).reduce((total, row) => total + Number(row.subtotal), 0);
    record('HU21', 'Suma de subtotales coincide con total', Math.abs(sum - Number(ingresos.body?.data?.monto_total || 0)) < 0.001, `Subtotal ${sum}, total ${ingresos.body?.data?.monto_total}`);

    const retencion = await request(`/reportes/retencion?mes=${mes}&anio=${anio}`, { token });
    record('HU22', 'Reporte de retencion', retencion.res.status === 200 && typeof retencion.body?.data?.porcentaje_retencion === 'number', `HTTP ${retencion.res.status}`);

    const dashboard = await request('/dashboard/indicadores', { token });
    record('HU20', 'Dashboard indicadores', dashboard.res.status === 200 && dashboard.body?.data?.miembros_activos !== undefined, `HTTP ${dashboard.res.status}`);

    const backup = await request('/seguridad/backups', { method: 'POST', token, body: {} });
    record('HU18', 'Generar backup protegido', backup.res.status === 201 && !!backup.body?.data?.file, `HTTP ${backup.res.status}`);

    const badRestore = await request('/seguridad/restore', { method: 'POST', token, body: { file: 'archivo_invalido.txt' } });
    record('HU19', 'Restore valida archivo .sql', badRestore.res.status === 400, `HTTP ${badRestore.res.status}`);

    const summary = results.reduce((acc, row) => {
      acc.total += 1;
      acc.ok += row.ok ? 1 : 0;
      acc.fail += row.ok ? 0 : 1;
      return acc;
    }, { total: 0, ok: 0, fail: 0 });

    console.log('\n=== RESUMEN ACCEPTANCE LOOP ===');
    console.log(JSON.stringify(summary, null, 2));
    if (summary.fail > 0) process.exitCode = 1;
  } catch (err) {
    console.error('Acceptance loop error:', err.message);
    process.exitCode = 1;
  } finally {
    if (server) server.kill();
    await db.end();
  }
};

run();

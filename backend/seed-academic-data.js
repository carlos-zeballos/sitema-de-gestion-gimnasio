const db = require('./src/config/db');
const { calculateExpirationDate } = require('./src/utils/dateHelper');

const nombres = ['Juan', 'Pedro', 'Luis', 'Carlos', 'Miguel', 'Javier', 'Diego', 'Maria', 'Ana', 'Sofia', 'Lucia', 'Laura', 'Carmen', 'Gabriela', 'Andrea', 'Ricardo', 'Fernando', 'Patricia', 'Camila', 'Valeria'];
const apellidos = ['Perez', 'Gonzalez', 'Rodriguez', 'Gomez', 'Fernandez', 'Lopez', 'Martinez', 'Sanchez', 'Mendoza', 'Ramos', 'Diaz', 'Flores', 'Castro', 'Torres', 'Vargas', 'Espinoza'];
const metodos = ['efectivo', 'yape', 'plin', 'otro'];
const tiposMembresia = ['semanal', 'quincenal', 'mensual'];
const montosMembresia = { semanal: 30, quincenal: 50, mensual: 90 };

const randRange = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const chooseRand = (arr) => arr[Math.floor(Math.random() * arr.length)];

const estadoMembresia = (fechaVencimiento) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const vencimiento = new Date(`${fechaVencimiento}T00:00:00`);
  if (vencimiento < today) return 'Vencida';
  const sevenDays = new Date(today);
  sevenDays.setDate(sevenDays.getDate() + 7);
  return vencimiento <= sevenDays ? 'Proxima_a_vencer' : 'Activa';
};

async function seed() {
  try {
    console.log('Limpiando tablas de negocio...');
    await db.execute('SET FOREIGN_KEY_CHECKS = 0');
    await db.execute('TRUNCATE TABLE asistencias');
    await db.execute('TRUNCATE TABLE pagos');
    await db.execute('TRUNCATE TABLE membresias');
    await db.execute('TRUNCATE TABLE clientes');
    await db.execute('SET FOREIGN_KEY_CHECKS = 1');

    const clientIds = [];
    console.log('Generando 35 clientes semilla...');

    for (let i = 0; i < 35; i++) {
      const nombreCompleto = `${chooseRand(nombres)} ${chooseRand(apellidos)} ${chooseRand(apellidos)}`;
      const dni = String(70000000 + i * 2947 + randRange(100, 999)).slice(0, 8);
      const telefono = `9${randRange(10000000, 99999999)}`;
      const correo = `${nombreCompleto.toLowerCase().replace(/\s+/g, '.')}@gym.com`;
      const fechaInscripcion = new Date();
      fechaInscripcion.setDate(fechaInscripcion.getDate() - randRange(15, 300));
      const fechaInscripcionStr = fechaInscripcion.toISOString().split('T')[0];

      const [res] = await db.execute(
        `INSERT INTO clientes (nombre_completo, dni, telefono, correo, fecha_inscripcion, estado)
         VALUES (?, ?, ?, ?, ?, 'Activo')`,
        [nombreCompleto, dni, telefono, correo, fechaInscripcionStr]
      );

      clientIds.push({ id: res.insertId, fecha_inscripcion: fechaInscripcion });
    }

    let totalPagos = 0;
    let totalAsistencias = 0;

    for (const client of clientIds) {
      const numMembresias = randRange(1, 3);
      let startDate = new Date(client.fecha_inscripcion);

      for (let j = 0; j < numMembresias; j++) {
        const tipo = chooseRand(tiposMembresia);
        const monto = montosMembresia[tipo];
        const metodo = chooseRand(metodos);
        const registradoPor = randRange(1, 2);
        const fechaInicioStr = startDate.toISOString().split('T')[0];
        const fechaVencimientoStr = calculateExpirationDate(fechaInicioStr, tipo);
        const estado = estadoMembresia(fechaVencimientoStr);

        const [resM] = await db.execute(
          `INSERT INTO membresias (cliente_id, tipo, fecha_inicio, fecha_vencimiento, estado, creado_en)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [client.id, tipo, fechaInicioStr, fechaVencimientoStr, estado, startDate]
        );

        await db.execute(
          `INSERT INTO pagos (cliente_id, membresia_id, monto, fecha_pago, metodo_pago, tipo_membresia, fecha_vencimiento_generada, registrado_por, creado_en)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [client.id, resM.insertId, monto, fechaInicioStr, metodo, tipo, fechaVencimientoStr, registradoPor, startDate]
        );
        totalPagos++;

        const hoy = new Date();
        const fechaVencimiento = new Date(`${fechaVencimientoStr}T00:00:00`);
        let asistenciaDate = new Date(startDate);
        const numAsistencias = randRange(2, 8);
        for (let k = 0; k < numAsistencias; k++) {
          asistenciaDate.setDate(asistenciaDate.getDate() + randRange(1, 5));
          if (asistenciaDate <= hoy && asistenciaDate <= fechaVencimiento) {
            await db.execute(
              `INSERT INTO asistencias (cliente_id, fecha_hora, registrado_por, estado_membresia_al_ingreso)
               VALUES (?, ?, ?, ?)`,
              [client.id, asistenciaDate, registradoPor, estadoMembresia(fechaVencimientoStr)]
            );
            totalAsistencias++;
          }
        }

        const nextStart = new Date(fechaVencimiento);
        nextStart.setDate(nextStart.getDate() + randRange(1, 15));
        startDate = nextStart;
        if (startDate > new Date()) break;
      }
    }

    console.log(`Seed finalizado. Pagos: ${totalPagos}. Asistencias: ${totalAsistencias}.`);
  } catch (err) {
    console.error('Error durante la insercion de datos semilla:', err.message);
  } finally {
    process.exit(0);
  }
}

seed();

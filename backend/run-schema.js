const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// Intentar cargar variables de entorno
try {
  require('dotenv').config({ path: path.join(__dirname, '.env') });
} catch (e) {
  // Ignorar si falla
}

const sqlFilePath = path.join(__dirname, '../database/schema.sql');

async function run() {
  console.log('📖 Leyendo el archivo schema.sql desde:', sqlFilePath);
  let sqlContent;
  try {
    sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
  } catch (err) {
    console.error('❌ No se pudo leer el archivo schema.sql:', err.message);
    process.exit(1);
  }

  // Lista de credenciales comunes para probar
  const credentialOptions = [
    {
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    },
    {
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: 'root'
    },
    {
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: ''
    }
  ];

  let connection = null;
  let activeConfig = null;

  for (const config of credentialOptions) {
    try {
      console.log(`🔌 Intentando conectar a MySQL (${config.user}@${config.host}:${config.port}) con password "${config.password ? '***' : '(vacío)'}"...`);
      connection = await mysql.createConnection({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        multipleStatements: true
      });
      activeConfig = config;
      console.log('✅ Conexión establecida correctamente.');
      break;
    } catch (err) {
      console.log(`⚠️ Falló la conexión: ${err.message}`);
    }
  }

  if (!connection) {
    console.error('\n❌ ERROR: No se pudo conectar a MySQL con ninguna de las credenciales por defecto.');
    console.error('Por favor, asegúrate de que MySQL está encendido y verifica las credenciales de tu base de datos.');
    process.exit(1);
  }

  try {
    console.log('\n⚙️  Ejecutando sentencias del esquema SQL...');
    
    // Ejecutar todo el archivo SQL
    await connection.query(sqlContent);
    
    console.log('🎉 ¡Base de datos crm_gimnasio_gd creada y poblada exitosamente!');
    
    // Si la conexión que funcionó difiere de las variables de entorno, sugerimos actualizar el .env
    if (process.env.DB_PASSWORD !== activeConfig.password || process.env.DB_USER !== activeConfig.user) {
      console.log('\n📝 NOTA: Hemos detectado que funcionaron credenciales distintas a las de tu archivo backend/.env.');
      console.log(`Actualizando tu backend/.env a: DB_USER=${activeConfig.user}, DB_PASSWORD=${activeConfig.password}...`);
      
      const envPath = path.join(__dirname, '.env');
      if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, 'utf8');
        envContent = envContent.replace(/DB_USER=.*/, `DB_USER=${activeConfig.user}`);
        envContent = envContent.replace(/DB_PASSWORD=.*/, `DB_PASSWORD=${activeConfig.password}`);
        fs.writeFileSync(envPath, envContent, 'utf8');
        console.log('💾 ¡Archivo backend/.env actualizado automáticamente!');
      }
    }
  } catch (err) {
    console.error('❌ Error al ejecutar el script de base de datos:', err.message);
  } finally {
    await connection.end();
    console.log('🔌 Conexión cerrada.');
  }
}

run();

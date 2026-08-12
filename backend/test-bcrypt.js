const bcrypt = require('bcryptjs');

async function test() {
  const adminHash = '$2a$10$L19X.x2tP7w4g4XFbe0hSuS34sXyXzJm53lApgZlCj9i1gEUpqWbe';
  const recepcionHash = '$2a$10$UvTebfIecD6z/d1y3P/yqOVQ9gT/T7Kz8Z1gD2WpDqGq.WvP7qCye';
  
  const adminMatch = await bcrypt.compare('admin123', adminHash);
  const recepcionMatch = await bcrypt.compare('recepcion123', recepcionHash);
  
  console.log('--- BCRYPT VERIFICATION ---');
  console.log('admin123 matches adminHash:', adminMatch);
  console.log('recepcion123 matches recepcionHash:', recepcionMatch);
  console.log('---------------------------');
}

test();

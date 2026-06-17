const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Iniciando servicios locales de Thesis Review...');

function runService(name, dir, command, args) {
  const isWindows = process.platform === 'win32';
  const shell = isWindows ? 'powershell.exe' : true;
  
  const child = spawn(command, args, {
    cwd: path.resolve(__dirname, '..', dir),
    stdio: 'inherit',
    shell: shell
  });

  child.on('error', (err) => {
    console.error(`❌ Error en servicio ${name}:`, err.message);
  });

  child.on('close', (code) => {
    console.log(`ℹ️ Servicio ${name} finalizado con código ${code}`);
  });

  return child;
}

// 1. Generar cliente prisma
console.log('📦 Inicializando Base de Datos (Prisma)...');
const dbInit = spawn('npx', ['prisma', 'generate'], {
  cwd: path.resolve(__dirname, '../packages/database'),
  stdio: 'inherit',
  shell: process.platform === 'win32' ? 'powershell.exe' : true
});

dbInit.on('close', (code) => {
  if (code !== 0) {
    console.error('❌ Error al inicializar la base de datos (npx prisma generate)');
    process.exit(code);
  }
  
  console.log('✅ Base de datos inicializada.');
  console.log('🚀 Levantando API NestJS y Web Next.js...');
  
  // 2. Levantar API NestJS
  runService('API NestJS', 'apps/api', 'npx', ['pnpm', 'run', 'dev']);
  
  // 3. Levantar Frontend Next.js
  runService('Web Next.js', 'apps/web', 'npx', ['pnpm', 'run', 'dev']);
});

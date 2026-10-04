const { spawn } = require('child_process');
const path = require('path');

console.log('--- Avvio Smoke Test Electron ---');
const electronBin = path.join(__dirname, '..', 'node_modules', '.bin', 'electron');
const appProcess = spawn(electronBin, ['.'], {
  cwd: path.join(__dirname, '..'),
  env: { ...process.env, ELECTRON_ENABLE_LOGGING: '1' }
});

let output = '';
let hasError = false;

appProcess.stdout.on('data', (d) => {
  const str = d.toString();
  output += str;
  process.stdout.write(str);
});

appProcess.stderr.on('data', (d) => {
  const str = d.toString();
  output += str;
  process.stderr.write(str);
  if (str.includes('Error:') || str.includes('Uncaught Exception')) {
    hasError = true;
  }
});

// Chiudi l'app dopo 2.5 secondi
setTimeout(() => {
  console.log('\nChiusura testuale controllata dell app Electron...');
  appProcess.kill('SIGINT');
  setTimeout(() => {
    if (!appProcess.killed) appProcess.kill('SIGKILL');
    if (hasError) {
      console.error('❌ Rilevati errori durante l avvio di Electron');
      process.exit(1);
    } else {
      console.log('✅ Smoke test Electron completato con successo!');
      process.exit(0);
    }
  }, 500);
}, 2500);

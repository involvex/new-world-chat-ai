/**
 * Ultra Fast Release Builder - Setup + Portable
 * Creates both NSIS installer and portable version
 */
const { execSync } = require('child_process');
const fs = require('fs');
console.log('🚀 Ultra Fast Release Build (Setup + Portable) Starting...');
console.time('⚡ Total Release Time');
try {
  // Clean previous builds
  console.log('🧹 Cleaning...');
  if (fs.existsSync('dist')) fs.rmSync('dist', { recursive: true, force: true });
  if (fs.existsSync('dist-electron')) fs.rmSync('dist-electron', { recursive: true, force: true });
  
  // Build Vite
  console.log('⚡ Building Vite...');
  console.time('Vite Build');
  execSync('npm run build', { stdio: 'inherit' });
  console.timeEnd('Vite Build');
  
  // Package with electron-builder for both NSIS and portable
  console.log('📦 Building NSIS Setup + Portable...');
  console.time('Electron Package');
  execSync('npx electron-builder --win --publish=never', { 
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });
  console.timeEnd('Electron Package');
  
  // Check outputs
  console.log('🔍 Checking build outputs...');
  const distDir = 'dist-electron';
  if (fs.existsSync(distDir)) {
    const files = fs.readdirSync(distDir);
    console.log('📁 Built files:');
    files.forEach(file => {
      const filePath = require('path').join(distDir, file);
      const stats = fs.statSync(filePath);
      if (stats.isFile()) {
        const sizeMB = Math.round(stats.size / 1024 / 1024);
        console.log(`  📄 ${file} (${sizeMB}MB)`);
      }
    });
  }
  
  console.timeEnd('⚡ Total Release Time');
  console.log('🎉 Ultra Fast Release Complete!');
  console.log('📁 Check dist-electron/ for your build files');
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

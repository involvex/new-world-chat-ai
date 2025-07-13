/**
 * Ultra Fast Build Script - WORKING SOLUTION
 * Bypasses electron-builder hook configuration issues
 */
const { execSync } = require('child_process');
const fs = require('fs');
console.log('🚀 Ultra Fast Build Starting...');
try {
  if (fs.existsSync('dist')) fs.rmSync('dist', { recursive: true, force: true });
  if (fs.existsSync('dist-electron')) fs.rmSync('dist-electron', { recursive: true, force: true });
  console.log('⚡ Building Vite...');
  execSync('npm run build', { stdio: 'inherit' });
  console.log('📦 Packaging Electron...');
  execSync('npx electron-builder --win --dir --config.afterPack= --config.afterSign=', { stdio: 'inherit' });
  console.log('✅ SUCCESS! Build complete!');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

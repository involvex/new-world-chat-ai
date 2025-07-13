/**
 * Ultra Fast Release Builder v1.3.2
 */
const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 Ultra Fast Release Build Starting...');
console.time('Total Build Time');

try {
  console.log('🧹 Cleaning previous builds...');
  if (fs.existsSync('dist')) fs.rmSync('dist', { recursive: true, force: true });
  if (fs.existsSync('dist-electron')) fs.rmSync('dist-electron', { recursive: true, force: true });
  
  console.log('⚡ Building Vite frontend...');
  execSync('npm run build', { stdio: 'inherit' });
  
  console.log('📦 Building Windows distributables...');
  execSync('npx electron-builder --win --publish=never', { 
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });
  
  console.log('✅ SUCCESS! Checking outputs...');
  if (fs.existsSync('dist-electron')) {
    const files = fs.readdirSync('dist-electron');
    console.log('📁 Built files:', files.join(', '));
  }
  
  console.timeEnd('Total Build Time');
  console.log('🎉 Release build complete!');
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

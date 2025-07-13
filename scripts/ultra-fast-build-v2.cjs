/**
 * Ultra Fast Build Script - WORKING SOLUTION v2
 */
const { execSync } = require('child_process');
const fs = require('fs');
console.log('🚀 Ultra Fast Build v2 Starting...');
try {
  console.log('⚡ Building Vite...');
  execSync('npm run build', { stdio: 'inherit' });
  console.log('📦 Packaging with minimal config...');
  // Use our working minimal-build script instead
  execSync('node scripts/minimal-build.cjs', { stdio: 'inherit' });
  console.log('✅ SUCCESS! Build complete!');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
